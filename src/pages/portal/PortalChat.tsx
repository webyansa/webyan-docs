import React, { useState, useEffect, useRef } from 'react';
import { useChat, Conversation, Message } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageCircle, Send, Plus, ArrowLeft, Loader2, 
  User, Clock, CheckCheck, Check, Search, X, CheckCircle,
  MessageSquare, Headphones, ChevronLeft
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusConfig = {
  unassigned: { 
    label: 'في الانتظار', 
    color: 'bg-warning/10 text-warning border-warning/20',
    dotColor: 'bg-warning',
    icon: Clock
  },
  assigned: { 
    label: 'قيد المعالجة', 
    color: 'bg-success/10 text-success border-success/20',
    dotColor: 'bg-success',
    icon: MessageSquare
  },
  closed: { 
    label: 'مغلقة', 
    color: 'bg-muted text-muted-foreground border-border',
    dotColor: 'bg-muted-foreground',
    icon: CheckCircle
  }
};

const PortalChat = () => {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newFirstMessage, setNewFirstMessage] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'closed'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    currentConversation,
    messages,
    loading,
    sending,
    fetchConversations,
    startConversation,
    sendMessage,
    selectConversation,
    setCurrentConversation
  } = useChat({ autoFetch: true });

  useEffect(() => {
    fetchClientInfo();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchClientInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('client_accounts')
        .select('full_name, email')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setClientName(data.full_name);
        setClientEmail(data.email);
      }
    }
  };

  const handleStartConversation = async () => {
    if (!newSubject.trim() || !newFirstMessage.trim()) return;
    
    setStartingChat(true);
    try {
      await startConversation(newSubject, newFirstMessage, clientName, clientEmail);
      setShowNewChat(false);
      setNewSubject('');
      setNewFirstMessage('');
    } finally {
      setStartingChat(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentConversation) return;
    await sendMessage(currentConversation.id, newMessage, undefined, clientName);
    setNewMessage('');
  };

  const filteredConversations = conversations.filter(conv => {
    // Filter by status
    if (activeFilter === 'active' && conv.status === 'closed') return false;
    if (activeFilter === 'closed' && conv.status !== 'closed') return false;
    
    // Filter by search
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.subject?.toLowerCase().includes(query) ||
      conv.last_message_preview?.toLowerCase().includes(query)
    );
  });

  const totalCount = conversations.length;
  const activeCount = conversations.filter(c => c.status !== 'closed').length;
  const closedCount = conversations.filter(c => c.status === 'closed').length;
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Conversation List View
  if (!currentConversation) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-secondary p-8 mb-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <Headphones className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">المحادثات</h1>
                <p className="text-white/80 text-sm md:text-base">تواصل مباشر مع فريق الدعم الفني</p>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-xl" />
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-secondary/20 rounded-full blur-2xl" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card 
            className={cn(
              "cursor-pointer transition-all duration-300 hover:shadow-lg border-2",
              activeFilter === 'all' ? "border-primary shadow-md" : "border-transparent hover:border-primary/30"
            )}
            onClick={() => setActiveFilter('all')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-foreground">{totalCount}</span>
                  <span className="text-sm text-muted-foreground mt-1">إجمالي المحادثات</span>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all duration-300 hover:shadow-lg border-2",
              activeFilter === 'active' ? "border-success shadow-md" : "border-transparent hover:border-success/30"
            )}
            onClick={() => setActiveFilter('active')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-success">{activeCount}</span>
                  <span className="text-sm text-muted-foreground mt-1">محادثات نشطة</span>
                </div>
                <div className="p-3 rounded-xl bg-success/10">
                  <MessageSquare className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all duration-300 hover:shadow-lg border-2",
              activeFilter === 'closed' ? "border-muted-foreground shadow-md" : "border-transparent hover:border-muted-foreground/30"
            )}
            onClick={() => setActiveFilter('closed')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-muted-foreground">{closedCount}</span>
                  <span className="text-sm text-muted-foreground mt-1">محادثات مكتملة</span>
                </div>
                <div className="p-3 rounded-xl bg-muted">
                  <CheckCircle className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {unreadCount > 0 ? (
            <Card className="border-2 border-destructive/30 bg-destructive/5">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold text-destructive">{unreadCount}</span>
                    <span className="text-sm text-destructive/80 mt-1">رسائل غير مقروءة</span>
                  </div>
                  <div className="p-3 rounded-xl bg-destructive/10">
                    <MessageCircle className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-transparent">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold text-muted-foreground">0</span>
                    <span className="text-sm text-muted-foreground mt-1">رسائل غير مقروءة</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted">
                    <Check className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Conversations Section */}
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-muted/30 rounded-t-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  {activeFilter === 'all' && 'جميع المحادثات'}
                  {activeFilter === 'active' && 'المحادثات النشطة'}
                  {activeFilter === 'closed' && 'المحادثات المكتملة'}
                </CardTitle>
                <CardDescription className="mt-1">
                  {filteredConversations.length} محادثة
                </CardDescription>
              </div>
              <Button onClick={() => setShowNewChat(true)} className="gap-2 shadow-md">
                <Plus className="h-4 w-4" />
                محادثة جديدة
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Search Bar */}
            {conversations.length > 0 && (
              <div className="p-4 border-b bg-background">
                <div className="relative max-w-md">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="البحث في المحادثات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-11 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Conversations List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">جاري تحميل المحادثات...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-6">
                  <MessageCircle className="h-14 w-14 text-primary/40" />
                </div>
                <h3 className="text-xl font-semibold mb-2">لا توجد محادثات</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  {activeFilter === 'all' 
                    ? 'ابدأ محادثة جديدة للتواصل مع فريق الدعم الفني'
                    : activeFilter === 'active'
                    ? 'لا توجد محادثات نشطة حالياً'
                    : 'لا توجد محادثات مكتملة'}
                </p>
                {activeFilter === 'all' && (
                  <Button onClick={() => setShowNewChat(true)} size="lg" className="gap-2 shadow-lg">
                    <Plus className="h-5 w-5" />
                    بدء محادثة جديدة
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv) => {
                  const StatusIcon = statusConfig[conv.status]?.icon || MessageCircle;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={cn(
                        "p-5 flex items-center gap-4 hover:bg-muted/50 transition-all cursor-pointer group",
                        conv.unread_count > 0 && "bg-primary/5"
                      )}
                    >
                      {/* Avatar with status indicator */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-14 w-14 ring-2 ring-background shadow-md">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold text-lg">
                            {conv.assigned_agent?.full_name?.charAt(0) || 'D'}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-3 border-background shadow-sm",
                          statusConfig[conv.status]?.dotColor || 'bg-muted-foreground'
                        )} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className={cn(
                            "font-semibold truncate text-base",
                            conv.unread_count > 0 && "text-primary"
                          )}>
                            {conv.subject || 'محادثة بدون عنوان'}
                          </h3>
                          <span className="text-xs text-muted-foreground flex-shrink-0 bg-muted px-2 py-1 rounded-full">
                            {conv.last_message_at && formatDistanceToNow(new Date(conv.last_message_at), { 
                              addSuffix: true, 
                              locale: ar 
                            })}
                          </span>
                        </div>
                        
                        <p className={cn(
                          "text-sm truncate mb-3",
                          conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {conv.last_message_preview || 'لا توجد رسائل بعد'}
                        </p>
                        
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "gap-1.5 font-medium text-xs",
                              statusConfig[conv.status]?.color
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig[conv.status]?.label}
                          </Badge>
                          
                          {conv.assigned_agent && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-full">
                              <User className="h-3 w-3" />
                              {conv.assigned_agent.full_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Unread badge & Arrow */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {conv.unread_count > 0 && (
                          <Badge className="h-7 min-w-7 text-sm flex items-center justify-center bg-destructive hover:bg-destructive shadow-md">
                            {conv.unread_count}
                          </Badge>
                        )}
                        <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Chat Dialog */}
        <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader className="text-center pb-4 border-b">
              <div className="mx-auto p-3 bg-primary/10 rounded-xl w-fit mb-3">
                <MessageCircle className="h-7 w-7 text-primary" />
              </div>
              <DialogTitle className="text-xl">محادثة جديدة</DialogTitle>
              <DialogDescription>
                ابدأ محادثة مع فريق الدعم الفني
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">موضوع المحادثة</label>
                <Input
                  placeholder="مثال: استفسار عن الخدمة..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">رسالتك</label>
                <Textarea
                  placeholder="اكتب تفاصيل استفسارك هنا..."
                  value={newFirstMessage}
                  onChange={(e) => setNewFirstMessage(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>
              <Button 
                onClick={handleStartConversation} 
                disabled={startingChat || !newSubject.trim() || !newFirstMessage.trim()}
                className="w-full h-12 gap-2 text-base shadow-lg"
              >
                {startingChat ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                إرسال المحادثة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Conversation View
  return (
    <div className="p-6 lg:p-8">
      <div className="h-[calc(100vh-200px)] flex flex-col bg-card rounded-2xl border shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 md:p-5 border-b bg-gradient-to-l from-primary/5 to-transparent">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCurrentConversation(null)}
            className="rounded-xl hover:bg-primary/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="relative flex-shrink-0">
            <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                {currentConversation.assigned_agent?.full_name?.charAt(0) || 'D'}
              </AvatarFallback>
            </Avatar>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
              statusConfig[currentConversation.status]?.dotColor
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg truncate">{currentConversation.subject || 'محادثة'}</h2>
            <div className="flex items-center gap-2 text-sm">
              <Badge 
                variant="outline" 
                className={cn(
                  "gap-1 text-xs",
                  statusConfig[currentConversation.status]?.color
                )}
              >
                {statusConfig[currentConversation.status]?.label}
              </Badge>
              {currentConversation.assigned_agent && (
                <span className="text-muted-foreground">
                  • {currentConversation.assigned_agent.full_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 bg-gradient-to-b from-muted/20 to-muted/40">
        <div className="p-4 md:p-6 space-y-1 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Avatar className="h-20 w-20 mb-4 ring-4 ring-primary/10">
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                  {currentConversation.assigned_agent?.full_name?.charAt(0) || 'D'}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg mb-1">مرحباً بك</h3>
              <p className="text-muted-foreground">ابدأ المحادثة الآن مع فريق الدعم</p>
            </div>
          )}
          
          {messages.map((msg, index) => {
            const isOwn = msg.sender_type === 'client';
            const isSystem = msg.sender_type === 'system';
            const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_type !== msg.sender_type);

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-4">
                  <span className="text-xs text-muted-foreground bg-muted/80 px-4 py-2 rounded-full shadow-sm">
                    {msg.body}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn("flex gap-3 mb-3", isOwn ? "flex-row" : "flex-row-reverse")}
              >
                {!isOwn && showAvatar && (
                  <Avatar className="h-9 w-9 flex-shrink-0 mt-auto shadow-md">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                      {msg.sender_name?.charAt(0) || 'D'}
                    </AvatarFallback>
                  </Avatar>
                )}
                {!isOwn && !showAvatar && <div className="w-9 flex-shrink-0" />}
                
                <div className={cn("max-w-[80%] flex flex-col", isOwn ? "items-start" : "items-end")}>
                  <div
                    className={cn(
                      "px-4 py-3 rounded-2xl text-sm shadow-sm",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-bl-md"
                        : "bg-card border rounded-br-md"
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground px-1",
                    isOwn ? "flex-row" : "flex-row-reverse"
                  )}>
                    <span>{format(new Date(msg.created_at), 'p', { locale: ar })}</span>
                    {isOwn && (
                      msg.is_read ? (
                        <CheckCheck className="h-3.5 w-3.5 text-secondary" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      {currentConversation.status !== 'closed' ? (
        <div className="flex-shrink-0 p-4 md:p-5 border-t bg-card">
          <div className="flex gap-3 max-w-3xl mx-auto">
            <Input
              placeholder="اكتب رسالتك هنا..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={sending}
              className="flex-1 h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={sending || !newMessage.trim()}
              size="lg"
              className="gap-2 h-12 px-6 shadow-lg"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              <span className="hidden sm:inline">إرسال</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 p-5 border-t bg-muted/30">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">تم إغلاق هذه المحادثة</span>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PortalChat;
