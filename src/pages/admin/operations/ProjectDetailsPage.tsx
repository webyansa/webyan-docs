import { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowRight, Building2, Calendar, Users, MoreVertical,
  Edit, Pause, Play, CheckCircle2, FileText, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  projectStatuses, 
  priorities, 
  teamRoles,
  getProjectTypeLabel,
} from '@/lib/operations/projectConfig';
import { PhaseProgressCard } from '@/components/operations/PhaseProgressCard';
import { TeamAssignmentModal } from '@/components/operations/TeamAssignmentModal';
import { PhaseAssignmentModal } from '@/components/operations/PhaseAssignmentModal';
import { ServiceExecutionCard } from '@/components/operations/ServiceExecutionCard';
import { useAuth } from '@/hooks/useAuth';
import { fetchProjectDetailsById, isUuid } from '@/lib/operations/projectQueries';
import { getPhaseConfig } from '@/lib/operations/phaseUtils';

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const location = useLocation();
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [phaseAssignmentOpen, setPhaseAssignmentOpen] = useState(false);

  const {
    data: project,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => fetchProjectDetailsById(id!, { retries: 3, retryDelayMs: 250 }),
    enabled: isUuid(id),
    staleTime: 0,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(400 * 2 ** attemptIndex, 1200),
    initialData: () => {
      const stateProject = (location.state as any)?.project;
      if (stateProject) return stateProject;
      return id ? (queryClient.getQueryData(['project', id]) as any) : undefined;
    },
  });

  // Fetch project phases with assigned staff
  const { data: phases = [] } = useQuery({
    queryKey: ['project-phases', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_phases')
        .select(`
          *,
          assigned_staff:staff_members!project_phases_assigned_to_fkey(id, full_name)
        `)
        .eq('project_id', id)
        .order('phase_order');

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch current staff id
  const { data: currentStaff } = useQuery({
    queryKey: ['current-staff', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('staff_members')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update project status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('crm_implementations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('تم تحديث حالة المشروع');
    },
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + error.message);
    },
  });

  // Update priority mutation
  const updatePriorityMutation = useMutation({
    mutationFn: async (newPriority: string) => {
      const { error } = await supabase
        .from('crm_implementations')
        .update({ priority: newPriority })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('تم تحديث أولوية المشروع');
    },
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + error.message);
    },
  });

  if (!isUuid(id)) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">معرّف المشروع غير صحيح</p>
        <Link to="/admin/projects">
          <Button variant="outline">العودة للمشاريع</Button>
        </Link>
      </div>
    );
  }

  if (isLoading || (isFetching && !project)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">تعذر تحميل المشروع</p>
        <p className="text-xs text-muted-foreground mb-4" dir="ltr">
          {(error as any)?.message || ''}
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            إعادة المحاولة
          </Button>
          <Link to="/admin/projects">
            <Button variant="link">العودة للمشاريع</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">المشروع غير موجود</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            إعادة المحاولة
          </Button>
          <Link to="/admin/projects">
            <Button variant="link">العودة للمشاريع</Button>
          </Link>
        </div>
      </div>
    );
  }

  const safeFormatDate = (value: string | null | undefined, pattern: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return format(d, pattern, { locale: ar });
  };

  const currentPhaseConfig = getPhaseConfig(project.stage);
  const statusValue = (project.status || 'active') as string;
  const statusConfig =
    (projectStatuses as any)[statusValue] ?? projectStatuses.active;
  const priorityValue = (project.priority || 'medium') as string;
  const priorityConfig = (priorities as any)[priorityValue] ?? priorities.medium;

  const TeamMemberCard = ({ 
    role, 
    staff 
  }: { 
    role: keyof typeof teamRoles; 
    staff: any;
  }) => {
    const roleConfig = teamRoles[role];
    const RoleIcon = roleConfig.icon;

    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border">
        <Avatar className="h-10 w-10">
          <AvatarFallback className={cn(roleConfig.bgColor)}>
            {staff?.full_name?.charAt(0) || <RoleIcon className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{staff?.full_name || 'غير معيّن'}</p>
          <p className="text-xs text-muted-foreground">{roleConfig.label}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/projects">
            <Button variant="ghost" size="icon">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{project.project_name}</h1>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <Link 
                to={`/admin/clients/${project.account?.id}`}
                className="hover:underline"
              >
                {project.account?.name}
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={statusValue}
            onValueChange={(v) => updateStatusMutation.mutate(v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(projectStatuses).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  <span className={value.color}>{value.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTeamModalOpen(true)}>
                <Users className="h-4 w-4 ml-2" />
                تعيين الفريق
              </DropdownMenuItem>
              {project.quote?.id && (
                <DropdownMenuItem asChild>
                  <Link to={`/admin/crm/quotes/${project.quote.id}`}>
                    <FileText className="h-4 w-4 ml-2" />
                    عرض السعر
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {project.status === 'active' && (
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate('on_hold')}>
                  <Pause className="h-4 w-4 ml-2" />
                  إيقاف المشروع
                </DropdownMenuItem>
              )}
              {project.status === 'on_hold' && (
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate('active')}>
                  <Play className="h-4 w-4 ml-2" />
                  استئناف المشروع
                </DropdownMenuItem>
              )}
              {project.status === 'active' && (
                <DropdownMenuItem 
                  onClick={() => updateStatusMutation.mutate('completed')}
                  className="text-green-600"
                >
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                  إنهاء المشروع
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">الأولوية</span>
              <Select
                value={project.priority || 'medium'}
                onValueChange={(v) => updatePriorityMutation.mutate(v)}
              >
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorities).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <span className={value.color}>{value.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">المرحلة الحالية</span>
              {currentPhaseConfig ? (
                <Badge variant="outline" className={cn(currentPhaseConfig.color)}>
                  {currentPhaseConfig.label}
                </Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">تاريخ الاستلام</span>
                <span className="text-sm font-medium">
                  {project.received_date 
                    ? safeFormatDate(project.received_date, 'PP')
                    : '-'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">التسليم المتوقع</span>
                <span className="text-sm font-medium">
                  {project.expected_delivery_date 
                    ? safeFormatDate(project.expected_delivery_date, 'PP')
                    : '-'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {project.quote && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">عرض السعر</span>
                  <Link 
                    to={`/admin/crm/quotes/${project.quote.id}`}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {project.quote.quote_number}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">القيمة</span>
                  <span className="text-sm font-medium">
                    {project.quote.total_amount?.toLocaleString('ar-SA')} ر.س
                  </span>
                </div>
              </div>
            )}
            {!project.quote && (
              <p className="text-sm text-muted-foreground text-center py-2">
                لا يوجد عرض سعر مرتبط
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Phases Progress - hide for service_execution */}
        {project.project_type !== 'service_execution' ? (
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">مراحل المشروع</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPhaseAssignmentOpen(true)}
              >
                <Users className="h-4 w-4 ml-2" />
                توزيع المراحل
              </Button>
            </div>
            <PhaseProgressCard
              phases={phases as any}
              projectId={id!}
              staffId={currentStaff?.id}
              canEdit={project.status === 'active'}
            />
          </div>
        ) : (
          <div className="lg:col-span-2">
            <ServiceExecutionCard
              projectId={id!}
              projectName={project.project_name}
              serviceStatus={project.service_status || 'pending'}
              serviceStartedAt={project.service_started_at}
              serviceCompletedAt={project.service_completed_at}
              staffId={currentStaff?.id}
              staffName={undefined}
              canEdit={project.status === 'active' || project.service_status === 'pending'}
            />
          </div>
        )}

        {/* Team */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                فريق المشروع
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setTeamModalOpen(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TeamMemberCard role="project_manager" staff={project.project_manager} />
            <TeamMemberCard role="implementer" staff={project.implementer} />
            <TeamMemberCard role="csm" staff={project.csm} />
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {project.notes && (
        <Card>
          <CardHeader>
            <CardTitle>ملاحظات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{project.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Team Assignment Modal */}
      <TeamAssignmentModal
        open={teamModalOpen}
        onOpenChange={setTeamModalOpen}
        projectId={id!}
        projectName={project.project_name}
        currentTeam={{
          implementer_id: project.implementer_id,
          csm_id: project.csm_id,
          project_manager_id: project.project_manager_id,
        }}
        assignedById={currentStaff?.id}
      />

      {/* Phase Assignment Modal */}
      <PhaseAssignmentModal
        open={phaseAssignmentOpen}
        onOpenChange={setPhaseAssignmentOpen}
        projectId={id!}
        phases={phases}
        implementerId={project.implementer_id}
        csmId={project.csm_id}
        projectManagerId={project.project_manager_id}
      />
    </div>
  );
}
