import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Receipt, 
  Ticket, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Briefcase,
  Building2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface OverviewTabProps {
  organizationId: string;
  organizationName: string;
  subscriptionEndDate?: string | null;
  lastInteractionAt?: string | null;
}

interface Stats {
  totalInvoices: number;
  paidInvoices: number;
  pendingAmount: number;
  openTickets: number;
  totalMeetings: number;
  activeOpportunities: number;
  totalContractValue: number;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  created_at: string;
  performed_by_name: string | null;
}

export function OverviewTab({ 
  organizationId, 
  organizationName,
  subscriptionEndDate,
  lastInteractionAt 
}: OverviewTabProps) {
  const [stats, setStats] = useState<Stats>({
    totalInvoices: 0,
    paidInvoices: 0,
    pendingAmount: 0,
    openTickets: 0,
    totalMeetings: 0,
    activeOpportunities: 0,
    totalContractValue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<TimelineEvent[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewData();
  }, [organizationId]);

  const fetchOverviewData = async () => {
    try {
      const [
        invoicesRes,
        ticketsRes,
        meetingsRes,
        opportunitiesRes,
        contractsRes,
        timelineRes
      ] = await Promise.all([
        supabase
          .from('client_invoices')
          .select('amount, status')
          .eq('organization_id', organizationId),
        supabase
          .from('support_tickets')
          .select('id, status')
          .eq('organization_id', organizationId)
          .in('status', ['open', 'in_progress']),
        supabase
          .from('meeting_requests')
          .select('id')
          .eq('organization_id', organizationId),
        supabase
          .from('crm_opportunities')
          .select('expected_value, status')
          .eq('account_id', organizationId)
          .eq('status', 'open'),
        supabase
          .from('crm_contracts')
          .select('contract_value, status')
          .eq('account_id', organizationId)
          .in('status', ['active', 'signed']),
        supabase
          .from('client_timeline')
          .select('id, event_type, title, description, created_at, performed_by_name')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // Calculate stats
      const invoices = invoicesRes.data || [];
      const paidInvoices = invoices.filter(i => i.status === 'paid').length;
      const pendingAmount = invoices
        .filter(i => i.status === 'pending' || i.status === 'overdue')
        .reduce((sum, i) => sum + Number(i.amount), 0);

      const contracts = contractsRes.data || [];
      const totalContractValue = contracts.reduce((sum, c) => sum + Number(c.contract_value), 0);

      setStats({
        totalInvoices: invoices.length,
        paidInvoices,
        pendingAmount,
        openTickets: ticketsRes.data?.length || 0,
        totalMeetings: meetingsRes.data?.length || 0,
        activeOpportunities: opportunitiesRes.data?.length || 0,
        totalContractValue,
      });

      setRecentActivity(timelineRes.data || []);

      // Build alerts
      const alertsList: string[] = [];
      
      // Check subscription end date
      if (subscriptionEndDate) {
        const endDate = parseISO(subscriptionEndDate);
        const daysUntilEnd = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilEnd <= 30 && daysUntilEnd > 0) {
          alertsList.push(`الاشتراك ينتهي خلال ${daysUntilEnd} يوم`);
        } else if (daysUntilEnd <= 0) {
          alertsList.push('الاشتراك منتهي!');
        }
      }

      // Check overdue invoices
      const overdueInvoices = invoices.filter(i => i.status === 'overdue');
      if (overdueInvoices.length > 0) {
        const overdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
        alertsList.push(`${overdueInvoices.length} فاتورة متأخرة (${overdueAmount.toLocaleString()} ر.س)`);
      }

      // Check open tickets
      if ((ticketsRes.data?.length || 0) > 0) {
        alertsList.push(`${ticketsRes.data?.length} تذكرة مفتوحة`);
      }

      // Check last interaction
      if (lastInteractionAt) {
        const lastDate = parseISO(lastInteractionAt);
        const daysSinceInteraction = Math.ceil((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceInteraction > 30) {
          alertsList.push(`لا يوجد تفاعل منذ ${daysSinceInteraction} يوم`);
        }
      }

      setAlerts(alertsList);
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'invoice_sent':
      case 'payment_received':
        return <Receipt className="h-4 w-4" />;
      case 'ticket_created':
      case 'ticket_closed':
        return <Ticket className="h-4 w-4" />;
      case 'meeting_scheduled':
      case 'meeting_completed':
        return <Calendar className="h-4 w-4" />;
      case 'stage_changed':
        return <TrendingUp className="h-4 w-4" />;
      case 'opportunity_won':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes('payment') || eventType.includes('won')) return 'text-green-500';
    if (eventType.includes('overdue') || eventType.includes('lost')) return 'text-red-500';
    if (eventType.includes('invoice') || eventType.includes('stage')) return 'text-blue-500';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيمة العقود</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalContractValue.toLocaleString()} ر.س
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.activeOpportunities} فرصة مفتوحة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفواتير</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.paidInvoices}/{stats.totalInvoices}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingAmount > 0 ? `${stats.pendingAmount.toLocaleString()} ر.س مستحق` : 'لا توجد مستحقات'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التذاكر المفتوحة</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTickets}</div>
            <p className="text-xs text-muted-foreground">تذكرة بانتظار المعالجة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الاجتماعات</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMeetings}</div>
            <p className="text-xs text-muted-foreground">إجمالي الاجتماعات</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              التنبيهات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>لا توجد تنبيهات - كل شيء على ما يرام!</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {alerts.map((alert, index) => (
                  <li key={index} className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              آخر النشاطات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">لا توجد نشاطات بعد</p>
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((event) => (
                  <li key={event.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 ${getEventColor(event.event_type)}`}>
                      {getEventIcon(event.event_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(parseISO(event.created_at), { locale: ar, addSuffix: true })}
                        {event.performed_by_name && ` • ${event.performed_by_name}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
