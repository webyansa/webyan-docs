import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Receipt, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface InvoiceRequestStatusProps {
  quoteId: string;
}

interface InvoiceRequest {
  id: string;
  request_number: string;
  status: string;
  sent_at: string;
  external_invoice_no: string | null;
  issued_at: string | null;
  sent_by_staff?: { full_name: string } | null;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  sent: { 
    label: 'تم الإرسال للحسابات', 
    icon: <Clock className="h-4 w-4" />, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50' 
  },
  processing: { 
    label: 'تحت الإجراء', 
    icon: <RefreshCw className="h-4 w-4" />, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50' 
  },
  issued: { 
    label: 'تم إصدار الفاتورة', 
    icon: <CheckCircle className="h-4 w-4" />, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50' 
  },
};

export function InvoiceRequestStatus({ quoteId }: InvoiceRequestStatusProps) {
  const { data: request, isLoading } = useQuery({
    queryKey: ['invoice-request-status', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_requests')
        .select(`
          id, request_number, status, sent_at, external_invoice_no, issued_at,
          sent_by_staff:staff_members!invoice_requests_sent_by_fkey(full_name)
        `)
        .eq('quote_id', quoteId)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as InvoiceRequest | null;
    },
    enabled: !!quoteId,
  });

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!request) {
    return null;
  }

  const config = statusConfig[request.status] || statusConfig.sent;

  return (
    <Card className={`border ${config.bgColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor} ${config.color}`}>
            <Receipt className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">حالة طلب الفاتورة</h4>
              <Badge variant="outline" className={`${config.color} border-current`}>
                {config.icon}
                <span className="mr-1">{config.label}</span>
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <span className="text-muted-foreground">رقم الطلب:</span>{' '}
                <span className="font-mono font-medium">{request.request_number}</span>
              </p>
              <p>
                <span className="text-muted-foreground">تاريخ الإرسال:</span>{' '}
                {format(new Date(request.sent_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
              </p>
              {request.sent_by_staff && (
                <p>
                  <span className="text-muted-foreground">بواسطة:</span>{' '}
                  {request.sent_by_staff.full_name}
                </p>
              )}
              {request.external_invoice_no && (
                <p className="text-green-600 font-medium">
                  <span className="text-muted-foreground">رقم الفاتورة:</span>{' '}
                  {request.external_invoice_no}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
