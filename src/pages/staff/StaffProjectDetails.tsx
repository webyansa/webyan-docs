import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  ArrowRight, Building2, Calendar, Users, User, CheckCircle2,
  Clock, AlertTriangle, Pause, Play, FileText, ExternalLink,
  Eye, EyeOff, Copy, Server, Globe, Key, Loader2, MessageSquare,
  ChevronRight, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  projectStatuses, priorities, projectPhases, phaseStatuses,
  teamRoles, type ProjectPhaseType, type PhaseStatus
} from '@/lib/operations/projectConfig';
import { fetchProjectDetailsById, isUuid } from '@/lib/operations/projectQueries';
import { getPhaseConfig } from '@/lib/operations/phaseUtils';
import { StaffPhaseCard } from '@/components/operations/StaffPhaseCard';

export default function StaffProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { permissions } = useStaffAuth();
  const staffId = permissions.staffId;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('summary');
  const [completePhaseDialogOpen, setCompletePhaseDialogOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<any>(null);
  const [phaseNotes, setPhaseNotes] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const safeFormatDate = (value: string | null | undefined, pattern: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return format(d, pattern, { locale: ar });
  };

  const safeTimeAgo = (value: string | null | undefined) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return formatDistanceToNow(d, { addSuffix: true, locale: ar });
  };

  const {
    data: project,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['staff-project', id],
    queryFn: async () => fetchProjectDetailsById(id!, { retries: 3, retryDelayMs: 250 }),
    enabled: isUuid(id),
    staleTime: 0,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(400 * 2 ** attemptIndex, 1200),
    initialData: () => {
      const stateProject = (location.state as any)?.project;
      if (stateProject) return stateProject;
      return id ? (queryClient.getQueryData(['staff-project', id]) as any) : undefined;
    },
  });

  const canEditDelivery = !!project && !!staffId && project.implementer_id === staffId;
  const [deliveryEditMode, setDeliveryEditMode] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    site_url: '',
    admin_url: '',
    admin_username: '',
    admin_password: '',
    server_url: '',
    server_username: '',
    server_password: '',
  });

  useEffect(() => {
    if (!project) return;
    // Avoid overwriting user input while editing.
    if (deliveryEditMode) return;
    setDeliveryForm({
      site_url: project.site_url || '',
      admin_url: project.admin_url || '',
      admin_username: project.admin_username || '',
      admin_password: project.admin_password_encrypted || '',
      server_url: project.server_url || '',
      server_username: project.server_username || '',
      server_password: project.server_password_encrypted || '',
    });
  }, [project?.id, deliveryEditMode]);

  // Fetch project phases with assigned staff info
  const { data: phases = [] } = useQuery({
    queryKey: ['staff-project-phases', id],
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

  // Fetch activity log
  const { data: activities = [] } = useQuery({
    queryKey: ['staff-project-activities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_activity_log')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Get current staff name
  const { data: currentStaff } = useQuery({
    queryKey: ['current-staff-name', staffId],
    queryFn: async () => {
      if (!staffId) return null;
      const { data } = await supabase
        .from('staff_members')
        .select('full_name')
        .eq('id', staffId)
        .single();
      return data;
    },
    enabled: !!staffId,
  });

  // Complete phase mutation
  const completePhase = useMutation({
    mutationFn: async ({ phaseId, notes }: { phaseId: string; notes: string }) => {
      if (!notes.trim()) {
        throw new Error('يجب إدخال ملاحظة عند إتمام المرحلة');
      }

      const phase = phases.find((p: any) => p.id === phaseId);
      const phaseConfig = getPhaseConfig(phase?.phase_type);

      // Update phase status
      const { error: phaseError } = await supabase
        .from('project_phases')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: staffId,
          completed_by_name: currentStaff?.full_name,
          completion_notes: notes,
        })
        .eq('id', phaseId);

      if (phaseError) throw phaseError;

      // Find next phase and set it to in_progress
      const currentPhaseIndex = phases.findIndex((p: any) => p.id === phaseId);
      const nextPhase = phases[currentPhaseIndex + 1];
      
      if (nextPhase) {
        await supabase
          .from('project_phases')
          .update({ status: 'in_progress', started_at: new Date().toISOString() })
          .eq('id', nextPhase.id);

        // Update project stage
        await supabase
          .from('crm_implementations')
          .update({ 
            stage: nextPhase.phase_type,
            stage_changed_at: new Date().toISOString()
          })
          .eq('id', id);
      }

      // Calculate new progress
      const completedCount = phases.filter((p: any) => p.status === 'completed').length + 1;
      const progress = Math.round((completedCount / phases.length) * 100);
      
      await supabase
        .from('crm_implementations')
        .update({ progress_percentage: progress })
        .eq('id', id);

      // Log activity
      await supabase.from('project_activity_log').insert({
        project_id: id,
        activity_type: 'phase_completed',
        title: `إتمام مرحلة: ${phaseConfig?.label}`,
        description: notes,
        performed_by: staffId,
        performed_by_name: currentStaff?.full_name,
        metadata: {
          phase_id: phaseId,
          phase_type: phase?.phase_type,
          next_phase: nextPhase?.phase_type,
        },
      });

      // Send notification to admin
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminUsers && adminUsers.length > 0) {
        const notifications = adminUsers.map((admin) => ({
          user_id: admin.user_id,
          title: `تم إتمام مرحلة في مشروع`,
          message: `${currentStaff?.full_name} أنهى مرحلة "${phaseConfig?.label}" في مشروع "${project?.project_name}"`,
          type: 'phase_completed',
        }));

        await supabase.from('user_notifications').insert(notifications);
      }

      return { progress, nextPhase };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-project', id] });
      queryClient.invalidateQueries({ queryKey: ['staff-project-phases', id] });
      queryClient.invalidateQueries({ queryKey: ['staff-project-activities', id] });
      queryClient.invalidateQueries({ queryKey: ['staff-projects'] });
      toast.success('تم إتمام المرحلة بنجاح');
      setCompletePhaseDialogOpen(false);
      setPhaseNotes('');
      setSelectedPhase(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ أثناء إتمام المرحلة');
    },
  });

  const saveDelivery = useMutation({
    mutationFn: async () => {
      if (!canEditDelivery) throw new Error('غير مصرح لك بتعديل بيانات التسليم');

      const payload = {
        site_url: deliveryForm.site_url.trim() || null,
        admin_url: deliveryForm.admin_url.trim() || null,
        admin_username: deliveryForm.admin_username.trim() || null,
        admin_password_encrypted: deliveryForm.admin_password || null,
        server_url: deliveryForm.server_url.trim() || null,
        server_username: deliveryForm.server_username.trim() || null,
        server_password_encrypted: deliveryForm.server_password || null,
        delivery_completed_by: staffId,
        delivery_completed_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('crm_implementations')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-project', id] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('تم حفظ بيانات التسليم');
      setDeliveryEditMode(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر حفظ بيانات التسليم');
    },
  });

  // Start phase mutation
  const startPhase = useMutation({
    mutationFn: async (phaseId: string) => {
      const phase = phases.find((p: any) => p.id === phaseId);
      const phaseConfig = projectPhases[phase?.phase_type as ProjectPhaseType];

      await supabase
        .from('project_phases')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', phaseId);

      await supabase
        .from('crm_implementations')
        .update({ stage: phase?.phase_type, stage_changed_at: new Date().toISOString() })
        .eq('id', id);

      await supabase.from('project_activity_log').insert({
        project_id: id,
        activity_type: 'phase_started',
        title: `بدء مرحلة: ${phaseConfig?.label}`,
        performed_by: staffId,
        performed_by_name: currentStaff?.full_name,
        metadata: { phase_id: phaseId, phase_type: phase?.phase_type },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-project', id] });
      queryClient.invalidateQueries({ queryKey: ['staff-project-phases', id] });
      queryClient.invalidateQueries({ queryKey: ['staff-project-activities', id] });
      toast.success('تم بدء المرحلة');
    },
  });

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label}`);
  };

  const getProgress = () => {
    const completed = phases.filter((p: any) => p.status === 'completed').length;
    return phases.length > 0 ? Math.round((completed / phases.length) * 100) : 0;
  };

  const canCompletePhase = (phase: any) => {
    const phaseIndex = phases.findIndex((p: any) => p.id === phase.id);
    if (phaseIndex === 0) return phase.status === 'in_progress';
    const prevPhase = phases[phaseIndex - 1];
    return prevPhase?.status === 'completed' && phase.status === 'in_progress';
  };

  const canStartPhase = (phase: any) => {
    const phaseIndex = phases.findIndex((p: any) => p.id === phase.id);
    if (phaseIndex === 0) return phase.status === 'pending';
    const prevPhase = phases[phaseIndex - 1];
    return prevPhase?.status === 'completed' && phase.status === 'pending';
  };

  if (!isUuid(id)) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">معرّف المشروع غير صحيح</p>
        <Link to="/support/projects">
          <Button variant="outline">العودة للمشاريع</Button>
        </Link>
      </div>
    );
  }

  if (isLoading || (isFetching && !project)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <Link to="/support/projects">
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
          <Link to="/support/projects">
            <Button variant="link">العودة للمشاريع</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = projectStatuses[project.status as keyof typeof projectStatuses];
  const priorityConfig = priorities[project.priority as keyof typeof priorities];
  const progress = getProgress();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link to="/support/projects">
            <Button variant="ghost" size="icon">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{project.project_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{project.account?.name}</span>
              <Badge variant="outline" className={cn(statusConfig?.color)}>
                {statusConfig?.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">تقدم المشروع</span>
                <span className="font-bold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
            <div className="text-center px-4 border-r">
              <p className="text-2xl font-bold">
                {phases.filter((p: any) => p.status === 'completed').length}/{phases.length}
              </p>
              <p className="text-xs text-muted-foreground">مراحل مكتملة</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">ملخص</TabsTrigger>
          <TabsTrigger value="phases">المراحل</TabsTrigger>
          <TabsTrigger value="delivery">التسليم</TabsTrigger>
          <TabsTrigger value="activity">النشاط</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">معلومات المشروع</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">العميل</span>
                  <span className="font-medium">{project.account?.name}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">البريد الإلكتروني</span>
                  <span className="font-medium">{project.account?.contact_email || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الهاتف</span>
                  <span className="font-medium font-mono">{project.account?.contact_phone || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الأولوية</span>
                  {priorityConfig && (
                    <Badge variant="outline" className={cn(priorityConfig.color)}>
                      {priorityConfig.label}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">التواريخ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    تاريخ الاستلام
                  </span>
                  <span className="font-medium">
                    {project.received_date 
                      ? safeFormatDate(project.received_date, 'PPP')
                      : '-'
                    }
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    التسليم المتوقع
                  </span>
                  <span className="font-medium">
                    {project.expected_delivery_date 
                      ? safeFormatDate(project.expected_delivery_date, 'PPP')
                      : '-'
                    }
                  </span>
                </div>
                {project.quote && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">عرض السعر</span>
                      <span className="font-medium">{project.quote.quote_number}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5" />
                فريق العمل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Implementer */}
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100">
                      {project.implementer?.full_name?.charAt(0) || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{project.implementer?.full_name || 'غير معيّن'}</p>
                    <p className="text-xs text-muted-foreground">موظف التنفيذ</p>
                  </div>
                </div>

                {/* CSM */}
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-green-100">
                      {project.csm?.full_name?.charAt(0) || <Users className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{project.csm?.full_name || 'غير معيّن'}</p>
                    <p className="text-xs text-muted-foreground">مدير نجاح العميل</p>
                  </div>
                </div>

                {/* Project Manager */}
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-purple-100">
                      {project.project_manager?.full_name?.charAt(0) || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{project.project_manager?.full_name || 'غير معيّن'}</p>
                    <p className="text-xs text-muted-foreground">مدير المشروع</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phases Tab */}
        <TabsContent value="phases" className="space-y-4">
          <StaffPhaseCard
            phases={phases}
            projectId={id!}
            currentStaffId={staffId || ''}
            currentStaffName={currentStaff?.full_name}
          />
        </TabsContent>

        {/* Delivery Tab */}
        <TabsContent value="delivery" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Site Credentials */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  بيانات الموقع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {deliveryEditMode && canEditDelivery ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>رابط الموقع</Label>
                      <Input
                        value={deliveryForm.site_url}
                        onChange={(e) => setDeliveryForm((p) => ({ ...p, site_url: e.target.value }))}
                        placeholder="https://example.com"
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>رابط لوحة التحكم</Label>
                      <Input
                        value={deliveryForm.admin_url}
                        onChange={(e) => setDeliveryForm((p) => ({ ...p, admin_url: e.target.value }))}
                        placeholder="https://example.com/wp-admin"
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>اسم المستخدم</Label>
                      <Input
                        value={deliveryForm.admin_username}
                        onChange={(e) =>
                          setDeliveryForm((p) => ({ ...p, admin_username: e.target.value }))
                        }
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>كلمة المرور</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type={showPasswords.admin ? 'text' : 'password'}
                          value={deliveryForm.admin_password}
                          onChange={(e) =>
                            setDeliveryForm((p) => ({ ...p, admin_password: e.target.value }))
                          }
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => togglePasswordVisibility('admin')}
                        >
                          {showPasswords.admin ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDeliveryEditMode(false);
                          setDeliveryForm({
                            site_url: project.site_url || '',
                            admin_url: project.admin_url || '',
                            admin_username: project.admin_username || '',
                            admin_password: project.admin_password_encrypted || '',
                            server_url: project.server_url || '',
                            server_username: project.server_username || '',
                            server_password: project.server_password_encrypted || '',
                          });
                        }}
                        disabled={saveDelivery.isPending}
                      >
                        إلغاء
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            await saveDelivery.mutateAsync();
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        disabled={saveDelivery.isPending}
                      >
                        {saveDelivery.isPending && (
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        )}
                        حفظ
                      </Button>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const hasAny =
                      !!project.site_url ||
                      !!project.admin_url ||
                      !!project.admin_username ||
                      !!project.admin_password_encrypted;

                    if (!hasAny) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="mb-3">لم يتم إضافة بيانات الموقع بعد</p>
                          {canEditDelivery && (
                            <Button size="sm" onClick={() => setDeliveryEditMode(true)}>
                              إضافة بيانات التسليم
                            </Button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <>
                        {canEditDelivery && (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeliveryEditMode(true)}
                            >
                              تعديل
                            </Button>
                          </div>
                        )}

                        {project.site_url && (
                          <div className="space-y-2">
                            <Label className="text-muted-foreground">رابط الموقع</Label>
                            <div className="flex items-center gap-2">
                              <Input value={project.site_url} readOnly className="font-mono text-sm" />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(project.site_url, 'رابط الموقع')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(project.site_url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {project.admin_url && (
                          <div className="space-y-2">
                            <Label className="text-muted-foreground">لوحة التحكم</Label>
                            <div className="flex items-center gap-2">
                              <Input value={project.admin_url} readOnly className="font-mono text-sm" />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(project.admin_url, 'لوحة التحكم')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {project.admin_username && (
                          <div className="space-y-2">
                            <Label className="text-muted-foreground">اسم المستخدم</Label>
                            <div className="flex items-center gap-2">
                              <Input value={project.admin_username} readOnly className="font-mono" />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(project.admin_username, 'اسم المستخدم')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {project.admin_password_encrypted && (
                          <div className="space-y-2">
                            <Label className="text-muted-foreground">كلمة المرور</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type={showPasswords.admin ? 'text' : 'password'}
                                value={project.admin_password_encrypted}
                                readOnly
                                className="font-mono"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => togglePasswordVisibility('admin')}
                              >
                                {showPasswords.admin ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  copyToClipboard(project.admin_password_encrypted, 'كلمة المرور')
                                }
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </CardContent>
            </Card>

            {/* Hosting Credentials */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  بيانات الاستضافة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {deliveryEditMode && canEditDelivery ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>رابط الاستضافة / لوحة السيرفر</Label>
                      <Input
                        value={deliveryForm.server_url}
                        onChange={(e) => setDeliveryForm((p) => ({ ...p, server_url: e.target.value }))}
                        placeholder="https://hosting.example.com"
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>اسم المستخدم</Label>
                      <Input
                        value={deliveryForm.server_username}
                        onChange={(e) =>
                          setDeliveryForm((p) => ({ ...p, server_username: e.target.value }))
                        }
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>كلمة المرور</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type={showPasswords.server ? 'text' : 'password'}
                          value={deliveryForm.server_password}
                          onChange={(e) =>
                            setDeliveryForm((p) => ({ ...p, server_password: e.target.value }))
                          }
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => togglePasswordVisibility('server')}
                        >
                          {showPasswords.server ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDeliveryEditMode(false);
                          setDeliveryForm({
                            site_url: project.site_url || '',
                            admin_url: project.admin_url || '',
                            admin_username: project.admin_username || '',
                            admin_password: project.admin_password_encrypted || '',
                            server_url: project.server_url || '',
                            server_username: project.server_username || '',
                            server_password: project.server_password_encrypted || '',
                          });
                        }}
                        disabled={saveDelivery.isPending}
                      >
                        إلغاء
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            await saveDelivery.mutateAsync();
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        disabled={saveDelivery.isPending}
                      >
                        {saveDelivery.isPending && (
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        )}
                        حفظ
                      </Button>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const hasAny =
                      !!project.server_url ||
                      !!project.server_username ||
                      !!project.server_password_encrypted ||
                      !!project.server_ip ||
                      !!project.hosting_provider;

                    if (!hasAny) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="mb-3">لم يتم إضافة بيانات الاستضافة بعد</p>
                          {canEditDelivery && (
                            <Button size="sm" onClick={() => setDeliveryEditMode(true)}>
                              إضافة بيانات الاستضافة
                            </Button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <>
                        {canEditDelivery && (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeliveryEditMode(true)}
                            >
                              تعديل
                            </Button>
                          </div>
                        )}

                        {project.server_url && (
                          <div className="space-y-2">
                            <Label className="text-muted-foreground">رابط الاستضافة</Label>
                            <div className="flex items-center gap-2">
                              <Input value={project.server_url} readOnly className="font-mono text-sm" />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(project.server_url, 'رابط الاستضافة')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {project.server_ip && (
                          <div className="space-y-2">
                            <Label className="text-muted-foreground">IP / Host</Label>
                            <div className="flex items-center gap-2">
                              <Input value={project.server_ip} readOnly className="font-mono" />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(project.server_ip, 'IP')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {project.server_username && (
                          <div className="space-y-2">
                            <Label className="text-muted-foreground">اسم المستخدم</Label>
                            <div className="flex items-center gap-2">
                              <Input value={project.server_username} readOnly className="font-mono" />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  copyToClipboard(project.server_username, 'اسم المستخدم')
                                }
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {project.server_password_encrypted && (
                          <div className="space-y-2">
                            <Label className="text-muted-foreground">كلمة المرور</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type={showPasswords.server ? 'text' : 'password'}
                                value={project.server_password_encrypted}
                                readOnly
                                className="font-mono"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => togglePasswordVisibility('server')}
                              >
                                {showPasswords.server ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  copyToClipboard(project.server_password_encrypted, 'كلمة المرور')
                                }
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </div>

          {/* Delivery Notes */}
          {(project.delivery_notes || project.hosting_notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ملاحظات التسليم</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.delivery_notes && (
                  <div>
                    <Label className="text-muted-foreground">ملاحظات الموقع</Label>
                    <p className="mt-1 p-3 bg-muted rounded-lg">{project.delivery_notes}</p>
                  </div>
                )}
                {project.hosting_notes && (
                  <div>
                    <Label className="text-muted-foreground">ملاحظات الاستضافة</Label>
                    <p className="mt-1 p-3 bg-muted rounded-lg">{project.hosting_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                سجل النشاط
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>لا توجد أنشطة مسجلة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity: any) => (
                    <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className={cn(
                        "p-2 rounded-lg shrink-0 h-fit",
                        activity.activity_type === 'phase_completed' ? "bg-green-100" :
                        activity.activity_type === 'phase_started' ? "bg-blue-100" :
                        activity.activity_type === 'note_added' ? "bg-amber-100" : "bg-gray-100"
                      )}>
                        {activity.activity_type === 'phase_completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : activity.activity_type === 'phase_started' ? (
                          <Play className="h-4 w-4 text-blue-600" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{activity.performed_by_name || 'النظام'}</span>
                          <span>•</span>
                          <span>{safeTimeAgo(activity.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Complete Phase Dialog */}
      <Dialog open={completePhaseDialogOpen} onOpenChange={setCompletePhaseDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إتمام المرحلة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPhase && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">
                  {projectPhases[selectedPhase.phase_type as ProjectPhaseType]?.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {projectPhases[selectedPhase.phase_type as ProjectPhaseType]?.description}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>ملاحظة الإتمام (إجباري) *</Label>
              <Textarea
                value={phaseNotes}
                onChange={(e) => setPhaseNotes(e.target.value)}
                placeholder="اكتب ملاحظة توضح ما تم إنجازه في هذه المرحلة..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                هذه الملاحظة ستظهر في سجل النشاط وسيتم إرسال إشعار للإدارة
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletePhaseDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => selectedPhase && completePhase.mutate({ phaseId: selectedPhase.id, notes: phaseNotes })}
              disabled={!phaseNotes.trim() || completePhase.isPending}
            >
              {completePhase.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              تأكيد الإتمام
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
