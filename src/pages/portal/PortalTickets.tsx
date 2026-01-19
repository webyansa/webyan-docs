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
  MessageSquare,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string; icon: any }> = {
  open: { 
    label: 'جديدة', 
    bg: 'bg-blue-50 dark:bg-blue-900/20', 
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
    icon: AlertCircle 
  },
  in_progress: { 
    label: 'قيد المعالجة', 
    bg: 'bg-amber-50 dark:bg-amber-900/20', 
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    icon: Clock 
  },
  resolved: { 
    label: 'تم الحل', 
    bg: 'bg-emerald-50 dark:bg-emerald-900/20', 
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    icon: CheckCircle2 
  },
  closed: { 
    label: 'مغلقة', 
    bg: 'bg-gray-100 dark:bg-gray-800', 
    text: 'text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400',
    icon: CheckCircle2 
  },
};

const priorityConfig: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: 'منخفضة', bg: 'bg-gray-100', text: 'text-gray-700' },
  medium: { label: 'متوسطة', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  high: { label: 'عالية', bg: 'bg-orange-100', text: 'text-orange-700' },
  urgent: { label: 'عاجلة', bg: 'bg-red-100', text: 'text-red-700' },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchClientOrganization();
    }
  }, [user]);

  useEffect(() => {
    if (organizationId) {
      fetchTickets();
      setupRealtimeSubscription();
    }
  }, [organizationId]);

  const fetchClientOrganization = async () => {
    try {
      const { data: clientAccount, error } = await supabase
        .from('client_accounts')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

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
    }
  };

  const setupRealtimeSubscription = () => {
    if (!organizationId) return;
    
    const channel = supabase
      .channel('portal-tickets')
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

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'open') return matchesSearch && (ticket.status === 'open' || ticket.status === 'in_progress');
    if (activeTab === 'resolved') return matchesSearch && (ticket.status === 'resolved' || ticket.status === 'closed');
    return matchesSearch;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
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
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary" />
            </div>
            تذاكر الدعم
          </h1>
          <p className="text-muted-foreground mt-1">تتبع وإدارة جميع طلبات الدعم الخاصة بك</p>
        </div>
        <Button asChild size="lg" className="gap-2 shadow-lg">
          <Link to="/portal/tickets/new">
            <Plus className="w-5 h-5" />
            تذكرة جديدة
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">إجمالي التذاكر</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-amber-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.open}</p>
                <p className="text-xs text-amber-600/80">مفتوحة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-emerald-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.resolved}</p>
                <p className="text-xs text-emerald-600/80">تم حلها</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="البحث في التذاكر..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="gap-1.5">
            الكل
            <Badge variant="secondary" className="text-xs">{stats.total}</Badge>
          </TabsTrigger>
          <TabsTrigger value="open" className="gap-1.5">
            مفتوحة
            <Badge variant="secondary" className="text-xs">{stats.open}</Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-1.5">
            تم حلها
            <Badge variant="secondary" className="text-xs">{stats.resolved}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredTickets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                  <Ticket className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد تذاكر</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  {activeTab === 'all' 
                    ? 'لم تقم بإنشاء أي تذاكر دعم بعد. ابدأ بإنشاء تذكرة جديدة للحصول على المساعدة.' 
                    : 'لا توجد تذاكر في هذا التصنيف'}
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
            <div className="space-y-3">
              {filteredTickets.map((ticket) => {
                const status = statusConfig[ticket.status] || statusConfig.open;
                const StatusIcon = status.icon;
                const priority = priorityConfig[ticket.priority] || priorityConfig.medium;

                return (
                  <Card 
                    key={ticket.id}
                    className="hover:shadow-md transition-all cursor-pointer group border-l-4"
                    style={{ borderLeftColor: ticket.status === 'open' ? '#3b82f6' : ticket.status === 'in_progress' ? '#f59e0b' : '#10b981' }}
                    onClick={() => navigate(`/portal/tickets/${ticket.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Status Icon */}
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                          status.bg
                        )}>
                          <StatusIcon className={cn("w-5 h-5", status.text)} />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                                  {ticket.ticket_number}
                                </code>
                                <Badge className={cn("text-[10px]", status.bg, status.text, "border-0")}>
                                  {status.label}
                                </Badge>
                                <span className={cn("text-[10px] px-2 py-0.5 rounded-full", priority.bg, priority.text)}>
                                  {priority.label}
                                </span>
                              </div>
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                {ticket.subject}
                              </h3>
                            </div>
                            <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all flex-shrink-0" />
                          </div>
                          
                          {/* Description */}
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {ticket.description}
                          </p>
                          
                          {/* Footer */}
                          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ar })}
                              </span>
                              <span className="px-2 py-0.5 bg-muted rounded-full">
                                {categoryLabels[ticket.category] || ticket.category}
                              </span>
                            </div>
                            
                            {/* Assigned Staff */}
                            {ticket.staff && (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                    {ticket.staff.full_name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs">{ticket.staff.full_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PortalTickets;
