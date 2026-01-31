import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { dealStages, DealStage } from '@/lib/crm/pipelineConfig';

interface StageNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealName: string;
  currentStage: string;
  targetStage: DealStage;
  onSuccess: () => void;
}

export default function StageNoteModal({
  open,
  onOpenChange,
  dealId,
  dealName,
  currentStage,
  targetStage,
  onSuccess,
}: StageNoteModalProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!note.trim()) {
      toast.error('يرجى إدخال سبب التغيير');
      return;
    }

    setSaving(true);
    try {
      // Get current staff info
      const { data: { user } } = await supabase.auth.getUser();
      let staffName = 'مستخدم';
      let staffId = null;
      
      if (user) {
        const { data: staff } = await supabase
          .from('staff_members')
          .select('id, full_name')
          .eq('user_id', user.id)
          .single();
        
        if (staff) {
          staffName = staff.full_name;
          staffId = staff.id;
        }
      }

      const fromStageLabel = dealStages[currentStage as DealStage]?.label || currentStage;
      const toStageLabel = dealStages[targetStage]?.label || targetStage;

      // Insert activity
      const { error: activityError } = await supabase
        .from('crm_opportunity_activities')
        .insert({
          opportunity_id: dealId,
          activity_type: 'stage_change',
          title: `تغيير المرحلة: ${fromStageLabel} ← ${toStageLabel}`,
          description: note,
          metadata: {
            from_stage: currentStage,
            to_stage: targetStage,
          },
          performed_by: staffId,
          performed_by_name: staffName,
        });

      if (activityError) throw activityError;

      // Update deal stage
      const { error: dealError } = await supabase
        .from('crm_opportunities')
        .update({
          stage: targetStage,
          probability: dealStages[targetStage].probability,
          stage_changed_at: new Date().toISOString(),
          stage_change_reason: note,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId);

      if (dealError) throw dealError;

      // Log stage transition
      await supabase.from('crm_stage_transitions').insert({
        entity_type: 'opportunity',
        entity_id: dealId,
        pipeline_type: 'deals',
        from_stage: currentStage,
        to_stage: targetStage,
        reason: note,
        performed_by: staffId,
        performed_by_name: staffName,
      });

      toast.success('تم تغيير المرحلة بنجاح');
      setNote('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error changing stage:', error);
      toast.error('حدث خطأ أثناء تغيير المرحلة');
    } finally {
      setSaving(false);
    }
  };

  const fromStageConfig = dealStages[currentStage as DealStage];
  const toStageConfig = dealStages[targetStage];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            تغيير مرحلة الفرصة
          </DialogTitle>
          <DialogDescription>
            {dealName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stage Transition Visual */}
          <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className={`px-3 py-2 rounded-md ${fromStageConfig?.bgColor || 'bg-gray-100'}`}>
              <span className={`text-sm font-medium ${fromStageConfig?.color || ''}`}>
                {fromStageConfig?.label || currentStage}
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className={`px-3 py-2 rounded-md ${toStageConfig?.bgColor || 'bg-gray-100'}`}>
              <span className={`text-sm font-medium ${toStageConfig?.color || ''}`}>
                {toStageConfig?.label || targetStage}
              </span>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">سبب التغيير *</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="اكتب سبب نقل الفرصة إلى هذه المرحلة..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !note.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              'تأكيد التغيير'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
