import { useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, Send, Square, Trash2, Plus, History,
  MessageSquare, Headphones, Search, Lightbulb,
  Wifi, WifiOff, X
} from 'lucide-react';
import { useCopilot } from './CopilotContext';
import CopilotChatArea, { type CopilotMessage } from './CopilotChatArea';
import CopilotSupportTab from './CopilotSupportTab';
import CopilotTicketTab from './CopilotTicketTab';
import CopilotSuggestTab from './CopilotSuggestTab';
import CopilotDebugPanel from './CopilotDebugPanel';
import CopilotSessionHistory from './CopilotSessionHistory';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MODELS = [
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', tag: 'Production' },
  { value: 'openai/gpt-4o', label: 'GPT-4o', tag: 'Production' },
  { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet', tag: 'Production' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini Flash', tag: 'Production' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini Pro', tag: 'Production' },
  { value: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B', tag: 'Free' },
  { value: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B', tag: 'Free' },
  { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', tag: 'Free' },
];

const QUICK_ACTIONS = [
  { label: 'اشرح لي هذه الباقة', mode: 'ask' },
  { label: 'اكتب رد دعم احترافي', mode: 'support' },
  { label: 'حلل هذه التذكرة', mode: 'analyze' },
  { label: 'اقترح الخطوة التالية', mode: 'suggest' },
  { label: 'لخص المشكلة', mode: 'ask' },
  { label: 'ما الذي لا يجب قوله للعميل؟', mode: 'ask' },
  { label: 'اكتب رد أكثر ودية', mode: 'support' },
  { label: 'اكتب رد أكثر رسمية', mode: 'support' },
];

export default function AICopilotPanel() {
  const { isOpen, setIsOpen } = useCopilot();
  const [activeTab, setActiveTab] = useState('ask');
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('openai/gpt-4o-mini');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [lastDebug, setLastDebug] = useState<any>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const streamChat = useCallback(async (action: string, payload: Record<string, any>) => {
    setIsLoading(true);
    const controller = new AbortController();
    setAbortController(controller);

    // Add user message
    const userContent = payload.message || payload.client_message || payload.ticket_title || payload.context_description || '';
    const userMsg: CopilotMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('يرجى تسجيل الدخول أولاً');
        setIsLoading(false);
        return;
      }

      const conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-copilot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action,
            model,
            session_id: sessionId,
            conversation_history: conversationHistory,
            ...payload,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'خطأ غير متوقع' }));
        toast.error(errorData.error || `خطأ ${response.status}`);
        setIsLoading(false);
        return;
      }

      // Check if it's a JSON error response (non-streaming)
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        const jsonData = await response.json();
        if (!jsonData.success && jsonData.error) {
          const errorMsg: CopilotMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `⚠️ ${jsonData.error}`,
            debug: jsonData.debug,
          };
          setMessages(prev => [...prev, errorMsg]);
          setLastDebug(jsonData.debug);
          setIsLoading(false);
          return;
        }
      }

      // Extract metadata from headers
      let sources: any[] = [];
      try {
        const sourcesHeader = response.headers.get('X-Copilot-Sources');
        if (sourcesHeader) sources = JSON.parse(decodeURIComponent(sourcesHeader));
      } catch {}

      const debug = {
        model: response.headers.get('X-Copilot-Model') || model,
        chunks_count: parseInt(response.headers.get('X-Copilot-Chunks') || '0'),
        confidence: parseInt(response.headers.get('X-Copilot-Confidence') || '0'),
        prompt_size: parseInt(response.headers.get('X-Copilot-Prompt-Size') || '0'),
        latency_ms: parseInt(response.headers.get('X-Copilot-Latency') || '0'),
        grounded: response.headers.get('X-Copilot-Grounded') === 'true',
      };
      setLastDebug(debug);

      // Stream SSE
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      const assistantId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        sources,
        debug,
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
              );
            }
          } catch {}
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (const line of textBuffer.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
              );
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error('[copilot]', e);
      toast.error('فشل الاتصال بالمساعد');
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  }, [model, sessionId, messages]);

  const handleAskSubmit = () => {
    if (!input.trim() || isLoading) return;
    const msg = input;
    setInput('');
    streamChat('ask', { message: msg });
  };

  const handleSupportSubmit = (data: any) => {
    streamChat('support', data);
  };

  const handleTicketSubmit = (data: any) => {
    streamChat('analyze', data);
  };

  const handleSuggestSubmit = (data: any) => {
    streamChat('suggest', data);
  };

  const handleQuickAction = (qa: typeof QUICK_ACTIONS[0]) => {
    setActiveTab(qa.mode);
    if (qa.mode === 'ask') {
      setInput(qa.label);
    }
  };

  const handleStop = () => {
    abortController?.abort();
    setIsLoading(false);
  };

  const handleClear = () => {
    setMessages([]);
    setSessionId(null);
    setLastDebug(null);
  };

  const handleLoadSession = async (sid: string) => {
    setShowHistory(false);
    setSessionId(sid);
    // Load messages
    const { data } = await supabase
      .from('ai_copilot_messages')
      .select('*')
      .eq('session_id', sid)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data.filter(m => m.role !== 'system').map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        sources: m.sources_json as any[] || undefined,
        debug: m.retrieval_json as any || undefined,
      })));
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <SheetContent
        side="left"
        className="w-[440px] sm:max-w-[440px] p-0 flex flex-col [&>button]:hidden z-[70]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetTitle className="sr-only">مساعد ويبيان الذكي</SheetTitle>
        <SheetDescription className="sr-only">المساعد الذكي الداخلي لفريق ويبيان</SheetDescription>
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-gradient-to-l from-primary/5 to-secondary/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground">مساعد ويبيان الذكي</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Wifi className="h-3 w-3 text-green-500" />
                <span className="text-[10px] text-muted-foreground">متصل</span>
                <Badge variant="outline" className="text-[10px] h-4 mr-1">Grounded</Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(!showHistory)}>
                <History className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClear}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {/* Model selector */}
          <div className="mt-2">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-7 text-[11px] bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {MODELS.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    <span>{m.label}</span>
                    <Badge variant={m.tag === 'Free' ? 'secondary' : 'default'} className="text-[9px] h-3.5 mr-2">
                      {m.tag}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showHistory ? (
          <CopilotSessionHistory onLoadSession={handleLoadSession} onClose={() => setShowHistory(false)} />
        ) : (
          <>
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-3 mt-2 grid grid-cols-4 h-8">
                <TabsTrigger value="ask" className="text-[11px] gap-1 px-1">
                  <MessageSquare className="h-3 w-3" />اسأل
                </TabsTrigger>
                <TabsTrigger value="support" className="text-[11px] gap-1 px-1">
                  <Headphones className="h-3 w-3" />ردود
                </TabsTrigger>
                <TabsTrigger value="analyze" className="text-[11px] gap-1 px-1">
                  <Search className="h-3 w-3" />تحليل
                </TabsTrigger>
                <TabsTrigger value="suggest" className="text-[11px] gap-1 px-1">
                  <Lightbulb className="h-3 w-3" />اقتراحات
                </TabsTrigger>
              </TabsList>

              {/* Ask Tab - Chat */}
              <TabsContent value="ask" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
                <CopilotChatArea messages={messages} isLoading={isLoading} />

                {/* Quick actions */}
                {messages.length === 0 && (
                  <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                    {QUICK_ACTIONS.filter(q => q.mode === 'ask').map((qa, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickAction(qa)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="px-3 pb-3 border-t border-border pt-2">
                  <div className="flex gap-2">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAskSubmit();
                        }
                      }}
                      placeholder="اكتب سؤالك هنا..."
                      className="text-sm min-h-[40px] max-h-[100px] resize-none"
                      dir="rtl"
                    />
                    <div className="flex flex-col gap-1">
                      {isLoading ? (
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={handleStop}>
                          <Square className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button size="icon" className="h-8 w-8" onClick={handleAskSubmit} disabled={!input.trim()}>
                          <Send className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Support Tab */}
              <TabsContent value="support" className="flex-1 flex flex-col overflow-auto mt-0 data-[state=inactive]:hidden">
                <CopilotChatArea messages={messages} isLoading={isLoading} />
                <CopilotSupportTab onSubmit={handleSupportSubmit} isLoading={isLoading} />
              </TabsContent>

              {/* Analyze Tab */}
              <TabsContent value="analyze" className="flex-1 flex flex-col overflow-auto mt-0 data-[state=inactive]:hidden">
                <CopilotChatArea messages={messages} isLoading={isLoading} />
                <CopilotTicketTab onSubmit={handleTicketSubmit} isLoading={isLoading} />
              </TabsContent>

              {/* Suggest Tab */}
              <TabsContent value="suggest" className="flex-1 flex flex-col overflow-auto mt-0 data-[state=inactive]:hidden">
                <CopilotChatArea messages={messages} isLoading={isLoading} />
                <CopilotSuggestTab onSubmit={handleSuggestSubmit} isLoading={isLoading} />
              </TabsContent>
            </Tabs>

            {/* Debug Panel */}
            <CopilotDebugPanel debug={lastDebug} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
