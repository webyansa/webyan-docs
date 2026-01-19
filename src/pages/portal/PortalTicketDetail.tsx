import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  User,
  Headphones,
  ExternalLink,
  Loader2,
  Calendar,
  Tag,
  XCircle,
  MessageSquare,
  Lock,
  FileText,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TicketReply {
  id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
  user_id: string | null;
  attachments: string[] | null;
}

interface TicketDetail {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  website_url: string | null;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string | null;
  closure_report: string | null;
  staff?: {
    id: string;
    full_name: string;
  } | null;
}

const statusConfig: Record<string, { 
  label: string; 
  bg: string; 
  text: string; 
  icon: any;
  message: string;
  gradient: string;
}> = {
  open: { 
    label: 'جديدة', 
    bg: 'bg-blue-50 dark:bg-blue-900/20', 
    text: 'text-blue-700 dark:text-blue-400',
    icon: AlertCircle,
    message: 'تم استلام تذكرتك وهي بانتظار المعالجة من فريق الدعم',
    gradient: 'from-blue-500 to-blue-600'
  },
  in_progress: { 
    label: 'قيد المعالجة', 
    bg: 'bg-amber-50 dark:bg-amber-900/20', 
    text: 'text-amber-700 dark:text-amber-400',
    icon: Clock,
    message: 'يعمل فريق الدعم حالياً على حل مشكلتك',
    gradient: 'from-amber-500 to-amber-600'
  },
  resolved: { 
    label: 'تم الحل', 
    bg: 'bg-emerald-50 dark:bg-emerald-900/20', 
    text: 'text-emerald-700 dark:text-emerald-400',
    icon: CheckCircle2,
    message: 'تم حل المشكلة بنجاح! نتمنى أن تكون راضياً عن الخدمة',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  closed: { 
    label: 'مغلقة', 
    bg: 'bg-gray-100 dark:bg-gray-800', 
    text: 'text-gray-600 dark:text-gray-400',
    icon: XCircle,
    message: 'تم إغلاق هذه التذكرة من قبل فريق الدعم',
    gradient: 'from-gray-500 to-gray-600'
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

const PortalTicketDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id && user) {
      fetchTicketDetails();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [id, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const fetchTicketDetails = async () => {
    try {
      const { data: clientAccount } = await supabase
        .from('client_accounts')
        .select('organization_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!clientAccount?.organization_id) {
        toast.error('لا يمكن العثور على حساب العميل');
        setLoading(false);
        return;
      }

      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select(`
          *,
          staff:staff_members!support_tickets_assigned_to_staff_fkey (
            id,
            full_name
          )
        `)
        .eq('id', id)
        .eq('organization_id', clientAccount.organization_id)
        .maybeSingle();

      if (ticketError) {
        console.error('Ticket error:', ticketError);
        setTicket(null);
        setLoading(false);
        return;
      }
      
      setTicket(ticketData);

      const { data: repliesData, error: repliesError } = await supabase
        .from('ticket_replies')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;
      setReplies(repliesData || []);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast.error('حدث خطأ أثناء تحميل التذكرة');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`portal-ticket-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_replies',
          filter: `ticket_id=eq.${id}`
        },
        () => {
          fetchTicketDetails();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${id}`
        },
        () => {
          fetchTicketDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendReply = async () => {
    if (!newReply.trim()) {
      toast.error('يرجى كتابة رسالة');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: id,
          user_id: user?.id,
          message: newReply.trim(),
          is_staff_reply: false
        });

      if (error) throw error;

      setNewReply('');
      toast.success('تم إرسال الرد');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('حدث خطأ أثناء إرسال الرد');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري تحميل التذكرة...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="max-w-md mx-auto text-center py-12">
          <CardContent>
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">التذكرة غير موجودة</h2>
            <p className="text-muted-foreground mb-6">
              لا يمكن العثور على هذه التذكرة أو ليس لديك صلاحية الوصول إليها
            </p>
            <Button asChild>
              <Link to="/portal/tickets" className="gap-2">
                <ArrowRight className="w-4 h-4" />
                العودة للتذاكر
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[ticket.status] || statusConfig.open;
  const StatusIcon = status.icon;
  const priority = priorityConfig[ticket.priority] || priorityConfig.medium;
  const isTicketClosed = ticket.status === 'closed' || ticket.status === 'resolved';

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild className="gap-2 mb-2">
        <Link to="/portal/tickets">
          <ArrowRight className="w-4 h-4" />
          العودة للتذاكر
        </Link>
      </Button>

      {/* Status Banner */}
      <div className={cn(
        "rounded-2xl p-6 text-white relative overflow-hidden",
        `bg-gradient-to-r ${status.gradient}`
      )}>
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.6))]" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <StatusIcon className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold">{status.label}</h2>
              <code className="text-sm bg-white/20 px-2 py-0.5 rounded">
                {ticket.ticket_number}
              </code>
            </div>
            <p className="text-white/90">{status.message}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge className={cn("text-xs", status.bg, status.text, "border-0")}>
                      {status.label}
                    </Badge>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", priority.bg, priority.text)}>
                      {priority.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {categoryLabels[ticket.category]}
                    </span>
                  </div>
                  <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              </div>

              {ticket.website_url && (
                <a 
                  href={ticket.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  رابط الموقع
                </a>
              )}

              {ticket.screenshot_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">صورة مرفقة:</p>
                  <a href={ticket.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={ticket.screenshot_url} 
                      alt="Screenshot" 
                      className="max-h-64 rounded-lg border border-border hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Closure Report - Only show if ticket is closed/resolved */}
          {isTicketClosed && ticket.closure_report && (
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  تقرير الحل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{ticket.closure_report}</p>
              </CardContent>
            </Card>
          )}

          {/* Conversation */}
          <Card className="flex flex-col" style={{ minHeight: '400px' }}>
            <CardHeader className="flex-shrink-0 pb-4 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
                المحادثة
                <Badge variant="secondary" className="mr-2">
                  {replies.length} رد
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-6" style={{ maxHeight: '400px' }}>
                {replies.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="font-medium">لا توجد ردود بعد</p>
                    <p className="text-sm mt-1">سيتم الرد على تذكرتك قريباً من فريق الدعم</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {replies.map((reply, index) => {
                      // Check if this is a system message about closure
                      const isClosureMessage = reply.message.includes('تم إغلاق التذكرة') || 
                                              reply.message.includes('تم حل المشكلة');
                      
                      return (
                        <div 
                          key={reply.id}
                          className={cn(
                            "flex gap-3",
                            reply.is_staff_reply ? "flex-row" : "flex-row-reverse"
                          )}
                        >
                          <Avatar className="flex-shrink-0 h-9 w-9">
                            <AvatarFallback className={cn(
                              "text-xs",
                              reply.is_staff_reply 
                                ? isClosureMessage
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-primary/10 text-primary" 
                                : "bg-muted"
                            )}>
                              {reply.is_staff_reply ? (
                                isClosureMessage ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <Headphones className="w-4 h-4" />
                                )
                              ) : (
                                <User className="w-4 h-4" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "flex-1 max-w-[85%]",
                            reply.is_staff_reply ? "" : "flex flex-col items-end"
                          )}>
                            <div className="mb-1 text-xs text-muted-foreground flex items-center gap-2">
                              <span>{reply.is_staff_reply ? 'فريق الدعم' : 'أنت'}</span>
                              <span>•</span>
                              <span>{format(new Date(reply.created_at), 'dd MMM - HH:mm', { locale: ar })}</span>
                            </div>
                            <div 
                              className={cn(
                                "inline-block p-4 rounded-2xl",
                                reply.is_staff_reply 
                                  ? isClosureMessage
                                    ? "bg-emerald-100 dark:bg-emerald-900/30 rounded-tr-sm border border-emerald-200 dark:border-emerald-800"
                                    : "bg-muted rounded-tr-sm" 
                                  : "bg-primary text-primary-foreground rounded-tl-sm"
                              )}
                            >
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">{reply.message}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Reply Input */}
              <div className="p-4 border-t bg-muted/30">
                {isTicketClosed ? (
                  <div className="flex items-center justify-center gap-3 py-4 text-muted-foreground">
                    <Lock className="w-5 h-5" />
                    <div className="text-center">
                      <p className="font-medium">تم إغلاق هذه التذكرة</p>
                      <p className="text-sm">إذا كنت بحاجة لمساعدة إضافية، يرجى فتح تذكرة جديدة</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="اكتب ردك هنا..."
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      rows={3}
                      className="resize-none bg-background"
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleSendReply} 
                        disabled={sending || !newReply.trim()} 
                        className="gap-2"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        إرسال الرد
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Ticket Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                معلومات التذكرة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">تاريخ الإنشاء</p>
                  <p className="text-sm font-medium">
                    {format(new Date(ticket.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">آخر تحديث</p>
                  <p className="text-sm font-medium">
                    {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ar })}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">التصنيف</p>
                  <p className="text-sm font-medium">{categoryLabels[ticket.category]}</p>
                </div>
              </div>

              {ticket.staff && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {ticket.staff.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-muted-foreground">الموظف المسؤول</p>
                      <p className="text-sm font-medium">{ticket.staff.full_name}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" asChild className="w-full justify-start gap-2">
                <Link to="/portal/tickets/new">
                  <MessageSquare className="w-4 h-4" />
                  إنشاء تذكرة جديدة
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start gap-2">
                <Link to="/portal/tickets">
                  <FileText className="w-4 h-4" />
                  عرض جميع التذاكر
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
                <Headphones className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-medium text-foreground mb-1">تحتاج مساعدة؟</h4>
              <p className="text-xs text-muted-foreground mb-3">
                فريق الدعم متاح للمساعدة
              </p>
              <p className="text-xs text-muted-foreground">
                متوسط وقت الاستجابة: 24 ساعة
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PortalTicketDetail;
