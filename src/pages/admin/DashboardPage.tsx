import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Building2, Ticket, Target, FileText, MessageSquare, Calendar, Rocket,
  Plus, ArrowUpRight, Loader2, AlertCircle, Clock, Users, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DashboardStats {
  totalClients: number;
  openTickets: number;
  activeOpportunities: number;
  totalQuotes: number;
  totalArticles: number;
  activeConversations: number;
  pendingMeetings: number;
  activeProjects: number;
}

interface ActionItem {
  label: string;
  count: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'ticket' | 'client' | 'conversation' | 'opportunity';
  title: string;
  time: string;
}

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0, openTickets: 0, activeOpportunities: 0, totalQuotes: 0,
    totalArticles: 0, activeConversations: 0, pendingMeetings: 0, activeProjects: 0,
  });
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          { count: clientsCount },
          { count: ticketsCount },
          { count: oppsCount },
          { count: quotesCount },
          { count: articlesCount },
          { count: convsCount },
          { count: meetingsCount },
          { count: projectsCount },
          { count: unreadTickets },
          { count: waitingChats },
        ] = await Promise.all([
          supabase.from('client_organizations').select('*', { count: 'exact', head: true }),
          supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
          supabase.from('crm_opportunities').select('*', { count: 'exact', head: true }).not('stage', 'in', '("closed_won","closed_lost")'),
          supabase.from('crm_quotes').select('*', { count: 'exact', head: true }),
          supabase.from('docs_articles').select('*', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('status', 'assigned'),
          supabase.from('meeting_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('crm_implementations').select('*', { count: 'exact', head: true }).in('status', ['in_progress', 'planning']),
          supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
          supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('status', 'assigned'),
        ]);

        setStats({
          totalClients: clientsCount || 0,
          openTickets: ticketsCount || 0,
          activeOpportunities: oppsCount || 0,
          totalQuotes: quotesCount || 0,
          totalArticles: articlesCount || 0,
          activeConversations: convsCount || 0,
          pendingMeetings: meetingsCount || 0,
          activeProjects: projectsCount || 0,
        });

        const actionItems: ActionItem[] = [];
        if ((unreadTickets || 0) > 0) actionItems.push({ label: 'تذاكر جديدة', count: unreadTickets || 0, href: '/admin/tickets', icon: Ticket, color: 'text-red-600' });
        if ((waitingChats || 0) > 0) actionItems.push({ label: 'محادثات نشطة', count: waitingChats || 0, href: '/admin/chat', icon: MessageSquare, color: 'text-green-600' });
        if ((meetingsCount || 0) > 0) actionItems.push({ label: 'اجتماعات معلقة', count: meetingsCount || 0, href: '/admin/meetings', icon: Calendar, color: 'text-cyan-600' });
        setActions(actionItems);

        // Recent activity
        const { data: recentTickets } = await supabase.from('support_tickets').select('id, subject, created_at').order('created_at', { ascending: false }).limit(3);
        const { data: recentClients } = await supabase.from('client_organizations').select('id, name, created_at').order('created_at', { ascending: false }).limit(2);

        const activities: RecentActivity[] = [
          ...(recentTickets || []).map((t: any) => ({ id: t.id, type: 'ticket' as const, title: t.subject, time: t.created_at })),
          ...(recentClients || []).map((c: any) => ({ id: c.id, type: 'client' as const, title: c.name, time: c.created_at })),
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);

        setRecentActivity(activities);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpiCards = [
    { label: 'العملاء', value: stats.totalClients, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', href: '/admin/clients' },
    { label: 'التذاكر المفتوحة', value: stats.openTickets, icon: Ticket, color: 'text-red-600', bg: 'bg-red-50', href: '/admin/tickets' },
    { label: 'الفرص النشطة', value: stats.activeOpportunities, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', href: '/admin/crm/deals' },
    { label: 'عروض الأسعار', value: stats.totalQuotes, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', href: '/admin/crm/quotes' },
  ];

  const secondaryCards = [
    { label: 'المقالات المنشورة', value: stats.totalArticles, icon: FileText, href: '/admin/articles' },
    { label: 'المحادثات النشطة', value: stats.activeConversations, icon: MessageSquare, href: '/admin/chat' },
    { label: 'الاجتماعات المعلقة', value: stats.pendingMeetings, icon: Calendar, href: '/admin/meetings' },
    { label: 'المشاريع النشطة', value: stats.activeProjects, icon: Rocket, href: '/admin/projects' },
  ];

  const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
    ticket: { icon: Ticket, label: 'تذكرة', color: 'bg-red-100 text-red-700' },
    client: { icon: Building2, label: 'عميل جديد', color: 'bg-blue-100 text-blue-700' },
    conversation: { icon: MessageSquare, label: 'محادثة', color: 'bg-green-100 text-green-700' },
    opportunity: { icon: Target, label: 'فرصة', color: 'bg-purple-100 text-purple-700' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground text-sm">نظرة عامة على أداء النظام</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/crm/leads">
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />عميل محتمل</Button>
          </Link>
          <Link to="/admin/articles/new">
            <Button size="sm" variant="outline" className="gap-2"><Plus className="h-4 w-4" />مقال جديد</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Link key={kpi.label} to={kpi.href}>
            <Card className="rounded-xl hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("p-2 rounded-lg", kpi.bg)}>
                    <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground">{kpi.value}</div>
                <p className="text-sm text-muted-foreground mt-1">{kpi.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Secondary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {secondaryCards.map((card) => (
          <Link key={card.label} to={card.href}>
            <Card className="rounded-xl hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <card.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-xl font-bold text-foreground">{card.value}</div>
                  <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Action Items + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Needs Action */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              يحتاج إجراء
            </CardTitle>
          </CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا توجد إجراءات مطلوبة حالياً ✓</p>
            ) : (
              <div className="space-y-2">
                {actions.map((action) => (
                  <Link key={action.href} to={action.href} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <action.icon className={cn("h-5 w-5", action.color)} />
                      <span className="text-sm font-medium">{action.label}</span>
                    </div>
                    <Badge variant="secondary" className="font-bold">{action.count}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              أحدث النشاط
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا يوجد نشاط حديث</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => {
                  const config = typeConfig[activity.type];
                  return (
                    <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <config.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.color)}>{config.label}</Badge>
                        </div>
                        <p className="text-sm font-medium truncate mt-0.5">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.time), 'dd MMM yyyy, HH:mm', { locale: ar })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'عميل محتمل جديد', href: '/admin/crm/leads', icon: Users },
              { label: 'عرض سعر جديد', href: '/admin/crm/quotes', icon: FileText },
              { label: 'مقال جديد', href: '/admin/articles/new', icon: FileText },
              { label: 'عرض التقارير', href: '/admin/reports', icon: BarChart3 },
            ].map((action) => (
              <Link key={action.href} to={action.href}>
                <Button variant="outline" className="w-full justify-start gap-2 h-11">
                  <action.icon className="h-4 w-4" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
