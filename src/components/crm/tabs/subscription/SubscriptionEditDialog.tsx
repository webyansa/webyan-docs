import { useState, useEffect } from 'react';
import { format, addYears } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface PricingPlan {
  id: string;
  name: string;
  monthly_price: number;
  yearly_price: number;
}

interface SubscriptionData {
  subscription_status: string;
  subscription_plan?: string | null;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  subscription_value?: number | null;
  domain_expiration_date?: string | null;
}

interface SubscriptionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  currentData: SubscriptionData;
  onSuccess: () => void;
}

export function SubscriptionEditDialog({
  open,
  onOpenChange,
  organizationId,
  currentData,
  onSuccess,
}: SubscriptionEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [formData, setFormData] = useState({
    subscription_status: currentData.subscription_status || 'trial',
    subscription_plan: currentData.subscription_plan || '',
    subscription_start_date: currentData.subscription_start_date 
      ? new Date(currentData.subscription_start_date) 
      : undefined as Date | undefined,
    subscription_end_date: currentData.subscription_end_date 
      ? new Date(currentData.subscription_end_date) 
      : undefined as Date | undefined,
    subscription_value: currentData.subscription_value?.toString() || '',
    domain_expiration_date: currentData.domain_expiration_date 
      ? new Date(currentData.domain_expiration_date) 
      : undefined as Date | undefined,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (open) {
      setFormData({
        subscription_status: currentData.subscription_status || 'trial',
        subscription_plan: currentData.subscription_plan || '',
        subscription_start_date: currentData.subscription_start_date 
          ? new Date(currentData.subscription_start_date) 
          : undefined,
        subscription_end_date: currentData.subscription_end_date 
          ? new Date(currentData.subscription_end_date) 
          : undefined,
        subscription_value: currentData.subscription_value?.toString() || '',
        domain_expiration_date: currentData.domain_expiration_date 
          ? new Date(currentData.domain_expiration_date) 
          : undefined,
      });
    }
  }, [open, currentData]);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('pricing_plans')
      .select('id, name, monthly_price, yearly_price')
      .eq('is_active', true)
      .order('sort_order');
    if (data) setPlans(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: Record<string, unknown> = {
        subscription_status: formData.subscription_status,
        subscription_plan: formData.subscription_plan || null,
        subscription_value: formData.subscription_value 
          ? parseFloat(formData.subscription_value) 
          : null,
      };

      if (formData.subscription_start_date) {
        updateData.subscription_start_date = formData.subscription_start_date.toISOString();
      }
      if (formData.subscription_end_date) {
        updateData.subscription_end_date = formData.subscription_end_date.toISOString();
      }
      if (formData.domain_expiration_date) {
        updateData.domain_expiration_date = format(formData.domain_expiration_date, 'yyyy-MM-dd');
      }

      const { error } = await supabase
        .from('client_organizations')
        .update(updateData)
        .eq('id', organizationId);

      if (error) throw error;

      toast.success('تم تحديث بيانات الاشتراك بنجاح');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'trial', label: 'تجريبي' },
    { value: 'active', label: 'نشط' },
    { value: 'pending_renewal', label: 'في انتظار التجديد' },
    { value: 'expired', label: 'منتهي' },
    { value: 'cancelled', label: 'ملغي' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الاشتراك</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* حالة الاشتراك */}
          <div className="space-y-2">
            <Label>حالة الاشتراك</Label>
            <Select
              value={formData.subscription_status}
              onValueChange={(value) => setFormData({ ...formData, subscription_status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* نوع الباقة */}
          <div className="space-y-2">
            <Label>نوع الباقة</Label>
            <Select
              value={formData.subscription_plan}
              onValueChange={(value) => setFormData({ ...formData, subscription_plan: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الباقة" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - {plan.yearly_price.toLocaleString()} ر.س/سنة
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* قيمة الاشتراك */}
          <div className="space-y-2">
            <Label>قيمة الاشتراك (ريال)</Label>
            <Input
              type="number"
              value={formData.subscription_value}
              onChange={(e) => setFormData({ ...formData, subscription_value: e.target.value })}
              placeholder="0"
            />
          </div>

          {/* تاريخ البدء */}
          <div className="space-y-2">
            <Label>تاريخ بدء الاشتراك</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-right font-normal',
                    !formData.subscription_start_date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {formData.subscription_start_date 
                    ? format(formData.subscription_start_date, 'yyyy/MM/dd')
                    : 'اختر التاريخ'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={formData.subscription_start_date}
                  onSelect={(date) => {
                    if (date) {
                      // حساب تاريخ الانتهاء تلقائياً (سنة واحدة)
                      const endDate = addYears(date, 1);
                      setFormData({ 
                        ...formData, 
                        subscription_start_date: date,
                        subscription_end_date: endDate
                      });
                    } else {
                      setFormData({ ...formData, subscription_start_date: date });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* تاريخ الانتهاء */}
          <div className="space-y-2">
            <Label>تاريخ انتهاء الاشتراك</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-right font-normal',
                    !formData.subscription_end_date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {formData.subscription_end_date 
                    ? format(formData.subscription_end_date, 'yyyy/MM/dd')
                    : 'اختر التاريخ'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={formData.subscription_end_date}
                  onSelect={(date) => setFormData({ ...formData, subscription_end_date: date })}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* تاريخ انتهاء الدومين */}
          <div className="space-y-2">
            <Label>تاريخ انتهاء الدومين</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-right font-normal',
                    !formData.domain_expiration_date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {formData.domain_expiration_date 
                    ? format(formData.domain_expiration_date, 'yyyy/MM/dd')
                    : 'اختر التاريخ'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={formData.domain_expiration_date}
                  onSelect={(date) => setFormData({ ...formData, domain_expiration_date: date })}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              حفظ التغييرات
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
