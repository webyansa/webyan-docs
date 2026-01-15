import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Loader2, CheckCheck, User } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface EmbedChatWidgetProps {
  embedToken: string;
  organizationName?: string;
  contactEmail?: string;
  primaryColor?: string;
  theme?: 'light' | 'dark';
}

const statusLabels = {
  unassigned: 'في الانتظار',
  assigned: 'قيد الرد',
  closed: 'مغلقة'
};

export default function EmbedChatWidget({ 
  embedToken, 
  organizationName, 
  contactEmail,
  primaryColor = '#3b82f6',
  theme = 'light'
}: EmbedChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(contactEmail || '');
  const [messageText, setMessageText] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    currentConversation,
    messages,
    sending,
    startConversation,
    sendMessage
  } = useChat({ embedToken, autoFetch: false });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Notify parent when widget opens/closes
  useEffect(() => {
    window.parent.postMessage({ 
      type: isOpen ? 'WEBYAN_CHAT_OPENED' : 'WEBYAN_CHAT_CLOSED' 
    }, '*');
  }, [isOpen]);

  const handleStartChat = async () => {
    if (!name.trim() || !initialMessage.trim()) return;
    await startConversation('محادثة جديدة', initialMessage, name, email);
    setInitialMessage('');
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentConversation) return;
    await sendMessage(currentConversation.id, messageText, undefined, name);
    setMessageText('');
  };

  const isDark = theme === 'dark';

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{ backgroundColor: primaryColor }}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform z-50"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 left-6 w-80 sm:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 ${
      isDark ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'
    }`}>
      {/* Header */}
      <div 
        style={{ backgroundColor: primaryColor }}
        className="text-white p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">الدعم الفني</h3>
            {currentConversation && (
              <span className="text-xs text-white/80">
                {statusLabels[currentConversation.status]}
                {currentConversation.assigned_agent && (
                  <> • {currentConversation.assigned_agent.full_name}</>
                )}
              </span>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-white hover:bg-white/20" 
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!currentConversation ? (
        /* Start Chat Form */
        <div className="flex-1 p-4 space-y-4 overflow-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
              <MessageCircle className="h-8 w-8" style={{ color: primaryColor }} />
            </div>
            <h3 className="font-semibold text-lg">مرحباً! 👋</h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              كيف يمكننا مساعدتك اليوم؟
            </p>
          </div>
          
          <div className="space-y-3">
            <Input
              placeholder="الاسم *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={isDark ? 'bg-slate-800 border-slate-700' : ''}
            />
            <Input
              placeholder="البريد الإلكتروني (اختياري)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={isDark ? 'bg-slate-800 border-slate-700' : ''}
            />
            <Textarea
              placeholder="اكتب رسالتك هنا... *"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              rows={4}
              className={isDark ? 'bg-slate-800 border-slate-700' : ''}
            />
          </div>
          
          <Button 
            onClick={handleStartChat} 
            className="w-full"
            style={{ backgroundColor: primaryColor }}
            disabled={!name.trim() || !initialMessage.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Send className="h-4 w-4 ml-2" />
            )}
            بدء المحادثة
          </Button>
        </div>
      ) : (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender_type === 'system' ? (
                    <div className={`text-center text-xs rounded-full px-3 py-1 w-full ${
                      isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {msg.body}
                    </div>
                  ) : (
                    <div className="max-w-[80%]">
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm ${
                          msg.sender_type === 'client'
                            ? 'text-white rounded-tl-none'
                            : isDark 
                              ? 'bg-slate-800 rounded-tr-none' 
                              : 'bg-gray-100 rounded-tr-none'
                        }`}
                        style={msg.sender_type === 'client' ? { backgroundColor: primaryColor } : {}}
                      >
                        {msg.sender_type === 'agent' && (
                          <p className="text-xs font-medium mb-1" style={{ color: primaryColor }}>
                            {msg.sender_name}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                      </div>
                      <div className={`flex items-center gap-1 mt-1 text-[10px] ${
                        isDark ? 'text-slate-500' : 'text-gray-400'
                      } ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
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
            <div className={`p-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex gap-2">
                <Input
                  placeholder="اكتب رسالتك..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={sending}
                  className={`text-sm ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
                />
                <Button 
                  size="icon" 
                  onClick={handleSendMessage} 
                  disabled={sending || !messageText.trim()}
                  style={{ backgroundColor: primaryColor }}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className={`p-3 text-center text-sm ${
              isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-500'
            }`}>
              تم إغلاق هذه المحادثة
            </div>
          )}
        </>
      )}
    </div>
  );
}
