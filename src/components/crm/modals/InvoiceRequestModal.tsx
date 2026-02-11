import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, 
  MapPin, 
  FileText, 
  Loader2, 
  Send,
  CreditCard,
  Receipt,
  AlertCircle,
  Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/crm/pipelineConfig';

interface InvoiceRequestModalProps {
  open: boolean;
  onClose: () => void;
  quoteId: string;
  onSuccess?: () => void;
}

interface OrganizationData {
  id: string;
  name: string;
  registration_number: string | null;
  tax_number: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  contact_email: string;
  contact_phone: string | null;
  city: string | null;
  district: string | null;
  street_name: string | null;
  building_number: string | null;
  postal_code: string | null;
  secondary_number: string | null;
  region: string | null;
}

interface QuoteData {
  id: string;
  quote_number: string;
  title: string;
  created_at: string;
  subtotal: number;
  discount_value: number | null;
  discount_type: string | null;
  tax_rate: number | null;
  tax_amount: number | null;
  total_amount: number;
  items: any[];
  account: OrganizationData;
  plan?: { name: string } | null;
}

interface ExistingRequest {
  id: string;
  request_number: string;
  status: string;
  sent_at: string;
}

export function InvoiceRequestModal({ open, onClose, quoteId, onSuccess }: InvoiceRequestModalProps) {
  const queryClient = useQueryClient();
  const [notesForAccounts, setNotesForAccounts] = useState('');
  const [expectedPaymentMethod, setExpectedPaymentMethod] = useState('');
  const [isResend, setIsResend] = useState(false);
  const [resendReason, setResendReason] = useState('');

  // Fetch quote data with organization details
  const { data: quote, isLoading: loadingQuote } = useQuery({
    queryKey: ['invoice-request-quote', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_quotes')
        .select(`
          id, quote_number, title, created_at, subtotal, 
          discount_value, discount_type, tax_rate, tax_amount, total_amount, items,
          plan:pricing_plans!crm_quotes_plan_id_fkey(name),
          account:client_organizations!crm_quotes_account_id_fkey(
            id, name, registration_number, tax_number,
            primary_contact_name, primary_contact_email, primary_contact_phone,
            contact_email, contact_phone,
            city, district, street_name, building_number, postal_code, secondary_number, region
          )
        `)
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      return data as QuoteData;
    },
    enabled: open && !!quoteId,
  });

  // Check for existing invoice request
  const { data: existingRequest, isLoading: loadingExisting } = useQuery({
    queryKey: ['existing-invoice-request', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_requests')
        .select('id, request_number, status, sent_at')
        .eq('quote_id', quoteId)
        .neq('status', 'issued')
        .maybeSingle();

      if (error) throw error;
      return data as ExistingRequest | null;
    },
    enabled: open && !!quoteId,
  });

  // Get current staff
  const { data: currentStaff } = useQuery({
    queryKey: ['current-staff-for-invoice'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('staff_members')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (existingRequest) {
      setIsResend(true);
    } else {
      setIsResend(false);
      setResendReason('');
    }
  }, [existingRequest]);

  // Submit invoice request
  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-invoice-request', {
        body: {
          quote_id: quoteId,
          notes_for_accounts: notesForAccounts || null,
          expected_payment_method: expectedPaymentMethod || null,
          sent_by: currentStaff?.id || null,
          is_resend: isResend,
          resend_reason: isResend ? resendReason : null,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`تم إرسال طلب إصدار الفاتورة بنجاح (${data.request_number})`);
      queryClient.invalidateQueries({ queryKey: ['existing-invoice-request', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['crm-quote-details', quoteId] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      console.error('Invoice request error:', error);
      toast.error(error.message || 'حدث خطأ أثناء إرسال طلب الفاتورة');
    },
  });

  const handleSubmit = () => {
    if (isResend && !resendReason.trim()) {
      toast.error('يرجى إدخال سبب إعادة الإرسال');
      return;
    }
    submitMutation.mutate();
  };

  const isLoading = loadingQuote || loadingExisting;
  const organization = quote?.account;

  // Calculate financial summary
  const subtotal = quote?.subtotal || 0;
  const discountValue = quote?.discount_value || 0;
  const discountType = quote?.discount_type || 'fixed';
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * discountValue / 100) 
    : discountValue;
  const afterDiscount = subtotal - discountAmount;
  const taxRate = quote?.tax_rate || 15;
  const taxAmount = quote?.tax_amount || (afterDiscount * taxRate / 100);
  const totalAmount = quote?.total_amount || (afterDiscount + taxAmount);

  // Build description from items
  const getInvoiceDescription = () => {
    if (!quote?.items || !Array.isArray(quote.items)) return quote?.title || '';
    const planName = quote.plan?.name;
    const items = quote.items as { name: string; type: string }[];
    const services = items.filter(i => i.type === 'service').map(i => i.name);
    
    let desc = quote.title;
    if (planName) desc += ` | خطة: ${planName}`;
    if (services.length > 0) desc += ` | خدمات: ${services.slice(0, 3).join('، ')}`;
    return desc;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            طلب إصدار فاتورة
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !quote || !organization ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لم يتم العثور على بيانات العرض</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Existing Request Warning */}
            {existingRequest && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">يوجد طلب سابق لهذا العرض</p>
                    <p className="text-sm text-amber-700 mt-1">
                      رقم الطلب: <strong>{existingRequest.request_number}</strong> | 
                      الحالة: <Badge variant="outline" className="mr-1">
                        {existingRequest.status === 'sent' ? 'تم الإرسال' : 
                         existingRequest.status === 'processing' ? 'تحت الإجراء' : existingRequest.status}
                      </Badge>
                    </p>
                    <p className="text-sm text-amber-600 mt-2">
                      يمكنك إعادة إرسال الطلب مع ذكر السبب
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Client Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  بيانات العميل
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">اسم الجهة</Label>
                  <p className="font-medium">{organization.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">رقم السجل التجاري</Label>
                  <p className="font-medium">{organization.registration_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">الرقم الضريبي</Label>
                  <p className="font-medium">{organization.tax_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">جهة الاتصال</Label>
                  <p className="font-medium">
                    {organization.primary_contact_name || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">البريد الإلكتروني</Label>
                  <p className="font-medium">
                    {organization.primary_contact_email || organization.contact_email}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">الجوال</Label>
                  <p className="font-medium">
                    {organization.primary_contact_phone || organization.contact_phone || '-'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* National Address */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  العنوان الوطني
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">المدينة</Label>
                  <p className="font-medium">{organization.city || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">المنطقة</Label>
                  <p className="font-medium">
                    {organization.region ? ({
                      riyadh: 'منطقة الرياض', makkah: 'منطقة مكة المكرمة', madinah: 'منطقة المدينة المنورة',
                      qassim: 'منطقة القصيم', eastern: 'المنطقة الشرقية', asir: 'منطقة عسير',
                      tabuk: 'منطقة تبوك', hail: 'منطقة حائل', northern_borders: 'منطقة الحدود الشمالية',
                      jazan: 'منطقة جازان', najran: 'منطقة نجران', bahah: 'منطقة الباحة', jawf: 'منطقة الجوف',
                    } as Record<string, string>)[organization.region] || organization.region : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">الحي</Label>
                  <p className="font-medium">{organization.district || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">الشارع</Label>
                  <p className="font-medium">{organization.street_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">رقم المبنى</Label>
                  <p className="font-medium">{organization.building_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">الرمز البريدي</Label>
                  <p className="font-medium">{organization.postal_code || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">الرقم الإضافي</Label>
                  <p className="font-medium">{organization.secondary_number || '-'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  بيانات الفاتورة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">رقم عرض السعر</Label>
                    <p className="font-medium font-mono">{quote.quote_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">تاريخ العرض</Label>
                    <p className="font-medium">
                      {new Date(quote.created_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">وصف الفاتورة</Label>
                  <p className="font-medium text-sm mt-1">{getInvoiceDescription()}</p>
                </div>

                <Separator />

                {/* Financial Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">المبلغ قبل الضريبة</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>الخصم {discountType === 'percentage' ? `(${discountValue}%)` : ''}</span>
                      <span>- {formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ضريبة القيمة المضافة ({taxRate}%)</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>الإجمالي المطلوب</span>
                    <span className="text-primary">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  خيارات إضافية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>طريقة السداد المتوقعة (اختياري)</Label>
                  <Select value={expectedPaymentMethod} onValueChange={setExpectedPaymentMethod}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="اختر طريقة السداد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                      <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>ملاحظات لقسم الحسابات (اختياري)</Label>
                  <Textarea
                    value={notesForAccounts}
                    onChange={(e) => setNotesForAccounts(e.target.value)}
                    placeholder="أي ملاحظات إضافية تود إرسالها مع الطلب..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {isResend && (
                  <div>
                    <Label className="text-amber-700">سبب إعادة الإرسال *</Label>
                    <Textarea
                      value={resendReason}
                      onChange={(e) => setResendReason(e.target.value)}
                      placeholder="اذكر سبب إعادة إرسال الطلب..."
                      className="mt-1 border-amber-300 focus:border-amber-500"
                      rows={2}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitMutation.isPending}>
            إلغاء
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || submitMutation.isPending || !quote}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 ml-2" />
                {isResend ? 'إعادة إرسال الطلب' : 'إرسال طلب الفاتورة'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
