import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DocsLayout } from '@/components/layout/DocsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ENTITY_TYPES = [
  'جمعية خيرية', 'منظمة غير ربحية', 'مؤسسة', 'جمعية تعاونية', 'أخرى'
];

const REGIONS = [
  'الرياض', 'مكة المكرمة', 'المدينة المنورة', 'القصيم', 'المنطقة الشرقية',
  'عسير', 'تبوك', 'حائل', 'الحدود الشمالية', 'جازان', 'نجران', 'الباحة', 'الجوف'
];

interface PlanData {
  id: string;
  name: string;
  yearly_price: number;
  description: string | null;
  features: string[];
  optional_addons: { id: string; name: string; price: number; description?: string }[];
}

export default function SubscribePage() {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId');
  const pageSource = searchParams.get('from') || 'PricingPage';

  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');
  const [invalidPlan, setInvalidPlan] = useState(false);

  // Form state
  const [form, setForm] = useState({
    organization_name: '',
    contact_name: '',
    phone: '',
    email: '',
    entity_type: '',
    entity_category: '',
    region: '',
    address: '',
    agree: false,
  });
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (planId) fetchPlan();
    else { setInvalidPlan(true); setLoading(false); }
  }, [planId]);

  const fetchPlan = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-public-plans');
      if (error) throw error;
      const found = (data.plans || []).find((p: any) => p.id === planId);
      if (found) {
        setPlan(found);
      } else {
        setInvalidPlan(true);
      }
    } catch {
      setInvalidPlan(true);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = () => {
    if (!plan) return 0;
    let total = plan.yearly_price;
    for (const addonId of selectedAddons) {
      const addon = (plan.optional_addons || []).find(a => a.id === addonId || a.name === addonId);
      if (addon) total += addon.price;
    }
    return total;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.organization_name.trim()) e.organization_name = 'اسم الكيان مطلوب';
    if (!form.contact_name.trim()) e.contact_name = 'اسم المسؤول مطلوب';
    if (!form.email.trim()) e.email = 'البريد الإلكتروني مطلوب';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'بريد إلكتروني غير صالح';
    if (!form.agree) e.agree = 'يجب الموافقة على الشروط';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !plan) return;
    setSubmitting(true);
    try {
      const addons = selectedAddons.map(id => {
        const a = (plan.optional_addons || []).find(x => x.id === id || x.name === id);
        return a ? { id: a.id, name: a.name, price: a.price } : null;
      }).filter(Boolean);

      const utmSource = searchParams.get('utm_source');
      const utmCampaign = searchParams.get('utm_campaign');
      const utmMedium = searchParams.get('utm_medium');

      const { data, error } = await supabase.functions.invoke('submit-subscription-request', {
        body: {
          plan_id: plan.id,
          selected_addons: addons,
          organization_name: form.organization_name,
          contact_name: form.contact_name,
          phone: form.phone,
          email: form.email,
          entity_type: form.entity_type,
          entity_category: form.entity_category,
          region: form.region,
          address: form.address,
          page_source: pageSource,
          utm_source: utmSource,
          utm_campaign: utmCampaign,
          utm_medium: utmMedium,
        },
      });

      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }

      setRequestNumber(data.request_number);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ في إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DocsLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DocsLayout>
    );
  }

  if (invalidPlan) {
    return (
      <DocsLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">الباقة غير موجودة</h2>
          <p className="text-muted-foreground">يرجى اختيار باقة من صفحة الباقات</p>
          <Link to="/pricing">
            <Button>عرض الباقات</Button>
          </Link>
        </div>
      </DocsLayout>
    );
  }

  if (submitted) {
    return (
      <DocsLayout>
        <div className="max-w-lg mx-auto text-center py-16 space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground">تم استلام طلبكم بنجاح!</h2>
          <p className="text-muted-foreground">
            رقم الطلب: <span className="font-mono font-bold text-foreground">{requestNumber}</span>
          </p>
          <p className="text-muted-foreground">
            سيتم التواصل معكم خلال 24 ساعة عمل لإتمام إجراءات الاشتراك
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/pricing">
              <Button variant="outline">عرض الباقات</Button>
            </Link>
            <Link to="/">
              <Button>الصفحة الرئيسية</Button>
            </Link>
          </div>
        </div>
      </DocsLayout>
    );
  }

  return (
    <DocsLayout>
      <div className="mb-6">
        <Link to="/pricing" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
          <ArrowRight className="h-4 w-4" />
          العودة إلى الباقات
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-8">طلب اشتراك - {plan?.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Right Column: Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">بيانات المنظمة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم الكيان <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.organization_name}
                    onChange={e => setForm(f => ({ ...f, organization_name: e.target.value }))}
                    placeholder="اسم المنظمة أو الجمعية"
                  />
                  {errors.organization_name && <p className="text-xs text-destructive">{errors.organization_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>اسم الموظف المسؤول <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.contact_name}
                    onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                    placeholder="الاسم الكامل"
                  />
                  {errors.contact_name && <p className="text-xs text-destructive">{errors.contact_name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رقم الجوال</Label>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني <span className="text-destructive">*</span></Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نوع الكيان</Label>
                  <Select value={form.entity_type} onValueChange={v => setForm(f => ({ ...f, entity_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="اختر نوع الكيان" /></SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>تصنيف الكيان</Label>
                  <Input
                    value={form.entity_category}
                    onChange={e => setForm(f => ({ ...f, entity_category: e.target.value }))}
                    placeholder="مثال: رعاية أيتام، تعليم..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المنطقة</Label>
                  <Select value={form.region} onValueChange={v => setForm(f => ({ ...f, region: v }))}>
                    <SelectTrigger><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="العنوان التفصيلي"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="agree"
                  checked={form.agree}
                  onCheckedChange={c => setForm(f => ({ ...f, agree: !!c }))}
                />
                <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
                  أوافق على شروط الاستخدام وسياسة الخصوصية
                </Label>
              </div>
              {errors.agree && <p className="text-xs text-destructive">{errors.agree}</p>}
            </CardContent>
          </Card>
        </div>

        {/* Left Column: Plan Summary */}
        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-lg">ملخص الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="font-medium">{plan?.name}</span>
                <span className="font-bold text-primary">
                  {plan?.yearly_price.toLocaleString('ar-SA')} ر.س
                </span>
              </div>

              {/* Optional Addons */}
              {(plan?.optional_addons || []).length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">خدمات إضافية (اختيارية)</Label>
                  {(plan?.optional_addons || []).map(addon => (
                    <div key={addon.id || addon.name} className="flex items-start gap-2">
                      <Checkbox
                        id={`addon-${addon.id || addon.name}`}
                        checked={selectedAddons.includes(addon.id || addon.name)}
                        onCheckedChange={checked => {
                          const key = addon.id || addon.name;
                          setSelectedAddons(prev =>
                            checked ? [...prev, key] : prev.filter(a => a !== key)
                          );
                        }}
                      />
                      <Label htmlFor={`addon-${addon.id || addon.name}`} className="text-sm cursor-pointer flex-1">
                        <span>{addon.name}</span>
                        <span className="text-muted-foreground mr-1">({addon.price} ر.س)</span>
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-bold text-lg">الإجمالي</span>
                <span className="font-bold text-lg text-primary">
                  {totalAmount().toLocaleString('ar-SA')} ر.س
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                * لا يشمل ضريبة القيمة المضافة
              </p>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    جاري الإرسال...
                  </>
                ) : (
                  'إكمال الطلب'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DocsLayout>
  );
}
