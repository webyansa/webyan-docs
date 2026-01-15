import React, { useState, useEffect } from 'react';
import { useChat, Conversation } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageCircle, Send, Plus, Clock, CheckCheck, 
  User, ArrowLeft, Loader2 
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const statusLabels = {
  unassigned: { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-700' },
  assigned: { label: 'قيد المعالجة', color: 'bg-blue-100 text-blue-700' },
  closed: { label: 'مغلقة', color: 'bg-gray-100 text-gray-600' }
};

const PortalChat = () => {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [startingChat, setStartingChat] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

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
    setStartingChat(true);
    try {
      await startConversation('محادثة جديدة', undefined, clientName, clientEmail);
    } finally {
      setStartingChat(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentConversation) return;
    await sendMessage(currentConversation.id, newMessage, undefined, clientName);
    setNewMessage('');
  };

  // Conversation List View
  if (!currentConversation) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">المحادثات</h1>
            <p className="text-muted-foreground">تواصل مباشر مع فريق الدعم</p>
          </div>
          <Button onClick={handleStartConversation} disabled={startingChat}>
            {startingChat ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Plus className="h-4 w-4 ml-2" />
            )}
            محادثة جديدة
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-medium mb-2">لا توجد محادثات</h3>
              <p className="text-muted-foreground mb-4">ابدأ محادثة جديدة للتواصل مع فريق الدعم</p>
              <Button onClick={handleStartConversation} disabled={startingChat}>
                <Plus className="h-4 w-4 ml-2" />
                بدء محادثة
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {conversations.map((conv) => (
              <Card 
                key={conv.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => selectConversation(conv)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>
                          <MessageCircle className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{conv.subject || 'محادثة'}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {conv.last_message_preview || 'لا توجد رسائل'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={statusLabels[conv.status].color}>
                            {statusLabels[conv.status].label}
                          </Badge>
                          {conv.assigned_agent && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {conv.assigned_agent.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      {conv.last_message_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(conv.last_message_at), 'p', { locale: ar })}
                        </span>
                      )}
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="mr-2">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Conversation View
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setCurrentConversation(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold">{currentConversation.subject || 'محادثة'}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge className={statusLabels[currentConversation.status].color}>
                {statusLabels[currentConversation.status].label}
              </Badge>
              {currentConversation.assigned_agent && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {currentConversation.assigned_agent.full_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender_type === 'system' ? (
                <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-full px-4 py-1 w-full max-w-md mx-auto">
                  {msg.body}
                </div>
              ) : (
                <div className={`max-w-[75%] ${msg.sender_type === 'client' ? '' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      msg.sender_type === 'client'
                        ? 'bg-primary text-primary-foreground rounded-tl-none'
                        : 'bg-muted rounded-tr-none'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  </div>
                  <div className={`flex items-center gap-1 mt-1 text-[10px] text-muted-foreground ${
                    msg.sender_type === 'client' ? 'justify-end' : 'justify-start'
                  }`}>
                    <span>{msg.sender_name}</span>
                    <span>•</span>
                    <span>{format(new Date(msg.created_at), 'p', { locale: ar })}</span>
                    {msg.is_read && msg.sender_type === 'client' && (
                      <CheckCheck className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      {currentConversation.status !== 'closed' ? (
        <div className="p-4 border-t bg-card">
          <div className="flex gap-2">
            <Input
              placeholder="اكتب رسالتك..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={sending}
            />
            <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t bg-muted/50 text-center text-sm text-muted-foreground">
          هذه المحادثة مغلقة
        </div>
      )}
    </div>
  );
};

export default PortalChat;
