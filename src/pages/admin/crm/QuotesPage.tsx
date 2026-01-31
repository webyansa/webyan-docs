import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Mail,
  Download,
  Loader2,
  Building2,
  Calendar,
} from 'lucide-react';
import { formatCurrency } from '@/lib/crm/pipelineConfig';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  quote_type: string;
  billing_cycle: string;
  subtotal: number;
  total_amount: number;
  status: string;
  valid_until: string | null;
  sent_at: string | null;
  created_at: string;
  account: {
    id: string;
    name: string;
  } | null;
  opportunity: {
    id: string;
    name: string;
  } | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'مسودة', variant: 'outline' },
  sent: { label: 'مرسل', variant: 'default' },
  viewed: { label: 'تمت المشاهدة', variant: 'secondary' },
  accepted: { label: 'معتمد', variant: 'default' },
  rejected: { label: 'مرفوض', variant: 'destructive' },
  expired: { label: 'منتهي', variant: 'secondary' },
};

const quoteTypeLabels: Record<string, string> = {
  subscription: 'اشتراك',
  custom_platform: 'منصة مخصصة',
  services_only: 'خدمات',
};

export default function QuotesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['crm-quotes', statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('crm_quotes')
        .select(`
          id,
          quote_number,
          title,
          quote_type,
          billing_cycle,
          subtotal,
          total_amount,
          status,
          valid_until,
          sent_at,
          created_at,
          account:account_id (id, name),
          opportunity:opportunity_id (id, name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('quote_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Quote[];
    },
  });

  const filteredQuotes = quotes.filter((quote) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      quote.quote_number.toLowerCase().includes(search) ||
      quote.title.toLowerCase().includes(search) ||
      quote.account?.name.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            عروض الأسعار
          </h1>
          <p className="text-muted-foreground">إدارة ومتابعة عروض الأسعار</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالرقم أو العميل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="sent">مرسل</SelectItem>
                  <SelectItem value="accepted">معتمد</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                  <SelectItem value="expired">منتهي</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="subscription">اشتراك</SelectItem>
                  <SelectItem value="custom_platform">منصة مخصصة</SelectItem>
                  <SelectItem value="services_only">خدمات</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد عروض أسعار</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم العرض</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>القيمة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-mono text-sm">
                      {quote.quote_number}
                    </TableCell>
                    <TableCell>
                      {quote.account ? (
                        <Link
                          to={`/admin/clients/${quote.account.id}`}
                          className="flex items-center gap-2 hover:text-primary"
                        >
                          <Building2 className="h-4 w-4" />
                          {quote.account.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {quoteTypeLabels[quote.quote_type] || quote.quote_type}
                        {quote.billing_cycle && quote.quote_type === 'subscription' && (
                          <span className="mr-1 text-xs">
                            ({quote.billing_cycle === 'monthly' ? 'شهري' : 'سنوي'})
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(quote.total_amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(quote.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(quote.created_at), 'dd MMM yyyy', { locale: ar })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/crm/quotes/${quote.id}`}>
                              <Eye className="h-4 w-4 ml-2" />
                              عرض التفاصيل
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 ml-2" />
                            تحميل PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 ml-2" />
                            إعادة الإرسال
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
