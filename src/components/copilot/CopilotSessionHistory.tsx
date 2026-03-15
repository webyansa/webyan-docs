import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { History, MessageSquare, Headphones, Search, Lightbulb } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const MODE_ICONS: Record<string, any> = {
  ask: MessageSquare,
  support: Headphones,
  analyze: Search,
  suggest: Lightbulb,
};

const MODE_LABELS: Record<string, string> = {
  ask: 'سؤال',
  support: 'رد دعم',
  analyze: 'تحليل تذكرة',
  suggest: 'اقتراحات',
};

interface Props {
  onLoadSession: (sessionId: string) => void;
  onClose: () => void;
}

export default function CopilotSessionHistory({ onLoadSession, onClose }: Props) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('ai_copilot_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(30);
      setSessions(data || []);
      setLoading(false);
    };
    fetchSessions();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">سجل الجلسات</span>
        <Button variant="ghost" size="sm" className="mr-auto text-xs" onClick={onClose}>
          رجوع
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">جاري التحميل...</div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">لا توجد جلسات سابقة</div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((s) => {
              const Icon = MODE_ICONS[s.mode] || MessageSquare;
              return (
                <button
                  key={s.id}
                  onClick={() => onLoadSession(s.id)}
                  className="w-full flex items-start gap-2 rounded-md px-3 py-2 text-right hover:bg-muted/50 transition-colors"
                >
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{MODE_LABELS[s.mode] || s.mode}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true, locale: ar })}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
