import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Receipt, Upload, CheckCircle, Loader2, FileText } from 'lucide-react';

export default function InvoiceConfirmPage() {
  const { requestId } = useParams();
  const [externalInvoiceNo, setExternalInvoiceNo] = useState('');
  const [confirmedByName, setConfirmedByName] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!externalInvoiceNo.trim()) {
      toast.error('يرجى إدخال رقم الفاتورة');
      return;
    }
    if (!confirmedByName.trim()) {
      toast.error('يرجى إدخال اسم المحاسب');
      return;
    }

    setIsSubmitting(true);
    try {
      let invoiceFileUrl: string | null = null;

      // Upload invoice file if provided
      if (invoiceFile) {
        const fileExt = invoiceFile.name.split('.').pop();
        const fileName = `invoice-${requestId}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(`invoices/${fileName}`, invoiceFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(`invoices/${fileName}`);
          invoiceFileUrl = urlData.publicUrl;
        }
      }

      const { data, error } = await supabase.functions.invoke('confirm-invoice', {
        body: {
          request_id: requestId,
          external_invoice_no: externalInvoiceNo,
          confirmed_by_name: confirmedByName,
          invoice_file_url: invoiceFileUrl,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsSuccess(true);
      toast.success('تم تأكيد إصدار الفاتورة بنجاح');
    } catch (error: any) {
      console.error('Confirm error:', error);
      toast.error(error.message || 'حدث خطأ أثناء التأكيد');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">تم التأكيد بنجاح</h2>
            <p className="text-muted-foreground">
              تم تأكيد إصدار الفاتورة وإرسال إشعار للفريق.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center border-b">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">تأكيد إصدار الفاتورة</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            يرجى تعبئة البيانات التالية لتأكيد إصدار الفاتورة
          </p>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label>رقم طلب الفاتورة</Label>
            <Input value={requestId || ''} disabled className="font-mono bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>رقم الفاتورة الخارجية *</Label>
            <Input
              value={externalInvoiceNo}
              onChange={(e) => setExternalInvoiceNo(e.target.value)}
              placeholder="مثال: FAT-2026-001"
            />
          </div>

          <div className="space-y-2">
            <Label>اسم المحاسب المؤكد *</Label>
            <Input
              value={confirmedByName}
              onChange={(e) => setConfirmedByName(e.target.value)}
              placeholder="اسم المحاسب"
            />
          </div>

          <div className="space-y-2">
            <Label>رفع ملف الفاتورة (PDF) - اختياري</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                className="hidden"
                id="invoice-file"
              />
              <label htmlFor="invoice-file" className="cursor-pointer">
                {invoiceFile ? (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <FileText className="h-5 w-5" />
                    <span className="text-sm font-medium">{invoiceFile.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">اضغط لرفع الملف</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري التأكيد...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 ml-2" />
                تأكيد إصدار الفاتورة
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
