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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { meetingTypes, meetingDurations, dealStages } from '@/lib/crm/pipelineConfig';

interface ScheduleMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealName: string;
  currentStage: string;
  onSuccess: () => void;
}

export default function ScheduleMeetingModal({
  open,
  onOpenChange,
  dealId,
  dealName,
  currentStage,
  onSuccess,
}: ScheduleMeetingModalProps) {
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [meetingType, setMeetingType] = useState('remote');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!meetingDate || !meetingTime) {
      toast.error('يرجى تحديد تاريخ ووقت الاجتماع');
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

      const meetingDateTime = `${meetingDate}T${meetingTime}:00`;

      // Insert activity
      const { error: activityError } = await supabase
        .from('crm_opportunity_activities')
        .insert({
          opportunity_id: dealId,
          activity_type: 'meeting_scheduled',
          title: 'جدولة اجتماع',
          description: notes || `تم جدولة اجتماع ${meetingTypes.find(t => t.value === meetingType)?.label}`,
          metadata: {
            meeting_date: meetingDateTime,
            duration: parseInt(duration),
            meeting_type: meetingType,
          },
          performed_by: staffId,
          performed_by_name: staffName,
        });

      if (activityError) throw activityError;

      // Update deal stage
      const { error: dealError } = await supabase
        .from('crm_opportunities')
        .update({
          stage: 'meeting_scheduled',
          probability: dealStages.meeting_scheduled.probability,
          stage_changed_at: new Date().toISOString(),
          stage_change_reason: `تم جدولة اجتماع بتاريخ ${meetingDate}`,
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
        to_stage: 'meeting_scheduled',
        reason: `تم جدولة اجتماع بتاريخ ${meetingDate}`,
        performed_by: staffId,
        performed_by_name: staffName,
      });

      toast.success('تم جدولة الاجتماع بنجاح');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      toast.error('حدث خطأ أثناء جدولة الاجتماع');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setMeetingDate('');
    setMeetingTime('');
    setDuration('60');
    setMeetingType('remote');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-600" />
            جدولة اجتماع
          </DialogTitle>
          <DialogDescription>
            {dealName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">تاريخ الاجتماع *</Label>
              <Input
                id="date"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">الوقت *</Label>
              <Input
                id="time"
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>مدة الاجتماع</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meetingDurations.map((d) => (
                  <SelectItem key={d.value} value={d.value.toString()}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meeting Type */}
          <div className="space-y-2">
            <Label>نوع الاجتماع</Label>
            <RadioGroup value={meetingType} onValueChange={setMeetingType} className="flex gap-4">
              {meetingTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value} className="cursor-pointer">{type.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية عن الاجتماع..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !meetingDate || !meetingTime}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              'جدولة الاجتماع'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
