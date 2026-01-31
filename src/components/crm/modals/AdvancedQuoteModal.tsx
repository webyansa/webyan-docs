import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Loader2,
  Package,
  Wrench,
  Puzzle,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { quoteValidityOptions, formatCurrency, dealStages } from '@/lib/crm/pipelineConfig';
import PlanSelector from '../quotes/PlanSelector';
import ServicesSelector from '../quotes/ServicesSelector';
import QuoteItemsTable, { QuoteItem } from '../quotes/QuoteItemsTable';
import { cn } from '@/lib/utils';

type QuoteType = 'subscription' | 'custom_platform' | 'services_only';

interface AdvancedQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealName: string;
  accountId: string | null;
  currentStage: string;
  currentValue: number;
  onSuccess: () => void;
}

const STEPS = [
  { id: 1, title: 'نوع البيع', icon: Package },
  { id: 2, title: 'التفاصيل', icon: Wrench },
  { id: 3, title: 'المراجعة', icon: Check },
];

const TAX_RATE = 15;

export default function AdvancedQuoteModal({
  open,
  onOpenChange,
  dealId,
  dealName,
  accountId,
  currentStage,
  currentValue,
  onSuccess,
}: AdvancedQuoteModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [quoteType, setQuoteType] = useState<QuoteType>('subscription');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [customValue, setCustomValue] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [validity, setValidity] = useState('30');
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch plans
  const { data: plans = [] } = useQuery({
    queryKey: ['pricing-plans-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ['pricing-services-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setQuoteType('subscription');
      setSelectedPlanId(null);
      setBillingCycle('yearly');
      setSelectedServiceIds([]);
      setCustomValue(currentValue > 0 ? currentValue.toString() : '');
      setCustomDescription('');
      setValidity('30');
      setNotes('');
      setSendEmail(false);
    }
  }, [open, currentValue]);

  // Calculate quote items and totals
  const { items, subtotal, taxAmount, total } = useMemo(() => {
    const quoteItems: QuoteItem[] = [];

    if (quoteType === 'subscription' && selectedPlanId) {
      const plan = plans.find(p => p.id === selectedPlanId);
      if (plan) {
        const price = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
        quoteItems.push({
          id: plan.id,
          name: plan.name,
          description: plan.description || undefined,
          type: 'plan',
          billing: billingCycle === 'monthly' ? 'شهري' : 'سنوي',
          quantity: 1,
          unit_price: price,
          total: price,
        });
      }
    }

    if (quoteType === 'custom_platform' && customValue) {
      quoteItems.push({
        id: 'custom',
        name: 'منصة مخصصة',
        description: customDescription || undefined,
        type: 'custom',
        quantity: 1,
        unit_price: parseFloat(customValue) || 0,
        total: parseFloat(customValue) || 0,
      });
    }

    // Add selected services
    selectedServiceIds.forEach(serviceId => {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        quoteItems.push({
          id: service.id,
          name: service.name,
          description: service.description || undefined,
          type: 'service',
          billing: service.unit,
          quantity: 1,
          unit_price: service.price,
          total: service.price,
        });
      }
    });

    const sub = quoteItems.reduce((sum, item) => sum + item.total, 0);
    const tax = sub * (TAX_RATE / 100);
    const tot = sub + tax;

    return { items: quoteItems, subtotal: sub, taxAmount: tax, total: tot };
  }, [quoteType, selectedPlanId, billingCycle, selectedServiceIds, customValue, customDescription, plans, services]);

  const canProceedToStep2 = () => {
    if (quoteType === 'services_only') return true;
    return true;
  };

  const canProceedToStep3 = () => {
    if (quoteType === 'subscription') return !!selectedPlanId;
    if (quoteType === 'custom_platform') return !!customValue && parseFloat(customValue) > 0;
    if (quoteType === 'services_only') return selectedServiceIds.length > 0;
    return false;
  };

  const handleSave = async () => {
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

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(validity));

      // Create quote record
      const { data: quote, error: quoteError } = await supabase
        .from('crm_quotes')
        .insert({
          account_id: accountId,
          opportunity_id: dealId,
          title: `عرض سعر - ${dealName}`,
          quote_type: quoteType,
          billing_cycle: billingCycle,
          plan_id: selectedPlanId,
          items: items.map(item => ({
            name: item.name,
            description: item.description,
            type: item.type,
            billing: item.billing,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
          })),
          subtotal,
          tax_rate: TAX_RATE,
          tax_amount: taxAmount,
          total_amount: total,
          validity_days: parseInt(validity),
          valid_until: validUntil.toISOString().split('T')[0],
          status: 'sent',
          sent_at: new Date().toISOString(),
          notes,
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
          description: `عرض سعر بقيمة ${formatCurrency(total)} (شامل الضريبة)`,
          metadata: {
            quote_id: quote.id,
            quote_number: quote.quote_number,
            quote_type: quoteType,
            subtotal,
            tax_amount: taxAmount,
            total,
            items_count: items.length,
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
          expected_value: total,
          opportunity_type: quoteType === 'subscription' ? 'subscription' : 'custom_platform',
          stage_changed_at: new Date().toISOString(),
          stage_change_reason: `تم إرسال عرض سعر بقيمة ${formatCurrency(total)}`,
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
        reason: `تم إرسال عرض سعر بقيمة ${formatCurrency(total)}`,
        performed_by: staffId,
        performed_by_name: staffName,
      });

      // Invalidate quotes cache so QuotesPage refreshes automatically
      queryClient.invalidateQueries({ queryKey: ['crm-quotes'] });
      
      toast.success(
        <div className="flex flex-col gap-2">
          <span>تم إنشاء وإرسال عرض السعر بنجاح</span>
          <Button
            size="sm"
            variant="outline"
            className="w-fit"
            onClick={() => navigate(`/admin/crm/quotes/${quote.id}`)}
          >
            فتح العرض
          </Button>
        </div>
      );
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('حدث خطأ أثناء إنشاء عرض السعر');
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-center">
              اختر نوع البيع الأساسي لعرض السعر
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  type: 'subscription' as QuoteType,
                  icon: Package,
                  title: 'اشتراك منصة',
                  description: 'اشتراك شهري أو سنوي في ويبيان',
                },
                {
                  type: 'custom_platform' as QuoteType,
                  icon: Puzzle,
                  title: 'منصة مخصصة',
                  description: 'تطوير منصة حسب الطلب',
                },
                {
                  type: 'services_only' as QuoteType,
                  icon: Wrench,
                  title: 'خدمات فقط',
                  description: 'خدمات إضافية بدون اشتراك',
                },
              ].map((option) => (
                <Card
                  key={option.type}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    quoteType === option.type
                      ? "ring-2 ring-primary border-primary"
                      : "hover:border-primary/50"
                  )}
                  onClick={() => setQuoteType(option.type)}
                >
                  <CardContent className="p-4 text-center">
                    <option.icon className={cn(
                      "h-10 w-10 mx-auto mb-3",
                      quoteType === option.type ? "text-primary" : "text-muted-foreground"
                    )} />
                    <h3 className="font-semibold mb-1">{option.title}</h3>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {quoteType === 'subscription' && (
              <PlanSelector
                selectedPlanId={selectedPlanId}
                billingCycle={billingCycle}
                onPlanSelect={setSelectedPlanId}
                onBillingCycleChange={setBillingCycle}
              />
            )}

            {quoteType === 'custom_platform' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>وصف المشروع</Label>
                  <Textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="وصف مختصر للمنصة المخصصة..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>القيمة الإجمالية *</Label>
                  <Input
                    type="number"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="أدخل قيمة المشروع"
                  />
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">إضافة خدمات إضافية (اختياري)</h4>
              <ServicesSelector
                selectedServiceIds={selectedServiceIds}
                onSelectionChange={setSelectedServiceIds}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">العميل</p>
              <p className="font-medium">{dealName}</p>
            </div>

            <QuoteItemsTable
              items={items}
              subtotal={subtotal}
              taxRate={TAX_RATE}
              taxAmount={taxAmount}
              total={total}
            />

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية على العرض..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="sendEmail"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked === true)}
              />
              <Label htmlFor="sendEmail" className="cursor-pointer">
                إرسال العرض بالبريد الإلكتروني للعميل
              </Label>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            إنشاء عرض سعر - الخطوة {step} من 3
          </DialogTitle>
          <DialogDescription>{dealName}</DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                  step >= s.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                <s.icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "mr-2 text-sm font-medium",
                step >= s.id ? "text-primary" : "text-muted-foreground"
              )}>
                {s.title}
              </span>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-16 h-0.5 mx-4",
                  step > s.id ? "bg-primary" : "bg-muted-foreground/30"
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="min-h-[300px]">
          {renderStepContent()}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={saving}>
              <ArrowRight className="h-4 w-4 ml-2" />
              السابق
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            إلغاء
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && !canProceedToStep3()}
            >
              التالي
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving || items.length === 0}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 ml-2" />
                  إنشاء العرض
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
