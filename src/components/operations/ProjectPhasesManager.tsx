import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { 
  Plus, LayoutTemplate, Layers, Loader2, Trash2 
} from 'lucide-react';

interface ProjectPhasesManagerProps {
  projectId: string;
  projectType: string;
  templateId?: string | null;
  hasPhases: boolean;
  canEdit: boolean;
}

export function ProjectPhasesManager({
  projectId,
  projectType,
  templateId,
  hasPhases,
  canEdit,
}: ProjectPhasesManagerProps) {
  const queryClient = useQueryClient();
  const [addMode, setAddMode] = useState<'template' | 'custom' | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['project-templates-for-phases', projectType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .eq('is_active', true)
        .eq('project_type', projectType)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: addMode === 'template',
  });

  // Fetch stage definitions
  const { data: stageDefinitions = [] } = useQuery({
    queryKey: ['stage-definitions-for-phases'],
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
    enabled: addMode === 'custom',
  });

  // Apply template mutation
  const applyTemplateMutation = useMutation({
    mutationFn: async () => {
      const template = templates.find((t: any) => t.id === selectedTemplateId);
      if (!template) throw new Error('القالب غير موجود');

      const templatePhases = (template.phases as any[]) || [];
      if (templatePhases.length === 0) throw new Error('القالب لا يحتوي على مراحل');

      // Delete existing phases first
      await supabase.from('project_phases').delete().eq('project_id', projectId);

      // Insert new phases
      const phasesToInsert = templatePhases.map((phase: any) => ({
        project_id: projectId,
        phase_type: phase.phase_type,
        phase_order: phase.order,
        status: 'pending',
        instructions: phase.instructions || null,
      }));

      const { error } = await supabase.from('project_phases').insert(phasesToInsert);
      if (error) throw error;

      // Update project template_id and stage
      await supabase
        .from('crm_implementations')
        .update({ template_id: selectedTemplateId, stage: templatePhases[0]?.phase_type })
        .eq('id', projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('تم تطبيق قالب المراحل بنجاح');
      setAddMode(null);
      setSelectedTemplateId('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Add custom stages mutation
  const addCustomStagesMutation = useMutation({
    mutationFn: async () => {
      if (selectedStageIds.length === 0) throw new Error('اختر مرحلة واحدة على الأقل');

      // Get current max phase_order
      const { data: existingPhases } = await supabase
        .from('project_phases')
        .select('phase_order')
        .eq('project_id', projectId)
        .order('phase_order', { ascending: false })
        .limit(1);

      const maxOrder = existingPhases?.[0]?.phase_order || 0;

      const stages = stageDefinitions.filter((s: any) => selectedStageIds.includes(s.id));
      const phasesToInsert = stages.map((stage: any, i: number) => ({
        project_id: projectId,
        phase_type: stage.name_en?.toLowerCase().replace(/[^a-z0-9]+/g, '_') || `custom_${i}`,
        phase_order: maxOrder + i + 1,
        status: 'pending',
        instructions: stage.description || null,
        stage_definition_id: stage.id,
      }));

      const { error } = await supabase.from('project_phases').insert(phasesToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      toast.success('تم إضافة المراحل بنجاح');
      setAddMode(null);
      setSelectedStageIds([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete all phases
  const deleteAllPhasesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('project_phases')
        .delete()
        .eq('project_id', projectId)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      toast.success('تم حذف المراحل المعلقة');
    },
  });

  const toggleStage = (stageId: string) => {
    setSelectedStageIds(prev =>
      prev.includes(stageId) ? prev.filter(id => id !== stageId) : [...prev, stageId]
    );
  };

  if (!canEdit) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setAddMode('template')}>
          <LayoutTemplate className="h-4 w-4 ml-2" />
          تطبيق قالب
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAddMode('custom')}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة مراحل
        </Button>
        {hasPhases && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => {
              if (confirm('هل تريد حذف جميع المراحل المعلقة؟')) {
                deleteAllPhasesMutation.mutate();
              }
            }}
          >
            <Trash2 className="h-4 w-4 ml-1" />
            حذف المعلقة
          </Button>
        )}
      </div>

      {/* Apply Template Dialog */}
      <Dialog open={addMode === 'template'} onOpenChange={(o) => !o && setAddMode(null)}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              تطبيق قالب مراحل
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              سيتم استبدال جميع المراحل الحالية بمراحل القالب المختار.
            </p>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر القالب" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.is_default && '(افتراضي)'} • {(t.phases as any[])?.length || 0} مراحل
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplateId && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                {((templates.find((t: any) => t.id === selectedTemplateId)?.phases as any[]) || []).map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">{p.order}</span>
                    <span>{p.label || p.phase_type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMode(null)}>إلغاء</Button>
            <Button
              onClick={() => applyTemplateMutation.mutate()}
              disabled={!selectedTemplateId || applyTemplateMutation.isPending}
            >
              {applyTemplateMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              تطبيق القالب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Stages Dialog */}
      <Dialog open={addMode === 'custom'} onOpenChange={(o) => !o && setAddMode(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              إضافة مراحل من المكتبة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              اختر المراحل التي تريد إضافتها للمشروع من مكتبة المراحل.
            </p>
            {stageDefinitions.map((stage: any) => (
              <div
                key={stage.id}
                onClick={() => toggleStage(stage.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedStageIds.includes(stage.id)
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  selectedStageIds.includes(stage.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                }`}>
                  {selectedStageIds.includes(stage.id) && '✓'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{stage.name}</p>
                  {stage.description && (
                    <p className="text-xs text-muted-foreground">{stage.description}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {stage.stage_category === 'custom_platform' ? 'منصة' :
                   stage.stage_category === 'subscription' ? 'اشتراك' :
                   stage.stage_category === 'general' ? 'عام' : stage.stage_category}
                </Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMode(null)}>إلغاء</Button>
            <Button
              onClick={() => addCustomStagesMutation.mutate()}
              disabled={selectedStageIds.length === 0 || addCustomStagesMutation.isPending}
            >
              {addCustomStagesMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              إضافة {selectedStageIds.length > 0 ? `(${selectedStageIds.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
