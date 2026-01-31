import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  ArrowRight,
  Building2,
  Calendar,
  User,
  Mail,
  Download,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Loader2,
  Send,
  Phone,
  MapPin,
  Printer,
  Eye,
  Package,
  Receipt,
  Percent,
  CreditCard,
  Clock,
  FileCheck,
  Hash,
} from 'lucide-react';
import { formatCurrency } from '@/lib/crm/pipelineConfig';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { PDFDownloadLink, BlobProvider, pdf } from '@react-pdf/renderer';
import QuotePDFDocument from '@/components/crm/quotes/QuotePDFDocument';

interface QuoteItem {
  id?: string;
  name: string;
  description?: string;
  type: 'plan' | 'service' | 'custom';
  billing?: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  total: number;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string; bgColor: string }> = {
  draft: { label: 'مسودة', variant: 'outline', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  sent: { label: 'مرسل', variant: 'default', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  viewed: { label: 'تمت المشاهدة', variant: 'secondary', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  accepted: { label: 'معتمد', variant: 'default', color: 'text-green-600', bgColor: 'bg-green-100' },
  rejected: { label: 'مرفوض', variant: 'destructive', color: 'text-red-600', bgColor: 'bg-red-100' },
  expired: { label: 'منتهي', variant: 'secondary', color: 'text-orange-600', bgColor: 'bg-orange-100' },
};

const quoteTypeLabels: Record<string, string> = {
  subscription: 'اشتراك منصة',
  custom_platform: 'منصة مخصصة',
  services_only: 'خدمات فقط',
};

const billingCycleLabels: Record<string, string> = {
  monthly: 'شهري',
  yearly: 'سنوي',
};

// Default company info (fallback)
const DEFAULT_COMPANY_INFO = {
  name: 'شركة رنين للتقنية',
  nameEn: 'Raneen Technology Co.',
  email: 'info@raneen.sa',
  phone: '+966 50 123 4567',
  address: 'طريق الملك فهد',
  city: 'الرياض',
  taxNumber: '300000000000003',
  crNumber: '1010000000',
  website: 'https://raneen.sa',
  logoUrl: '',
  webyanLogoUrl: '',
  stampUrl: '',
};

export default function QuoteDetailsPage() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch company settings for quotes
  const { data: companySettings } = useQuery({
    queryKey: ['quote-company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .like('key', 'quote_%');
      
      if (error) throw error;
      
      const settings: Record<string, string> = {};
      data?.forEach(s => {
        settings[s.key] = s.value;
      });
      return settings;
    },
  });

  // Merge settings with defaults
  const COMPANY_INFO = {
    name: companySettings?.quote_company_name_ar || DEFAULT_COMPANY_INFO.name,
    nameEn: companySettings?.quote_company_name_en || DEFAULT_COMPANY_INFO.nameEn,
    email: companySettings?.quote_company_email || DEFAULT_COMPANY_INFO.email,
    phone: companySettings?.quote_company_phone || DEFAULT_COMPANY_INFO.phone,
    address: companySettings?.quote_company_address || DEFAULT_COMPANY_INFO.address,
    city: companySettings?.quote_company_city || DEFAULT_COMPANY_INFO.city,
    taxNumber: companySettings?.quote_company_tax_number || DEFAULT_COMPANY_INFO.taxNumber,
    crNumber: companySettings?.quote_company_cr_number || DEFAULT_COMPANY_INFO.crNumber,
    website: companySettings?.quote_company_website || DEFAULT_COMPANY_INFO.website,
    logoUrl: companySettings?.quote_company_logo_url || '/raneen-logo.png',
    webyanLogoUrl: companySettings?.quote_webyan_logo_url || '/webyan-logo-02.svg',
    stampUrl: companySettings?.quote_company_stamp_url || '',
  };

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['crm-quote-details', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_quotes')
        .select(`
          *,
          account:client_organizations!crm_quotes_account_id_fkey(id, name, contact_email, contact_phone, city, address),
          opportunity:crm_opportunities!crm_quotes_opportunity_id_fkey(id, name, stage),
          plan:pricing_plans!crm_quotes_plan_id_fkey(id, name, description, monthly_price, yearly_price, features)
        `)
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      
      let staffName = null;
      if (data.created_by) {
        const { data: staffData } = await supabase
          .from('staff_members')
          .select('full_name')
          .eq('id', data.created_by)
          .single();
        staffName = staffData?.full_name;
      }
      
      return { ...data, created_by_staff_name: staffName };
    },
    enabled: !!quoteId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, additionalData }: { status: string; additionalData?: object }) => {
      const { error } = await supabase
        .from('crm_quotes')
        .update({
          status,
          ...additionalData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-quote-details', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['crm-quotes'] });
    },
  });

  const handleAccept = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        status: 'accepted',
        additionalData: { accepted_at: new Date().toISOString() },
      });
      toast.success('تم اعتماد عرض السعر بنجاح');
      setShowAcceptDialog(false);
    } catch {
      toast.error('حدث خطأ أثناء اعتماد العرض');
    }
  };

  const handleReject = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        status: 'rejected',
        additionalData: { rejected_at: new Date().toISOString() },
      });
      toast.success('تم رفض عرض السعر');
      setShowRejectDialog(false);
    } catch {
      toast.error('حدث خطأ أثناء رفض العرض');
    }
  };

  const handleSend = async () => {
    if (!quote?.account?.contact_email) {
      toast.error('لا يوجد بريد إلكتروني للعميل');
      return;
    }

    try {
      const { error: sendError } = await supabase.functions.invoke('send-quote-email', {
        body: {
          quoteId: quoteId,
          recipientEmail: quote.account.contact_email,
          recipientName: quote.account.name,
        },
      });

      if (sendError) {
        throw sendError;
      }

      queryClient.invalidateQueries({ queryKey: ['crm-quote-details', quoteId] });
      toast.success('تم إرسال عرض السعر بنجاح');
    } catch (err) {
      console.error('Send error:', err);
      toast.error('حدث خطأ أثناء إرسال العرض');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold mb-2">عرض السعر غير موجود</h2>
        <p className="text-muted-foreground mb-4">لم يتم العثور على عرض السعر المطلوب</p>
        <Button onClick={() => navigate('/admin/crm/quotes')}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة لعروض الأسعار
        </Button>
      </div>
    );
  }

  const items: QuoteItem[] = Array.isArray(quote.items) ? (quote.items as unknown as QuoteItem[]) : [];
  const statusInfo = statusConfig[quote.status || 'draft'] || statusConfig.draft;
  
  // Calculate totals
  const subtotalBeforeDiscount = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = quote.discount_value || 0;
  const discountType = quote.discount_type || 'fixed';
  const calculatedDiscount = discountType === 'percentage' 
    ? (subtotalBeforeDiscount * discountAmount / 100) 
    : discountAmount;
  const subtotalAfterDiscount = subtotalBeforeDiscount - calculatedDiscount;
  const taxRate = quote.tax_rate || 15;
  const taxAmount = quote.tax_amount || (subtotalAfterDiscount * taxRate / 100);
  const totalAmount = quote.total_amount || (subtotalAfterDiscount + taxAmount);

  const quoteData = {
    ...quote,
    items,
    company: COMPANY_INFO,
    subtotalBeforeDiscount,
    calculatedDiscount,
    discountType,
    discountAmount,
    subtotalAfterDiscount,
    taxRate,
    taxAmount,
    totalAmount,
  };

  // Manual PDF download function as fallback
  const handleManualPDFDownload = async () => {
    try {
      toast.info('جاري إنشاء ملف PDF...');
      const blob = await pdf(<QuotePDFDocument data={quoteData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quote-${quote.quote_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('تم تحميل PDF بنجاح');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('حدث خطأ أثناء إنشاء PDF');
    }
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/crm/quotes')}>
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0 px-3 py-1`}>
            {statusInfo.label}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                إجراءات
                <MoreHorizontal className="h-4 w-4 mr-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {quote.status !== 'accepted' && quote.status !== 'rejected' && (
                <>
                  <DropdownMenuItem onClick={() => setShowAcceptDialog(true)}>
                    <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
                    اعتماد العرض
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowRejectDialog(true)}>
                    <XCircle className="h-4 w-4 ml-2 text-destructive" />
                    رفض العرض
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleSend}>
                <Send className="h-4 w-4 ml-2" />
                إرسال بالبريد
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowPDFPreview(true)}>
                <Eye className="h-4 w-4 ml-2" />
                معاينة PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleManualPDFDownload}>
                <Download className="h-4 w-4 ml-2" />
                تحميل PDF (بديل)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <PDFDownloadLink
            document={<QuotePDFDocument data={quoteData} />}
            fileName={`Quote-${quote.quote_number}.pdf`}
          >
            {({ loading, error }) => (
              <Button disabled={loading || !!error} onClick={() => error && toast.error('حدث خطأ أثناء إنشاء PDF')}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري التحميل...
                  </>
                ) : error ? (
                  <>
                    <FileText className="h-4 w-4 ml-2" />
                    خطأ في PDF
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 ml-2" />
                    تحميل PDF
                  </>
                )}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </div>

      {/* Main Quote Document */}
      <div ref={printRef} className="bg-card border rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-0">
        {/* Document Header */}
        <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-6 border-b">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-primary">عرض سعر</h1>
              </div>
              <p className="text-lg font-semibold text-foreground">{quote.title}</p>
            </div>
            <div className="text-left space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <Hash className="h-4 w-4" />
                <span className="text-xl font-bold font-mono">{quote.quote_number}</span>
              </div>
              <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Company & Client Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-muted/30">
          {/* Company Info */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                من
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <h3 className="font-bold text-lg">{COMPANY_INFO.name}</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  {COMPANY_INFO.email}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  {COMPANY_INFO.phone}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  {COMPANY_INFO.city}، {COMPANY_INFO.address}
                </p>
              </div>
              <Separator className="my-2" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>الرقم الضريبي: {COMPANY_INFO.taxNumber}</p>
                <p>السجل التجاري: {COMPANY_INFO.crNumber}</p>
              </div>
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                إلى (العميل)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quote.account ? (
                <>
                  <Link
                    to={`/admin/clients/${quote.account.id}`}
                    className="font-bold text-lg hover:text-primary transition-colors block"
                  >
                    {quote.account.name}
                  </Link>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {quote.account.contact_email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {quote.account.contact_email}
                      </p>
                    )}
                    {quote.account.contact_phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {quote.account.contact_phone}
                      </p>
                    )}
                    {quote.account.city && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {quote.account.city}
                        {quote.account.address && ` - ${quote.account.address}`}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">لا يوجد عميل مرتبط</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quote Meta Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b bg-muted/20">
          <div className="text-center p-3 rounded-lg bg-card">
            <p className="text-xs text-muted-foreground mb-1">تاريخ الإصدار</p>
            <p className="font-semibold">{format(new Date(quote.created_at), 'dd MMM yyyy', { locale: ar })}</p>
          </div>
          {quote.sent_at && (
            <div className="text-center p-3 rounded-lg bg-card">
              <p className="text-xs text-muted-foreground mb-1">تاريخ الإرسال</p>
              <p className="font-semibold">{format(new Date(quote.sent_at), 'dd MMM yyyy', { locale: ar })}</p>
            </div>
          )}
          {quote.valid_until && (
            <div className="text-center p-3 rounded-lg bg-card">
              <p className="text-xs text-muted-foreground mb-1">صالح حتى</p>
              <p className="font-semibold">{format(new Date(quote.valid_until), 'dd MMM yyyy', { locale: ar })}</p>
            </div>
          )}
          <div className="text-center p-3 rounded-lg bg-card">
            <p className="text-xs text-muted-foreground mb-1">نوع العرض</p>
            <p className="font-semibold">{quoteTypeLabels[quote.quote_type || 'subscription']}</p>
          </div>
        </div>

        {/* Plan Details (if subscription) */}
        {quote.plan && (
          <div className="p-6 border-b bg-primary/5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{quote.plan.name}</h3>
                  {quote.billing_cycle && (
                    <Badge variant="secondary">
                      {billingCycleLabels[quote.billing_cycle]}
                    </Badge>
                  )}
                </div>
                {quote.plan.description && (
                  <p className="text-muted-foreground text-sm mb-3">{quote.plan.description}</p>
                )}
                {quote.plan.features && Array.isArray(quote.plan.features) && (
                  <div className="flex flex-wrap gap-2">
                    {(quote.plan.features as string[]).slice(0, 5).map((feature, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            بنود العرض
          </h3>
          
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-right p-3 text-sm font-semibold">#</th>
                  <th className="text-right p-3 text-sm font-semibold">البند / الوصف</th>
                  <th className="text-center p-3 text-sm font-semibold">النوع</th>
                  <th className="text-center p-3 text-sm font-semibold">المدة</th>
                  <th className="text-center p-3 text-sm font-semibold">الكمية</th>
                  <th className="text-left p-3 text-sm font-semibold">السعر</th>
                  <th className="text-left p-3 text-sm font-semibold">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length > 0 ? items.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-muted/50 transition-colors">
                    <td className="p-3 text-muted-foreground">{index + 1}</td>
                    <td className="p-3">
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        {item.type === 'plan' ? 'خطة' : item.type === 'service' ? 'خدمة' : 'مخصص'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center text-muted-foreground">{item.billing || '-'}</td>
                    <td className="p-3 text-center">{item.quantity}</td>
                    <td className="p-3 text-left">{formatCurrency(item.unit_price)}</td>
                    <td className="p-3 text-left font-semibold">{formatCurrency(item.total)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      لا توجد بنود مضافة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="p-6 border-t bg-muted/30">
          <div className="max-w-md mr-auto">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              ملخص الأسعار
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="font-medium">{formatCurrency(subtotalBeforeDiscount)}</span>
              </div>
              
              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    الخصم
                    {discountType === 'percentage' && ` (${discountAmount}%)`}
                  </span>
                  <span className="font-medium">- {formatCurrency(calculatedDiscount)}</span>
                </div>
              )}

              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المجموع بعد الخصم</span>
                  <span className="font-medium">{formatCurrency(subtotalAfterDiscount)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ضريبة القيمة المضافة ({taxRate}%)</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-lg">الإجمالي المستحق</span>
                <span className="font-bold text-2xl text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        {(quote.notes || quote.terms_and_conditions) && (
          <div className="p-6 border-t space-y-4">
            {quote.notes && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  ملاحظات
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                  {quote.notes}
                </p>
              </div>
            )}
            
            {quote.terms_and_conditions && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                  الشروط والأحكام
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                  {quote.terms_and_conditions}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t bg-muted/20">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>أُعد بواسطة: {quote.created_by_staff_name || 'غير محدد'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>آخر تحديث: {format(new Date(quote.updated_at || quote.created_at), 'dd MMM yyyy HH:mm', { locale: ar })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions for pending quotes */}
      {(quote.status === 'sent' || quote.status === 'viewed' || quote.status === 'draft') && (
        <Card className="border-primary/20 bg-gradient-to-l from-primary/5 to-transparent print:hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">إجراءات سريعة</h4>
                <p className="text-sm text-muted-foreground">يمكنك اتخاذ إجراء على هذا العرض</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowRejectDialog(true)}>
                  <XCircle className="h-4 w-4 ml-2" />
                  رفض
                </Button>
                <Button onClick={() => setShowAcceptDialog(true)}>
                  <CheckCircle className="h-4 w-4 ml-2" />
                  اعتماد
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accept Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>اعتماد عرض السعر</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من اعتماد عرض السعر رقم {quote.quote_number}؟ 
              سيتم تحديث حالة العرض إلى "معتمد".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 ml-2" />
              اعتماد العرض
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>رفض عرض السعر</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رفض عرض السعر رقم {quote.quote_number}؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive hover:bg-destructive/90">
              <XCircle className="h-4 w-4 ml-2" />
              رفض العرض
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview Dialog */}
      <Dialog open={showPDFPreview} onOpenChange={setShowPDFPreview}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>معاينة عرض السعر PDF</DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-full min-h-[70vh]">
            <BlobProvider document={<QuotePDFDocument data={quoteData} />}>
              {({ blob, url, loading, error }) => {
                if (loading) {
                  return (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="mr-2">جاري تحميل المعاينة...</span>
                    </div>
                  );
                }
                if (error) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-destructive">
                      <FileText className="h-12 w-12 mb-4 opacity-50" />
                      <p>حدث خطأ أثناء تحميل المعاينة</p>
                      <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
                    </div>
                  );
                }
                if (url) {
                  return (
                    <iframe
                      src={url}
                      title="PDF Preview"
                      className="w-full h-full rounded-lg border"
                      style={{ minHeight: '65vh' }}
                    />
                  );
                }
                return null;
              }}
            </BlobProvider>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
