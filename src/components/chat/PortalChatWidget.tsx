import React, { useState, useRef, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useChat, Conversation, Message } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, X, Minus, Send, 
  Headphones, HelpCircle, GraduationCap, Wrench, ChevronLeft,
  Check, CheckCheck, Loader2, Circle, Sparkles, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TypingIndicator } from './messenger/TypingIndicator';
import webyanLogo from '@/assets/webyan-logo.svg';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  subject: string;
  color: string;
}

const quickActions: QuickAction[] = [
  { id: 'technical', label: 'مشكلة تقنية', icon: Wrench, subject: 'مشكلة تقنية', color: 'from-red-500 to-orange-500' },
  { id: 'inquiry', label: 'استفسار عام', icon: HelpCircle, subject: 'استفسار عام', color: 'from-blue-500 to-cyan-500' },
  { id: 'training', label: 'طلب تدريب', icon: GraduationCap, subject: 'طلب تدريب', color: 'from-purple-500 to-pink-500' },
];

interface PortalChatWidgetProps {
  clientName?: string;
  clientEmail?: string;
  organizationId?: string;
}

export function PortalChatWidget({
  clientName = '',
  clientEmail = '',
  organizationId
}: PortalChatWidgetProps) {
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

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [view, setView] = useState<'launcher' | 'welcome' | 'chat'>('launcher');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Persist widget state across navigation
  useEffect(() => {
    const savedState = sessionStorage.getItem('portalChatWidgetState');
    if (savedState) {
      const state = JSON.parse(savedState);
      setIsOpen(state.isOpen || false);
      setIsMinimized(state.isMinimized || false);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('portalChatWidgetState', JSON.stringify({
      isOpen,
      isMinimized
    }));
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !currentConversation && conversations.length === 0) {
      setView('welcome');
    } else if (isOpen && conversations.length > 0 && !currentConversation) {
      setView('launcher');
    }
  }, [isOpen, currentConversation, conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (view === 'chat' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [view, currentConversation]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
    fetchConversations();
    if (conversations.length > 0) {
      setView('launcher');
    } else {
      setView('welcome');
    }
  }, [conversations.length, fetchConversations]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCurrentConversation(null);
    setView('launcher');
  }, [setCurrentConversation]);

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const handleQuickAction = useCallback(async (action: QuickAction) => {
    try {
      await startConversation(action.subject, `بدء محادثة - ${action.label}`, clientName, clientEmail);
      setView('chat');
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  }, [clientName, clientEmail, startConversation]);

  const handleStartNewChat = useCallback(async () => {
    try {
      await startConversation('محادثة جديدة', 'مرحباً! كيف يمكننا مساعدتك؟', clientName, clientEmail);
      setView('chat');
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  }, [clientName, clientEmail, startConversation]);

  const handleSelectConversation = useCallback((conv: Conversation) => {
    selectConversation(conv);
    setView('chat');
  }, [selectConversation]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !currentConversation) return;
    
    const text = messageText;
    setMessageText('');
    await sendMessage(currentConversation.id, text, undefined, clientName);
  }, [messageText, currentConversation, sendMessage, clientName]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleBackToList = useCallback(() => {
    setCurrentConversation(null);
    setView(conversations.length > 0 ? 'launcher' : 'welcome');
  }, [conversations.length, setCurrentConversation]);

  // Floating Button - Modern Design
  if (!isOpen || isMinimized) {
    return (
      <div className="fixed z-50 bottom-6 left-6">
        <button
          onClick={handleOpen}
          className="group relative w-16 h-16 rounded-2xl shadow-2xl hover:shadow-primary/30 transition-all duration-300 flex items-center justify-center transform hover:scale-105 bg-gradient-to-br from-primary to-secondary"
          title="تواصل مع الدعم"
        >
          <MessageCircle className="h-7 w-7 text-white" />
          
          {totalUnread > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce shadow-lg">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
          
          {/* Pulse Effect */}
          <span className="absolute inset-0 rounded-2xl bg-primary/30 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
          
          {/* Tooltip */}
          <span className="absolute bottom-full mb-3 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
            <span className="flex items-center gap-2">
              <Headphones className="w-4 h-4" />
              فريق الدعم متاح الآن
            </span>
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-foreground" />
          </span>
        </button>
      </div>
    );
  }

  // Chat Window - Modern Professional Design
  return (
    <div 
      ref={widgetRef}
      className="fixed z-50 bottom-6 left-6 flex flex-col bg-background rounded-3xl shadow-2xl overflow-hidden border border-border/50 animate-in slide-in-from-bottom-4 duration-300 w-[400px] h-[600px]"
      dir="rtl"
    >
      {/* Header - Gradient */}
      <div className="relative flex items-center justify-between px-5 py-4 text-white flex-shrink-0 bg-gradient-to-l from-primary to-secondary overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative flex items-center gap-3">
          {view === 'chat' && (
            <button
              onClick={handleBackToList}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <img src={webyanLogo} alt="ويبيان" className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-base">فريق دعم ويبيان</h3>
            <div className="flex items-center gap-1.5 text-xs text-white/80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>متاح الآن للمساعدة</span>
            </div>
          </div>
        </div>
        <div className="relative flex items-center gap-1">
          <button 
            onClick={handleMinimize}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Welcome View */}
      {view === 'welcome' && (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="text-center mb-8">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl animate-pulse" />
              <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">مرحباً بك! 👋</h2>
            <p className="text-muted-foreground text-sm">
              نحن هنا لمساعدتك. اختر موضوع المحادثة أو ابدأ محادثة جديدة.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                disabled={sending}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all text-right disabled:opacity-50 group bg-gradient-to-l from-muted/30 to-transparent"
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br text-white shadow-lg transition-transform group-hover:scale-110",
                  action.color
                )}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-foreground block">{action.label}</span>
                  <span className="text-xs text-muted-foreground">انقر للبدء</span>
                </div>
                <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
              </button>
            ))}
          </div>

          <Button 
            onClick={handleStartNewChat}
            size="lg"
            className="w-full gap-2 rounded-xl h-12 text-base font-medium bg-gradient-to-l from-primary to-secondary hover:opacity-90 shadow-lg shadow-primary/20"
            disabled={sending}
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            محادثة جديدة
          </Button>
        </div>
      )}

      {/* Conversations List View */}
      {view === 'launcher' && (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border/50">
            <Button 
              onClick={handleStartNewChat}
              size="lg"
              className="w-full gap-2 rounded-xl h-12 bg-gradient-to-l from-primary to-secondary hover:opacity-90 shadow-lg shadow-primary/20"
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              بدء محادثة جديدة
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3">
              <p className="text-xs font-medium text-muted-foreground px-3 py-2 mb-2">المحادثات السابقة</p>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">لا توجد محادثات سابقة</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/50 transition-all text-right group"
                    >
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-secondary/10 text-primary font-semibold">
                          {conv.assigned_agent?.full_name?.charAt(0) || 'ع'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-foreground truncate">
                            {conv.subject || 'محادثة'}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex-shrink-0">
                            {conv.last_message_at && formatDistanceToNow(new Date(conv.last_message_at), { 
                              addSuffix: false, 
                              locale: ar 
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.last_message_preview || 'لا توجد رسائل'}
                        </p>
                      </div>
                      {conv.unread_count > 0 && (
                        <Badge className="h-6 min-w-6 text-xs bg-primary hover:bg-primary">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Powered By */}
          <div className="p-4 text-center border-t border-border/50">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <img src={webyanLogo} alt="ويبيان" className="h-4 w-4 opacity-50" />
              <span>مدعوم بواسطة ويبيان</span>
            </div>
          </div>
        </div>
      )}

      {/* Chat View */}
      {view === 'chat' && currentConversation && (
        <>
          <ScrollArea className="flex-1 bg-muted/20">
            <div className="p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Avatar className="h-16 w-16 mx-auto mb-4 border-2 border-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-secondary/10 text-primary text-xl font-semibold">
                      ع
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-muted-foreground">
                    ابدأ المحادثة الآن وسنرد عليك في أقرب وقت
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOwn = msg.sender_type === 'client';
                  const isSystem = msg.sender_type === 'system';
                  const showAvatar = !isOwn && (idx === 0 || messages[idx - 1]?.sender_type !== 'agent');

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-[11px] text-muted-foreground bg-muted px-4 py-1.5 rounded-full">
                          {msg.body}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={cn("flex gap-3", isOwn ? "flex-row-reverse" : "flex-row")}
                    >
                      {!isOwn && showAvatar && (
                        <Avatar className="h-8 w-8 flex-shrink-0 mt-auto border border-border">
                          <AvatarFallback className="text-xs bg-gradient-to-br from-primary/10 to-secondary/10 text-primary font-medium">
                            {msg.sender_name?.charAt(0) || 'ع'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {!isOwn && !showAvatar && <div className="w-8" />}

                      <div className={cn("max-w-[80%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            "px-4 py-3 rounded-2xl text-sm shadow-sm",
                            isOwn 
                              ? "rounded-bl-md bg-gradient-to-l from-primary to-primary/90 text-white" 
                              : "rounded-br-md bg-background border border-border"
                          )}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground px-1",
                          isOwn ? "flex-row-reverse" : "flex-row"
                        )}>
                          <span>{format(new Date(msg.created_at), 'p', { locale: ar })}</span>
                          {isOwn && (
                            msg.is_read ? (
                              <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              {isTyping && <TypingIndicator name={currentConversation.assigned_agent?.full_name} />}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border/50 bg-background">
            <div className="flex items-center gap-3">
              <Input
                ref={inputRef}
                placeholder="اكتب رسالتك..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sending}
                className="flex-1 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || !messageText.trim()}
                size="icon"
                className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
