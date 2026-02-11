import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Plus,
  Target,
  Users,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/crm/pipelineConfig';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import AdvancedQuoteModal from '@/components/crm/modals/AdvancedQuoteModal';

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  quote_type: string;
  billing_cycle: string;
  subtotal: number;
  total_amount: number;
  status: string;
  payment_status: string;
  invoice_status: string;
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
    stage: string;
    expected_value: number;
    account_id: string;
  } | null;
}

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  unpaid: { label: 'لم يُدفع', className: 'text-slate-600 bg-slate-100' },
  paid: { label: 'مدفوع', className: 'text-green-600 bg-green-100' },
  partially_paid: { label: 'جزئي', className: 'text-amber-600 bg-amber-100' },
};

const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
  not_requested: { label: 'لم يُطلب', className: 'text-slate-600 bg-slate-100' },
  requested: { label: 'تم الطلب', className: 'text-blue-600 bg-blue-100' },
  issued: { label: 'صدرت', className: 'text-green-600 bg-green-100' },
};

interface Deal {
  id: string;
  name: string;
  stage: string;
  expected_value: number;
  account_id: string;
  account: {
    id: string;
    name: string;
  } | null;
}

interface Client {
  id: string;
  name: string;
  contact_email: string;
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
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createTab, setCreateTab] = useState<'deal' | 'standalone'>('deal');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'selected' | 'single' | null>(null);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: quotes = [], isLoading, refetch } = useQuery({
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
          payment_status,
          invoice_status,
          valid_until,
          sent_at,
          created_at,
          account:client_organizations!crm_quotes_account_id_fkey(id, name),
          opportunity:crm_opportunities!crm_quotes_opportunity_id_fkey(id, name, stage, expected_value, account_id)
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

  // Fetch deals for creating new quote
  const { data: deals = [] } = useQuery({
    queryKey: ['crm-deals-for-quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_opportunities')
        .select(`
          id,
          name,
          stage,
          expected_value,
          account_id,
          account:client_organizations!crm_opportunities_account_id_fkey(id, name)
        `)
        .not('stage', 'in', '(approved,rejected)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Deal[];
    },
    enabled: showCreateDialog && createTab === 'deal',
  });

  // Fetch clients for standalone quotes
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_organizations')
        .select('id, name, contact_email')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Client[];
    },
    enabled: showCreateDialog && createTab === 'standalone',
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

  const filteredDeals = deals.filter((deal) => {
    if (!clientSearchQuery) return true;
    const search = clientSearchQuery.toLowerCase();
    return (
      deal.name.toLowerCase().includes(search) ||
      deal.account?.name.toLowerCase().includes(search)
    );
  });

  const filteredClients = clients.filter((client) => {
    if (!clientSearchQuery) return true;
    const search = clientSearchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(search) ||
      client.contact_email.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleCreateQuoteFromDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setSelectedClient(null);
    setShowCreateDialog(false);
    setShowQuoteModal(true);
  };

  const handleCreateQuoteFromClient = (client: Client) => {
    setSelectedClient(client);
    setSelectedDeal(null);
    setShowCreateDialog(false);
    setShowQuoteModal(true);
  };

  const handleQuoteSuccess = () => {
    setShowQuoteModal(false);
    setSelectedDeal(null);
    setSelectedClient(null);
    refetch();
  };

  const handleOpenCreateDialog = () => {
    setClientSearchQuery('');
    setCreateTab('deal');
    setShowCreateDialog(true);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('crm_quotes')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'تم الحذف بنجاح' });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['crm-quotes'] });
    },
    onError: () => {
      toast({ title: 'حدث خطأ أثناء الحذف', variant: 'destructive' });
    },
  });

  const handleConfirmDelete = () => {
    if (deleteTarget === 'single' && singleDeleteId) {
      deleteMutation.mutate([singleDeleteId]);
    } else if (deleteTarget === 'selected') {
      deleteMutation.mutate(Array.from(selectedIds));
    }
    setShowDeleteDialog(false);
    setDeleteTarget(null);
    setSingleDeleteId(null);
  };

  const handleDeleteSingle = (id: string) => {
    setSingleDeleteId(id);
    setDeleteTarget('single');
    setShowDeleteDialog(true);
  };

  const handleDeleteSelected = () => {
    setDeleteTarget('selected');
    setShowDeleteDialog(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQuotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuotes.map(q => q.id)));
    }
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
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="h-4 w-4 ml-2" />
          عرض سعر جديد
        </Button>
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
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleOpenCreateDialog}
              >
                <Plus className="h-4 w-4 ml-2" />
                إنشاء عرض سعر جديد
              </Button>
            </div>
          ) : (
            <>
              {/* Bulk action bar */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg border">
                  <span className="text-sm font-medium">
                    تم تحديد {selectedIds.size} عرض
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="h-4 w-4 ml-1" />
                    حذف المحددة
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    إلغاء التحديد
                  </Button>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.size === filteredQuotes.length && filteredQuotes.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>رقم العرض</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>القيمة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الدفع</TableHead>
                    <TableHead>الفاتورة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => (
                    <TableRow 
                      key={quote.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/crm/quotes/${quote.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(quote.id)}
                          onCheckedChange={() => toggleSelect(quote.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {quote.quote_number}
                      </TableCell>
                      <TableCell>
                        {quote.account ? (
                          <div 
                            className="flex items-center gap-2 hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/clients/${quote.account!.id}`);
                            }}
                          >
                            <Building2 className="h-4 w-4" />
                            {quote.account.name}
                          </div>
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {getStatusBadge(quote.status)}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const ps = paymentStatusConfig[quote.payment_status || 'unpaid'] || paymentStatusConfig.unpaid;
                          return <Badge variant="outline" className={`${ps.className} border-0 text-xs`}>{ps.label}</Badge>;
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const is = invoiceStatusConfig[quote.invoice_status || 'not_requested'] || invoiceStatusConfig.not_requested;
                          return <Badge variant="outline" className={`${is.className} border-0 text-xs`}>{is.label}</Badge>;
                        })()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(quote.created_at), 'dd MMM yyyy', { locale: ar })}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/crm/quotes/${quote.id}`)}>
                              <Eye className="h-4 w-4 ml-2" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 ml-2" />
                              تحميل PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="h-4 w-4 ml-2" />
                              إعادة الإرسال
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteSingle(quote.id)}
                            >
                              <Trash2 className="h-4 w-4 ml-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === 'selected'
                ? `هل أنت متأكد من حذف ${selectedIds.size} عرض سعر؟ لا يمكن التراجع عن هذا الإجراء.`
                : 'هل أنت متأكد من حذف عرض السعر هذا؟ لا يمكن التراجع عن هذا الإجراء.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : (
                <Trash2 className="h-4 w-4 ml-1" />
              )}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Quote Dialog with Tabs */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              إنشاء عرض سعر جديد
            </DialogTitle>
            <DialogDescription>
              اختر طريقة إنشاء عرض السعر
            </DialogDescription>
          </DialogHeader>

          <Tabs value={createTab} onValueChange={(v) => {
            setCreateTab(v as 'deal' | 'standalone');
            setClientSearchQuery('');
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deal" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                عبر فرصة بيعية
              </TabsTrigger>
              <TabsTrigger value="standalone" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                عرض مستقل (عميل)
              </TabsTrigger>
            </TabsList>

            <div className="my-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={createTab === 'deal' ? "بحث في الفرص..." : "بحث في العملاء..."}
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>

            <TabsContent value="deal" className="max-h-[350px] overflow-y-auto">
              {filteredDeals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>لا توجد فرص متاحة</p>
                  <p className="text-sm">يمكنك إنشاء فرصة جديدة من صفحة الفرص</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setShowCreateDialog(false);
                      navigate('/admin/crm/deals');
                    }}
                  >
                    الانتقال لصفحة الفرص
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDeals.map((deal) => (
                    <Card
                      key={deal.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleCreateQuoteFromDeal(deal)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{deal.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              {deal.account && (
                                <>
                                  <Building2 className="h-3 w-3" />
                                  <span>{deal.account.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-primary">
                              {formatCurrency(deal.expected_value)}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {deal.stage}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="standalone" className="max-h-[350px] overflow-y-auto">
              {filteredClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>لا يوجد عملاء</p>
                  <p className="text-sm">يمكنك إضافة عميل جديد من صفحة العملاء</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setShowCreateDialog(false);
                      navigate('/admin/clients');
                    }}
                  >
                    الانتقال لصفحة العملاء
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredClients.map((client) => (
                    <Card
                      key={client.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleCreateQuoteFromClient(client)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{client.name}</p>
                              <p className="text-sm text-muted-foreground">{client.contact_email}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">عميل نشط</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Advanced Quote Modal - From Deal */}
      {selectedDeal && (
        <AdvancedQuoteModal
          open={showQuoteModal}
          onOpenChange={setShowQuoteModal}
          accountId={selectedDeal.account_id}
          accountName={selectedDeal.account?.name || selectedDeal.name}
          dealId={selectedDeal.id}
          dealName={selectedDeal.name}
          currentStage={selectedDeal.stage}
          currentValue={selectedDeal.expected_value}
          onSuccess={handleQuoteSuccess}
        />
      )}

      {/* Advanced Quote Modal - From Client (Standalone) */}
      {selectedClient && (
        <AdvancedQuoteModal
          open={showQuoteModal}
          onOpenChange={setShowQuoteModal}
          accountId={selectedClient.id}
          accountName={selectedClient.name}
          onSuccess={handleQuoteSuccess}
        />
      )}
    </div>
  );
}
