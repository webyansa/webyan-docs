import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
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
  Clock,
  Send,
  Target,
} from 'lucide-react';
import { formatCurrency } from '@/lib/crm/pipelineConfig';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface QuoteItem {
  name: string;
  description?: string;
  type: string;
  billing?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  draft: { label: 'مسودة', variant: 'outline', icon: FileText },
  sent: { label: 'مرسل', variant: 'default', icon: Send },
  viewed: { label: 'تمت المشاهدة', variant: 'secondary', icon: Clock },
  accepted: { label: 'معتمد', variant: 'default', icon: CheckCircle },
  rejected: { label: 'مرفوض', variant: 'destructive', icon: XCircle },
  expired: { label: 'منتهي', variant: 'secondary', icon: Clock },
};

const quoteTypeLabels: Record<string, string> = {
  subscription: 'اشتراك منصة',
  custom_platform: 'منصة مخصصة',
  services_only: 'خدمات فقط',
};

export default function QuoteDetailsPage() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['crm-quote', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_quotes')
        .select(`
          *,
          account:account_id (id, name, contact_email, contact_phone),
          opportunity:opportunity_id (id, name, stage),
          plan:plan_id (id, name)
        `)
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      
      // Fetch staff name separately
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
      queryClient.invalidateQueries({ queryKey: ['crm-quote', quoteId] });
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

  const handleResend = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        status: 'sent',
        additionalData: { sent_at: new Date().toISOString() },
      });
      toast.success('تم إعادة إرسال عرض السعر');
    } catch {
      toast.error('حدث خطأ أثناء إعادة الإرسال');
    }
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
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/crm/quotes')}>
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              عرض سعر #{quote.quote_number}
            </h1>
            <p className="text-muted-foreground">{quote.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={statusInfo.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                إجراءات
                <MoreHorizontal className="h-4 w-4 mr-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
              <DropdownMenuItem onClick={handleResend}>
                <Mail className="h-4 w-4 ml-2" />
                إعادة الإرسال
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 ml-2" />
                تحميل PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quote Items */}
          <Card>
            <CardHeader>
              <CardTitle>بنود العرض</CardTitle>
              <CardDescription>
                {quoteTypeLabels[quote.quote_type || 'subscription']}
                {quote.billing_cycle && (
                  <span className="mr-2">
                    ({quote.billing_cycle === 'monthly' ? 'شهري' : 'سنوي'})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">البند</TableHead>
                    <TableHead className="text-right">المدة</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.billing || '-'}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} className="text-left">المجموع الفرعي</TableCell>
                    <TableCell className="font-medium">{formatCurrency(quote.subtotal)}</TableCell>
                  </TableRow>
                  {quote.tax_rate && quote.tax_rate > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-left">
                        ضريبة القيمة المضافة ({quote.tax_rate}%)
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(quote.tax_amount || 0)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={5} className="text-left font-bold">الإجمالي</TableCell>
                    <TableCell className="font-bold text-primary text-lg">
                      {formatCurrency(quote.total_amount)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle>ملاحظات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Terms */}
          {quote.terms_and_conditions && (
            <Card>
              <CardHeader>
                <CardTitle>الشروط والأحكام</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {quote.terms_and_conditions}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                بيانات العميل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quote.account ? (
                <>
                  <Link
                    to={`/admin/clients/${quote.account.id}`}
                    className="font-medium hover:text-primary block"
                  >
                    {quote.account.name}
                  </Link>
                  {quote.account.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {quote.account.contact_email}
                    </div>
                  )}
                  {quote.account.contact_phone && (
                    <p className="text-sm text-muted-foreground">{quote.account.contact_phone}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">لا يوجد عميل مرتبط</p>
              )}
            </CardContent>
          </Card>

          {/* Opportunity Info */}
          {quote.opportunity && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  الفرصة المرتبطة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  to={`/admin/crm/deals/${quote.opportunity.id}`}
                  className="font-medium hover:text-primary block"
                >
                  {quote.opportunity.name}
                </Link>
                <Badge variant="outline" className="mt-2">
                  {quote.opportunity.stage}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Quote Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                معلومات العرض
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">تاريخ الإنشاء</span>
                <span>{format(new Date(quote.created_at), 'dd MMM yyyy', { locale: ar })}</span>
              </div>
              {quote.sent_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">تاريخ الإرسال</span>
                  <span>{format(new Date(quote.sent_at), 'dd MMM yyyy', { locale: ar })}</span>
                </div>
              )}
              {quote.valid_until && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">صالح حتى</span>
                  <span>{format(new Date(quote.valid_until), 'dd MMM yyyy', { locale: ar })}</span>
                </div>
              )}
              <Separator />
              {quote.created_by_staff_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">أُنشئ بواسطة:</span>
                  <span>{quote.created_by_staff_name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions Card */}
          {(quote.status === 'sent' || quote.status === 'viewed') && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">إجراءات سريعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => setShowAcceptDialog(true)}
                >
                  <CheckCircle className="h-4 w-4 ml-2" />
                  اعتماد العرض
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="h-4 w-4 ml-2" />
                  رفض العرض
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Accept Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد اعتماد العرض</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من اعتماد عرض السعر #{quote.quote_number}؟
              <br />
              القيمة الإجمالية: {formatCurrency(quote.total_amount)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept}>
              <CheckCircle className="h-4 w-4 ml-2" />
              اعتماد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد رفض العرض</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رفض عرض السعر #{quote.quote_number}؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive hover:bg-destructive/90"
            >
              <XCircle className="h-4 w-4 ml-2" />
              رفض
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
