import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, FileText, Clock, CheckCircle, Users, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  new: { label: 'جديد', variant: 'default' },
  reviewing: { label: 'قيد المراجعة', variant: 'secondary' },
  contacted: { label: 'تم التواصل', variant: 'outline' },
  pending_payment: { label: 'بانتظار السداد', variant: 'secondary' },
  activated: { label: 'تم التفعيل', variant: 'default' },
  cancelled: { label: 'ملغي', variant: 'destructive' },
};

export default function SubscriptionRequestsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['subscription-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('website_subscription_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = requests.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.organization_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.request_number?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: requests.length,
    new: requests.filter(r => r.status === 'new').length,
    reviewing: requests.filter(r => r.status === 'reviewing').length,
    activated: requests.filter(r => r.status === 'activated').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          طلبات الاشتراك
        </h1>
        <p className="text-muted-foreground">إدارة ومتابعة طلبات الاشتراك الواردة من الموقع</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.new}</p>
              <p className="text-xs text-muted-foreground">جديد</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Search className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{stats.reviewing}</p>
              <p className="text-xs text-muted-foreground">قيد المراجعة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.activated}</p>
              <p className="text-xs text-muted-foreground">تم التفعيل</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد أو رقم الطلب..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد طلبات
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>المنظمة</TableHead>
                  <TableHead>الباقة</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.request_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{r.organization_name}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{r.plan_name}</TableCell>
                    <TableCell>{r.total_amount?.toLocaleString('ar-SA')} ر.س</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_MAP[r.status]?.variant || 'outline'}>
                        {STATUS_MAP[r.status]?.label || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy', { locale: ar }) : '-'}
                    </TableCell>
                    <TableCell>
                      <Link to={`/admin/subscription-requests/${r.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
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
