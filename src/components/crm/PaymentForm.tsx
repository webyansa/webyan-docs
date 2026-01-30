import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
}

interface PaymentFormProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedInvoiceId?: string;
}

const paymentMethods = [
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'card', label: 'بطاقة ائتمانية' },
  { value: 'cash', label: 'نقدي' },
  { value: 'other', label: 'أخرى' },
];

export function PaymentForm({
  organizationId,
  open,
  onOpenChange,
  onSuccess,
  preselectedInvoiceId,
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(preselectedInvoiceId || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());

  useEffect(() => {
    if (open) {
      fetchUnpaidInvoices();
      if (preselectedInvoiceId) {
        setSelectedInvoiceId(preselectedInvoiceId);
      }
    }
  }, [open, preselectedInvoiceId]);

  const fetchUnpaidInvoices = async () => {
    const { data, error } = await supabase
      .from('client_invoices')
      .select('id, invoice_number, amount, status')
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true });

    if (!error && data) {
      setInvoices(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();

      // Insert payment
      const { error: paymentError } = await supabase.from('client_payments').insert({
        organization_id: organizationId,
        invoice_id: selectedInvoiceId || null,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        notes: notes || null,
        payment_date: format(paymentDate, 'yyyy-MM-dd'),
        created_by: userData.user?.id,
      });

      if (paymentError) throw paymentError;

      // Update invoice status to paid if fully paid
      if (selectedInvoiceId) {
        const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);
        if (selectedInvoice && parseFloat(amount) >= selectedInvoice.amount) {
          await supabase
            .from('client_invoices')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', selectedInvoiceId);
        }
      }

      toast.success('تم تسجيل الدفعة بنجاح');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedInvoiceId('');
    setAmount('');
    setPaymentMethod('bank_transfer');
    setReferenceNumber('');
    setNotes('');
    setPaymentDate(new Date());
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (invoice) {
      setAmount(invoice.amount.toString());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>تسجيل دفعة جديدة</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>ربط بفاتورة (اختياري)</Label>
              <Select value={selectedInvoiceId} onValueChange={handleInvoiceSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر فاتورة..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">دفعة عامة (بدون فاتورة)</SelectItem>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - {invoice.amount.toLocaleString()} ر.س
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ (ر.س) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>طريقة الدفع *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ الدفع</Label>
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
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">رقم المرجع</Label>
                <Input
                  id="reference"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="رقم التحويل أو المرجع..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              تسجيل الدفعة
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
