import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Recipient {
  id: string;
  email_status: string;
  sent_at: string | null;
  open_count: number;
  click_count: number;
  error_message: string | null;
  client_organizations: {
    name: string;
    contact_email: string;
  } | null;
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'معلق', variant: 'secondary' },
  sent: { label: 'مرسل', variant: 'default' },
  delivered: { label: 'تم التسليم', variant: 'default' },
  failed: { label: 'فشل', variant: 'destructive' },
  bounced: { label: 'مرتد', variant: 'destructive' },
};

export default function RecipientsList({ recipients }: { recipients: Recipient[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المنظمة</TableHead>
            <TableHead>البريد</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>الفتح</TableHead>
            <TableHead>النقر</TableHead>
            <TableHead>وقت الإرسال</TableHead>
            <TableHead>الخطأ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipients.map((r) => {
            const st = statusMap[r.email_status] || { label: r.email_status, variant: 'secondary' as const };
            return (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.client_organizations?.name || '-'}</TableCell>
                <TableCell className="text-sm">{r.client_organizations?.contact_email || '-'}</TableCell>
                <TableCell>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </TableCell>
                <TableCell>{r.open_count}</TableCell>
                <TableCell>{r.click_count}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.sent_at ? new Date(r.sent_at).toLocaleString('ar-SA') : '-'}
                </TableCell>
                <TableCell className="text-xs text-destructive max-w-32 truncate">{r.error_message || '-'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
