import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Ticket, Clock, CheckCircle, AlertCircle, Search, Filter, Eye, 
  MessageSquare, User, UserPlus, Send, Building2, Globe, ExternalLink,
  ChevronRight, MoreHorizontal, RefreshCw, Download, Calendar,
  TrendingUp, Inbox, ArrowUpRight, Sparkles, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  subject: string;
  description: string;
  website_url: string | null;
  screenshot_url: string | null;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  assigned_to_staff: string | null;
  admin_note: string | null;
  closure_report: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  organization_id: string | null;
  source: string | null;
  source_domain: string | null;
  staff?: {
    full_name: string;
    email: string;
  } | null;
  organization?: {
    id: string;
    name: string;
    contact_email: string | null;
  } | null;
}

interface TicketReply {
  id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  job_title: string | null;
  can_reply_tickets: boolean;
  is_active: boolean;
}

interface Organization {
  id: string;
  name: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  open: { label: 'مفتوحة', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', icon: Inbox },
  in_progress: { label: 'قيد المعالجة', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', icon: Clock },
  resolved: { label: 'تم الحل', color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
  closed: { label: 'مغلقة', color: 'text-slate-500', bgColor: 'bg-slate-50 border-slate-200', icon: CheckCircle },
};

const priorityConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  low: { label: 'منخفضة', color: 'text-emerald-600', dotColor: 'bg-emerald-500' },
  medium: { label: 'متوسطة', color: 'text-amber-600', dotColor: 'bg-amber-500' },
  high: { label: 'عالية', color: 'text-red-600', dotColor: 'bg-red-500' },
};

const sourceConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  direct: { label: 'مباشر', color: 'text-slate-600', icon: User },
  embed: { label: 'نموذج مضمن', color: 'text-violet-600', icon: ExternalLink },
  portal: { label: 'بوابة العملاء', color: 'text-blue-600', icon: Building2 },
  api: { label: 'API', color: 'text-orange-600', icon: Globe },
};

const categoryLabels: Record<string, string> = {
  technical: 'مشكلة تقنية',
  question: 'استفسار عام',
  suggestion: 'اقتراح تحسين',
  complaint: 'شكوى',
  general: 'عام',
};

export default function AdminTicketsPage() {
  const { user, isAdminOrEditor } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  
  // View/Reply dialog
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [sending, setSending] = useState(false);

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [ticketToAssign, setTicketToAssign] = useState<SupportTicket | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [adminNote, setAdminNote] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!isAdminOrEditor) {
      navigate('/');
      return;
    }
    fetchTickets();
    fetchStaffMembers();
    fetchOrganizations();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [isAdminOrEditor, navigate]);

  const fetchTickets = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          organization:client_organizations(id, name, contact_email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const ticketsWithStaff = await Promise.all(
        (ticketsData || []).map(async (ticket: any) => {
          if (ticket.assigned_to_staff) {
            const { data: staffData } = await supabase
              .from('staff_members')
              .select('full_name, email')
              .eq('id', ticket.assigned_to_staff)
              .single();
            return { ...ticket, staff: staffData };
          }
          return { ...ticket, staff: null };
        })
      );
      
      setTickets(ticketsWithStaff as unknown as SupportTicket[]);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('client_organizations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_members' as any)
        .select('id, full_name, job_title, can_reply_tickets, is_active')
        .eq('is_active', true)
        .eq('can_reply_tickets', true);

      if (error) throw error;
      setStaffMembers((data as unknown as StaffMember[]) || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('admin-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchTickets(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchReplies = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching replies:', error);
      return;
    }
    setReplies(data || []);
  };

  const handleViewTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await fetchReplies(ticket.id);
    setViewDialogOpen(true);
  };

  const getTicketEmail = async (ticket: SupportTicket): Promise<string | null> => {
    if (ticket.guest_email) {
      return ticket.guest_email;
    }
    
    if (ticket.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', ticket.user_id)
        .single();
      
      return profile?.email || null;
    }
    
    return null;
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return;

      const updateData: any = { status: newStatus };
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      const statusLabels: Record<string, string> = {
        open: 'مفتوحة',
        in_progress: 'قيد المعالجة',
        resolved: 'تم الحل',
        closed: 'مغلقة',
      };

      if (ticket.user_id) {
        await supabase.from('user_notifications').insert({
          user_id: ticket.user_id,
          title: 'تحديث حالة التذكرة',
          message: `تم تغيير حالة تذكرتك "${ticket.subject}" إلى ${statusLabels[newStatus] || newStatus}`,
          type: 'ticket_update',
        });
      }

      const email = await getTicketEmail(ticket);
      if (email) {
        const siteUrl = window.location.origin;
        await supabase.functions.invoke('send-ticket-notification', {
          body: {
            email,
            ticketNumber: ticket.ticket_number,
            subject: ticket.subject,
            type: newStatus === 'resolved' ? 'resolved' : 'status_update',
            newStatus,
            siteUrl,
          },
        });
      }

      toast({
        title: "تم التحديث",
        description: "تم تغيير حالة التذكرة بنجاح",
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || !selectedTicket) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user?.id,
          message: newReply,
          is_staff_reply: true,
        });

      if (error) throw error;

      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
      }

      if (selectedTicket.user_id) {
        await supabase.from('user_notifications').insert({
          user_id: selectedTicket.user_id,
          title: 'رد جديد على تذكرتك',
          message: `تم إضافة رد جديد على تذكرتك "${selectedTicket.subject}"`,
          type: 'ticket_reply',
        });
      }

      const email = await getTicketEmail(selectedTicket);
      if (email) {
        const siteUrl = window.location.origin;
        await supabase.functions.invoke('send-ticket-notification', {
          body: {
            email,
            ticketNumber: selectedTicket.ticket_number,
            subject: selectedTicket.subject,
            type: 'reply',
            message: newReply,
            siteUrl,
          },
        });
      }

      setNewReply('');
      await fetchReplies(selectedTicket.id);
      
      toast({
        title: "تم الإرسال",
        description: "تم إرسال الرد بنجاح",
      });
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleOpenAssignDialog = (ticket: SupportTicket) => {
    setTicketToAssign(ticket);
    setSelectedStaffId(ticket.assigned_to_staff || '');
    setAdminNote(ticket.admin_note || '');
    setAssignDialogOpen(true);
  };

  const handleAssignTicket = async () => {
    if (!ticketToAssign || !selectedStaffId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار موظف",
        variant: "destructive",
      });
      return;
    }

    setAssigning(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          assigned_to_staff: selectedStaffId,
          admin_note: adminNote || null,
          status: ticketToAssign.status === 'open' ? 'in_progress' : ticketToAssign.status
        } as any)
        .eq('id', ticketToAssign.id);

      if (error) throw error;

      const staff = staffMembers.find(s => s.id === selectedStaffId);
      if (staff) {
        const { data: staffData } = await supabase
          .from('staff_members' as any)
          .select('user_id, email')
          .eq('id', selectedStaffId)
          .single();

        const staffRecord = staffData as any;
        if (staffRecord?.user_id) {
          await supabase.from('user_notifications').insert({
            user_id: staffRecord.user_id,
            title: '🎫 تذكرة جديدة موجهة إليك',
            message: `تم توجيه التذكرة "${ticketToAssign.subject}" إليك${adminNote ? ` - ملاحظة: ${adminNote}` : ''}`,
            type: 'ticket_assigned',
          });
        }

        if (staffRecord?.email) {
          await supabase.functions.invoke('send-staff-notification', {
            body: {
              type: 'ticket_assigned',
              staff_email: staffRecord.email,
              staff_name: staff.full_name,
              data: {
                ticket_number: ticketToAssign.ticket_number,
                ticket_subject: ticketToAssign.subject,
                admin_note: adminNote,
              },
            },
          });
        }
      }

      toast({
        title: "تم التوجيه",
        description: "تم توجيه التذكرة للموظف بنجاح وإرسال إشعار له",
      });

      setAssignDialogOpen(false);
      fetchTickets(true);
    } catch (error: any) {
      console.error('Error assigning ticket:', error);
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.guest_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.guest_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.organization?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = activeTab === 'all' || 
      (activeTab === 'active' && (ticket.status === 'open' || ticket.status === 'in_progress')) ||
      (activeTab === 'resolved' && (ticket.status === 'resolved' || ticket.status === 'closed')) ||
      ticket.status === activeTab;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesOrganization = organizationFilter === 'all' || ticket.organization_id === organizationFilter;
    const matchesSource = sourceFilter === 'all' || ticket.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesOrganization && matchesSource;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    unassigned: tickets.filter(t => !t.assigned_to_staff && t.status !== 'resolved' && t.status !== 'closed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Ticket className="h-5 w-5 text-primary animate-bounce" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">جاري تحميل التذاكر...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">مركز إدارة التذاكر</h1>
                <p className="text-sm text-muted-foreground">متابعة وإدارة تذاكر الدعم الفني</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTickets(true)}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-background to-muted/30 border-border/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('all')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Ticket className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">إجمالي التذاكر</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/30 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('open')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Inbox className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
                  <p className="text-xs text-muted-foreground">مفتوحة</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50 dark:border-amber-800/30 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('in_progress')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
                  <p className="text-xs text-muted-foreground">قيد المعالجة</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/30 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('resolved')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p>
                  <p className="text-xs text-muted-foreground">تم الحل</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border-rose-200/50 dark:border-rose-800/30 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('active')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-rose-500/10">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-rose-600">{stats.unassigned}</p>
                  <p className="text-xs text-muted-foreground">غير موجهة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث برقم التذكرة، الموضوع، اسم العميل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 bg-background"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                  <SelectTrigger className="w-[160px] bg-background">
                    <Building2 className="h-4 w-4 ml-2 text-muted-foreground" />
                    <SelectValue placeholder="العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع العملاء</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[140px] bg-background">
                    <Globe className="h-4 w-4 ml-2 text-muted-foreground" />
                    <SelectValue placeholder="المصدر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المصادر</SelectItem>
                    <SelectItem value="direct">مباشر</SelectItem>
                    <SelectItem value="embed">نموذج مضمن</SelectItem>
                    <SelectItem value="portal">بوابة العملاء</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[140px] bg-background">
                    <Filter className="h-4 w-4 ml-2 text-muted-foreground" />
                    <SelectValue placeholder="الأولوية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأولويات</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="low">منخفضة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs & Tickets List */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="gap-2">
              الكل
              <Badge variant="secondary" className="text-xs">{tickets.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="open" className="gap-2">
              مفتوحة
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">{stats.open}</Badge>
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="gap-2">
              قيد المعالجة
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">{stats.inProgress}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2">
              نشطة
              <Badge variant="secondary" className="text-xs">{stats.open + stats.inProgress}</Badge>
            </TabsTrigger>
            <TabsTrigger value="resolved" className="gap-2">
              تم الحل
              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">{stats.resolved}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <Card className="border-border/50 overflow-hidden">
              <ScrollArea className="h-[calc(100vh-480px)] min-h-[400px]">
                {filteredTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 rounded-full bg-muted/50 mb-4">
                      <Ticket className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-foreground mb-1">لا توجد تذاكر</h3>
                    <p className="text-sm text-muted-foreground">لم يتم العثور على تذاكر تطابق معايير البحث</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {filteredTickets.map((ticket) => {
                      const status = statusConfig[ticket.status] || statusConfig.open;
                      const priority = priorityConfig[ticket.priority] || priorityConfig.medium;
                      const source = sourceConfig[ticket.source || 'direct'] || sourceConfig.direct;
                      const StatusIcon = status.icon;
                      const SourceIcon = source.icon;

                      return (
                        <div
                          key={ticket.id}
                          className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                          onClick={() => handleViewTicket(ticket)}
                        >
                          <div className="flex items-start gap-4">
                            {/* Priority Indicator */}
                            <div className="flex flex-col items-center gap-2 pt-1">
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className={`w-3 h-3 rounded-full ${priority.dotColor}`} />
                                </TooltipTrigger>
                                <TooltipContent>أولوية {priority.label}</TooltipContent>
                              </Tooltip>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  {/* Ticket Number & Subject */}
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                                      {ticket.ticket_number}
                                    </span>
                                    <Badge variant="outline" className={`${status.bgColor} ${status.color} text-xs border`}>
                                      <StatusIcon className="h-3 w-3 ml-1" />
                                      {status.label}
                                    </Badge>
                                    {ticket.source === 'embed' && (
                                      <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-xs">
                                        <ExternalLink className="h-3 w-3 ml-1" />
                                        مضمن
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <h3 className="font-medium text-foreground truncate mb-1 group-hover:text-primary transition-colors">
                                    {ticket.subject}
                                  </h3>
                                  
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    {ticket.description}
                                  </p>

                                  {/* Meta Info */}
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    {/* Sender */}
                                    <div className="flex items-center gap-1.5">
                                      <Avatar className="h-5 w-5">
                                        <AvatarFallback className="text-[10px]">
                                          {ticket.guest_name?.[0] || 'م'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{ticket.guest_name || 'مستخدم مسجل'}</span>
                                    </div>

                                    {/* Organization */}
                                    {ticket.organization && (
                                      <div className="flex items-center gap-1">
                                        <Building2 className="h-3.5 w-3.5" />
                                        <span>{ticket.organization.name}</span>
                                      </div>
                                    )}

                                    {/* Category */}
                                    <span className="text-muted-foreground/70">
                                      {categoryLabels[ticket.category] || ticket.category}
                                    </span>

                                    {/* Time */}
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span>{formatDistanceToNow(new Date(ticket.created_at), { locale: ar, addSuffix: true })}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Side - Staff & Actions */}
                                <div className="flex flex-col items-end gap-2">
                                  {/* Assigned Staff */}
                                  {ticket.staff ? (
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-muted-foreground">{ticket.staff.full_name}</span>
                                      <Avatar className="h-7 w-7 border-2 border-primary/20">
                                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                          {ticket.staff.full_name[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-muted-foreground bg-muted/30">
                                      غير موجهة
                                    </Badge>
                                  )}

                                  {/* Actions */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewTicket(ticket);
                                          }}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>عرض التفاصيل</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenAssignDialog(ticket);
                                          }}
                                        >
                                          <UserPlus className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>توجيه لموظف</TooltipContent>
                                    </Tooltip>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(ticket.id, 'in_progress');
                                        }}>
                                          <Clock className="h-4 w-4 ml-2" />
                                          تحويل لقيد المعالجة
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(ticket.id, 'resolved');
                                        }}>
                                          <CheckCircle className="h-4 w-4 ml-2" />
                                          تحويل لتم الحل
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(ticket.id, 'closed');
                                        }}>
                                          إغلاق التذكرة
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View/Reply Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {selectedTicket && (
              <>
                <DialogHeader className="pb-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {selectedTicket.ticket_number}
                        </span>
                        <Badge className={`${statusConfig[selectedTicket.status]?.bgColor} ${statusConfig[selectedTicket.status]?.color} border`}>
                          {statusConfig[selectedTicket.status]?.label}
                        </Badge>
                        {selectedTicket.source === 'embed' && (
                          <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                            <ExternalLink className="h-3 w-3 ml-1" />
                            نموذج مضمن
                          </Badge>
                        )}
                      </div>
                      <DialogTitle className="text-xl">{selectedTicket.subject}</DialogTitle>
                    </div>
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(value) => handleStatusChange(selectedTicket.id, value)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">مفتوحة</SelectItem>
                        <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                        <SelectItem value="resolved">تم الحل</SelectItem>
                        <SelectItem value="closed">مغلقة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-6 py-4">
                    {/* Client & Sender Info */}
                    {selectedTicket.organization && (
                      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-4 border border-primary/10">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold text-lg">{selectedTicket.organization.name}</div>
                            {selectedTicket.organization.contact_email && (
                              <div className="text-sm text-muted-foreground">{selectedTicket.organization.contact_email}</div>
                            )}
                          </div>
                        </div>
                        {selectedTicket.source_domain && (
                          <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span>النطاق المصدر: {selectedTicket.source_domain}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ticket Info */}
                    <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">المرسل:</span>
                        <span>{selectedTicket.guest_name || 'مستخدم مسجل'}</span>
                        {selectedTicket.guest_email && (
                          <span className="text-muted-foreground">({selectedTicket.guest_email})</span>
                        )}
                      </div>
                      <Separator />
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                        {selectedTicket.description}
                      </p>
                      {(selectedTicket.website_url || selectedTicket.screenshot_url) && (
                        <div className="flex gap-4 pt-2">
                          {selectedTicket.website_url && (
                            <a
                              href={selectedTicket.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              الرابط المرفق
                            </a>
                          )}
                          {selectedTicket.screenshot_url && (
                            <a
                              href={selectedTicket.screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              الصورة المرفقة
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Replies */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        المحادثة ({replies.length})
                      </h4>
                      <div className="space-y-3">
                        {replies.map((reply) => (
                          <div
                            key={reply.id}
                            className={`p-4 rounded-xl ${
                              reply.is_staff_reply 
                                ? 'bg-primary/5 border border-primary/10 mr-6' 
                                : 'bg-muted/50 ml-6'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className={`text-xs ${reply.is_staff_reply ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                                    {reply.is_staff_reply ? 'د' : 'ع'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">
                                  {reply.is_staff_reply ? 'فريق الدعم' : 'العميل'}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(reply.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reply Form */}
                    {selectedTicket.status !== 'closed' && (
                      <div className="space-y-3 pt-4 border-t">
                        <Label className="flex items-center gap-2">
                          <Send className="h-4 w-4 text-primary" />
                          إرسال رد
                        </Label>
                        <Textarea
                          placeholder="اكتب ردك هنا..."
                          value={newReply}
                          onChange={(e) => setNewReply(e.target.value)}
                          className="min-h-[100px] resize-none"
                        />
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <DialogFooter className="pt-4 border-t">
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                    إغلاق
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewDialogOpen(false);
                      handleOpenAssignDialog(selectedTicket);
                    }}
                  >
                    <UserPlus className="h-4 w-4 ml-2" />
                    توجيه
                  </Button>
                  {selectedTicket.status !== 'closed' && (
                    <Button onClick={handleSendReply} disabled={!newReply.trim() || sending}>
                      <Send className="h-4 w-4 ml-2" />
                      {sending ? 'جاري الإرسال...' : 'إرسال الرد'}
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Assign Staff Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>توجيه التذكرة</DialogTitle>
                  <DialogDescription>اختر الموظف المسؤول عن هذه التذكرة</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>اختر الموظف *</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر موظف..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">{staff.full_name[0]}</AvatarFallback>
                          </Avatar>
                          <span>{staff.full_name}</span>
                          {staff.job_title && (
                            <span className="text-muted-foreground text-xs">({staff.job_title})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ملاحظة للموظف (اختياري)</Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="أضف ملاحظة أو تعليمات للموظف..."
                  className="min-h-[80px] resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAssignTicket} disabled={!selectedStaffId || assigning}>
                <Send className="h-4 w-4 ml-2" />
                {assigning ? 'جاري التوجيه...' : 'توجيه التذكرة'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
