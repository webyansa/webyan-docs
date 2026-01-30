import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { format, parseISO, isToday, isTomorrow, differenceInHours } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Ticket,
  Calendar,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Building2,
  Loader2,
  MessageCircle,
  TrendingUp,
  Zap,
  Star,
  Users,
  Timer,
  Coffee,
  Target,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AssignedTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  admin_note: string | null;
  organization?: { name: string };
}

interface AssignedMeeting {
  id: string;
  subject: string;
  status: string;
  meeting_type: string;
  confirmed_date: string | null;
  preferred_date: string;
  organization?: { name: string };
}

interface StaffStats {
  totalTickets: number;
  resolvedTickets: number;
  totalMeetings: number;
  completedMeetings: number;
  activeChats: number;
}

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: 'منخفضة', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
  medium: { label: 'متوسطة', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  high: { label: 'عالية', color: 'text-rose-700', bgColor: 'bg-rose-50 border-rose-200' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'مفتوحة', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_progress: { label: 'قيد المعالجة', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved: { label: 'تم الحل', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  pending: { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  confirmed: { label: 'مؤكد', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  completed: { label: 'منتهي', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const meetingTypes: Record<string, string> = {
  general: 'اجتماع عام',
  training: 'جلسة تدريبية',
  support: 'دعم فني',
  demo: 'عرض توضيحي',
  consultation: 'استشارة',
};

export default function StaffDashboard() {
  const { permissions } = useStaffAuth();
  const [tickets, setTickets] = useState<AssignedTicket[]>([]);
  const [meetings, setMeetings] = useState<AssignedMeeting[]>([]);
  const [stats, setStats] = useState<StaffStats>({
    totalTickets: 0,
    resolvedTickets: 0,
    totalMeetings: 0,
    completedMeetings: 0,
    activeChats: 0,
  });
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('صباح الخير');
    else if (hour >= 12 && hour < 17) setGreeting('مساء الخير');
    else setGreeting('مساء الخير');
  }, []);

  useEffect(() => {
    if (permissions.staffId) {
      fetchData();
    }
  }, [permissions.staffId]);

  const fetchData = async () => {
    if (!permissions.staffId) return;

    setLoading(true);
    try {
      // Fetch staff name
      const { data: staffData } = await supabase
        .from('staff_members')
        .select('full_name')
        .eq('id', permissions.staffId)
        .single();
      
      if (staffData) setStaffName(staffData.full_name);

      // Fetch statistics
      let totalTickets = 0, resolvedTickets = 0, totalMeetings = 0, completedMeetings = 0, activeChats = 0;

      if (permissions.canReplyTickets) {
        // All assigned tickets
        const { count: ticketCount } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to_staff', permissions.staffId);
        totalTickets = ticketCount || 0;

        // Resolved tickets
        const { count: resolvedCount } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to_staff', permissions.staffId)
          .in('status', ['resolved', 'closed']);
        resolvedTickets = resolvedCount || 0;

        // Active tickets for list
        const { data: ticketsData } = await supabase
          .from('support_tickets')
          .select('id, ticket_number, subject, status, priority, created_at, admin_note, organization_id')
          .eq('assigned_to_staff', permissions.staffId)
          .in('status', ['open', 'in_progress'])
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5);

        if (ticketsData) {
          const ticketsWithOrg = await Promise.all(
            ticketsData.map(async (ticket: any) => {
              if (ticket.organization_id) {
                const { data: orgData } = await supabase
                  .from('client_organizations')
                  .select('name')
                  .eq('id', ticket.organization_id)
                  .single();
                return { ...ticket, organization: orgData || undefined };
              }
              return ticket;
            })
          );
          setTickets(ticketsWithOrg);
        }

        // Active conversations
        const { count: chatCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_agent_id', permissions.staffId)
          .neq('status', 'closed');
        activeChats = chatCount || 0;
      }

      if (permissions.canAttendMeetings) {
        // All assigned meetings
        const { count: meetingCount } = await supabase
          .from('meeting_requests')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_staff', permissions.staffId);
        totalMeetings = meetingCount || 0;

        // Completed meetings
        const { count: completedCount } = await supabase
          .from('meeting_requests')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_staff', permissions.staffId)
          .eq('status', 'completed');
        completedMeetings = completedCount || 0;

        // Upcoming meetings for list
        const { data: meetingsData } = await supabase
          .from('meeting_requests')
          .select('id, subject, status, meeting_type, confirmed_date, preferred_date, organization_id')
          .eq('assigned_staff', permissions.staffId)
          .in('status', ['pending', 'confirmed'])
          .order('preferred_date', { ascending: true })
          .limit(5);

        if (meetingsData) {
          const meetingsWithOrg = await Promise.all(
            meetingsData.map(async (meeting: any) => {
              const { data: orgData } = await supabase
                .from('client_organizations')
                .select('name')
                .eq('id', meeting.organization_id)
                .single();
              return { ...meeting, organization: orgData || undefined };
            })
          );
          setMeetings(meetingsWithOrg);
        }
      }

      setStats({ totalTickets, resolvedTickets, totalMeetings, completedMeetings, activeChats });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntilMeeting = (date: string) => {
    const meetingDate = parseISO(date);
    if (isToday(meetingDate)) return { label: 'اليوم', urgent: true };
    if (isTomorrow(meetingDate)) return { label: 'غداً', urgent: false };
    const hours = differenceInHours(meetingDate, new Date());
    if (hours < 48) return { label: `خلال ${hours} ساعة`, urgent: true };
    return { label: format(meetingDate, 'EEEE d MMM', { locale: ar }), urgent: false };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Coffee className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground animate-pulse">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  const ticketProgress = stats.totalTickets > 0 
    ? Math.round((stats.resolvedTickets / stats.totalTickets) * 100) 
    : 0;
  const meetingProgress = stats.totalMeetings > 0 
    ? Math.round((stats.completedMeetings / stats.totalMeetings) * 100) 
    : 0;

  const openTickets = tickets.length;
  const upcomingMeetings = meetings.length;
  const urgentTickets = tickets.filter(t => t.priority === 'high').length;

  return (
    <div className="space-y-8">
      {/* Hero Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 border-2 border-white/20">
                  <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                    {staffName?.charAt(0) || '؟'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white/80 text-sm">{greeting}،</p>
                  <h1 className="text-2xl md:text-3xl font-bold">{staffName}</h1>
                </div>
              </div>
              <p className="text-white/70 max-w-md">
                إليك ملخص نشاطك اليوم. تابع مهامك وحافظ على أدائك المتميز!
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {permissions.canReplyTickets && openTickets > 0 && (
                <Link to="/support/tickets">
                  <Button variant="secondary" className="gap-2 shadow-lg">
                    <Ticket className="h-4 w-4" />
                    {openTickets} تذكرة نشطة
                  </Button>
                </Link>
              )}
              {permissions.canReplyTickets && stats.activeChats > 0 && (
                <Link to="/support/chat">
                  <Button variant="secondary" className="gap-2 shadow-lg">
                    <MessageCircle className="h-4 w-4" />
                    {stats.activeChats} محادثة
                  </Button>
                </Link>
              )}
              {permissions.canAttendMeetings && upcomingMeetings > 0 && (
                <Link to="/support/meetings">
                  <Button variant="secondary" className="gap-2 shadow-lg">
                    <Calendar className="h-4 w-4" />
                    {upcomingMeetings} اجتماع قادم
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {permissions.canReplyTickets && (
          <>
            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600/80 font-medium">التذاكر النشطة</p>
                    <p className="text-3xl font-bold text-blue-700 mt-1">{openTickets}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Ticket className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                {urgentTickets > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-full w-fit">
                    <AlertCircle className="h-3 w-3" />
                    {urgentTickets} عاجلة
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-violet-50 to-violet-100/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-violet-600/80 font-medium">المحادثات</p>
                    <p className="text-3xl font-bold text-violet-700 mt-1">{stats.activeChats}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageCircle className="h-6 w-6 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {permissions.canAttendMeetings && (
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600/80 font-medium">الاجتماعات القادمة</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-1">{upcomingMeetings}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {permissions.canManageContent && (
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-orange-50 to-orange-100/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600/80 font-medium">إدارة المحتوى</p>
                  <Link to="/support/content" className="text-lg font-bold text-orange-700 mt-1 hover:underline">
                    الانتقال ←
                  </Link>
                </div>
                <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Cards */}
      {(permissions.canReplyTickets || permissions.canAttendMeetings) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {permissions.canReplyTickets && stats.totalTickets > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-500/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">إنجاز التذاكر</CardTitle>
                    <CardDescription>نسبة التذاكر المُنجزة</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-4xl font-bold text-blue-600">{ticketProgress}%</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.resolvedTickets} من {stats.totalTickets}
                    </span>
                  </div>
                  <Progress value={ticketProgress} className="h-2" />
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                    <span>أداء ممتاز! استمر في العمل الرائع</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {permissions.canAttendMeetings && stats.totalMeetings > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-emerald-500/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">إنجاز الاجتماعات</CardTitle>
                    <CardDescription>نسبة الاجتماعات المُنجزة</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-4xl font-bold text-emerald-600">{meetingProgress}%</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.completedMeetings} من {stats.totalMeetings}
                    </span>
                  </div>
                  <Progress value={meetingProgress} className="h-2 bg-emerald-100 [&>div]:bg-emerald-500" />
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <Star className="h-4 w-4" />
                    <span>التزام رائع بالاجتماعات</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Task Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Tickets */}
        {permissions.canReplyTickets && (
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">التذاكر الموجهة إليك</CardTitle>
                  <CardDescription className="text-xs">التذاكر التي تحتاج متابعتك</CardDescription>
                </div>
              </div>
              <Link to="/support/tickets">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  عرض الكل
                  <ArrowLeft className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">لا توجد تذاكر نشطة</p>
                  <p className="text-sm text-muted-foreground/70">ممتاز! أنهيت جميع مهامك</p>
                </div>
              ) : (
                <ScrollArea className="h-[320px]">
                  <div className="divide-y">
                    {tickets.map((ticket, index) => (
                      <Link key={ticket.id} to={`/support/tickets/${ticket.id}`}>
                        <div className="p-4 hover:bg-muted/50 transition-colors group">
                          <div className="flex items-start gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold ${priorityConfig[ticket.priority]?.bgColor} ${priorityConfig[ticket.priority]?.color} border`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {ticket.ticket_number}
                                </span>
                                <Badge variant="outline" className={`text-[10px] ${statusConfig[ticket.status]?.color}`}>
                                  {statusConfig[ticket.status]?.label}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${priorityConfig[ticket.priority]?.bgColor} ${priorityConfig[ticket.priority]?.color}`}>
                                  {priorityConfig[ticket.priority]?.label}
                                </Badge>
                              </div>
                              <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                {ticket.subject}
                              </h4>
                              {ticket.organization && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Building2 className="h-3 w-3" />
                                  {ticket.organization.name}
                                </p>
                              )}
                              {ticket.admin_note && (
                                <p className="text-xs text-orange-600 mt-1.5 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded">
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{ticket.admin_note}</span>
                                </p>
                              )}
                            </div>
                            <ArrowLeft className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:-translate-x-1 transition-all" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Meetings */}
        {permissions.canAttendMeetings && (
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">الاجتماعات القادمة</CardTitle>
                  <CardDescription className="text-xs">الاجتماعات المطلوب حضورها</CardDescription>
                </div>
              </div>
              <Link to="/support/meetings">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  عرض الكل
                  <ArrowLeft className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {meetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Coffee className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">لا توجد اجتماعات قادمة</p>
                  <p className="text-sm text-muted-foreground/70">استمتع بوقتك!</p>
                </div>
              ) : (
                <ScrollArea className="h-[320px]">
                  <div className="divide-y">
                    {meetings.map((meeting) => {
                      const timeInfo = getTimeUntilMeeting(meeting.confirmed_date || meeting.preferred_date);
                      return (
                        <Link key={meeting.id} to={`/support/meetings/${meeting.id}`}>
                          <div className="p-4 hover:bg-muted/50 transition-colors group">
                            <div className="flex items-start gap-3">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${timeInfo.urgent ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                                <Timer className={`h-5 w-5 ${timeInfo.urgent ? 'text-amber-600' : 'text-emerald-600'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <Badge variant="outline" className="text-[10px]">
                                    {meetingTypes[meeting.meeting_type] || meeting.meeting_type}
                                  </Badge>
                                  <Badge variant="outline" className={`text-[10px] ${statusConfig[meeting.status]?.color}`}>
                                    {statusConfig[meeting.status]?.label}
                                  </Badge>
                                  {timeInfo.urgent && (
                                    <Badge className="text-[10px] bg-amber-500 hover:bg-amber-600">
                                      <Zap className="h-2.5 w-2.5 mr-1" />
                                      {timeInfo.label}
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                  {meeting.subject}
                                </h4>
                                {meeting.organization && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Building2 className="h-3 w-3" />
                                    {meeting.organization.name}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Clock className="h-3 w-3" />
                                  {format(
                                    parseISO(meeting.confirmed_date || meeting.preferred_date),
                                    'EEEE d MMMM - HH:mm',
                                    { locale: ar }
                                  )}
                                </p>
                              </div>
                              <ArrowLeft className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:-translate-x-1 transition-all" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
