import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Plus, Edit, Trash2, Loader2, GripVertical, Layers, LayoutTemplate,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const stageCategories = [
  { value: 'general', label: 'عام' },
  { value: 'subscription', label: 'اشتراك' },
  { value: 'custom_platform', label: 'منصة مخصصة' },
  { value: 'service', label: 'خدمة' },
];

// ===================== Stages Library =====================
function StagesLibrary() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [form, setForm] = useState({
    name: '', name_en: '', description: '', default_order: 0,
    estimated_days: '', stage_category: 'custom_platform', icon_name: '', color: '',
  });

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['stage-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stage_definitions')
        .select('*')
        .eq('is_active', true)
        .order('stage_category')
        .order('default_order');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        name_en: form.name_en || null,
        description: form.description || null,
        default_order: form.default_order,
        estimated_days: form.estimated_days ? parseInt(form.estimated_days) : null,
        stage_category: form.stage_category,
        icon_name: form.icon_name || null,
        color: form.color || null,
      };

      if (editingStage) {
        const { error } = await supabase
          .from('stage_definitions')
          .update(payload)
          .eq('id', editingStage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stage_definitions')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-definitions'] });
      toast.success(editingStage ? 'تم تحديث المرحلة' : 'تم إنشاء المرحلة');
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stage_definitions')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-definitions'] });
      toast.success('تم حذف المرحلة');
    },
  });

  const openCreate = () => {
    setEditingStage(null);
    setForm({ name: '', name_en: '', description: '', default_order: 0, estimated_days: '', stage_category: 'custom_platform', icon_name: '', color: '' });
    setDialogOpen(true);
  };

  const openEdit = (stage: any) => {
    setEditingStage(stage);
    setForm({
      name: stage.name, name_en: stage.name_en || '', description: stage.description || '',
      default_order: stage.default_order, estimated_days: stage.estimated_days?.toString() || '',
      stage_category: stage.stage_category, icon_name: stage.icon_name || '', color: stage.color || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingStage(null);
  };

  const filtered = categoryFilter === 'all' ? stages : stages.filter((s: any) => s.stage_category === categoryFilter);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="التصنيف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {stageCategories.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 ml-2" />
          مرحلة جديدة
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الترتيب</TableHead>
                <TableHead>اسم المرحلة</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>المدة التقديرية</TableHead>
                <TableHead className="w-[100px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    لا توجد مراحل
                  </TableCell>
                </TableRow>
              ) : filtered.map((stage: any) => (
                <TableRow key={stage.id}>
                  <TableCell>{stage.default_order}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{stage.name}</p>
                      {stage.name_en && <p className="text-xs text-muted-foreground">{stage.name_en}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-muted-foreground text-sm">
                    {stage.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {stageCategories.find(c => c.value === stage.stage_category)?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{stage.estimated_days ? `${stage.estimated_days} يوم` : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(stage)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(stage.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingStage ? 'تعديل المرحلة' : 'إنشاء مرحلة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم المرحلة *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>الاسم بالإنجليزية</Label>
              <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الترتيب الافتراضي</Label>
                <Input type="number" value={form.default_order} onChange={e => setForm(f => ({ ...f, default_order: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>المدة التقديرية (أيام)</Label>
                <Input type="number" value={form.estimated_days} onChange={e => setForm(f => ({ ...f, estimated_days: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <Select value={form.stage_category} onValueChange={v => setForm(f => ({ ...f, stage_category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stageCategories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {editingStage ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===================== Templates Management =====================
function TemplatesManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', project_type: 'custom_platform', is_default: false });
  const [selectedStages, setSelectedStages] = useState<{ stage_definition_id: string; stage_order: number; estimated_days: string }[]>([]);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['project-templates-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*, template_stages(*, stage_definition:stage_definitions(*))')
        .eq('is_active', true)
        .order('project_type');
      if (error) throw error;
      return data;
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['stage-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stage_definitions')
        .select('*')
        .eq('is_active', true)
        .order('default_order');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let templateId = editingTemplate?.id;

      const payload = {
        name: form.name,
        description: form.description || null,
        project_type: form.project_type,
        is_default: form.is_default,
        is_active: true,
        phases: selectedStages.map((s, i) => ({
          stage_definition_id: s.stage_definition_id,
          phase_type: stages.find((sd: any) => sd.id === s.stage_definition_id)?.name_en?.toLowerCase().replace(/[^a-z0-9]+/g, '_') || `phase_${i}`,
          order: s.stage_order,
          instructions: stages.find((sd: any) => sd.id === s.stage_definition_id)?.description,
        })),
      };

      if (editingTemplate) {
        const { error } = await supabase.from('project_templates').update(payload).eq('id', templateId);
        if (error) throw error;
        // Remove old template_stages
        await supabase.from('template_stages').delete().eq('template_id', templateId);
      } else {
        const { data, error } = await supabase.from('project_templates').insert(payload).select().single();
        if (error) throw error;
        templateId = data.id;
      }

      // Insert template_stages
      if (selectedStages.length > 0) {
        const stageInserts = selectedStages.map(s => ({
          template_id: templateId,
          stage_definition_id: s.stage_definition_id,
          stage_order: s.stage_order,
          estimated_days: s.estimated_days ? parseInt(s.estimated_days) : null,
        }));
        await supabase.from('template_stages').insert(stageInserts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates-admin'] });
      toast.success(editingTemplate ? 'تم تحديث القالب' : 'تم إنشاء القالب');
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({ name: '', description: '', project_type: 'custom_platform', is_default: false });
    setSelectedStages([]);
    setDialogOpen(true);
  };

  const openEdit = (template: any) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      description: template.description || '',
      project_type: template.project_type,
      is_default: template.is_default,
    });
    const ts = (template.template_stages || [])
      .sort((a: any, b: any) => a.stage_order - b.stage_order)
      .map((s: any) => ({
        stage_definition_id: s.stage_definition_id,
        stage_order: s.stage_order,
        estimated_days: s.estimated_days?.toString() || '',
      }));
    setSelectedStages(ts);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
  };

  const addStageToTemplate = (stageId: string) => {
    if (selectedStages.find(s => s.stage_definition_id === stageId)) return;
    setSelectedStages(prev => [
      ...prev,
      { stage_definition_id: stageId, stage_order: prev.length + 1, estimated_days: '' },
    ]);
  };

  const removeStageFromTemplate = (stageId: string) => {
    setSelectedStages(prev =>
      prev.filter(s => s.stage_definition_id !== stageId)
        .map((s, i) => ({ ...s, stage_order: i + 1 }))
    );
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newStages = [...selectedStages];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newStages.length) return;
    [newStages[index], newStages[swapIndex]] = [newStages[swapIndex], newStages[index]];
    setSelectedStages(newStages.map((s, i) => ({ ...s, stage_order: i + 1 })));
  };

  const filteredStages = stages.filter((s: any) =>
    s.stage_category === form.project_type || s.stage_category === 'general'
  );

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('project_templates').update({ is_active: false }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates-admin'] });
      toast.success('تم حذف القالب');
    },
  });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground">قوالب جاهزة لأنواع المشاريع</p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 ml-2" />
          قالب جديد
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            لا توجد قوالب
          </div>
        ) : templates.map((template: any) => (
          <Card key={template.id} className="relative">
            {template.is_default && (
              <Badge className="absolute top-2 left-2" variant="default">افتراضي</Badge>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{template.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">
                  {template.project_type === 'custom_platform' ? 'منصة مخصصة' :
                   template.project_type === 'subscription' ? 'اشتراك' : template.project_type}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {(template.template_stages || []).length} مراحل
                </span>
              </div>
              {(template.template_stages || []).length > 0 && (
                <div className="space-y-1 mb-3">
                  {(template.template_stages || [])
                    .sort((a: any, b: any) => a.stage_order - b.stage_order)
                    .slice(0, 4)
                    .map((ts: any, i: number) => (
                      <div key={ts.id} className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-4 text-center">{i + 1}.</span>
                        <span>{ts.stage_definition?.name || '—'}</span>
                      </div>
                    ))}
                  {(template.template_stages || []).length > 4 && (
                    <p className="text-xs text-muted-foreground">
                      +{(template.template_stages || []).length - 4} مراحل أخرى
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(template)}>
                  <Edit className="h-3 w-3 ml-1" />
                  تعديل
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteTemplate.mutate(template.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'تعديل القالب' : 'إنشاء قالب جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم القالب *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>نوع المشروع</Label>
                <Select value={form.project_type} onValueChange={v => setForm(f => ({ ...f, project_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom_platform">منصة مخصصة</SelectItem>
                    <SelectItem value="subscription">اشتراك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>

            {/* Selected Stages */}
            <div className="space-y-2">
              <Label>مراحل القالب ({selectedStages.length})</Label>
              {selectedStages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center border rounded-lg">
                  لم يتم إضافة مراحل بعد. اختر من المكتبة أدناه.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedStages.map((ss, i) => {
                    const stageDef = stages.find((s: any) => s.id === ss.stage_definition_id);
                    return (
                      <div key={ss.stage_definition_id} className="flex items-center gap-2 p-2 border rounded-lg">
                        <div className="flex flex-col gap-1">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveStage(i, 'up')} disabled={i === 0}>▲</Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveStage(i, 'down')} disabled={i === selectedStages.length - 1}>▼</Button>
                        </div>
                        <span className="w-6 text-center text-sm font-medium">{ss.stage_order}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{stageDef?.name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{stageDef?.description}</p>
                        </div>
                        <Input
                          className="w-20"
                          placeholder="أيام"
                          type="number"
                          value={ss.estimated_days}
                          onChange={e => {
                            const newStages = [...selectedStages];
                            newStages[i].estimated_days = e.target.value;
                            setSelectedStages(newStages);
                          }}
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeStageFromTemplate(ss.stage_definition_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Available Stages */}
            <div className="space-y-2">
              <Label>مكتبة المراحل المتاحة</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg">
                {filteredStages.map((stage: any) => {
                  const isSelected = selectedStages.some(s => s.stage_definition_id === stage.id);
                  return (
                    <Button
                      key={stage.id}
                      variant={isSelected ? "secondary" : "outline"}
                      size="sm"
                      className="justify-start text-right h-auto py-2"
                      onClick={() => isSelected ? removeStageFromTemplate(stage.id) : addStageToTemplate(stage.id)}
                    >
                      <span className="truncate">{stage.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {editingTemplate ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===================== Main Page =====================
export default function ProjectStagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مراحل المشاريع</h1>
        <p className="text-muted-foreground">إدارة مكتبة المراحل وقوالب المشاريع</p>
      </div>

      <Tabs defaultValue="stages" dir="rtl">
        <TabsList>
          <TabsTrigger value="stages" className="gap-2">
            <Layers className="h-4 w-4" />
            مكتبة المراحل
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            قوالب المشاريع
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stages" className="mt-4">
          <StagesLibrary />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <TemplatesManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
