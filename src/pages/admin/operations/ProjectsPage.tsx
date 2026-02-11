import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  FolderKanban, Search, Filter, Eye, Building2, AlertTriangle,
  Plus, Loader2, CalendarIcon, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectStatuses, priorities, projectTypes, getProjectTypeLabel } from '@/lib/operations/projectConfig';
import { format, isPast, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null);
  // New project form state
  const [projectForm, setProjectForm] = useState({
    project_name: '',
    project_type: 'custom_platform',
    account_id: '',
    budget: '',
    description: '',
    priority: 'medium',
    template_id: '',
    received_date: new Date(),
    expected_delivery_date: undefined as Date | undefined,
  });

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_implementations')
        .select(`
          *,
          account:client_organizations!crm_implementations_account_id_fkey(id, name),
          implementer:staff_members!crm_implementations_implementer_id_fkey(id, full_name),
          csm:staff_members!crm_implementations_csm_id_fkey(id, full_name),
          project_manager:staff_members!crm_implementations_project_manager_id_fkey(id, full_name),
          project_phases(id, phase_type, status)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch clients for new project
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-project'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_organizations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: newProjectOpen,
  });

  // Fetch templates for new project
  const { data: templates = [] } = useQuery({
    queryKey: ['project-templates-for-new', projectForm.project_type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .eq('is_active', true)
        .eq('project_type', projectForm.project_type)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: newProjectOpen && projectForm.project_type !== 'service_execution',
  });

  // Fetch current staff
  const { data: currentStaff } = useQuery({
    queryKey: ['current-staff', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('staff_members')
        .select('id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const isService = projectForm.project_type === 'service_execution';
      const selectedTemplate = templates.find((t: any) => t.id === projectForm.template_id);
      const templatePhases = selectedTemplate?.phases as any[] || [];

      const { data: project, error: projectError } = await supabase
        .from('crm_implementations')
        .insert({
          project_name: projectForm.project_name,
          project_type: projectForm.project_type,
          account_id: projectForm.account_id,
          budget: projectForm.budget ? parseFloat(projectForm.budget) : null,
          description: projectForm.description || null,
          priority: projectForm.priority,
          template_id: isService ? null : (projectForm.template_id || null),
          status: 'active',
          received_date: format(projectForm.received_date, 'yyyy-MM-dd'),
          expected_delivery_date: projectForm.expected_delivery_date
            ? format(projectForm.expected_delivery_date, 'yyyy-MM-dd')
            : null,
          stage: isService ? null : (templatePhases[0]?.phase_type || null),
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create phases from template
      if (!isService && templatePhases.length > 0) {
        const phasesToInsert = templatePhases.map((phase: any) => ({
          project_id: project.id,
          phase_type: phase.phase_type,
          phase_order: phase.order,
          status: 'pending',
          instructions: phase.instructions || null,
        }));

        await supabase.from('project_phases').insert(phasesToInsert);
      }

      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      toast.success('تم إنشاء المشروع بنجاح');
      setNewProjectOpen(false);
      resetForm();
      navigate(`/admin/projects/${project.id}`);
    },
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + error.message);
    },
  });

  const resetForm = () => {
    setProjectForm({
      project_name: '',
      project_type: 'custom_platform',
      account_id: '',
      budget: '',
      description: '',
      priority: 'medium',
      template_id: '',
      received_date: new Date(),
      expected_delivery_date: undefined,
    });
  };

  // Validate if project can be deleted
  const canDeleteProject = (project: any): { allowed: boolean; reason?: string } => {
    const phases = project.project_phases || [];
    const hasStartedPhases = phases.some((p: any) => p.status === 'in_progress' || p.status === 'completed');
    const allCompleted = phases.length > 0 && phases.every((p: any) => p.status === 'completed');
    const isCompleted = project.status === 'completed';
    const isActive = project.status === 'active';

    // Allow: completed project with all phases done
    if (isCompleted && (allCompleted || phases.length === 0)) return { allowed: true };
    // Allow: active project with NO started/completed phases
    if (isActive && !hasStartedPhases) return { allowed: true };
    // Block: in-progress or has started phases
    return { allowed: false, reason: 'لا يمكن حذف مشروع قيد التنفيذ. يمكن حذف المشاريع المكتملة أو النشطة التي لم يبدأ تنفيذ أي مرحلة فيها.' };
  };

  // Delete projects mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Cascading delete: remove all related records first
      await supabase.from('project_sprints').delete().in('project_id', ids);
      await supabase.from('project_service_notes').delete().in('project_id', ids);
      await supabase.from('project_activity_log').delete().in('project_id', ids);
      await supabase.from('project_team_members').delete().in('project_id', ids);
      await supabase.from('project_phases').delete().in('project_id', ids);
      for (const id of ids) {
        await supabase.from('client_recurring_charges').delete().eq('project_id', id);
      }
      await supabase.from('staff_project_history').delete().in('project_id', ids);
      // Unlink quotes (set project_id to null instead of deleting)
      await supabase.from('crm_quotes').update({ project_id: null }).in('project_id', ids);

      // Finally delete the project itself
      const { error } = await supabase.from('crm_implementations').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      toast.success('تم حذف المشاريع بنجاح');
      setSelectedIds(new Set());
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      toast.error('حدث خطأ أثناء الحذف: ' + error.message);
    },
  });

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      // Validate all targets before deleting
      const targetProjects = projects.filter((p: any) => deleteTarget.includes(p.id));
      const blocked = targetProjects.find((p: any) => !canDeleteProject(p).allowed);
      if (blocked) {
        toast.error(canDeleteProject(blocked).reason!);
        setDeleteConfirmOpen(false);
        return;
      }
      deleteMutation.mutate(deleteTarget);
    }
    setDeleteConfirmOpen(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map((p: any) => p.id)));
    }
  };

  // Auto-select default template when type changes
  const handleTypeChange = (type: string) => {
    setProjectForm(f => ({ ...f, project_type: type, template_id: '' }));
  };

  // Filter projects
  const filteredProjects = projects.filter((project: any) => {
    const matchesSearch = 
      project.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.account?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getProjectProgress = (project: any) => {
    if (project.project_type === 'service_execution') {
      return project.service_status === 'completed' ? 100 : project.service_status === 'in_progress' ? 50 : 0;
    }
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
    return differenceInDays(new Date(project.expected_delivery_date), new Date());
  };

  const canSubmitNewProject = projectForm.project_name && projectForm.account_id;

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
          <h1 className="text-2xl font-bold">المشاريع</h1>
          <p className="text-muted-foreground">إدارة ومتابعة جميع المشاريع</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setNewProjectOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            مشروع جديد
          </Button>
          <Link to="/admin/operations">
            <Button variant="outline">
              <FolderKanban className="h-4 w-4 ml-2" />
              لوحة العمليات
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المشاريع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 ml-2" />
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {Object.entries(projectStatuses).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأولويات</SelectItem>
                {Object.entries(priorities).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium">تم تحديد {selectedIds.size} مشروع</span>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setDeleteTarget(Array.from(selectedIds)); setDeleteConfirmOpen(true); }}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                حذف المحددة
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                إلغاء التحديد
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={filteredProjects.length > 0 && selectedIds.size === filteredProjects.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>المشروع</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>تاريخ الاستلام</TableHead>
                <TableHead>تاريخ التسليم</TableHead>
                <TableHead>التقدم</TableHead>
                <TableHead>الفريق</TableHead>
                <TableHead>الأولوية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-[100px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project: any) => {
                const statusConfig = projectStatuses[project.status as keyof typeof projectStatuses];
                const priorityConfig = priorities[project.priority as keyof typeof priorities];
                const progress = getProjectProgress(project);
                const overdue = isOverdue(project);
                const daysInfo = getDaysInfo(project);

                return (
                  <TableRow key={project.id} className={overdue ? 'bg-destructive/5' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(project.id)}
                        onCheckedChange={() => toggleSelect(project.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          {overdue && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                          <p className="font-medium">{project.project_name}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span>{project.account?.name || '-'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getProjectTypeLabel(project.project_type || '')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {project.received_date ? (
                        <span className="text-sm">
                          {format(new Date(project.received_date), 'dd/MM/yyyy', { locale: ar })}
                        </span>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {project.expected_delivery_date ? (
                        <div className="flex flex-col">
                          <span className={cn("text-sm", overdue && "text-destructive font-medium")}>
                            {format(new Date(project.expected_delivery_date), 'dd/MM/yyyy', { locale: ar })}
                          </span>
                          {daysInfo !== null && project.status !== 'completed' && (
                            <span className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                              {overdue ? `متأخر ${Math.abs(daysInfo)} يوم` : daysInfo === 0 ? 'اليوم' : `باقي ${daysInfo} يوم`}
                            </span>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="w-20">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2 space-x-reverse">
                        {project.implementer && (
                          <Avatar className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="text-xs bg-blue-100">
                              {project.implementer.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {project.csm && (
                          <Avatar className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="text-xs bg-green-100">
                              {project.csm.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {project.project_manager && (
                          <Avatar className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="text-xs bg-purple-100">
                              {project.project_manager.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!project.implementer && !project.csm && !project.project_manager && (
                          <span className="text-muted-foreground text-sm">غير معيّن</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {priorityConfig ? (
                        <Badge variant="outline" className={cn(priorityConfig.color)}>{priorityConfig.label}</Badge>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(statusConfig?.color)}>{statusConfig?.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link to={`/admin/projects/${project.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            const check = canDeleteProject(project);
                            if (!check.allowed) {
                              toast.error(check.reason!);
                              return;
                            }
                            setDeleteTarget([project.id]);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-muted-foreground">لا توجد مشاريع</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Project Dialog */}
      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              إنشاء مشروع جديد
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Project Name */}
            <div className="space-y-2">
              <Label>اسم المشروع *</Label>
              <Input
                value={projectForm.project_name}
                onChange={(e) => setProjectForm(f => ({ ...f, project_name: e.target.value }))}
                placeholder="مثال: مشروع - اسم العميل"
              />
            </div>

            {/* Client Selection */}
            <div className="space-y-2">
              <Label>العميل *</Label>
              <Select value={projectForm.account_id} onValueChange={(v) => setProjectForm(f => ({ ...f, account_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Type */}
            <div className="space-y-2">
              <Label>نوع المشروع *</Label>
              <Select value={projectForm.project_type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <span className="font-medium">{t.label}</span>
                        <span className="text-xs text-muted-foreground mr-2">- {t.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template selection for non-service projects */}
            {projectForm.project_type !== 'service_execution' && templates.length > 0 && (
              <div className="space-y-2">
                <Label>قالب المشروع</Label>
                <Select
                  value={projectForm.template_id}
                  onValueChange={(v) => setProjectForm(f => ({ ...f, template_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر قالب (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.is_default && '(افتراضي)'} • {(t.phases as any[])?.length || 0} مراحل
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Budget & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ميزانية المشروع (ر.س)</Label>
                <Input
                  type="number"
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm(f => ({ ...f, budget: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>الأولوية</Label>
                <Select value={projectForm.priority} onValueChange={(v) => setProjectForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorities).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ الاستلام</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-right font-normal">
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {format(projectForm.received_date, 'PPP', { locale: ar })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={projectForm.received_date}
                      onSelect={(date) => date && setProjectForm(f => ({ ...f, received_date: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>تاريخ التسليم المتوقع</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-right font-normal", !projectForm.expected_delivery_date && "text-muted-foreground")}>
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {projectForm.expected_delivery_date
                        ? format(projectForm.expected_delivery_date, 'PPP', { locale: ar })
                        : 'اختر التاريخ'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={projectForm.expected_delivery_date}
                      onSelect={(date) => date && setProjectForm(f => ({ ...f, expected_delivery_date: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>وصف المشروع</Label>
              <Textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm(f => ({ ...f, description: e.target.value }))}
                placeholder="وصف مختصر للمشروع..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewProjectOpen(false); resetForm(); }}>
              إلغاء
            </Button>
            <Button
              onClick={() => createProjectMutation.mutate()}
              disabled={!canSubmitNewProject || createProjectMutation.isPending}
            >
              {createProjectMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              إنشاء المشروع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف {deleteTarget?.length === 1 ? 'هذا المشروع' : `${deleteTarget?.length} مشاريع`}؟ سيتم حذف جميع المراحل المرتبطة. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
