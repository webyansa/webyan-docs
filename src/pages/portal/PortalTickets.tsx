import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Ticket, 
  Plus, 
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  XCircle,
  Filter,
  Calendar,
  User,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  staff?: {
    id: string;
    full_name: string;
  } | null;
}

const statusConfig: Record<string, { 
  label: string; 
  bg: string; 
  text: string; 
  border: string;
  dot: string; 
  icon: any;
  description: string;
}> = {
  open: { 
    label: 'جديدة', 
    bg: 'bg-blue-50 dark:bg-blue-900/20', 
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
    icon: AlertCircle,
    description: 'تم استلام التذكرة وبانتظار المعالجة'
  },
  in_progress: { 
    label: 'قيد المعالجة', 
    bg: 'bg-amber-50 dark:bg-amber-900/20', 
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
    icon: Clock,
    description: 'يعمل فريق الدعم على حل المشكلة'
  },
  resolved: { 
    label: 'تم الحل', 
    bg: 'bg-emerald-50 dark:bg-emerald-900/20', 
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
    description: 'تم حل المشكلة بنجاح'
  },
  closed: { 
    label: 'مغلقة', 
    bg: 'bg-gray-100 dark:bg-gray-800', 
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
    dot: 'bg-gray-400',
    icon: XCircle,
    description: 'تم إغلاق التذكرة من قبل فريق الدعم'
  },
};

const priorityConfig: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: 'منخفضة', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
  medium: { label: 'متوسطة', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  high: { label: 'عالية', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
  urgent: { label: 'عاجلة', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
};

const categoryLabels: Record<string, string> = {
  technical: 'مشكلة تقنية',
  billing: 'الفواتير والمدفوعات',
  feature: 'طلب ميزة',
  training: 'التدريب والدعم',
  other: 'أخرى',
};

const PortalTickets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchClientOrganization();
    }
  }, [user]);

  useEffect(() => {
    if (organizationId) {
      fetchTickets();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [organizationId]);

  const fetchClientOrganization = async () => {
    try {
      const { data: clientAccount, error } = await supabase
        .from('client_accounts')
        .select('organization_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching client account:', error);
        setLoading(false);
        return;
      }

      setOrganizationId(clientAccount?.organization_id || null);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch ALL tickets including closed ones - no status filtering at DB level
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          staff:staff_members!support_tickets_assigned_to_staff_fkey (
            id,
            full_name
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTickets();
  };

  const setupRealtimeSubscription = () => {
    if (!organizationId) return () => {};
    
    const channel = supabase
      .channel('portal-tickets-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Filter tickets based on search and status
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') return matchesSearch && ['open', 'in_progress'].includes(ticket.status);
    if (statusFilter === 'completed') return matchesSearch && ['resolved', 'closed'].includes(ticket.status);
    return matchesSearch && ticket.status === statusFilter;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري تحميل التذاكر...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            تذاكر الدعم
          </h1>
          <p className="text-muted-foreground mt-2">تتبع وإدارة جميع طلبات الدعم الخاصة بك</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
          <Button asChild size="lg" className="gap-2 shadow-lg bg-gradient-to-r from-primary to-primary/90">
            <Link to="/portal/tickets/new">
              <Plus className="w-5 h-5" />
              تذكرة جديدة
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Interactive */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'all' && "ring-2 ring-primary"
          )}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-2">
              <Ticket className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">إجمالي التذاكر</p>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'open' && "ring-2 ring-blue-500"
          )}
          onClick={() => setStatusFilter('open')}
        >
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
            <p className="text-xs text-muted-foreground">جديدة</p>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'in_progress' && "ring-2 ring-amber-500"
          )}
          onClick={() => setStatusFilter('in_progress')}
        >
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">قيد المعالجة</p>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'resolved' && "ring-2 ring-emerald-500"
          )}
          onClick={() => setStatusFilter('resolved')}
        >
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p>
            <p className="text-xs text-muted-foreground">تم الحل</p>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'closed' && "ring-2 ring-gray-500"
          )}
          onClick={() => setStatusFilter('closed')}
        >
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2">
              <XCircle className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-600">{stats.closed}</p>
            <p className="text-xs text-muted-foreground">مغلقة</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="البحث في التذاكر بالرقم أو الموضوع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="فلترة الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التذاكر</SelectItem>
                <SelectItem value="active">النشطة فقط</SelectItem>
                <SelectItem value="open">جديدة</SelectItem>
                <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                <SelectItem value="resolved">تم الحل</SelectItem>
                <SelectItem value="closed">مغلقة</SelectItem>
                <SelectItem value="completed">المكتملة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      {filteredTickets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
              <Ticket className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد تذاكر</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {statusFilter === 'all' 
                ? 'لم تقم بإنشاء أي تذاكر دعم بعد.' 
                : 'لا توجد تذاكر تطابق الفلتر المحدد'}
            </p>
            <Button asChild className="gap-2">
              <Link to="/portal/tickets/new">
                <Plus className="w-4 h-4" />
                إنشاء تذكرة جديدة
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right w-32">رقم التذكرة</TableHead>
                  <TableHead className="text-right">الموضوع</TableHead>
                  <TableHead className="text-right w-36">الحالة</TableHead>
                  <TableHead className="text-right w-28">الأولوية</TableHead>
                  <TableHead className="text-right w-36">الموظف المسؤول</TableHead>
                  <TableHead className="text-right w-36">آخر تحديث</TableHead>
                  <TableHead className="text-right w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => {
                  const status = statusConfig[ticket.status] || statusConfig.open;
                  const StatusIcon = status.icon;
                  const priority = priorityConfig[ticket.priority] || priorityConfig.medium;

                  return (
                    <TableRow 
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={() => navigate(`/portal/tickets/${ticket.id}`)}
                    >
                      <TableCell>
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {ticket.ticket_number}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {ticket.subject}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {categoryLabels[ticket.category] || ticket.category}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            status.bg
                          )}>
                            <StatusIcon className={cn("w-4 h-4", status.text)} />
                          </div>
                          <div>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs font-medium border-0",
                                status.bg,
                                status.text
                              )}
                            >
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-xs border-0",
                            priority.bg,
                            priority.text
                          )}
                        >
                          {priority.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ticket.staff ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {ticket.staff.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{ticket.staff.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">لم يتم التعيين</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ar })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Status Legend */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">دليل حالات التذاكر:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(statusConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <div key={key} className="flex items-start gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                    config.bg
                  )}>
                    <Icon className={cn("w-3.5 h-3.5", config.text)} />
                  </div>
                  <div>
                    <p className={cn("text-sm font-medium", config.text)}>{config.label}</p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalTickets;
