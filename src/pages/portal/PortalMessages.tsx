import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  ArrowRight,
  MessagesSquare,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Conversation {
  id: string;
  subject: string | null;
  status: string;
  created_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  assigned_agent: {
    full_name: string;
  } | null;
}

interface Message {
  id: string;
  body: string;
  sender_type: string;
  sender_name: string | null;
  created_at: string;
}

const PortalMessages = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [newConversationData, setNewConversationData] = useState({
    subject: '',
    message: ''
  });
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [clientAccount, setClientAccount] = useState<{ id: string; organization_id: string; full_name: string } | null>(null);

  useEffect(() => {
    fetchClientAccount();
  }, [user]);

  useEffect(() => {
    if (clientAccount) {
      fetchConversations();
    }
  }, [clientAccount]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchClientAccount = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('client_accounts')
      .select('id, organization_id, full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching client account:', error);
      return;
    }

    if (data) {
      setClientAccount(data);
    }
  };

  const fetchConversations = async () => {
    if (!clientAccount) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          subject,
          status,
          created_at,
          last_message_at,
          last_message_preview,
          unread_count,
          assigned_agent:staff_members!conversations_assigned_agent_id_fkey (
            full_name
          )
        `)
        .eq('organization_id', clientAccount.organization_id)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('conversation_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'agent')
        .eq('is_read', false);

      // Reset unread count
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !clientAccount) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: selectedConversation.id,
          body: newMessage,
          sender_type: 'client',
          sender_id: clientAccount.id,
          sender_name: clientAccount.full_name
        });

      if (error) throw error;

      // Update conversation
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: newMessage.substring(0, 100),
          status: 'assigned'
        })
        .eq('id', selectedConversation.id);

      setNewMessage('');
      fetchMessages(selectedConversation.id);
      fetchConversations();
      toast.success('تم إرسال الرسالة');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!newConversationData.subject.trim() || !newConversationData.message.trim() || !clientAccount) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    setCreatingConversation(true);
    try {
      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          subject: newConversationData.subject,
          organization_id: clientAccount.organization_id,
          client_account_id: clientAccount.id,
          status: 'unassigned',
          source: 'portal',
          last_message_preview: newConversationData.message.substring(0, 100)
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add first message
      const { error: msgError } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversation.id,
          body: newConversationData.message,
          sender_type: 'client',
          sender_id: clientAccount.id,
          sender_name: clientAccount.full_name
        });

      if (msgError) throw msgError;

      toast.success('تم إنشاء المحادثة بنجاح');
      setShowNewConversationDialog(false);
      setNewConversationData({ subject: '', message: '' });
      fetchConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('حدث خطأ أثناء إنشاء المحادثة');
    } finally {
      setCreatingConversation(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'unassigned':
        return { label: 'في الانتظار', color: 'bg-amber-100 text-amber-700', icon: Clock };
      case 'assigned':
        return { label: 'قيد المعالجة', color: 'bg-emerald-100 text-emerald-700', icon: MessagesSquare };
      case 'closed':
        return { label: 'مغلقة', color: 'bg-slate-100 text-slate-600', icon: CheckCircle2 };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-600', icon: AlertCircle };
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchQuery || 
      conv.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.last_message_preview?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: conversations.length,
    active: conversations.filter(c => c.status === 'assigned').length,
    completed: conversations.filter(c => c.status === 'closed').length,
    unread: conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30">
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-sky-600 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              المحادثات
            </h1>
            <p className="text-muted-foreground mt-1">تواصل مباشر مع فريق الدعم</p>
          </div>
          
          <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-primary to-sky-600 hover:from-primary/90 hover:to-sky-600/90 shadow-lg">
                <Plus className="w-4 h-4" />
                محادثة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl">محادثة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="conv-subject">الموضوع *</Label>
                  <Input
                    id="conv-subject"
                    placeholder="ما هو موضوع استفسارك؟"
                    value={newConversationData.subject}
                    onChange={(e) => setNewConversationData(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conv-message">الرسالة *</Label>
                  <Textarea
                    id="conv-message"
                    placeholder="اكتب رسالتك هنا..."
                    rows={5}
                    value={newConversationData.message}
                    onChange={(e) => setNewConversationData(prev => ({ ...prev, message: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleCreateConversation} 
                  disabled={creatingConversation}
                  className="w-full gap-2"
                >
                  {creatingConversation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  إرسال
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] border-2 ${
              statusFilter === 'all' ? 'border-primary bg-primary/5' : 'border-transparent hover:border-primary/30'
            }`}
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-sky-500/20 flex items-center justify-center mx-auto mb-2">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">إجمالي المحادثات</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] border-2 ${
              statusFilter === 'assigned' ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:border-emerald-300'
            }`}
            onClick={() => setStatusFilter('assigned')}
          >
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
              <p className="text-sm text-muted-foreground">محادثات نشطة</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] border-2 ${
              statusFilter === 'closed' ? 'border-slate-400 bg-slate-50' : 'border-transparent hover:border-slate-300'
            }`}
            onClick={() => setStatusFilter('closed')}
          >
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-2xl font-bold text-slate-600">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">محادثات مكتملة</p>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-transparent hover:border-rose-300 transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center mx-auto mb-2 relative">
                <MessagesSquare className="w-6 h-6 text-rose-600" />
                {stats.unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                    {stats.unread}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-rose-600">{stats.unread}</p>
              <p className="text-sm text-muted-foreground">رسائل غير مقروءة</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="lg:col-span-1 shadow-lg border-0">
            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-sky-50/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessagesSquare className="w-5 h-5 text-primary" />
                محادثاتك
              </CardTitle>
              <p className="text-sm text-muted-foreground">جميع محادثاتك مع فريق الدعم</p>
            </CardHeader>
            <CardContent className="p-0">
              {/* Search */}
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="البحث في المحادثات..."
                    className="pr-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Conversations */}
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-muted-foreground">لا توجد محادثات</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setShowNewConversationDialog(true)}
                    >
                      ابدأ محادثة جديدة
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations.map((conv) => {
                      const statusInfo = getStatusInfo(conv.status);
                      const StatusIcon = statusInfo.icon;
                      return (
                        <div
                          key={conv.id}
                          className={`p-4 cursor-pointer transition-all duration-200 hover:bg-slate-50 ${
                            selectedConversation?.id === conv.id ? 'bg-primary/5 border-r-4 border-r-primary' : ''
                          }`}
                          onClick={() => setSelectedConversation(conv)}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-sky-500/20 text-primary text-sm">
                                {conv.subject?.charAt(0) || 'م'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-semibold text-foreground truncate">
                                  {conv.subject || 'محادثة جديدة'}
                                </h4>
                                {conv.unread_count > 0 && (
                                  <Badge className="bg-rose-500 text-white text-xs">
                                    {conv.unread_count}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.last_message_preview || 'لا توجد رسائل'}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <Badge variant="secondary" className={`text-xs ${statusInfo.color}`}>
                                  <StatusIcon className="w-3 h-3 ml-1" />
                                  {statusInfo.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {conv.last_message_at 
                                    ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ar })
                                    : format(new Date(conv.created_at), 'dd/MM/yyyy', { locale: ar })
                                  }
                                </span>
                              </div>
                              {conv.assigned_agent && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                  <User className="w-3 h-3" />
                                  {conv.assigned_agent.full_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-2 shadow-lg border-0 flex flex-col h-[650px]">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-sky-50 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-sky-600 text-white">
                          {selectedConversation.subject?.charAt(0) || 'م'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-foreground">
                          {selectedConversation.subject || 'محادثة'}
                        </h3>
                        {selectedConversation.assigned_agent && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {selectedConversation.assigned_agent.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusInfo(selectedConversation.status).color}>
                      {getStatusInfo(selectedConversation.status).label}
                    </Badge>
                  </div>
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-muted-foreground">لا توجد رسائل بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isClient = msg.sender_type === 'client';
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[75%] ${isClient ? 'order-1' : 'order-2'}`}>
                              <div
                                className={`rounded-2xl px-4 py-3 ${
                                  isClient
                                    ? 'bg-gradient-to-r from-primary to-sky-600 text-white rounded-br-sm'
                                    : 'bg-slate-100 text-foreground rounded-bl-sm'
                                }`}
                              >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                              </div>
                              <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
                                isClient ? 'justify-end' : 'justify-start'
                              }`}>
                                <span>{msg.sender_name || (isClient ? 'أنت' : 'فريق الدعم')}</span>
                                <span>•</span>
                                <span>{format(new Date(msg.created_at), 'HH:mm', { locale: ar })}</span>
                              </div>
                            </div>
                            {!isClient && (
                              <Avatar className="w-8 h-8 order-1 ml-2">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  <User className="w-4 h-4" />
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                {selectedConversation.status !== 'closed' ? (
                  <div className="border-t p-4 bg-slate-50 flex-shrink-0">
                    <div className="flex gap-3">
                      <Textarea
                        placeholder="اكتب رسالتك هنا..."
                        className="resize-none min-h-[60px] bg-white"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sendingMessage || !newMessage.trim()}
                        className="h-auto bg-gradient-to-r from-primary to-sky-600 hover:from-primary/90 hover:to-sky-600/90"
                      >
                        {sendingMessage ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t p-4 bg-slate-100 text-center flex-shrink-0">
                    <p className="text-muted-foreground flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      تم إغلاق هذه المحادثة
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-sky-500/10 flex items-center justify-center mx-auto mb-6">
                    <ArrowRight className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">اختر محادثة</h3>
                  <p className="text-muted-foreground mb-6">اختر محادثة من القائمة لعرض الرسائل</p>
                  <Button 
                    variant="outline"
                    onClick={() => setShowNewConversationDialog(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    أو ابدأ محادثة جديدة
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PortalMessages;
