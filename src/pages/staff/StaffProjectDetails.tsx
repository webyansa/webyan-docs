import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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

export default function StaffProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const { permissions } = useStaffAuth();
  const staffId = permissions.staffId;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('summary');
  const [completePhaseDialogOpen, setCompletePhaseDialogOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<any>(null);
  const [phaseNotes, setPhaseNotes] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Fetch project details
  const { data: project, isLoading } = useQuery({
    queryKey: ['staff-project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_implementations')
        .select(`
          *,
          account:client_organizations(id, name, contact_email, contact_phone),
          quote:crm_quotes(id, quote_number, title, total_amount),
          implementer:staff_members!crm_implementations_implementer_id_fkey(id, full_name, email),
          csm:staff_members!crm_implementations_csm_id_fkey(id, full_name, email),
          project_manager:staff_members!crm_implementations_project_manager_id_fkey(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch project phases
  const { data: phases = [] } = useQuery({
    queryKey: ['staff-project-phases', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_phases')
        .select('*')
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
      const phaseConfig = projectPhases[phase?.phase_type as ProjectPhaseType];

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">المشروع غير موجود</p>
        <Link to="/support/projects">
          <Button variant="outline">العودة للمشاريع</Button>
        </Link>
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
                      ? format(new Date(project.received_date), 'PPP', { locale: ar })
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
                      ? format(new Date(project.expected_delivery_date), 'PPP', { locale: ar })
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">مراحل التنفيذ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {phases.map((phase: any, index: number) => {
                  const phaseConfig = projectPhases[phase.phase_type as ProjectPhaseType];
                  const statusConf = phaseStatuses[phase.status as PhaseStatus];
                  const PhaseIcon = phaseConfig?.icon || CheckCircle2;
                  const canComplete = canCompletePhase(phase);
                  const canStart = canStartPhase(phase);

                  return (
                    <div key={phase.id} className="relative">
                      {/* Connection line */}
                      {index < phases.length - 1 && (
                        <div className={cn(
                          "absolute right-5 top-12 w-0.5 h-8",
                          phase.status === 'completed' ? "bg-green-500" : "bg-gray-200"
                        )} />
                      )}
                      
                      <div className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border transition-colors",
                        phase.status === 'completed' && "bg-green-50/50 border-green-200",
                        phase.status === 'in_progress' && "bg-blue-50/50 border-blue-200",
                        phase.status === 'pending' && "bg-gray-50/50"
                      )}>
                        <div className={cn(
                          "p-2 rounded-lg shrink-0",
                          phase.status === 'completed' ? "bg-green-100" : 
                          phase.status === 'in_progress' ? "bg-blue-100" : "bg-gray-100"
                        )}>
                          <PhaseIcon className={cn(
                            "h-5 w-5",
                            phase.status === 'completed' ? "text-green-600" :
                            phase.status === 'in_progress' ? "text-blue-600" : "text-gray-400"
                          )} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{phaseConfig?.label}</h4>
                            <Badge variant="outline" className={cn("text-xs", statusConf?.color)}>
                              {statusConf?.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {phaseConfig?.description}
                          </p>

                          {phase.completed_at && (
                            <div className="text-xs text-muted-foreground mb-2">
                              <span>أُنجز بواسطة: </span>
                              <span className="font-medium">{phase.completed_by_name || 'غير محدد'}</span>
                              <span className="mx-1">•</span>
                              <span>{format(new Date(phase.completed_at), 'PPp', { locale: ar })}</span>
                            </div>
                          )}

                          {phase.completion_notes && (
                            <div className="text-sm bg-white p-2 rounded border mt-2">
                              <span className="text-muted-foreground">ملاحظة: </span>
                              {phase.completion_notes}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          {canStart && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => startPhase.mutate(phase.id)}
                              disabled={startPhase.isPending}
                            >
                              {startPhase.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Play className="h-4 w-4 ml-1" />
                                  بدء
                                </>
                              )}
                            </Button>
                          )}
                          {canComplete && (
                            <Button 
                              size="sm"
                              onClick={() => {
                                setSelectedPhase(phase);
                                setCompletePhaseDialogOpen(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 ml-1" />
                              إتمام
                            </Button>
                          )}
                          {phase.status === 'completed' && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
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
                {project.site_url ? (
                  <>
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
                            {showPasswords.admin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => copyToClipboard(project.admin_password_encrypted, 'كلمة المرور')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>لم يتم إضافة بيانات الموقع بعد</p>
                  </div>
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
                {project.hosting_provider ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">مزود الاستضافة</Label>
                      <Input value={project.hosting_provider} readOnly />
                    </div>

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
                            onClick={() => copyToClipboard(project.server_username, 'اسم المستخدم')}
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
                            {showPasswords.server ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => copyToClipboard(project.server_password_encrypted, 'كلمة المرور')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>لم يتم إضافة بيانات الاستضافة بعد</p>
                  </div>
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
                          <span>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ar })}</span>
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
