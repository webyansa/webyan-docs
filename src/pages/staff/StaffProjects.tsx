import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FolderKanban, Calendar, Building2, AlertTriangle, RefreshCw,
  Clock, CheckCircle2, Pause, ExternalLink, User, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectStatuses, priorities, projectPhases } from '@/lib/operations/projectConfig';
import { format, isPast, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';

type FilterRole = 'all' | 'implementer' | 'csm' | 'project_manager';
type FilterStatus = 'active' | 'completed' | 'all';

export default function StaffProjects() {
  const { permissions } = useStaffAuth();
  const staffId = permissions.staffId;
  
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  // Fetch projects assigned to this staff member
  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['staff-projects', staffId, roleFilter, statusFilter],
    queryFn: async () => {
      if (!staffId) return [];

      let query = supabase
        .from('crm_implementations')
        .select(`
          *,
          account:client_organizations(id, name, contact_email, contact_phone),
          project_phases(id, phase_type, status, completed_at)
        `)
        .order('created_at', { ascending: false });

      // Filter by role
      if (roleFilter === 'implementer') {
        query = query.eq('implementer_id', staffId);
      } else if (roleFilter === 'csm') {
        query = query.eq('csm_id', staffId);
      } else if (roleFilter === 'project_manager') {
        query = query.eq('project_manager_id', staffId);
      } else {
        query = query.or(`implementer_id.eq.${staffId},csm_id.eq.${staffId},project_manager_id.eq.${staffId}`);
      }

      // Filter by status
      if (statusFilter === 'active') {
        query = query.in('status', ['active', 'on_hold']);
      } else if (statusFilter === 'completed') {
        query = query.eq('status', 'completed');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!staffId,
    staleTime: 0,
  });

  const getProjectProgress = (project: any) => {
    const phases = project.project_phases || [];
    const completedPhases = phases.filter((p: any) => p.status === 'completed').length;
    return phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0;
  };

  const isOverdue = (project: any) => {
    if (!project.expected_delivery_date || project.status === 'completed') return false;
    return isPast(new Date(project.expected_delivery_date));
  };

  const getDaysInfo = (project: any) => {
    if (!project.expected_delivery_date) return null;
    const deliveryDate = new Date(project.expected_delivery_date);
    const diff = differenceInDays(deliveryDate, new Date());
    return diff;
  };

  const getMyRole = (project: any) => {
    const roles: string[] = [];
    if (project.implementer_id === staffId) roles.push('implementer');
    if (project.csm_id === staffId) roles.push('csm');
    if (project.project_manager_id === staffId) roles.push('project_manager');
    if (roles.length === 0) return null;
    if (roles.length === 1) return roles[0];
    return 'multiple';
  };

  const getRoleBadges = (project: any) => {
    const badges: { key: string; label: string; icon: typeof User }[] = [];
    if (project.implementer_id === staffId) badges.push({ key: 'impl', label: 'مسؤول التنفيذ', icon: User });
    if (project.csm_id === staffId) badges.push({ key: 'csm', label: 'نجاح العميل', icon: Users });
    if (project.project_manager_id === staffId) badges.push({ key: 'pm', label: 'مدير المشروع', icon: Users });
    return badges;
  };

  // Stats
  const activeProjects = projects.filter((p: any) => p.status === 'active').length;
  const completedProjects = projects.filter((p: any) => p.status === 'completed').length;
  const overdueProjects = projects.filter((p: any) => isOverdue(p)).length;
  const onHoldProjects = projects.filter((p: any) => p.status === 'on_hold').length;

  if (!staffId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderKanban className="h-6 w-6" />
            مشاريعي
          </h1>
          <p className="text-muted-foreground">المشاريع المُسندة إليك</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 ml-2", isLoading && "animate-spin")} />
          تحديث
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeProjects}</p>
                <p className="text-sm text-muted-foreground">مشاريع نشطة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueProjects}</p>
                <p className="text-sm text-muted-foreground">متأخرة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Pause className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onHoldProjects}</p>
                <p className="text-sm text-muted-foreground">متوقفة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedProjects}</p>
                <p className="text-sm text-muted-foreground">مكتملة (رصيدك)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FolderKanban className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-sm text-muted-foreground">إجمالي المشاريع</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={statusFilter} onValueChange={(v: FilterStatus) => setStatusFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="حالة المشروع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المشاريع</SelectItem>
                <SelectItem value="active">النشطة والمتوقفة</SelectItem>
                <SelectItem value="completed">المكتملة فقط</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={(v: FilterRole) => setRoleFilter(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="دوري في المشروع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأدوار</SelectItem>
                <SelectItem value="implementer">مسؤول التنفيذ</SelectItem>
                <SelectItem value="csm">مسؤول نجاح العميل</SelectItem>
                <SelectItem value="project_manager">مدير المشروع</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مشاريع</h3>
              <p className="text-muted-foreground mb-4">
                لم يتم إسناد أي مشاريع إليك بعد
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => {
            const statusConfig = projectStatuses[project.status as keyof typeof projectStatuses];
            const priorityConfig = priorities[project.priority as keyof typeof priorities];
            const currentPhaseConfig = projectPhases[project.stage as keyof typeof projectPhases];
            const progress = getProjectProgress(project);
            const overdue = isOverdue(project);
            const daysInfo = getDaysInfo(project);
            const myRole = getMyRole(project);

            return (
              <Card key={project.id} className={cn(
                "hover:shadow-md transition-shadow",
                overdue && "border-red-300 bg-red-50/30"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate flex items-center gap-2">
                        {overdue && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                        {project.project_name}
                      </CardTitle>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{project.account?.name}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn(statusConfig?.color)}>
                      {statusConfig?.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* My Role Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {getRoleBadges(project).map(b => (
                      <Badge key={b.key} variant="secondary" className="text-xs">
                        <b.icon className="h-3 w-3 ml-1" />
                        {b.label}
                      </Badge>
                    ))}
                  </div>

                  {/* Current Phase */}
                  {currentPhaseConfig && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">المرحلة:</span>
                      <Badge variant="outline" className={cn("text-xs", currentPhaseConfig.color)}>
                        {currentPhaseConfig.label}
                      </Badge>
                    </div>
                  )}

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>التقدم</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>الاستلام:</span>
                      <span className="font-medium text-foreground">
                        {project.received_date 
                          ? format(new Date(project.received_date), 'dd/MM', { locale: ar })
                          : '-'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className={cn("h-3 w-3", overdue ? "text-destructive" : "text-muted-foreground")} />
                      <span className={overdue ? "text-destructive" : "text-muted-foreground"}>التسليم:</span>
                      <span className={cn("font-medium", overdue ? "text-destructive" : "text-foreground")}>
                        {project.expected_delivery_date 
                          ? format(new Date(project.expected_delivery_date), 'dd/MM', { locale: ar })
                          : '-'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Days info */}
                  {daysInfo !== null && project.status !== 'completed' && (
                    <div className={cn(
                      "text-xs text-center py-1 rounded",
                      overdue ? "bg-red-100 text-red-700" : daysInfo <= 3 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                    )}>
                      {overdue 
                        ? `متأخر ${Math.abs(daysInfo)} يوم` 
                        : daysInfo === 0 
                          ? 'موعد التسليم اليوم!'
                          : `باقي ${daysInfo} يوم للتسليم`
                      }
                    </div>
                  )}

                  {/* Priority */}
                  {priorityConfig && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">الأولوية:</span>
                      <Badge variant="outline" className={cn("text-xs", priorityConfig.color)}>
                        {priorityConfig.label}
                      </Badge>
                    </div>
                  )}

                  {/* Actions */}
                  <Link to={`/support/projects/${project.id}`}>
                    <Button className="w-full" size="sm">
                      <ExternalLink className="h-4 w-4 ml-2" />
                      فتح المشروع
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
