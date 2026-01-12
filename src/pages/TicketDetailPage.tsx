import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Send, Clock, CheckCircle, AlertCircle, User, Image, Globe, MessageSquare } from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Breadcrumb } from "@/components/docs/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface TicketReply {
  id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
  user_id: string | null;
}

interface TicketDetail {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  website_url: string | null;
  screenshot_url: string | null;
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
  low: { label: 'منخفضة', color: 'bg-green-50 text-green-600' },
  medium: { label: 'متوسطة', color: 'bg-yellow-50 text-yellow-600' },
  high: { label: 'عالية', color: 'bg-red-50 text-red-600' },
};

const categoryLabels: Record<string, string> = {
  technical: 'مشكلة تقنية',
  question: 'استفسار عام',
  suggestion: 'اقتراح تحسين',
  complaint: 'شكوى',
  general: 'عام',
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (id) {
      fetchTicketDetails();
      setupRealtimeSubscription();
    }
  }, [id, user, navigate]);

  const fetchTicketDetails = async () => {
    try {
      // Fetch ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);

      // Fetch replies
      const { data: repliesData, error: repliesError } = await supabase
        .from('ticket_replies')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;
      setReplies(repliesData || []);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل التذكرة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`ticket-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_replies',
          filter: `ticket_id=eq.${id}`,
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
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setTicket(payload.new as TicketDetail);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || !ticket) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: ticket.id,
          user_id: user?.id,
          message: newReply,
          is_staff_reply: false,
        });

      if (error) throw error;

      setNewReply('');
      toast({
        title: "تم الإرسال",
        description: "تم إضافة ردك بنجاح",
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

  if (loading) {
    return (
      <DocsLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DocsLayout>
    );
  }

  if (!ticket) {
    return (
      <DocsLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold mb-4">التذكرة غير موجودة</h2>
          <Button onClick={() => navigate('/my-tickets')}>العودة لتذاكري</Button>
        </div>
      </DocsLayout>
    );
  }

  const status = statusConfig[ticket.status] || statusConfig.open;
  const priority = priorityConfig[ticket.priority] || priorityConfig.medium;
  const StatusIcon = status.icon;

  return (
    <DocsLayout>
      <div className="max-w-4xl mx-auto">
        <Breadcrumb
          items={[
            { label: "تذاكري", href: "/my-tickets" },
            { label: ticket.ticket_number },
          ]}
          className="mb-6"
        />

        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/my-tickets')}
          className="mb-4 gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للتذاكر
        </Button>

        {/* Ticket Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-lg text-muted-foreground">
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
                <CardTitle className="text-2xl">{ticket.subject}</CardTitle>
              </div>
              <div className="text-sm text-muted-foreground text-left">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(ticket.created_at), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                </div>
                <div className="text-xs">
                  {categoryLabels[ticket.category] || ticket.category}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {/* Attachments */}
            {(ticket.website_url || ticket.screenshot_url) && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium mb-3">المرفقات</h4>
                <div className="flex flex-wrap gap-4">
                  {ticket.website_url && (
                    <a
                      href={ticket.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Globe className="h-4 w-4" />
                      {ticket.website_url}
                    </a>
                  )}
                  {ticket.screenshot_url && (
                    <a
                      href={ticket.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Image className="h-4 w-4" />
                      عرض الصورة المرفقة
                    </a>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Replies */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              المحادثة ({replies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {replies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد ردود بعد</p>
              </div>
            ) : (
              <div className="space-y-4">
                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`flex gap-3 ${reply.is_staff_reply ? '' : 'flex-row-reverse'}`}
                  >
                    <Avatar className={reply.is_staff_reply ? 'bg-primary' : 'bg-muted'}>
                      <AvatarFallback>
                        {reply.is_staff_reply ? 'ف' : 'أ'}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`flex-1 rounded-xl p-4 ${
                        reply.is_staff_reply
                          ? 'bg-primary/5 border border-primary/20'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {reply.is_staff_reply ? 'فريق الدعم' : 'أنت'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(reply.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Form */}
            {ticket.status !== 'closed' && (
              <>
                <Separator className="my-6" />
                <div className="space-y-4">
                  <Textarea
                    placeholder="اكتب ردك هنا..."
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!newReply.trim() || sending}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'جاري الإرسال...' : 'إرسال الرد'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DocsLayout>
  );
}
