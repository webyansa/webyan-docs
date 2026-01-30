import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Ticket,
  Plus,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TicketsTabProps {
  organizationId: string;
  onCreateTicket?: () => void;
}

interface TicketItem {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; color: string; Icon: typeof Clock }> = {
  open: { label: 'مفتوحة', color: 'bg-blue-100 text-blue-700', Icon: Clock },
  in_progress: { label: 'قيد المعالجة', color: 'bg-amber-100 text-amber-700', Icon: AlertCircle },
  resolved: { label: 'تم الحل', color: 'bg-green-100 text-green-700', Icon: CheckCircle },
  closed: { label: 'مغلقة', color: 'bg-gray-100 text-gray-700', Icon: CheckCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفضة', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'متوسطة', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'عالية', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'عاجلة', color: 'bg-red-100 text-red-700' },
};

export function TicketsTab({ organizationId, onCreateTicket }: TicketsTabProps) {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchTickets();
  }, [organizationId]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, subject, status, priority, category, created_at, updated_at')
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

  const filteredTickets = filter === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === filter);

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">إجمالي التذاكر</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
            <p className="text-sm text-muted-foreground">مفتوحة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
            <p className="text-sm text-muted-foreground">قيد المعالجة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            <p className="text-sm text-muted-foreground">تم الحل</p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              التذاكر
            </span>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="open">مفتوحة</SelectItem>
                  <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                  <SelectItem value="resolved">تم الحل</SelectItem>
                  <SelectItem value="closed">مغلقة</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={onCreateTicket}>
                <Plus className="w-4 h-4 ml-2" />
                تذكرة جديدة
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTickets.length > 0 ? (
            <div className="divide-y">
              {filteredTickets.map((ticket) => {
                const status = statusConfig[ticket.status] || statusConfig.open;
                const priority = priorityConfig[ticket.priority] || priorityConfig.medium;
                const StatusIcon = status.Icon;

                return (
                  <div 
                    key={ticket.id} 
                    className="py-4 flex items-center justify-between hover:bg-muted/50 -mx-4 px-4 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${status.color}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">
                            #{ticket.ticket_number}
                          </span>
                          <Badge variant="outline" className={priority.color}>
                            {priority.label}
                          </Badge>
                        </div>
                        <p className="font-medium mt-1">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ar })}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد تذاكر</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
