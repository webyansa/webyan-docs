import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Ticket, Clock, CheckCircle, AlertCircle, Search, 
  MessageSquare, User, UserPlus, Send, Building2, 
  RefreshCw, Calendar, Inbox, ChevronRight, 
  Filter, X, ArrowUpRight, Hash, Mail, Phone,
  MoreVertical, Eye, ExternalLink, Trash2, Edit, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CreateTicketModal } from "@/components/admin/CreateTicketModal";
import { Checkbox } from "@/components/ui/checkbox";
import { TicketTasksManager } from "@/components/tickets/TicketTasksManager";

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
    website_url: string | null;
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

// Status configuration with vibrant colors
const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  open: { label: 'جديدة', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  in_progress: { label: 'قيد المعالجة', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  resolved: { label: 'تم الحل', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  closed: { label: 'مغلقة', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

// Priority configuration
const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: 'عاجلة', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  medium: { label: 'متوسطة', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  low: { label: 'عادية', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
};

const categoryLabels: Record<string, string> = {
  technical: 'تقنية',
  question: 'استفسار',
  suggestion: 'اقتراح',
  complaint: 'شكوى',
  general: 'عام',
};

function formatSmartDate(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) {
    return `اليوم ${format(date, 'HH:mm')}`;
  }
  if (isYesterday(date)) {
    return `أمس ${format(date, 'HH:mm')}`;
  }
  return format(date, 'dd/MM/yyyy', { locale: ar });
}

export default function AdminTicketsPage() {
  const { user, isAdminOrEditor } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // View ticket dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [sending, setSending] = useState(false);

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [ticketToAssign, setTicketToAssign] = useState<SupportTicket | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [adminNote, setAdminNote] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);

  // Selection & bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<SupportTicket | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Edit ticket
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<SupportTicket | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdminOrEditor) {
      navigate('/');
      return;
    }
    fetchTickets();
    fetchStaffMembers();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [isAdminOrEditor, navigate]);

  const fetchTickets = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select(`*, organization:client_organizations(id, name, contact_email, website_url)`)
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchTickets(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const fetchReplies = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error) setReplies(data || []);
  };

  const handleViewTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await fetchReplies(ticket.id);
    setViewDialogOpen(true);
  };

  const getTicketEmail = async (ticket: SupportTicket): Promise<string | null> => {
    if (ticket.guest_email) return ticket.guest_email;
    if (ticket.user_id) {
      const { data: profile } = await supabase.from('profiles').select('email').eq('id', ticket.user_id).single();
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

      const { error } = await supabase.from('support_tickets').update(updateData).eq('id', ticketId);
      if (error) throw error;

      const statusLabels: Record<string, string> = { open: 'مفتوحة', in_progress: 'قيد المعالجة', resolved: 'تم الحل', closed: 'مغلقة' };

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
        await supabase.functions.invoke('send-ticket-notification', {
          body: { email, ticketNumber: ticket.ticket_number, subject: ticket.subject, type: newStatus === 'resolved' ? 'resolved' : 'status_update', newStatus, siteUrl: window.location.origin },
        });
      }

      await logTicketActivity(ticketId, 'status_changed', ticket.status, newStatus, `تغيير الحالة إلى ${statusLabels[newStatus] || newStatus}`);
      toast({ title: "تم التحديث", description: "تم تغيير حالة التذكرة بنجاح" });
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || !selectedTicket) return;
    setSending(true);
    try {
      const { error } = await supabase.from('ticket_replies').insert({
        ticket_id: selectedTicket.id,
        user_id: user?.id,
        message: newReply,
        is_staff_reply: true,
      });
      if (error) throw error;

      if (selectedTicket.status === 'open') {
        await supabase.from('support_tickets').update({ status: 'in_progress' }).eq('id', selectedTicket.id);
        setSelectedTicket({ ...selectedTicket, status: 'in_progress' });
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
        await supabase.functions.invoke('send-ticket-notification', {
          body: { email, ticketNumber: selectedTicket.ticket_number, subject: selectedTicket.subject, type: 'reply', message: newReply, siteUrl: window.location.origin },
        });
      }

      setNewReply('');
      await fetchReplies(selectedTicket.id);
      toast({ title: "تم الإرسال", description: "تم إرسال الرد بنجاح" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleOpenAssignDialog = (ticket: SupportTicket) => {
    setTicketToAssign(ticket);
    setSelectedStaffId(ticket.assigned_to_staff || '');
    setAdminNote(ticket.admin_note || '');
    setAssignDialogOpen(true);
    setViewDialogOpen(false);
  };

  const handleAssignTicket = async () => {
    if (!ticketToAssign || !selectedStaffId) {
      toast({ title: "خطأ", description: "يرجى اختيار موظف", variant: "destructive" });
      return;
    }
    setAssigning(true);
    try {
      const { error } = await supabase.from('support_tickets').update({
        assigned_to_staff: selectedStaffId,
        admin_note: adminNote || null,
        status: ticketToAssign.status === 'open' ? 'in_progress' : ticketToAssign.status
      } as any).eq('id', ticketToAssign.id);

      if (error) throw error;

      const staff = staffMembers.find(s => s.id === selectedStaffId);
      if (staff) {
        const { data: staffData } = await supabase.from('staff_members' as any).select('user_id, email').eq('id', selectedStaffId).single();
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
            body: { type: 'ticket_assigned', staff_email: staffRecord.email, staff_name: staff.full_name, data: { ticket_number: ticketToAssign.ticket_number, ticket_subject: ticketToAssign.subject, admin_note: adminNote } },
          });
        }
      }

      toast({ title: "تم التوجيه", description: "تم توجيه التذكرة للموظف بنجاح" });
      setAssignDialogOpen(false);
      fetchTickets(true);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  const logTicketActivity = async (ticketId: string, actionType: string, oldValue?: string, newValue?: string, note?: string) => {
    try {
      const { data: staffData } = await supabase.from('staff_members').select('id, full_name').eq('user_id', user?.id || '').single();
      await supabase.from('ticket_activity_log').insert({
        ticket_id: ticketId,
        action_type: actionType,
        old_value: oldValue || null,
        new_value: newValue || null,
        note: note || null,
        performed_by: staffData?.id || null,
        performed_by_name: staffData?.full_name || user?.email || 'مسؤول',
        is_staff_action: true,
      });
    } catch (e) { console.error('Activity log error:', e); }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredTickets.map(t => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleDeleteTicket = async (ticket: SupportTicket) => {
    setDeleting(true);
    try {
      await supabase.from('ticket_tasks').delete().eq('ticket_id', ticket.id);
      await supabase.from('ticket_replies').delete().eq('ticket_id', ticket.id);
      await supabase.from('ticket_activity_log').delete().eq('ticket_id', ticket.id);
      
      await supabase.from('admin_notifications').insert({
        title: 'حذف تذكرة',
        message: `تم حذف التذكرة #${ticket.ticket_number} "${ticket.subject}" بواسطة ${user?.email}`,
        type: 'ticket_deleted',
        link: '/admin/tickets',
      });

      const { error } = await supabase.from('support_tickets').delete().eq('id', ticket.id);
      if (error) throw error;

      toast({ title: "تم الحذف", description: `تم حذف التذكرة #${ticket.ticket_number} نهائياً` });
      setDeleteConfirmOpen(false);
      setTicketToDelete(null);
      fetchTickets(true);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const deletedTickets = tickets.filter(t => selectedIds.has(t.id));
      const ticketNumbers = deletedTickets.map(t => t.ticket_number).join(', ');
      
      for (const id of ids) {
        await supabase.from('ticket_tasks').delete().eq('ticket_id', id);
        await supabase.from('ticket_replies').delete().eq('ticket_id', id);
        await supabase.from('ticket_activity_log').delete().eq('ticket_id', id);
      }
      
      const { error } = await supabase.from('support_tickets').delete().in('id', ids);
      if (error) throw error;

      await supabase.from('admin_notifications').insert({
        title: 'حذف تذاكر جماعي',
        message: `تم حذف ${ids.length} تذكرة (${ticketNumbers}) بواسطة ${user?.email}`,
        type: 'tickets_bulk_deleted',
        link: '/admin/tickets',
      });

      toast({ title: "تم الحذف", description: `تم حذف ${ids.length} تذكرة نهائياً` });
      setSelectedIds(new Set());
      setBulkDeleteConfirmOpen(false);
      fetchTickets(true);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenEdit = (ticket: SupportTicket) => {
    setTicketToEdit(ticket);
    setEditSubject(ticket.subject);
    setEditDescription(ticket.description);
    setEditCategory(ticket.category);
    setEditPriority(ticket.priority);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!ticketToEdit || !editSubject.trim()) return;
    setSaving(true);
    try {
      const changes: string[] = [];
      if (editSubject !== ticketToEdit.subject) changes.push('الموضوع');
      if (editDescription !== ticketToEdit.description) changes.push('الوصف');
      if (editCategory !== ticketToEdit.category) changes.push('التصنيف');
      if (editPriority !== ticketToEdit.priority) changes.push('الأولوية');

      const { error } = await supabase.from('support_tickets').update({
        subject: editSubject,
        description: editDescription,
        category: editCategory,
        priority: editPriority,
      }).eq('id', ticketToEdit.id);
      if (error) throw error;

      if (changes.length > 0) {
        await logTicketActivity(ticketToEdit.id, 'edited', undefined, undefined, `تم تعديل: ${changes.join('، ')}`);
      }

      toast({ title: "تم التحديث", description: "تم تعديل التذكرة بنجاح" });
      setEditDialogOpen(false);
      fetchTickets(true);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch = !searchQuery || 
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.guest_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.organization?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    unassigned: tickets.filter(t => !t.assigned_to_staff && t.status !== 'resolved' && t.status !== 'closed').length,
  }), [tickets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm">جاري تحميل التذاكر...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة التذاكر</h1>
            <p className="text-muted-foreground text-sm mt-1">عرض ومتابعة جميع تذاكر الدعم الفني</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchTickets(true)} 
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              تحديث
            </Button>
            <Button 
              size="sm" 
              onClick={() => setCreateTicketOpen(true)}
              className="gap-2"
            >
              <Ticket className="h-4 w-4" />
              فتح تذكرة
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              statusFilter === 'all' ? "border-primary bg-primary/5" : "border-transparent hover:border-muted"
            )}
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الإجمالي</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-2.5 rounded-full bg-slate-100">
                  <Ticket className="h-5 w-5 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              statusFilter === 'open' ? "border-sky-500 bg-sky-50" : "border-transparent hover:border-muted"
            )}
            onClick={() => setStatusFilter('open')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">جديدة</p>
                  <p className="text-2xl font-bold text-sky-700">{stats.open}</p>
                </div>
                <div className="p-2.5 rounded-full bg-sky-100">
                  <Inbox className="h-5 w-5 text-sky-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              statusFilter === 'in_progress' ? "border-amber-500 bg-amber-50" : "border-transparent hover:border-muted"
            )}
            onClick={() => setStatusFilter('in_progress')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">قيد المعالجة</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.inProgress}</p>
                </div>
                <div className="p-2.5 rounded-full bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              statusFilter === 'resolved' ? "border-emerald-500 bg-emerald-50" : "border-transparent hover:border-muted"
            )}
            onClick={() => setStatusFilter('resolved')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">تم الحل</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.resolved}</p>
                </div>
                <div className="p-2.5 rounded-full bg-emerald-100">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم التذكرة، الموضوع، اسم العميل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
                {searchQuery && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7" 
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="الأولوية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأولويات</SelectItem>
                  <SelectItem value="high">عاجلة</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="low">عادية</SelectItem>
                </SelectContent>
              </Select>
              {(statusFilter !== 'all' || priorityFilter !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); }}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedIds.size === filteredTickets.length && filteredTickets.length > 0}
                  onCheckedChange={(c) => handleSelectAll(!!c)}
                />
                <span className="text-sm font-medium">
                  تم تحديد <strong>{selectedIds.size}</strong> تذكرة
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} className="gap-1">
                  <X className="h-3.5 w-3.5" />
                  إلغاء التحديد
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setBulkDeleteConfirmOpen(true)}
                  className="gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف المحدد ({selectedIds.size})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tickets List */}
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">لا توجد تذاكر</h3>
                <p className="text-sm text-muted-foreground">لم يتم العثور على تذاكر تطابق معايير البحث</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-[40px_80px_1fr_150px_100px_110px_180px_100px_60px] gap-3 p-4 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={selectedIds.size === filteredTickets.length && filteredTickets.length > 0}
                    onCheckedChange={(c) => handleSelectAll(!!c)}
                  />
                </div>
                <div>الرقم</div>
                <div>الموضوع والعميل</div>
                <div>الأولوية</div>
                <div>الحالة</div>
                <div>الموظف المسؤول</div>
                <div></div>
                <div>التاريخ</div>
                <div>إجراءات</div>
              </div>

              {/* Table Body */}
              <div className="divide-y">
                {filteredTickets.map((ticket) => {
                  const status = statusConfig[ticket.status] || statusConfig.open;
                  const priority = priorityConfig[ticket.priority] || priorityConfig.medium;

                  return (
                    <div
                      key={ticket.id}
                      className={cn(
                        "grid grid-cols-1 md:grid-cols-[40px_80px_1fr_150px_100px_110px_180px_100px_60px] gap-3 p-4 hover:bg-muted/30 transition-colors items-center",
                        selectedIds.has(ticket.id) && "bg-primary/5"
                      )}
                    >
                      {/* Checkbox */}
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={selectedIds.has(ticket.id)}
                          onCheckedChange={() => handleToggleSelect(ticket.id)}
                        />
                      </div>

                      {/* Ticket Number */}
                      <div>
                        <span className="inline-flex items-center gap-1 text-xs font-mono bg-muted px-2 py-1 rounded">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          {ticket.ticket_number.slice(-6)}
                        </span>
                      </div>

                      {/* Subject & Client Combined */}
                      <div>
                        <button
                          onClick={() => handleViewTicket(ticket)}
                          className="text-right hover:text-primary transition-colors w-full"
                        >
                          <p className="font-medium text-sm line-clamp-1">{ticket.subject}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                {(ticket.organization?.name || ticket.guest_name || 'م')[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate">
                              {ticket.organization?.name || ticket.guest_name || 'مستخدم'} • {categoryLabels[ticket.category] || ticket.category}
                            </span>
                          </div>
                        </button>
                      </div>

                      {/* Priority */}
                      <div>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs font-medium border px-3 py-1", priority.bg, priority.color)}
                        >
                          {priority.label}
                        </Badge>
                      </div>

                      {/* Status */}
                      <div>
                        <Select 
                          value={ticket.status} 
                          onValueChange={(v) => handleStatusChange(ticket.id, v)}
                        >
                          <SelectTrigger className={cn(
                            "h-8 text-xs border-0 gap-1.5 w-full",
                            status.bg, status.text
                          )}>
                            <span className={cn("w-2 h-2 rounded-full shrink-0", status.dot)} />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">جديدة</SelectItem>
                            <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                            <SelectItem value="resolved">تم الحل</SelectItem>
                            <SelectItem value="closed">مغلقة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Assigned Staff Name */}
                      <div>
                        {ticket.staff ? (
                          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                            <Avatar className="h-5 w-5 border border-emerald-300 shrink-0">
                              <AvatarFallback className="text-[8px] bg-emerald-100 text-emerald-700 font-semibold">
                                {ticket.staff.full_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium text-emerald-700 truncate">
                              {ticket.staff.full_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* Assign/Reassign Button */}
                      <div className="flex justify-start">
                        {ticket.staff ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAssignDialog(ticket)}
                            className="h-7 px-2.5 text-xs gap-1 border-dashed hover:border-primary hover:text-primary"
                          >
                            <UserPlus className="h-3 w-3" />
                            تغيير
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAssignDialog(ticket)}
                            className="h-7 px-2.5 text-xs gap-1 border-dashed border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-400"
                          >
                            <UserPlus className="h-3 w-3" />
                            توجيه
                          </Button>
                        )}
                      </div>

                      {/* Date */}
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{formatSmartDate(ticket.created_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background">
                            <DropdownMenuItem onClick={() => handleViewTicket(ticket)}>
                              <Eye className="h-4 w-4 ml-2" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEdit(ticket)}>
                              <Edit className="h-4 w-4 ml-2" />
                              تعديل التذكرة
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenAssignDialog(ticket)}>
                              <UserPlus className="h-4 w-4 ml-2" />
                              توجيه لموظف
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'resolved')}>
                              <CheckCircle className="h-4 w-4 ml-2" />
                              تعيين كمحلولة
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => { setTicketToDelete(ticket); setDeleteConfirmOpen(true); }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 ml-2" />
                              حذف التذكرة
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* View Ticket Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    #{selectedTicket?.ticket_number}
                  </Badge>
                  {selectedTicket && (
                    <>
                      <Badge className={cn(
                        "text-xs",
                        statusConfig[selectedTicket.status]?.bg,
                        statusConfig[selectedTicket.status]?.text
                      )}>
                        {statusConfig[selectedTicket.status]?.label}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          priorityConfig[selectedTicket.priority]?.color
                        )}
                      >
                        {priorityConfig[selectedTicket.priority]?.label}
                      </Badge>
                    </>
                  )}
                </div>
                <DialogTitle className="text-lg">{selectedTicket?.subject}</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          {selectedTicket && (
            <>
              {/* Client & Organization Info */}
              {selectedTicket.organization && (
                <div className="flex items-center gap-4 py-3 px-4 rounded-lg bg-primary/5 border border-primary/10 mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{selectedTicket.organization.name}</span>
                  </div>
                  {selectedTicket.organization.website_url && (
                    <a
                      href={selectedTicket.organization.website_url.startsWith('http') ? selectedTicket.organization.website_url : `https://${selectedTicket.organization.website_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {selectedTicket.organization.website_url}
                    </a>
                  )}
                </div>
              )}

              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-3 py-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">المرسل</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {(selectedTicket.guest_name || selectedTicket.organization?.name || 'م')[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{selectedTicket.guest_name || selectedTicket.organization?.name || 'مستخدم'}</p>
                      {selectedTicket.guest_email && (
                        <p className="text-[10px] text-muted-foreground">{selectedTicket.guest_email}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">الموظف المسؤول</p>
                  {selectedTicket.staff ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border border-primary/30">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {selectedTicket.staff.full_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{selectedTicket.staff.full_name}</p>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs gap-1"
                      onClick={() => handleOpenAssignDialog(selectedTicket)}
                    >
                      <UserPlus className="h-3 w-3" />
                      توجيه لموظف
                    </Button>
                  )}
                </div>
              </div>

              {/* Conversation */}
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4">
                  {/* Original Message */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(selectedTicket.created_at), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                    
                    {(selectedTicket.website_url || selectedTicket.screenshot_url) && (
                      <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
                        {selectedTicket.website_url && (
                          <a 
                            href={selectedTicket.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            رابط الصفحة
                          </a>
                        )}
                        {selectedTicket.screenshot_url && (
                          <a 
                            href={selectedTicket.screenshot_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            صورة الشاشة
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Replies */}
                  {replies.map((reply) => (
                    <div 
                      key={reply.id} 
                      className={cn(
                        "rounded-xl p-4",
                        reply.is_staff_reply 
                          ? "bg-primary/5 border border-primary/10 mr-6" 
                          : "bg-muted/50 border border-muted ml-6"
                      )}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span className={cn(
                          "font-medium",
                          reply.is_staff_reply ? "text-primary" : "text-foreground"
                        )}>
                          {reply.is_staff_reply ? 'فريق الدعم' : 'العميل'}
                        </span>
                        <span>•</span>
                        {format(new Date(reply.created_at), 'dd/MM HH:mm', { locale: ar })}
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Tasks Manager — always show */}
              {selectedTicket && (
                <div className="border-t pt-4 mt-2">
                  <TicketTasksManager
                    ticketId={selectedTicket.id}
                    mode="admin"
                    taskMode={(selectedTicket as any).task_mode || 'multiple'}
                  />
                </div>
              )}

              {/* Reply Input */}
              {selectedTicket.status !== 'closed' && (
                <div className="pt-4 border-t mt-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="اكتب ردك هنا..."
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      className="min-h-[80px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          handleSendReply();
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-[10px] text-muted-foreground">Ctrl + Enter للإرسال السريع</p>
                    <Button onClick={handleSendReply} disabled={!newReply.trim() || sending} className="gap-2">
                      {sending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      إرسال الرد
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Staff Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>توجيه التذكرة</DialogTitle>
            <DialogDescription>
              اختر موظف الدعم الذي سيتولى معالجة هذه التذكرة
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الموظف</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظفاً..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px]">{staff.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <span>{staff.full_name}</span>
                        {staff.job_title && (
                          <span className="text-xs text-muted-foreground">({staff.job_title})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>ملاحظات للموظف (اختياري)</Label>
              <Textarea
                placeholder="أي تعليمات أو ملاحظات خاصة..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAssignTicket} disabled={!selectedStaffId || assigning}>
              {assigning ? (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <UserPlus className="h-4 w-4 ml-2" />
              )}
              توجيه التذكرة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateTicketModal
        open={createTicketOpen}
        onOpenChange={setCreateTicketOpen}
        onCreated={() => fetchTickets(true)}
      />

      {/* Single Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد حذف التذكرة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيتم حذف التذكرة <strong>#{ticketToDelete?.ticket_number}</strong> "{ticketToDelete?.subject}" نهائياً مع جميع الردود والمرفقات المرتبطة بها. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => ticketToDelete && handleDeleteTicket(ticketToDelete)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <RefreshCw className="h-4 w-4 animate-spin ml-2" /> : <Trash2 className="h-4 w-4 ml-2" />}
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد الحذف الجماعي
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيتم حذف <strong>{selectedIds.size}</strong> تذكرة نهائياً مع جميع الردود والمرفقات المرتبطة بها. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <RefreshCw className="h-4 w-4 animate-spin ml-2" /> : <Trash2 className="h-4 w-4 ml-2" />}
              حذف {selectedIds.size} تذكرة نهائياً
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Ticket Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              تعديل التذكرة #{ticketToEdit?.ticket_number}
            </DialogTitle>
            <DialogDescription>تعديل بيانات التذكرة الأساسية</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الموضوع</Label>
              <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} className="min-h-[100px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">تقنية</SelectItem>
                    <SelectItem value="question">استفسار</SelectItem>
                    <SelectItem value="suggestion">اقتراح</SelectItem>
                    <SelectItem value="complaint">شكوى</SelectItem>
                    <SelectItem value="general">عام</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الأولوية</Label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">عادية</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عاجلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveEdit} disabled={!editSubject.trim() || saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle className="h-4 w-4 ml-2" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
