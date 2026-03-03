import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Trash2, Clock, Loader2, Bot, User, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ModelSession {
  provider: string;
  model: string;
  label: string;
  messages: ChatMessage[];
  isLoading: boolean;
  responseTime: number | null;
  error: string | null;
}

const AVAILABLE_MODELS = [
  { provider: 'lovable', model: 'google/gemini-2.5-flash', label: 'Lovable – Gemini 2.5 Flash' },
  { provider: 'lovable', model: 'google/gemini-2.5-pro', label: 'Lovable – Gemini 2.5 Pro' },
  { provider: 'lovable', model: 'google/gemini-3-flash-preview', label: 'Lovable – Gemini 3 Flash' },
  { provider: 'lovable', model: 'google/gemini-3-pro-preview', label: 'Lovable – Gemini 3 Pro' },
  { provider: 'lovable', model: 'openai/gpt-5', label: 'Lovable – GPT-5' },
  { provider: 'lovable', model: 'openai/gpt-5-mini', label: 'Lovable – GPT-5 Mini' },
  { provider: 'lovable', model: 'openai/gpt-5-nano', label: 'Lovable – GPT-5 Nano' },
  { provider: 'lovable', model: 'openai/gpt-5.2', label: 'Lovable – GPT-5.2' },
  { provider: 'openai', model: 'gpt-4o', label: 'OpenAI – GPT-4o' },
  { provider: 'openai', model: 'gpt-4o-mini', label: 'OpenAI – GPT-4o Mini' },
  { provider: 'gemini', model: 'gemini-2.5-flash', label: 'Gemini – 2.5 Flash' },
  { provider: 'gemini', model: 'gemini-2.5-pro', label: 'Gemini – 2.5 Pro' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/raw-chat-test`;

async function streamChat(
  provider: string,
  model: string,
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  onDone: (responseTimeMs: number) => void,
  onError: (err: string) => void,
) {
  const startTime = Date.now();
  try {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ provider, model, messages }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(errData.error || `HTTP ${resp.status}`);
    }

    if (!resp.body) throw new Error('No response body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;

    while (!done) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIdx);
        buffer = buffer.slice(newlineIdx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') { done = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    // flush
    if (buffer.trim()) {
      for (let raw of buffer.split('\n')) {
        if (!raw || raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const j = raw.slice(6).trim();
        if (j === '[DONE]') continue;
        try {
          const p = JSON.parse(j);
          const c = p.choices?.[0]?.delta?.content;
          if (c) onDelta(c);
        } catch {}
      }
    }

    onDone(Date.now() - startTime);
  } catch (e: any) {
    onError(e.message || 'Unknown error');
  }
}

export default function ModelChatTesterPage() {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [sessions, setSessions] = useState<Record<string, ModelSession>>({});
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getModelKey = (provider: string, model: string) => `${provider}::${model}`;

  const toggleModel = (provider: string, model: string) => {
    const key = getModelKey(provider, model);
    setSelectedModels(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      }
      return [...prev, key];
    });
  };

  const clearAll = () => {
    setSessions({});
    toast.success('تم مسح جميع المحادثات');
  };

  const scrollToBottom = useCallback((key: string) => {
    const el = scrollRefs.current[key];
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (selectedModels.length === 0) {
      toast.error('اختر نموذجاً واحداً على الأقل');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    setInput('');
    setIsSending(true);

    // Initialize sessions for selected models
    const updatedSessions = { ...sessions };
    for (const key of selectedModels) {
      if (!updatedSessions[key]) {
        const [provider, model] = key.split('::');
        const def = AVAILABLE_MODELS.find(m => m.provider === provider && m.model === model);
        updatedSessions[key] = {
          provider,
          model,
          label: def?.label || key,
          messages: [],
          isLoading: false,
          responseTime: null,
          error: null,
        };
      }
      updatedSessions[key] = {
        ...updatedSessions[key],
        messages: [...updatedSessions[key].messages, userMessage],
        isLoading: true,
        error: null,
        responseTime: null,
      };
    }
    setSessions({ ...updatedSessions });

    // Send to all selected models in parallel
    const promises = selectedModels.map(key => {
      const session = updatedSessions[key];
      const allMessages = [...session.messages];
      let assistantContent = '';

      return streamChat(
        session.provider,
        session.model,
        allMessages,
        (delta) => {
          assistantContent += delta;
          setSessions(prev => {
            const s = prev[key];
            if (!s) return prev;
            const msgs = [...s.messages];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg?.role === 'assistant') {
              msgs[msgs.length - 1] = { ...lastMsg, content: assistantContent };
            } else {
              msgs.push({ role: 'assistant', content: assistantContent });
            }
            return { ...prev, [key]: { ...s, messages: msgs } };
          });
          scrollToBottom(key);
        },
        (responseTimeMs) => {
          setSessions(prev => {
            const s = prev[key];
            if (!s) return prev;
            return { ...prev, [key]: { ...s, isLoading: false, responseTime: responseTimeMs } };
          });
        },
        (errMsg) => {
          setSessions(prev => {
            const s = prev[key];
            if (!s) return prev;
            return { ...prev, [key]: { ...s, isLoading: false, error: errMsg } };
          });
        },
      );
    });

    await Promise.allSettled(promises);
    setIsSending(false);
  };

  const activeKeys = selectedModels.filter(k => sessions[k]);
  const cols = selectedModels.length <= 1 ? 'grid-cols-1' : selectedModels.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Model Chat Tester (Raw Mode)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            اختبار النماذج بشكل مباشر بدون أي سياق إضافي أو تعليمات نظام
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={clearAll} className="gap-2">
          <Trash2 className="h-4 w-4" />
          مسح الكل
        </Button>
      </div>

      {/* Model Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            اختر النماذج للمقارنة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {AVAILABLE_MODELS.map(m => {
              const key = getModelKey(m.provider, m.model);
              const isSelected = selectedModels.includes(key);
              return (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleModel(m.provider, m.model)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.provider}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <div className={`grid ${cols} gap-4`}>
        {selectedModels.map(key => {
          const session = sessions[key];
          const def = AVAILABLE_MODELS.find(m => getModelKey(m.provider, m.model) === key);
          const label = session?.label || def?.label || key;
          const messages = session?.messages || [];

          return (
            <Card key={key} className="flex flex-col h-[500px]">
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium truncate">{label}</CardTitle>
                  <div className="flex items-center gap-2">
                    {session?.responseTime != null && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {(session.responseTime / 1000).toFixed(1)}s
                      </Badge>
                    )}
                    {session?.isLoading && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <div
                ref={el => { scrollRefs.current[key] = el; }}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <Bot className="h-8 w-8 opacity-30" />
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                ))}
                {session?.error && (
                  <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded-lg p-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {session.error}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Input */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="اكتب رسالتك هنا... (Raw Mode – بدون سياق إضافي)"
              className="min-h-[60px] resize-none flex-1"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isSending}
            />
            <Button
              onClick={handleSend}
              disabled={isSending || !input.trim() || selectedModels.length === 0}
              size="lg"
              className="gap-2 self-end"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              إرسال
            </Button>
          </div>
          {selectedModels.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              ⬆️ اختر نموذجاً واحداً على الأقل من القائمة أعلاه
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
