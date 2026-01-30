import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { opportunityStages, OpportunityStage } from '@/lib/crm/pipelineConfig';

interface Account {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  full_name: string;
}

interface OpportunityFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accountId?: string;
  opportunity?: {
    id: string;
    name: string;
    description: string | null;
    account_id: string;
    opportunity_type: string;
    expected_value: number;
    currency: string;
    probability: number;
    stage: OpportunityStage;
    expected_close_date: string | null;
    next_step: string | null;
    owner_id: string | null;
  };
}

export function OpportunityForm({ open, onClose, onSuccess, accountId, opportunity }: OpportunityFormProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [formData, setFormData] = useState({
    name: opportunity?.name || '',
    description: opportunity?.description || '',
    account_id: opportunity?.account_id || accountId || '',
    opportunity_type: opportunity?.opportunity_type || 'new_business',
    expected_value: opportunity?.expected_value || 0,
    currency: opportunity?.currency || 'SAR',
    probability: opportunity?.probability || 50,
    stage: opportunity?.stage || 'qualification',
    expected_close_date: opportunity?.expected_close_date || '',
    next_step: opportunity?.next_step || '',
    owner_id: opportunity?.owner_id || '',
  });

  useEffect(() => {
    if (open) {
      fetchAccounts();
      fetchStaff();
    }
  }, [open]);

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from('client_organizations')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setAccounts(data || []);
  };

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('staff_members')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name');
    setStaff(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.account_id || !formData.expected_value) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    try {
      if (opportunity) {
        // Update
        const { error } = await supabase
          .from('crm_opportunities')
          .update({
            ...formData,
            expected_value: Number(formData.expected_value),
            probability: Number(formData.probability),
            updated_at: new Date().toISOString(),
          })
          .eq('id', opportunity.id);

        if (error) throw error;
        toast.success('تم تحديث الفرصة بنجاح');
      } else {
        // Create
        const { error } = await supabase
          .from('crm_opportunities')
          .insert({
            ...formData,
            expected_value: Number(formData.expected_value),
            probability: Number(formData.probability),
            status: 'open',
          });

        if (error) throw error;
        toast.success('تم إنشاء الفرصة بنجاح');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving opportunity:', error);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {opportunity ? 'تعديل الفرصة' : 'فرصة جديدة'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account */}
          <div className="space-y-2">
            <Label>العميل <span className="text-destructive">*</span></Label>
            <Select
              value={formData.account_id}
              onValueChange={(value) => setFormData({ ...formData, account_id: value })}
              disabled={!!accountId}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر العميل" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>اسم الفرصة <span className="text-destructive">*</span></Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: اشتراك سنوي - الباقة الذهبية"
            />
          </div>

          {/* Type & Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>نوع الفرصة</Label>
              <Select
                value={formData.opportunity_type}
                onValueChange={(value) => setFormData({ ...formData, opportunity_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_business">عميل جديد</SelectItem>
                  <SelectItem value="upsell">ترقية</SelectItem>
                  <SelectItem value="renewal">تجديد</SelectItem>
                  <SelectItem value="cross_sell">خدمة إضافية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>المرحلة</Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => setFormData({ ...formData, stage: value as OpportunityStage })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(opportunityStages).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Value & Probability */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>القيمة المتوقعة <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="0"
                value={formData.expected_value}
                onChange={(e) => setFormData({ ...formData, expected_value: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>الاحتمالية %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Expected Close Date */}
          <div className="space-y-2">
            <Label>تاريخ الإغلاق المتوقع</Label>
            <Input
              type="date"
              value={formData.expected_close_date}
              onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
            />
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <Label>المسؤول</Label>
            <Select
              value={formData.owner_id}
              onValueChange={(value) => setFormData({ ...formData, owner_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المسؤول" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Next Step */}
          <div className="space-y-2">
            <Label>الخطوة التالية</Label>
            <Input
              value={formData.next_step || ''}
              onChange={(e) => setFormData({ ...formData, next_step: e.target.value })}
              placeholder="مثال: إرسال عرض السعر"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>الوصف</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="تفاصيل إضافية عن الفرصة..."
              className="min-h-[80px]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {opportunity ? 'حفظ التغييرات' : 'إنشاء الفرصة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
