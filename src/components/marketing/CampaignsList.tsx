import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Campaign {
  id: string;
  name: string;
  goal: string;
  status: string;
  total_recipients: number;
  success_count: number;
  failed_count: number;
  created_at: string;
}

const goalLabels: Record<string, string> = {
  renewal: 'تجديد',
  incentive: 'تحفيز',
  education: 'تثقيف',
  upgrade: 'ترقية',
  alert: 'تنبيه',
};

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'مسودة', variant: 'secondary' },
  scheduled: { label: 'مجدولة', variant: 'outline' },
  sending: { label: 'قيد الإرسال', variant: 'default' },
  completed: { label: 'مكتملة', variant: 'default' },
  paused: { label: 'متوقفة', variant: 'destructive' },
  cancelled: { label: 'ملغاة', variant: 'destructive' },
};

export default function CampaignsList({ campaigns }: { campaigns: Campaign[] }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم الحملة</TableHead>
            <TableHead>الهدف</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>المستلمون</TableHead>
            <TableHead>الناجحة</TableHead>
            <TableHead>الفاشلة</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                لا توجد حملات بعد
              </TableCell>
            </TableRow>
          ) : (
            campaigns.map((c) => {
              const st = statusLabels[c.status] || { label: c.status, variant: 'secondary' as const };
              return (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/marketing/campaigns/${c.id}`)}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{goalLabels[c.goal] || c.goal}</TableCell>
                  <TableCell>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </TableCell>
                  <TableCell>{c.total_recipients}</TableCell>
                  <TableCell className="text-green-600">{c.success_count}</TableCell>
                  <TableCell className="text-destructive">{c.failed_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/admin/marketing/campaigns/${c.id}`); }}>
                          <Eye className="h-4 w-4 ml-2" /> عرض التفاصيل
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
