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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { rejectionReasons, dealStages, formatCurrency } from '@/lib/crm/pipelineConfig';

interface RejectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealName: string;
  dealValue: number;
  currentStage: string;
  onSuccess: () => void;
}

export default function RejectionModal({
  open,
  onOpenChange,
  dealId,
  dealName,
  dealValue,
  currentStage,
  onSuccess,
}: RejectionModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [canRecontact, setCanRecontact] = useState('unknown');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!reason || !details.trim()) {
      toast.error('يرجى اختيار سبب الرفض وإضافة التفاصيل');
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

      const reasonLabel = rejectionReasons.find(r => r.value === reason)?.label || reason;

      // Insert activity
      const { error: activityError } = await supabase
        .from('crm_opportunity_activities')
        .insert({
          opportunity_id: dealId,
          activity_type: 'rejection',
          title: 'رفض الفرصة',
          description: details,
          metadata: {
            reason,
            reason_label: reasonLabel,
            can_recontact: canRecontact,
            value_lost: dealValue,
          },
          performed_by: staffId,
          performed_by_name: staffName,
        });

      if (activityError) throw activityError;

      // Update deal stage
      const { error: dealError } = await supabase
        .from('crm_opportunities')
        .update({
          stage: 'rejected',
          status: 'lost',
          probability: 0,
          lost_reason: `${reasonLabel}: ${details}`,
          actual_close_date: new Date().toISOString().split('T')[0],
          stage_changed_at: new Date().toISOString(),
          stage_change_reason: `سبب الرفض: ${reasonLabel}`,
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
        to_stage: 'rejected',
        reason: `${reasonLabel}: ${details}`,
        performed_by: staffId,
        performed_by_name: staffName,
      });

      toast.success('تم تسجيل رفض الفرصة');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error rejecting deal:', error);
      toast.error('حدث خطأ أثناء تسجيل الرفض');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setReason('');
    setDetails('');
    setCanRecontact('unknown');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            تسجيل رفض الفرصة
          </DialogTitle>
          <DialogDescription>
            {dealName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">تنبيه: هذا الإجراء نهائي</p>
              <p className="text-xs text-red-600">
                قيمة الفرصة المفقودة: {formatCurrency(dealValue)}
              </p>
            </div>
          </div>

          {/* Rejection Reason */}
          <div className="space-y-2">
            <Label>سبب الرفض *</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {rejectionReasons.map((res) => (
                <div key={res.value} className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value={res.value} id={res.value} />
                  <Label htmlFor={res.value} className="cursor-pointer">
                    {res.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Details */}
          <div className="space-y-2">
            <Label htmlFor="details">تفاصيل إضافية *</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="اشرح سبب الرفض بالتفصيل..."
              rows={3}
            />
          </div>

          {/* Can Recontact */}
          <div className="space-y-2">
            <Label>هل يمكن إعادة التواصل مستقبلاً؟</Label>
            <RadioGroup value={canRecontact} onValueChange={setCanRecontact} className="flex gap-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes" className="cursor-pointer text-green-600">نعم</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no" className="cursor-pointer text-red-600">لا</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="unknown" id="unknown" />
                <Label htmlFor="unknown" className="cursor-pointer text-muted-foreground">غير محدد</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !reason || !details.trim()}
            variant="destructive"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              'تأكيد الرفض'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
