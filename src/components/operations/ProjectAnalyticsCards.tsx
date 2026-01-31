import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, Clock, CheckCircle2, AlertTriangle, 
  PauseCircle, Users, Zap, Target, Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectPhases, teamRoles } from '@/lib/operations/projectConfig';
import { isPast, differenceInDays, subDays } from 'date-fns';
import {
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ProjectAnalyticsCards() {
  // Fetch all projects with phases
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['analytics-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_implementations')
        .select(`
          *,
          project_phases(id, phase_type, status, started_at, completed_at, assigned_to)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch staff performance
  const { data: staffPerformance = [] } = useQuery({
    queryKey: ['staff-phase-performance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_phases')
        .select(`
          id,
          phase_type,
          status,
          started_at,
          completed_at,
          assigned_to,
          staff:staff_members!project_phases_assigned_to_fkey(id, full_name)
        `)
        .eq('status', 'completed')
        .not('started_at', 'is', null)
        .not('completed_at', 'is', null);

      if (error) throw error;

      // Calculate average completion time per staff
      const staffMap = new Map<string, { name: string; totalHours: number; count: number }>();
      
      data.forEach((phase: any) => {
        if (phase.assigned_to && phase.staff) {
          const hours = (new Date(phase.completed_at).getTime() - new Date(phase.started_at).getTime()) / (1000 * 60 * 60);
          const existing = staffMap.get(phase.assigned_to) || { name: phase.staff.full_name, totalHours: 0, count: 0 };
          existing.totalHours += hours;
          existing.count++;
          staffMap.set(phase.assigned_to, existing);
        }
      });

      return Array.from(staffMap.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          avgHours: Math.round(data.totalHours / data.count),
          completedPhases: data.count,
        }))
        .sort((a, b) => b.completedPhases - a.completedPhases);
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

  // Projects completed this month
  const thisMonthCompleted = completedProjects.filter((p: any) => {
    if (!p.actual_end_date) return false;
    const endDate = new Date(p.actual_end_date);
    const thirtyDaysAgo = subDays(new Date(), 30);
    return endDate >= thirtyDaysAgo;
  });

  // Status distribution for pie chart
  const statusDistribution = [
    { name: 'نشط', value: activeProjects.length, color: '#22c55e' },
    { name: 'مكتمل', value: completedProjects.length, color: '#3b82f6' },
    { name: 'متوقف', value: onHoldProjects.length, color: '#f59e0b' },
    { name: 'متأخر', value: delayedProjects.length, color: '#ef4444' },
  ].filter(item => item.value > 0);

  // Phase distribution
  const phaseDistribution = Object.keys(projectPhases).map(phaseType => {
    const count = activeProjects.filter((p: any) => p.stage === phaseType).length;
    return { 
      phase: projectPhases[phaseType as keyof typeof projectPhases]?.label || phaseType, 
      count 
    };
  }).filter(item => item.count > 0);

  // Calculate average project duration
  const completedWithDates = completedProjects.filter((p: any) => p.actual_start_date && p.actual_end_date);
  const avgDuration = completedWithDates.length > 0
    ? Math.round(
        completedWithDates.reduce((sum: number, p: any) => {
          return sum + differenceInDays(new Date(p.actual_end_date), new Date(p.actual_start_date));
        }, 0) / completedWithDates.length
      )
    : 0;

  // On-time delivery rate
  const onTimeDelivery = completedProjects.filter((p: any) => {
    if (!p.expected_delivery_date || !p.actual_end_date) return false;
    return new Date(p.actual_end_date) <= new Date(p.expected_delivery_date);
  });
  const onTimeRate = completedProjects.length > 0
    ? Math.round((onTimeDelivery.length / completedProjects.length) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مشاريع جارية</p>
                <p className="text-3xl font-bold">{activeProjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مكتمل هذا الشهر</p>
                <p className="text-3xl font-bold">{thisMonthCompleted.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متوسط مدة التنفيذ</p>
                <p className="text-3xl font-bold">{avgDuration} <span className="text-lg font-normal">يوم</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">نسبة التسليم بالموعد</p>
                <p className="text-3xl font-bold">{onTimeRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">توزيع حالات المشاريع</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {statusDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className="text-sm">{item.name}</span>
                      <Badge variant="outline">{item.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        {/* Phase Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">المشاريع حسب المرحلة</CardTitle>
          </CardHeader>
          <CardContent>
            {phaseDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={phaseDistribution} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="phase" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">لا توجد مشاريع نشطة</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5" />
            أداء الموظفين في المراحل
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staffPerformance.length > 0 ? (
            <div className="space-y-4">
              {staffPerformance.slice(0, 5).map((staff: any, index: number) => (
                <div key={staff.id} className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    index === 0 && "bg-yellow-100 text-yellow-600",
                    index === 1 && "bg-gray-100 text-gray-600",
                    index === 2 && "bg-orange-100 text-orange-600",
                    index > 2 && "bg-blue-50 text-blue-600"
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{staff.name}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {staff.completedPhases} مراحل مكتملة
                        </span>
                        <span className="text-muted-foreground">
                          متوسط: {staff.avgHours} ساعة
                        </span>
                      </div>
                    </div>
                    <Progress value={Math.min((staff.completedPhases / 20) * 100, 100)} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">لا توجد بيانات أداء حتى الآن</p>
          )}
        </CardContent>
      </Card>

      {/* Delayed Projects Alert */}
      {delayedProjects.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 text-lg">
              <AlertTriangle className="h-5 w-5" />
              مشاريع متأخرة ({delayedProjects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {delayedProjects.map((project: any) => (
                <div key={project.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <span className="font-medium">{project.project_name}</span>
                    <p className="text-sm text-muted-foreground">{project.account?.name}</p>
                  </div>
                  <Badge variant="destructive">
                    متأخر {differenceInDays(new Date(), new Date(project.expected_delivery_date))} يوم
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
