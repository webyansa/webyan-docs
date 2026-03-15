import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, User, ChevronDown, ChevronUp, FileText, Copy, Check, Share2 } from 'lucide-react';
import { toast } from 'sonner';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  debug?: {
    model?: string;
    chunks_count?: number;
    confidence?: number;
    prompt_size?: number;
    latency_ms?: number;
    grounded?: boolean;
  };
}

function SourcesAccordion({ sources }: { sources: any[] }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2 rounded-md border border-border bg-muted/30">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50"
      >
        <FileText className="h-3 w-3" />
        <span>المصادر ({sources.length})</span>
        <Badge variant="outline" className="text-[10px] h-4 mr-1">Grounded</Badge>
        {open ? <ChevronUp className="h-3 w-3 mr-auto" /> : <ChevronDown className="h-3 w-3 mr-auto" />}
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-2">
          {sources.map((s: any, i: number) => (
            <div key={s.id || i} className="rounded border border-border/50 p-2 text-xs bg-background">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-[10px] h-4">{s.category}</Badge>
                <span className="font-medium truncate">{s.title}</span>
                <span className="text-muted-foreground mr-auto">
                  {Math.round((s.final_score || s.similarity_score || 0) * 100)}%
                </span>
              </div>
              {s.section_path && (
                <div className="text-muted-foreground text-[10px] mb-1">{s.section_path}</div>
              )}
              <p className="text-muted-foreground line-clamp-2">{s.content?.slice(0, 150)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CopilotChatArea({
  messages,
  isLoading,
}: {
  messages: CopilotMessage[];
  isLoading: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mx-auto">
            <Sparkles className="h-8 w-8 text-primary/60" />
          </div>
          <h3 className="font-semibold text-foreground">مساعد ويبيان الذكي</h3>
          <p className="text-sm text-muted-foreground max-w-[250px]">
            اسألني عن ويبيان، اطلب رد دعم، حلل تذكرة، أو اطلب اقتراحات عملية.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4 py-3">
      <div className="space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-gradient-to-br from-primary/20 to-secondary/20 text-primary'
            }`}>
              {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            </div>
            <div className={`flex-1 max-w-[85%] ${msg.role === 'user' ? 'text-left' : 'text-right'}`}>
              <div className={`rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-foreground'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert text-right [&>*]:text-right">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <SourcesAccordion sources={msg.sources} />
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            </div>
            <div className="bg-muted/60 rounded-lg px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
