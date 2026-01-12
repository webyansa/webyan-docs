import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Ticket, Clock, CheckCircle, MessageSquare, AlertCircle, Search, Filter } from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Breadcrumb } from "@/components/docs/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: 'مفتوحة', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  in_progress: { label: 'قيد المعالجة', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  resolved: { label: 'تم الحل', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed: { label: 'مغلقة', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفضة', color: 'bg-green-50 text-green-600 border-green-200' },
  medium: { label: 'متوسطة', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  high: { label: 'عالية', color: 'bg-red-50 text-red-600 border-red-200' },
};

const categoryLabels: Record<string, string> = {
  technical: 'مشكلة تقنية',
  question: 'استفسار عام',
  suggestion: 'اقتراح تحسين',
  complaint: 'شكوى',
  general: 'عام',
};

export default function MyTicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchTickets();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('my-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const fetchTickets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
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
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  };

  if (loading) {
    return (
      <DocsLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DocsLayout>
    );
  }

  return (
    <DocsLayout>
      <div className="max-w-4xl mx-auto">
        <Breadcrumb items={[{ label: "تذاكري" }]} className="mb-6" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">تذاكر الدعم</h1>
            <p className="text-muted-foreground">تابع حالة تذاكرك واطلع على الردود</p>
          </div>
          <Button onClick={() => navigate('/submit-ticket')} className="gap-2">
            <Plus className="h-4 w-4" />
            تذكرة جديدة
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-muted-foreground">إجمالي التذاكر</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats.open}</div>
              <div className="text-sm text-muted-foreground">قيد المعالجة</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
              <div className="text-sm text-muted-foreground">تم حلها</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث برقم التذكرة أو الموضوع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all">الكل ({stats.total})</TabsTrigger>
            <TabsTrigger value="open">قيد المعالجة ({stats.open})</TabsTrigger>
            <TabsTrigger value="resolved">تم الحل ({stats.resolved})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredTickets.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">لا توجد تذاكر</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'لم يتم العثور على نتائج' : 'لم تقم بإنشاء أي تذاكر بعد'}
                  </p>
                  <Button onClick={() => navigate('/submit-ticket')}>
                    إنشاء تذكرة جديدة
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTickets.map((ticket) => {
                  const status = statusConfig[ticket.status] || statusConfig.open;
                  const priority = priorityConfig[ticket.priority] || priorityConfig.medium;
                  const StatusIcon = status.icon;

                  return (
                    <Card
                      key={ticket.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-mono text-sm text-muted-foreground">
                                {ticket.ticket_number}
                              </span>
                              <Badge className={status.color}>
                                <StatusIcon className="h-3 w-3 ml-1" />
                                {status.label}
                              </Badge>
                              <Badge variant="outline" className={priority.color}>
                                {priority.label}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-lg mb-1">{ticket.subject}</h3>
                            <p className="text-muted-foreground text-sm line-clamp-2">
                              {ticket.description}
                            </p>
                          </div>
                          <div className="text-left text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: ar })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                          <span className="text-sm text-muted-foreground">
                            {categoryLabels[ticket.category] || ticket.category}
                          </span>
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
    </DocsLayout>
  );
}
