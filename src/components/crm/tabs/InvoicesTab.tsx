import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { InvoiceForm } from '../InvoiceForm';
import { PaymentForm } from '../PaymentForm';
import { CustomerNotesSection } from '../CustomerNotesSection';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  description: string | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string | null;
  payment_date: string;
  reference_number: string | null;
  invoice_id: string | null;
}

interface InvoicesTabProps {
  organizationId: string;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: {
    label: 'معلقة',
    icon: Clock,
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  paid: {
    label: 'مدفوعة',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  overdue: {
    label: 'متأخرة',
    icon: AlertTriangle,
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  cancelled: {
    label: 'ملغية',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

const paymentMethodLabels: Record<string, string> = {
  bank_transfer: 'تحويل بنكي',
  card: 'بطاقة',
  cash: 'نقدي',
  other: 'أخرى',
};

export function InvoicesTab({ organizationId }: InvoicesTabProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<string | undefined>();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('client_invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Check and update overdue invoices
      const today = new Date().toISOString().split('T')[0];
      const updatedInvoices = (invoicesData || []).map((inv) => {
        if (inv.status === 'pending' && inv.due_date < today) {
          return { ...inv, status: 'overdue' };
        }
        return inv;
      });

      setInvoices(updatedInvoices);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('client_payments')
        .select('*')
        .eq('organization_id', organizationId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  // Calculate stats
  const stats = {
    pending: invoices
      .filter((inv) => inv.status === 'pending')
      .reduce((sum, inv) => sum + inv.amount, 0),
    paid: invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0),
    overdue: invoices
      .filter((inv) => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.amount, 0),
    total: invoices.reduce((sum, inv) => sum + inv.amount, 0),
  };

  const handlePayInvoice = (invoiceId: string) => {
    setSelectedInvoiceForPayment(invoiceId);
    setPaymentFormOpen(true);
  };

  const handlePaymentSuccess = () => {
    setSelectedInvoiceForPayment(undefined);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">المستحق</p>
                <p className="text-lg font-bold">{stats.pending.toLocaleString()} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">المدفوع</p>
                <p className="text-lg font-bold">{stats.paid.toLocaleString()} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">المتأخر</p>
                <p className="text-lg font-bold">{stats.overdue.toLocaleString()} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الإجمالي</p>
                <p className="text-lg font-bold">{stats.total.toLocaleString()} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => setInvoiceFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          إنشاء فاتورة
        </Button>
        <Button variant="outline" onClick={() => setPaymentFormOpen(true)} className="gap-2">
          <CreditCard className="w-4 h-4" />
          تسجيل دفعة
        </Button>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الإصدار</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد فواتير حتى الآن
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => {
                  const config = statusConfig[invoice.status] || statusConfig.pending;
                  const StatusIcon = config.icon;

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        {invoice.amount.toLocaleString()} {invoice.currency}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={config.className}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.issue_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {invoice.description || '-'}
                      </TableCell>
                      <TableCell>
                        {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePayInvoice(invoice.id)}
                            className="gap-1"
                          >
                            <CreditCard className="w-3 h-3" />
                            سداد
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      {payments.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-4">آخر المدفوعات</h3>
            <div className="space-y-3">
              {payments.slice(0, 5).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">
                        {payment.amount.toLocaleString()} ر.س
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.payment_method
                          ? paymentMethodLabels[payment.payment_method] || payment.payment_method
                          : '-'}
                        {payment.reference_number && ` - ${payment.reference_number}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forms */}
      <InvoiceForm
        organizationId={organizationId}
        open={invoiceFormOpen}
        onOpenChange={setInvoiceFormOpen}
        onSuccess={fetchData}
      />

      <PaymentForm
        organizationId={organizationId}
        open={paymentFormOpen}
        onOpenChange={(open) => {
          setPaymentFormOpen(open);
          if (!open) setSelectedInvoiceForPayment(undefined);
        }}
        onSuccess={handlePaymentSuccess}
        preselectedInvoiceId={selectedInvoiceForPayment}
      />

      {/* Invoice Notes */}
      <CustomerNotesSection 
        organizationId={organizationId} 
        noteType="invoices"
        title="ملاحظات الفواتير"
      />
    </div>
  );
}
