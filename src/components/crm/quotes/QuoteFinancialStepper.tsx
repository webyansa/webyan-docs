import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import {
  CheckCircle2,
  Circle,
  Lock,
  XCircle,
  Loader2,
  UserCheck,
  Banknote,
  Receipt,
  FileCheck,
  Send,
  CalendarIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/crm/pipelineConfig';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { InvoiceRequestModal } from '@/components/crm/modals/InvoiceRequestModal';

interface QuoteFinancialStepperProps {
  quote: any;
  quoteId: string;
}

type StepStatus = 'locked' | 'active' | 'completed' | 'rejected';

interface StepConfig {
  key: string;
  label: string;
  icon: React.ElementType;
}

const STEPS: StepConfig[] = [
  { key: 'client_approval', label: 'تعميد العميل', icon: UserCheck },
  { key: 'payment_confirmation', label: 'تأكيد الدفع', icon: Banknote },
  { key: 'invoice_request', label: 'طلب إصدار فاتورة', icon: Receipt },
  { key: 'invoice_issued', label: 'إصدار الفاتورة', icon: FileCheck },
  { key: 'invoice_sent', label: 'إرسال الفاتورة للعميل', icon: Send },
];

export function QuoteFinancialStepper({ quote, quoteId }: QuoteFinancialStepperProps) {
  const queryClient = useQueryClient();
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showInvoiceRequestModal, setShowInvoiceRequestModal] = useState(false);
  const [showIssueConfirmDialog, setShowIssueConfirmDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);

  // Approval form state
  const [approvalChoice, setApprovalChoice] = useState<'yes' | 'no'>('yes');
  const [rejectionReason, setRejectionReason] = useState('');

  // Payment form state
  const [paymentBankName, setPaymentBankName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [transferNumber, setTransferNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Fetch invoice request status
  const { data: invoiceRequest } = useQuery({
    queryKey: ['invoice-request-for-stepper', quoteId],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoice_requests')
        .select('id, request_number, status')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Determine step statuses
  const getStepStatuses = (): StepStatus[] => {
    const q = quote as any;
    const statuses: StepStatus[] = ['locked', 'locked', 'locked', 'locked', 'locked'];

    // Step 1: Client Approval
    if (q.status !== 'accepted') return statuses;
    
    if (q.client_approved === true) {
      statuses[0] = 'completed';
    } else if (q.client_approved === false) {
      statuses[0] = 'rejected';
      return statuses; // Stop here if rejected
    } else {
      statuses[0] = 'active';
      return statuses;
    }

    // Step 2: Payment Confirmation
    if (q.payment_confirmed === true) {
      statuses[1] = 'completed';
    } else {
      statuses[1] = 'active';
      return statuses;
    }

    // Step 3: Invoice Request
    const invoiceRequested = q.invoice_status === 'requested' || q.invoice_status === 'issued';
    if (invoiceRequested) {
      statuses[2] = 'completed';
    } else {
      statuses[2] = 'active';
      return statuses;
    }

    // Step 4: Invoice Issued
    if (q.invoice_status === 'issued') {
      statuses[3] = 'completed';
    } else {
      statuses[3] = 'active';
      return statuses;
    }

    // Step 5: Sent to Client
    if (q.invoice_sent_to_client === true) {
      statuses[4] = 'completed';
    } else {
      statuses[4] = 'active';
    }

    return statuses;
  };

  const stepStatuses = getStepStatuses();

  // Mutations
  const approvalMutation = useMutation({
    mutationFn: async () => {
      const approved = approvalChoice === 'yes';
      const updateData: any = {
        client_approved: approved,
        client_approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (!approved) {
        updateData.client_rejection_reason = rejectionReason;
      }
      const { error } = await supabase.from('crm_quotes').update(updateData).eq('id', quoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-quote-details', quoteId] });
      toast.success(approvalChoice === 'yes' ? 'تم تعميد العميل بنجاح' : 'تم تسجيل عدم التعميد');
      setShowApprovalDialog(false);
      setRejectionReason('');
    },
    onError: () => toast.error('حدث خطأ'),
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('crm_quotes').update({
        payment_confirmed: true,
        payment_bank_name: paymentBankName,
        payment_amount: parseFloat(paymentAmount),
        payment_date: format(paymentDate, 'yyyy-MM-dd'),
        payment_transfer_number: transferNumber,
        payment_notes: paymentNotes || null,
        payment_confirmed_at: new Date().toISOString(),
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      } as any).eq('id', quoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-quote-details', quoteId] });
      toast.success('تم تأكيد الدفع بنجاح');
      setShowPaymentDialog(false);
      setPaymentBankName('');
      setPaymentAmount('');
      setPaymentDate(new Date());
      setTransferNumber('');
      setPaymentNotes('');
    },
    onError: () => toast.error('حدث خطأ'),
  });

  const issueConfirmMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('crm_quotes').update({
        invoice_status: 'issued',
        updated_at: new Date().toISOString(),
      } as any).eq('id', quoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-quote-details', quoteId] });
      toast.success('تم تأكيد إصدار الفاتورة');
      setShowIssueConfirmDialog(false);
    },
    onError: () => toast.error('حدث خطأ'),
  });

  const sendToClientMutation = useMutation({
    mutationFn: async () => {
      // Call edge function to send thank-you email
      const { error } = await supabase.functions.invoke('send-invoice-to-client', {
        body: { quote_id: quoteId },
      });
      if (error) throw error;

      // Update quote
      const { error: updateError } = await supabase.from('crm_quotes').update({
        invoice_sent_to_client: true,
        invoice_sent_to_client_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any).eq('id', quoteId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-quote-details', quoteId] });
      toast.success('تم إرسال الفاتورة للعميل بنجاح');
      setShowSendDialog(false);
    },
    onError: (err: any) => toast.error(err.message || 'حدث خطأ أثناء الإرسال'),
  });

  const handleStepAction = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: setShowApprovalDialog(true); break;
      case 1: setShowPaymentDialog(true); break;
      case 2: setShowInvoiceRequestModal(true); break;
      case 3: setShowIssueConfirmDialog(true); break;
      case 4: setShowSendDialog(true); break;
    }
  };

  const getStepDetails = (stepIndex: number): string | null => {
    const q = quote as any;
    switch (stepIndex) {
      case 0:
        if (q.client_approved === true)
          return `تم التعميد ${q.client_approved_at ? '• ' + format(new Date(q.client_approved_at), 'dd MMM yyyy', { locale: ar }) : ''}`;
        if (q.client_approved === false)
          return `لم يتم التعميد${q.client_rejection_reason ? ' • السبب: ' + q.client_rejection_reason : ''}`;
        return null;
      case 1:
        if (q.payment_confirmed) {
          const parts = [formatCurrency(q.payment_amount || 0)];
          if (q.payment_bank_name) parts.push(q.payment_bank_name);
          if (q.payment_transfer_number) parts.push(`إيصال #${q.payment_transfer_number}`);
          if (q.payment_date) parts.push(format(new Date(q.payment_date), 'dd MMM yyyy', { locale: ar }));
          return parts.join(' • ');
        }
        return null;
      case 2:
        if (invoiceRequest)
          return `رقم الطلب: ${invoiceRequest.request_number} • ${invoiceRequest.status === 'issued' ? 'تم الإصدار' : 'تم الطلب'}`;
        if (q.invoice_status === 'requested' || q.invoice_status === 'issued')
          return 'تم الطلب';
        return null;
      case 3:
        if (q.invoice_status === 'issued')
          return 'تم إصدار الفاتورة';
        return null;
      case 4:
        if (q.invoice_sent_to_client)
          return `تم الإرسال${q.invoice_sent_to_client_at ? ' • ' + format(new Date(q.invoice_sent_to_client_at), 'dd MMM yyyy', { locale: ar }) : ''}`;
        return null;
    }
    return null;
  };

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case 'active': return <Circle className="h-6 w-6 text-blue-500 animate-pulse" />;
      case 'rejected': return <XCircle className="h-6 w-6 text-red-500" />;
      default: return <Lock className="h-5 w-5 text-muted-foreground/40" />;
    }
  };

  const getStepBgClass = (status: StepStatus) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200';
      case 'active': return 'bg-blue-50 border-blue-200';
      case 'rejected': return 'bg-red-50 border-red-200';
      default: return 'bg-muted/30 border-muted';
    }
  };

  const getActionLabel = (stepIndex: number): string => {
    switch (stepIndex) {
      case 0: return 'تسجيل التعميد';
      case 1: return 'تأكيد الدفع';
      case 2: return 'طلب إصدار فاتورة';
      case 3: return 'تأكيد إصدار الفاتورة';
      case 4: return 'إرسال للعميل';
      default: return '';
    }
  };

  if (quote.status !== 'accepted') return null;

  return (
    <>
      <Card className="border-primary/20 print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            المراحل المالية لعرض السعر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-0">
            {STEPS.map((step, index) => {
              const status = stepStatuses[index];
              const details = getStepDetails(index);
              const StepIcon = step.icon;
              const isLast = index === STEPS.length - 1;

              return (
                <div key={step.key} className="relative flex gap-4">
                  {/* Vertical line */}
                  {!isLast && (
                    <div className="absolute right-[19px] top-[44px] bottom-0 w-0.5">
                      <div className={cn(
                        'h-full w-full',
                        status === 'completed' ? 'bg-green-300' : 'bg-muted-foreground/15'
                      )} />
                    </div>
                  )}

                  {/* Icon circle */}
                  <div className={cn(
                    'relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 mt-2',
                    status === 'completed' ? 'bg-green-100 border-green-400' :
                    status === 'active' ? 'bg-blue-100 border-blue-400' :
                    status === 'rejected' ? 'bg-red-100 border-red-400' :
                    'bg-muted border-muted-foreground/20'
                  )}>
                    {getStepIcon(status)}
                  </div>

                  {/* Content */}
                  <div className={cn(
                    'flex-1 rounded-lg border p-4 mb-3 transition-all',
                    getStepBgClass(status)
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StepIcon className={cn(
                          'h-4 w-4',
                          status === 'completed' ? 'text-green-600' :
                          status === 'active' ? 'text-blue-600' :
                          status === 'rejected' ? 'text-red-600' :
                          'text-muted-foreground/40'
                        )} />
                        <span className={cn(
                          'font-semibold text-sm',
                          status === 'locked' && 'text-muted-foreground/50'
                        )}>
                          {step.label}
                        </span>
                        <Badge variant="outline" className={cn(
                          'text-xs',
                          status === 'completed' && 'text-green-700 border-green-300 bg-green-100',
                          status === 'active' && 'text-blue-700 border-blue-300 bg-blue-100',
                          status === 'rejected' && 'text-red-700 border-red-300 bg-red-100',
                          status === 'locked' && 'text-muted-foreground/40 border-muted bg-muted/50'
                        )}>
                          {status === 'completed' ? 'مكتمل' :
                           status === 'active' ? 'بانتظار الإجراء' :
                           status === 'rejected' ? 'مرفوض' : 'مقفل'}
                        </Badge>
                      </div>

                      {status === 'active' && (
                        <Button size="sm" onClick={() => handleStepAction(index)}>
                          {getActionLabel(index)}
                        </Button>
                      )}
                    </div>

                    {details && (
                      <p className={cn(
                        'text-xs mt-2 mr-6',
                        status === 'rejected' ? 'text-red-600' : 'text-muted-foreground'
                      )}>
                        {details}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Client Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              تعميد العميل
            </DialogTitle>
            <DialogDescription>
              هل تم تعميد العميل على عرض السعر؟
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={approvalChoice} onValueChange={(v) => setApprovalChoice(v as 'yes' | 'no')}>
              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="yes" id="approve-yes" />
                <Label htmlFor="approve-yes" className="cursor-pointer flex-1">نعم، تم التعميد</Label>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="no" id="approve-no" />
                <Label htmlFor="approve-no" className="cursor-pointer flex-1">لا، لم يتم التعميد</Label>
              </div>
            </RadioGroup>

            {approvalChoice === 'no' && (
              <div className="space-y-2">
                <Label>سبب عدم التعميد</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="اذكر سبب عدم تعميد العميل..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>إلغاء</Button>
            <Button
              onClick={() => approvalMutation.mutate()}
              disabled={approvalMutation.isPending || (approvalChoice === 'no' && !rejectionReason.trim())}
            >
              {approvalMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: Payment Confirmation Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              تأكيد الدفع
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات التحويل البنكي
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم البنك *</Label>
              <Select value={paymentBankName} onValueChange={setPaymentBankName}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر البنك..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="البنك الأهلي السعودي (SNB)">البنك الأهلي السعودي (SNB)</SelectItem>
                  <SelectItem value="مصرف الراجحي">مصرف الراجحي</SelectItem>
                  <SelectItem value="بنك الرياض">بنك الرياض</SelectItem>
                  <SelectItem value="البنك السعودي البريطاني (ساب)">البنك السعودي البريطاني (ساب)</SelectItem>
                  <SelectItem value="البنك العربي الوطني">البنك العربي الوطني</SelectItem>
                  <SelectItem value="مصرف الإنماء">مصرف الإنماء</SelectItem>
                  <SelectItem value="البنك السعودي الفرنسي">البنك السعودي الفرنسي</SelectItem>
                  <SelectItem value="البنك السعودي للاستثمار">البنك السعودي للاستثمار</SelectItem>
                  <SelectItem value="بنك الجزيرة">بنك الجزيرة</SelectItem>
                  <SelectItem value="بنك البلاد">بنك البلاد</SelectItem>
                  <SelectItem value="بنك الخليج الدولي - السعودية (ميم)">بنك الخليج الدولي - السعودية (ميم)</SelectItem>
                  <SelectItem value="أخرى">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المبلغ المحول (ر.س) *</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={`المبلغ المتوقع: ${formatCurrency(quote.total_amount)}`}
              />
            </div>
            <div className="space-y-2">
              <Label>تاريخ التحويل *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-right font-normal',
                      !paymentDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {paymentDate ? format(paymentDate, 'yyyy-MM-dd') : 'اختر التاريخ'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={(date) => date && setPaymentDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>رقم الإيصال *</Label>
              <Input
                value={transferNumber}
                onChange={(e) => setTransferNumber(e.target.value)}
                placeholder="أدخل رقم الإيصال"
              />
            </div>
            <div className="space-y-2">
              <Label>ملاحظة</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>إلغاء</Button>
            <Button
              onClick={() => paymentMutation.mutate()}
              disabled={paymentMutation.isPending || !paymentBankName || !paymentAmount || !transferNumber.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {paymentMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              تأكيد الدفع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 3: Invoice Request Modal (reuse existing) */}
      <InvoiceRequestModal
        open={showInvoiceRequestModal}
        onClose={() => setShowInvoiceRequestModal(false)}
        quoteId={quoteId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['crm-quote-details', quoteId] });
          queryClient.invalidateQueries({ queryKey: ['invoice-request-for-stepper', quoteId] });
        }}
      />

      {/* Step 4: Issue Confirm Dialog */}
      <AlertDialog open={showIssueConfirmDialog} onOpenChange={setShowIssueConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إصدار الفاتورة</AlertDialogTitle>
            <AlertDialogDescription>
              هل تم إصدار الفاتورة من قبل المحاسب؟ سيتم تحديث حالة الفاتورة إلى "تم الإصدار".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => issueConfirmMutation.mutate()}
              disabled={issueConfirmMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {issueConfirmMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              تأكيد الإصدار
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Step 5: Send to Client Dialog */}
      <AlertDialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إرسال الفاتورة للعميل</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إرسال رسالة شكر مع تفاصيل الفاتورة إلى بريد العميل ({quote.account?.contact_email}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sendToClientMutation.mutate()}
              disabled={sendToClientMutation.isPending}
            >
              {sendToClientMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              <Send className="h-4 w-4 ml-2" />
              إرسال الفاتورة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
