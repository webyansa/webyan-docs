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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ClipboardList, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { meetingResults, dealStages } from '@/lib/crm/pipelineConfig';

interface MeetingReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealName: string;
  currentStage: string;
  onSuccess: () => void;
}

export default function MeetingReportModal({
  open,
  onOpenChange,
  dealId,
  dealName,
  currentStage,
  onSuccess,
}: MeetingReportModalProps) {
  const [attendees, setAttendees] = useState('');
  const [summary, setSummary] = useState('');
  const [result, setResult] = useState('positive');
  const [nextStep, setNextStep] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!attendees.trim() || !summary.trim() || !nextStep.trim()) {
      toast.error('يرجى تعبئة جميع الحقول الإلزامية');
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

      const resultLabel = meetingResults.find(r => r.value === result)?.label || result;

      // Insert activity
      const { error: activityError } = await supabase
        .from('crm_opportunity_activities')
        .insert({
          opportunity_id: dealId,
          activity_type: 'meeting_report',
          title: 'تقرير الاجتماع',
          description: summary,
          metadata: {
            attendees,
            result,
            result_label: resultLabel,
            next_step: nextStep,
          },
          performed_by: staffId,
          performed_by_name: staffName,
        });

      if (activityError) throw activityError;

      // Update deal stage and next_step
      const { error: dealError } = await supabase
        .from('crm_opportunities')
        .update({
          stage: 'meeting_done',
          probability: dealStages.meeting_done.probability,
          next_step: nextStep,
          stage_changed_at: new Date().toISOString(),
          stage_change_reason: `تقرير اجتماع: ${resultLabel}`,
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
        to_stage: 'meeting_done',
        reason: `تقرير اجتماع: ${resultLabel}`,
        performed_by: staffId,
        performed_by_name: staffName,
      });

      toast.success('تم حفظ تقرير الاجتماع بنجاح');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving meeting report:', error);
      toast.error('حدث خطأ أثناء حفظ التقرير');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setAttendees('');
    setSummary('');
    setResult('positive');
    setNextStep('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            تقرير الاجتماع
          </DialogTitle>
          <DialogDescription>
            {dealName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Attendees */}
          <div className="space-y-2">
            <Label htmlFor="attendees">الحاضرون *</Label>
            <Input
              id="attendees"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="أسماء الحاضرين من العميل وفريق العمل..."
            />
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">ملخص الاجتماع *</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="ما تم مناقشته في الاجتماع..."
              rows={4}
            />
          </div>

          {/* Result */}
          <div className="space-y-2">
            <Label>نتيجة الاجتماع *</Label>
            <RadioGroup value={result} onValueChange={setResult} className="space-y-2">
              {meetingResults.map((res) => (
                <div key={res.value} className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value={res.value} id={res.value} />
                  <Label htmlFor={res.value} className={`cursor-pointer ${res.color}`}>
                    {res.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Next Step */}
          <div className="space-y-2">
            <Label htmlFor="nextStep">الخطوة التالية *</Label>
            <Input
              id="nextStep"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="مثال: إرسال عرض السعر خلال أسبوع"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !attendees.trim() || !summary.trim() || !nextStep.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              'حفظ التقرير'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
