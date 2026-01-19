import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Ticket, 
  Calendar, 
  CreditCard, 
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Plus,
  TrendingUp,
  Bell,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  Loader2,
  Users,
  FileText,
  Zap,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  pendingMeetings: number;
  subscriptionDaysLeft: number;
  totalConversations: number;
  unreadMessages: number;
}

interface RecentActivity {
  id: string;
  type: 'ticket' | 'meeting' | 'conversation';
  title: string;
  status: string;
  date: string;
}

interface QuickStat {
  label: string;
  value: number;
  icon: any;
  color: string;
  bgColor: string;
  link: string;
  description?: string;
}

const PortalDashboard = () => {
  const { user } = useAuth();
  const { clientInfo } = useOutletContext<{ clientInfo: any }>();
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    pendingMeetings: 0,
    subscriptionDaysLeft: 0,
    totalConversations: 0,
    unreadMessages: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data: clientData } = await supabase
        .from('client_accounts')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!clientData) return;

      const orgId = clientData.organization_id;

      // Fetch tickets stats
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id, status')
        .eq('organization_id', orgId);

      const totalTickets = tickets?.length || 0;
      const openTickets = tickets?.filter(t => t.status === 'open' || t.status === 'in_progress').length || 0;

      // Fetch pending meetings
      const { data: meetings } = await supabase
        .from('meeting_requests')
        .select('id')
        .eq('organization_id', orgId)
        .eq('status', 'pending');

      const pendingMeetings = meetings?.length || 0;

      // Fetch conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, unread_count')
        .eq('organization_id', orgId);

      const totalConversations = conversations?.length || 0;
      const unreadMessages = conversations?.reduce((acc, c) => acc + (c.unread_count || 0), 0) || 0;

      // Get organization subscription info
      const { data: org } = await supabase
        .from('client_organizations')
        .select('subscription_end_date')
        .eq('id', orgId)
        .single();

      let subscriptionDaysLeft = 0;
      if (org?.subscription_end_date) {
        const endDate = new Date(org.subscription_end_date);
        const today = new Date();
        subscriptionDaysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      }

      setStats({
        totalTickets,
        openTickets,
        pendingMeetings,
        subscriptionDaysLeft,
        totalConversations,
        unreadMessages
      });

      // Fetch recent activity
      const activities: RecentActivity[] = [];

      const { data: recentTickets } = await supabase
        .from('support_tickets')
        .select('id, subject, status, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(3);

      recentTickets?.forEach(t => {
        activities.push({
          id: t.id,
          type: 'ticket',
          title: t.subject,
          status: t.status,
          date: t.created_at
        });
      });

      const { data: recentMeetings } = await supabase
        .from('meeting_requests')
        .select('id, subject, status, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(2);

      recentMeetings?.forEach(m => {
        activities.push({
          id: m.id,
          type: 'meeting',
          title: m.subject,
          status: m.status,
          date: m.created_at
        });
      });

      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string, type: string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      open: { label: 'مفتوحة', color: 'text-blue-600', bg: 'bg-blue-100' },
      in_progress: { label: 'قيد المعالجة', color: 'text-amber-600', bg: 'bg-amber-100' },
      resolved: { label: 'تم الحل', color: 'text-emerald-600', bg: 'bg-emerald-100' },
      closed: { label: 'مغلقة', color: 'text-gray-600', bg: 'bg-gray-100' },
      pending: { label: 'في الانتظار', color: 'text-amber-600', bg: 'bg-amber-100' },
      confirmed: { label: 'مؤكد', color: 'text-emerald-600', bg: 'bg-emerald-100' },
      completed: { label: 'مكتمل', color: 'text-emerald-600', bg: 'bg-emerald-100' },
      cancelled: { label: 'ملغي', color: 'text-red-600', bg: 'bg-red-100' },
    };

    return configs[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ticket': return Ticket;
      case 'meeting': return Calendar;
      case 'conversation': return MessageSquare;
      default: return Bell;
    }
  };

  const quickStats: QuickStat[] = [
    {
      label: 'تذاكر مفتوحة',
      value: stats.openTickets,
      icon: AlertCircle,
      color: 'text-amber-600',
      bgColor: 'from-amber-500/10 to-orange-500/10',
      link: '/portal/tickets',
      description: `من أصل ${stats.totalTickets} تذكرة`
    },
    {
      label: 'اجتماعات معلقة',
      value: stats.pendingMeetings,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'from-blue-500/10 to-indigo-500/10',
      link: '/portal/meetings',
      description: 'في انتظار التأكيد'
    },
    {
      label: 'رسائل جديدة',
      value: stats.unreadMessages,
      icon: MessageSquare,
      color: 'text-emerald-600',
      bgColor: 'from-emerald-500/10 to-teal-500/10',
      link: '/portal/chat',
      description: `في ${stats.totalConversations} محادثة`
    },
    {
      label: 'أيام الاشتراك',
      value: stats.subscriptionDaysLeft,
      icon: CreditCard,
      color: stats.subscriptionDaysLeft <= 7 ? 'text-red-600' : 'text-primary',
      bgColor: stats.subscriptionDaysLeft <= 7 ? 'from-red-500/10 to-rose-500/10' : 'from-primary/10 to-secondary/10',
      link: '/portal/subscription',
      description: stats.subscriptionDaysLeft <= 7 ? 'يجب التجديد قريباً' : 'متبقية'
    }
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
            <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Hero Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary via-primary/90 to-secondary p-6 lg:p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/5" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-secondary" />
                <span className="text-sm font-medium text-white/80">بوابة العملاء</span>
              </div>
              <h1 className="text-2xl lg:text-4xl font-bold mb-2">
                مرحباً، {clientInfo?.full_name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-white/80 text-sm lg:text-base max-w-xl">
                يسعدنا تواجدك في بوابة عملاء ويبيان. يمكنك من هنا متابعة طلباتك وإدارة حسابك بكل سهولة.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg gap-2">
                <Link to="/portal/tickets/new">
                  <Plus className="w-5 h-5" />
                  تذكرة جديدة
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 gap-2">
                <Link to="/portal/meetings/new">
                  <Calendar className="w-5 h-5" />
                  طلب اجتماع
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="group"
          >
            <Card className={cn(
              "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer h-full",
              "bg-gradient-to-br", stat.bgColor
            )}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center",
                    stat.color.replace('text-', 'bg-').replace('600', '100')
                  )}>
                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:-translate-x-1 transition-all opacity-0 group-hover:opacity-100" />
                </div>
                <div>
                  <p className={cn("text-3xl font-bold mb-1", stat.color)}>{stat.value}</p>
                  <p className="text-sm font-medium text-foreground">{stat.label}</p>
                  {stat.description && (
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">إجراءات سريعة</CardTitle>
                <CardDescription className="text-xs">الوصول السريع للخدمات</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              to="/portal/tickets/new"
              className="flex items-center gap-4 p-4 rounded-xl border border-dashed hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <Plus className="w-5 h-5 text-primary group-hover:text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">فتح تذكرة دعم</p>
                <p className="text-xs text-muted-foreground">احصل على المساعدة فوراً</p>
              </div>
              <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
            </Link>

            <Link
              to="/portal/meetings/new"
              className="flex items-center gap-4 p-4 rounded-xl border border-dashed hover:border-secondary hover:bg-secondary/5 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors">
                <Calendar className="w-5 h-5 text-secondary group-hover:text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">حجز اجتماع</p>
                <p className="text-xs text-muted-foreground">تواصل مباشر مع الفريق</p>
              </div>
              <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-secondary group-hover:-translate-x-1 transition-all" />
            </Link>

            <Link
              to="/portal/chat"
              className="flex items-center gap-4 p-4 rounded-xl border border-dashed hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5 text-emerald-600 group-hover:text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">المحادثات</p>
                <p className="text-xs text-muted-foreground">دردشة مباشرة مع الدعم</p>
              </div>
              <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 group-hover:-translate-x-1 transition-all" />
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">النشاط الأخير</CardTitle>
                  <CardDescription className="text-xs">آخر التحديثات على حسابك</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild className="gap-1">
                <Link to="/portal/tickets">
                  عرض الكل
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                  <Bell className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-medium text-foreground mb-1">لا يوجد نشاط بعد</h3>
                <p className="text-sm text-muted-foreground mb-4">ابدأ بإنشاء تذكرة دعم أو طلب اجتماع</p>
                <Button asChild size="sm">
                  <Link to="/portal/tickets/new">
                    <Plus className="w-4 h-4 ml-1" />
                    إنشاء تذكرة
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => {
                  const statusConfig = getStatusConfig(activity.status, activity.type);
                  const Icon = getActivityIcon(activity.type);
                  
                  return (
                    <div 
                      key={`${activity.type}-${activity.id}`}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        activity.type === 'ticket' ? 'bg-primary/10' :
                        activity.type === 'meeting' ? 'bg-blue-100' : 'bg-emerald-100'
                      )}>
                        <Icon className={cn(
                          "w-5 h-5",
                          activity.type === 'ticket' ? 'text-primary' :
                          activity.type === 'meeting' ? 'text-blue-600' : 'text-emerald-600'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {activity.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            statusConfig.bg, statusConfig.color
                          )}>
                            {statusConfig.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: ar })}
                          </span>
                        </div>
                      </div>
                      <ArrowLeft className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Help Banner */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-l from-primary/5 via-primary/10 to-secondary/5">
        <div className="absolute inset-0 bg-grid-primary/5" />
        <div className="absolute top-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <CardContent className="relative p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <Star className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 text-center lg:text-right">
              <h3 className="text-xl font-bold text-foreground mb-2">هل تحتاج إلى مساعدة؟</h3>
              <p className="text-muted-foreground max-w-2xl">
                فريق دعم ويبيان متاح لمساعدتك على مدار الساعة. لا تتردد في التواصل معنا لأي استفسار أو مساعدة تحتاجها.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="gap-2 shadow-lg">
                <Link to="/portal/tickets/new">
                  <Ticket className="w-5 h-5" />
                  فتح تذكرة
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link to="/portal/chat">
                  <MessageSquare className="w-5 h-5" />
                  محادثة مباشرة
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalDashboard;
