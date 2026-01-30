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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { opportunityStages, OpportunityStage, implementationStages, ImplementationStage } from '@/lib/crm/pipelineConfig';

interface StageChangeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, nextStep: string) => void;
  opportunityName: string;
  fromStage: string;
  toStage: string;
  pipelineType?: 'opportunity' | 'implementation';
}

export function StageChangeModal({
  open,
  onClose,
  onConfirm,
  opportunityName,
  fromStage,
  toStage,
  pipelineType = 'opportunity',
}: StageChangeModalProps) {
  const [reason, setReason] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [loading, setLoading] = useState(false);

  const stages: Record<string, any> = pipelineType === 'opportunity' ? opportunityStages : implementationStages;
  const fromConfig = stages[fromStage];
  const toConfig = stages[toStage];

  const handleConfirm = async () => {
    if (!reason.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onConfirm(reason, nextStep);
    } finally {
      setLoading(false);
      setReason('');
      setNextStep('');
    }
  };

  const handleClose = () => {
    setReason('');
    setNextStep('');
    onClose();
  };

  const FromIcon = fromConfig?.icon;
  const ToIcon = toConfig?.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            تغيير المرحلة
          </DialogTitle>
          <DialogDescription>
            {opportunityName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stage Transition Visual */}
          <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${fromConfig?.bgColor || 'bg-gray-100'}`}>
              {FromIcon && <FromIcon className={`w-4 h-4 ${fromConfig?.color || ''}`} />}
              <span className={`text-sm font-medium ${fromConfig?.color || ''}`}>
                {fromConfig?.label || fromStage}
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${toConfig?.bgColor || 'bg-gray-100'}`}>
              {ToIcon && <ToIcon className={`w-4 h-4 ${toConfig?.color || ''}`} />}
              <span className={`text-sm font-medium ${toConfig?.color || ''}`}>
                {toConfig?.label || toStage}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              سبب التغيير <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="اكتب سبب نقل الفرصة إلى هذه المرحلة..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              مثال: العميل وافق على المتطلبات وطلب عرض سعر
            </p>
          </div>

          {/* Next Step */}
          <div className="space-y-2">
            <Label htmlFor="nextStep">
              الخطوة التالية
            </Label>
            <Textarea
              id="nextStep"
              placeholder="ما هي الخطوة التالية المطلوبة؟"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              className="min-h-[60px]"
            />
            <p className="text-xs text-muted-foreground">
              مثال: إرسال عرض السعر خلال 48 ساعة
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            إلغاء
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!reason.trim() || loading}
          >
            {loading ? 'جاري الحفظ...' : 'تأكيد التغيير'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
