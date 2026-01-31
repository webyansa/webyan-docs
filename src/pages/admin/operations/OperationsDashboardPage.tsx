import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FolderKanban, Clock, CheckCircle2, AlertTriangle, 
  PauseCircle, ArrowLeft, Users, TrendingUp, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectStatuses, projectPhases } from '@/lib/operations/projectConfig';
import { format, differenceInDays, isPast } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ProjectAnalyticsCards } from '@/components/operations/ProjectAnalyticsCards';

export default function OperationsDashboardPage() {
  // Fetch projects with phases and team
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['operations-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_implementations')
        .select(`
          *,
          account:client_organizations(id, name),
          project_phases(id, phase_type, status),
          project_team_members(id, staff_id, role, staff:staff_members(full_name))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch staff workload
  const { data: staffWorkload = [] } = useQuery({
    queryKey: ['staff-workload'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team_members')
        .select(`
          staff_id,
          role,
          staff:staff_members(id, full_name),
          project:crm_implementations(id, status)
        `)
        .eq('is_active', true);

      if (error) throw error;

      // Group by staff
      const workloadMap = new Map<string, { name: string; activeProjects: number; roles: Set<string> }>();
      
      data.forEach((item: any) => {
        if (item.project?.status === 'active' && item.staff) {
          const existing = workloadMap.get(item.staff_id) || {
            name: item.staff.full_name,
            activeProjects: 0,
            roles: new Set(),
          };
          existing.activeProjects++;
          existing.roles.add(item.role);
          workloadMap.set(item.staff_id, existing);
        }
      });

      return Array.from(workloadMap.entries())
        .map(([id, data]) => ({ id, ...data, roles: Array.from(data.roles) }))
        .sort((a, b) => b.activeProjects - a.activeProjects);
    },
  });

  // Calculate stats
  const activeProjects = projects.filter((p: any) => p.status === 'active');
  const completedProjects = projects.filter((p: any) => p.status === 'completed');
  const onHoldProjects = projects.filter((p: any) => p.status === 'on_hold');
  const delayedProjects = activeProjects.filter((p: any) => {
    if (!p.expected_delivery_date) return false;
    return isPast(new Date(p.expected_delivery_date));
  });

  // Calculate phase distribution
  const phaseDistribution = Object.keys(projectPhases).map(phaseType => {
    const count = activeProjects.filter((p: any) => p.stage === phaseType).length;
    return { phase: phaseType, count };
  });

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    bgColor 
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    color: string; 
    bgColor: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-lg", bgColor)}>
            <Icon className={cn("h-6 w-6", color)} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة العمليات</h1>
          <p className="text-muted-foreground">متابعة المشاريع وفريق العمل</p>
        </div>
        <Link to="/admin/projects">
          <Button>
            <FolderKanban className="h-4 w-4 ml-2" />
            عرض كل المشاريع
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            الإحصائيات
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="مشاريع جارية"
              value={activeProjects.length}
              icon={TrendingUp}
              color="text-green-600"
              bgColor="bg-green-100"
            />
            <StatCard
              title="مشاريع متأخرة"
              value={delayedProjects.length}
              icon={AlertTriangle}
              color="text-red-600"
              bgColor="bg-red-100"
            />
            <StatCard
              title="مشاريع مكتملة"
              value={completedProjects.length}
              icon={CheckCircle2}
              color="text-blue-600"
              bgColor="bg-blue-100"
            />
            <StatCard
              title="مشاريع متوقفة"
              value={onHoldProjects.length}
              icon={PauseCircle}
              color="text-amber-600"
              bgColor="bg-amber-100"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Staff Workload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  توزيع المشاريع على الموظفين
                </CardTitle>
              </CardHeader>
              <CardContent>
                {staffWorkload.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    لا توجد مشاريع نشطة موزعة حالياً
                  </p>
                ) : (
                  <div className="space-y-4">
                    {staffWorkload.slice(0, 5).map((staff: any) => (
                      <div key={staff.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{staff.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {staff.activeProjects} مشاريع
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(staff.activeProjects * 20, 100)} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phase Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5" />
                  المشاريع حسب المرحلة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {phaseDistribution.map(({ phase, count }) => {
                    const phaseConfig = projectPhases[phase as keyof typeof projectPhases];
                    if (!phaseConfig) return null;
                    const PhaseIcon = phaseConfig.icon;
                    
                    return (
                      <div key={phase} className="flex items-center gap-3">
                        <div className={cn("p-2 rounded", phaseConfig.bgColor)}>
                          <PhaseIcon className={cn("h-4 w-4", phaseConfig.color)} />
                        </div>
                        <span className="flex-1">{phaseConfig.label}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>أحدث المشاريع</span>
                <Link to="/admin/projects">
                  <Button variant="ghost" size="sm">
                    عرض الكل
                    <ArrowLeft className="h-4 w-4 mr-1" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeProjects.slice(0, 5).map((project: any) => {
                  const completedPhases = project.project_phases?.filter(
                    (p: any) => p.status === 'completed'
                  ).length || 0;
                  const totalPhases = project.project_phases?.length || 6;
                  const progress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
                  const statusConfig = projectStatuses[project.status as keyof typeof projectStatuses];

                  return (
                    <Link 
                      key={project.id}
                      to={`/admin/projects/${project.id}`}
                      className="block"
                    >
                      <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{project.project_name}</span>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", statusConfig?.color)}
                            >
                              {statusConfig?.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {project.account?.name}
                          </p>
                        </div>
                        <div className="w-32">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>التقدم</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}

                {activeProjects.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    لا توجد مشاريع جارية حالياً
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <ProjectAnalyticsCards />
        </TabsContent>
      </Tabs>
    </div>
  );
}
