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
import { FileText, Loader2, Link, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { quoteValidityOptions, dealStages, formatCurrency } from '@/lib/crm/pipelineConfig';

interface CreateQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealName: string;
  accountId: string | null;
  currentStage: string;
  currentValue: number;
  onSuccess: () => void;
}

export default function CreateQuoteModal({
  open,
  onOpenChange,
  dealId,
  dealName,
  accountId,
  currentStage,
  currentValue,
  onSuccess,
}: CreateQuoteModalProps) {
  const [title, setTitle] = useState(`عرض سعر - ${dealName}`);
  const [serviceType, setServiceType] = useState('subscription');
  const [value, setValue] = useState(currentValue.toString());
  const [validity, setValidity] = useState('30');
  const [documentUrl, setDocumentUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !value || parseFloat(value) <= 0) {
      toast.error('يرجى تعبئة العنوان والقيمة');
      return;
    }

    if (!accountId) {
      toast.error('يرجى التأكد من ربط الفرصة بعميل');
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

      const quoteValue = parseFloat(value);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(validity));

      // Create quote record
      const { data: quote, error: quoteError } = await supabase
        .from('crm_quotes')
        .insert({
          account_id: accountId,
          opportunity_id: dealId,
          title,
          subtotal: quoteValue,
          total_amount: quoteValue,
          validity_days: parseInt(validity),
          valid_until: validUntil.toISOString().split('T')[0],
          status: 'sent',
          sent_at: new Date().toISOString(),
          notes,
          document_url: documentUrl || null,
          created_by: staffId,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Insert activity
      const { error: activityError } = await supabase
        .from('crm_opportunity_activities')
        .insert({
          opportunity_id: dealId,
          activity_type: 'quote_sent',
          title: 'إرسال عرض سعر',
          description: `عرض سعر بقيمة ${formatCurrency(quoteValue)}`,
          metadata: {
            quote_id: quote.id,
            quote_number: quote.quote_number,
            value: quoteValue,
            validity_days: parseInt(validity),
            service_type: serviceType,
            document_url: documentUrl,
          },
          performed_by: staffId,
          performed_by_name: staffName,
        });

      if (activityError) throw activityError;

      // Update deal stage and value
      const { error: dealError } = await supabase
        .from('crm_opportunities')
        .update({
          stage: 'proposal_sent',
          probability: dealStages.proposal_sent.probability,
          expected_value: quoteValue,
          opportunity_type: serviceType,
          stage_changed_at: new Date().toISOString(),
          stage_change_reason: `تم إرسال عرض سعر بقيمة ${formatCurrency(quoteValue)}`,
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
        to_stage: 'proposal_sent',
        reason: `تم إرسال عرض سعر بقيمة ${formatCurrency(quoteValue)}`,
        performed_by: staffId,
        performed_by_name: staffName,
      });

      toast.success('تم إنشاء وإرسال عرض السعر بنجاح');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('حدث خطأ أثناء إنشاء عرض السعر');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setServiceType('subscription');
    setValue('');
    setValidity('30');
    setDocumentUrl('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            إنشاء عرض سعر
          </DialogTitle>
          <DialogDescription>
            {dealName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">عنوان العرض *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان عرض السعر..."
            />
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <Label>نوع الخدمة *</Label>
            <RadioGroup value={serviceType} onValueChange={setServiceType} className="flex gap-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="subscription" id="subscription" />
                <Label htmlFor="subscription" className="cursor-pointer">اشتراك ويبيان</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="custom_platform" id="custom_platform" />
                <Label htmlFor="custom_platform" className="cursor-pointer">منصة مخصصة</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="value">قيمة العرض * (ر.س)</Label>
            <Input
              id="value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="القيمة بالريال السعودي"
              min={0}
            />
          </div>

          {/* Validity */}
          <div className="space-y-2">
            <Label>صلاحية العرض</Label>
            <Select value={validity} onValueChange={setValidity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quoteValidityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document URL */}
          <div className="space-y-2">
            <Label htmlFor="document">ملف أو رابط العرض</Label>
            <div className="flex gap-2">
              <Input
                id="document"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="رابط ملف العرض (Google Drive, Dropbox, etc.)"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" disabled>
                <Link className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              أدخل رابط ملف العرض من Google Drive أو Dropbox أو أي خدمة تخزين
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية على العرض..."
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
            disabled={saving || !title.trim() || !value || parseFloat(value) <= 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              'إنشاء وإرسال العرض'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
