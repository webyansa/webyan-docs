import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Loader2, Palette, Send, CheckCircle2, Clock, Megaphone,
  ExternalLink, ChevronDown, ChevronUp, Inbox, CalendarDays, Hash,
  Type, FileText, MousePointerClick, Image, MessageSquareText, Sparkles,
  Clock3, Globe, AlertTriangle, Flame, BellRing
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { differenceInDays, format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

const statusLabels: Record<string, string> = {
  draft: 'مسودة', waiting_design: 'بانتظار التصميم', in_design: 'قيد التصميم',
  design_done: 'تم التصميم', ready: 'جاهز للنشر', published: 'تم النشر'
};
const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  waiting_design: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  in_design: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  design_done: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  ready: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
};

const contentTypeLabels: Record<string, string> = {
  post: 'منشور', article: 'مقال', video: 'فيديو', story: 'ستوري',
  infographic: 'إنفوجرافيك', carousel: 'كاروسيل', reel: 'ريلز',
};

const channelIcons: Record<string, string> = {
  X: '𝕏', LinkedIn: '💼', Instagram: '📸', Website: '🌐',
  Email: '📧', WhatsApp: '💬',
};

interface ContentTask {
  id: string;
  title: string;
  status: string;
  channels: string[] | null;
  publish_date: string | null;
  publish_time: string | null;
  design_notes: string | null;
  design_text: string | null;
  design_status: string | null;
  post_text: string | null;
  design_file_url: string | null;
  hashtags: string | null;
  cta: string | null;
  updated_at: string;
  content_type: string;
}

// Urgency helpers
function getUrgencyInfo(publishDate: string | null) {
  if (!publishDate) return { level: 'none' as const, label: '', daysLeft: Infinity };
  const date = parseISO(publishDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInDays(date, today);

  if (isPast(date) && !isToday(date)) return { level: 'overdue' as const, label: 'متأخر!', daysLeft: days };
  if (isToday(date)) return { level: 'today' as const, label: 'اليوم!', daysLeft: 0 };
  if (isTomorrow(date)) return { level: 'tomorrow' as const, label: 'غداً', daysLeft: 1 };
  if (days <= 3) return { level: 'soon' as const, label: `بعد ${days} أيام`, daysLeft: days };
  return { level: 'normal' as const, label: '', daysLeft: days };
}

function formatPublishDate(publishDate: string | null) {
  if (!publishDate) return null;
  try {
    return format(parseISO(publishDate), 'EEEE d MMMM yyyy', { locale: ar });
  } catch { return publishDate; }
}

export default function StaffMarketing() {
  const { permissions } = useStaffAuth();
  const staffId = permissions.staffId;
  const [designTasks, setDesignTasks] = useState<ContentTask[]>([]);
  const [publishTasks, setPublishTasks] = useState<ContentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (staffId) fetchTasks();
  }, [staffId]);

  const fetchTasks = async () => {
    setLoading(true);
    const [designRes, publishRes] = await Promise.all([
      supabase.from('content_calendar').select('*').eq('designer_id', staffId).order('publish_date') as any,
      supabase.from('content_calendar').select('*').eq('publisher_id', staffId).order('publish_date') as any,
    ]);
    setDesignTasks(designRes.data || []);
    setPublishTasks(publishRes.data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id);
    const { error } = await (supabase.from('content_calendar').update({ status: newStatus }).eq('id', id) as any);
    if (error) toast.error('فشل تحديث الحالة');
    else { toast.success('تم تحديث الحالة'); fetchTasks(); }
    setUpdating(null);
  };

  const updateDesignUrl = async (id: string, url: string) => {
    const { error } = await (supabase.from('content_calendar').update({ design_file_url: url }).eq('id', id) as any);
    if (error) toast.error('فشل الحفظ');
    else toast.success('تم حفظ رابط التصميم');
  };

  // Urgent tasks: need design but publish date is within 3 days or past
  const urgentDesignTasks = useMemo(() => {
    return designTasks.filter(t => {
      if (!['waiting_design', 'in_design', 'draft'].includes(t.status)) return false;
      const info = getUrgencyInfo(t.publish_date);
      return info.level === 'overdue' || info.level === 'today' || info.level === 'tomorrow' || info.level === 'soon';
    }).sort((a, b) => {
      const aInfo = getUrgencyInfo(a.publish_date);
      const bInfo = getUrgencyInfo(b.publish_date);
      return aInfo.daysLeft - bInfo.daysLeft;
    });
  }, [designTasks]);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const allTasks = [...designTasks, ...publishTasks];
  const uniqueIds = new Set<string>();
  const allUnique = allTasks.filter(t => {
    if (uniqueIds.has(t.id)) return false;
    uniqueIds.add(t.id);
    return true;
  });
  const completedRecently = allUnique.filter(t =>
    t.status === 'published' && new Date(t.updated_at) >= weekAgo
  );
  const inProgressCount = designTasks.filter(t => ['waiting_design', 'in_design'].includes(t.status)).length;
  const activePublishTasks = publishTasks.filter(t => ['design_done', 'ready'].includes(t.status));
  const awaitingPublish = activePublishTasks.length;
  const completedCount = completedRecently.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Date badge component
  const DateBadge = ({ publishDate, className }: { publishDate: string | null; className?: string }) => {
    if (!publishDate) return null;
    const urgency = getUrgencyInfo(publishDate);
    const formatted = formatPublishDate(publishDate);

    const urgencyStyles = {
      overdue: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
      today: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
      tomorrow: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
      soon: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
      normal: 'bg-muted/50 text-foreground border-border/50',
      none: '',
    };

    const urgencyIcons = {
      overdue: <Flame className="h-3.5 w-3.5 text-red-500 animate-pulse" />,
      today: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
      tomorrow: <Clock className="h-3.5 w-3.5 text-amber-500" />,
      soon: <Clock3 className="h-3.5 w-3.5 text-orange-500" />,
      normal: <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />,
      none: null,
    };

    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium",
        urgencyStyles[urgency.level],
        className
      )}>
        {urgencyIcons[urgency.level]}
        <span>{formatted}</span>
        {urgency.label && (
          <Badge variant="outline" className={cn(
            "text-[9px] px-1.5 py-0",
            urgency.level === 'overdue' && 'border-red-400 text-red-700 dark:text-red-300',
            urgency.level === 'today' && 'border-red-300 text-red-600 dark:text-red-300',
            urgency.level === 'tomorrow' && 'border-amber-300 text-amber-700 dark:text-amber-300',
            urgency.level === 'soon' && 'border-orange-300 text-orange-600 dark:text-orange-300',
          )}>
            {urgency.label}
          </Badge>
        )}
      </div>
    );
  };

  // Detail row helper
  const DetailRow = ({ icon: Icon, label, children, className }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={cn("flex items-start gap-2.5 py-2", className)}>
      <div className="flex items-center gap-1.5 min-w-[100px] shrink-0 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );

  const renderTaskCard = (task: ContentTask, role: 'designer' | 'publisher') => {
    const isDesigner = role === 'designer';
    const cardKey = `${task.id}-${role}`;
    const isExpanded = expandedCards.has(cardKey);
    const urgency = getUrgencyInfo(task.publish_date);

    const hasDesignText = !!task.design_text;
    const hasDesignNotes = !!task.design_notes;
    const hasPostText = !!task.post_text;
    const hasCta = !!task.cta;
    const hasHashtags = !!task.hashtags;
    const hasTime = !!task.publish_time;
    const hasContentType = !!task.content_type;
    const detailCount = [hasDesignText, hasDesignNotes, hasPostText, hasCta, hasHashtags].filter(Boolean).length;

    // Border color based on urgency for unfinished design tasks
    const isUrgentDesign = isDesigner && ['waiting_design', 'in_design', 'draft'].includes(task.status);
    const urgentBorderClass = isUrgentDesign ? {
      overdue: 'border-red-400 dark:border-red-700 shadow-red-100 dark:shadow-red-900/20 shadow-md',
      today: 'border-red-300 dark:border-red-800 shadow-red-50 dark:shadow-red-900/10 shadow-sm',
      tomorrow: 'border-amber-300 dark:border-amber-800',
      soon: 'border-orange-200 dark:border-orange-800',
      normal: 'border-border/60',
      none: 'border-border/60',
    }[urgency.level] : 'border-border/60';

    return (
      <Card key={cardKey} className={cn("group hover:shadow-md transition-all overflow-hidden", urgentBorderClass)}>
        <CardContent className="p-0">
          {/* Header strip */}
          <div className={cn(
            "h-1",
            isDesigner
              ? urgency.level === 'overdue' ? "bg-gradient-to-l from-red-400 to-red-600"
              : urgency.level === 'today' ? "bg-gradient-to-l from-red-300 to-red-500"
              : "bg-gradient-to-l from-purple-400 to-purple-600"
              : "bg-gradient-to-l from-emerald-400 to-emerald-600"
          )} />

          <div className="p-5">
            {/* Top row: title + status + action */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-semibold shrink-0',
                      isDesigner
                        ? 'border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:bg-purple-900/20'
                        : 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:bg-emerald-900/20'
                    )}
                  >
                    {isDesigner ? '🎨 مصمم' : '📢 ناشر'}
                  </Badge>
                  <h3 className="font-semibold text-sm">{task.title}</h3>
                  <Badge className={cn('text-[10px]', statusColors[task.status])}>
                    {statusLabels[task.status]}
                  </Badge>
                  {hasContentType && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {contentTypeLabels[task.content_type] || task.content_type}
                    </Badge>
                  )}
                </div>

                {/* Prominent publish date */}
                <DateBadge publishDate={task.publish_date} />

                {/* Quick meta line */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {hasTime && (
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      وقت النشر: {task.publish_time}
                    </span>
                  )}
                  {task.channels && task.channels.length > 0 && (
                    <div className="flex items-center gap-1">
                      {task.channels.map(ch => (
                        <span key={ch} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
                          {channelIcons[ch] || '📌'} {ch}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-1.5 min-w-[110px] items-stretch shrink-0">
                {isDesigner && task.status === 'waiting_design' && (
                  <Button size="sm" variant="outline" className="text-xs h-8" disabled={updating === task.id}
                    onClick={() => updateStatus(task.id, 'in_design')}>
                    {updating === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : '▶ بدء التصميم'}
                  </Button>
                )}
                {isDesigner && task.status === 'in_design' && (
                  <Button size="sm" className="text-xs h-8" disabled={updating === task.id}
                    onClick={() => updateStatus(task.id, 'design_done')}>
                    {updating === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : '✓ تم التصميم'}
                  </Button>
                )}
                {isDesigner && task.status === 'design_done' && (
                  <span className="text-xs text-center py-1.5 rounded-md bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    ✓ مكتمل
                  </span>
                )}
                {isDesigner && task.status === 'draft' && (
                  <span className="text-xs text-center py-1.5 text-muted-foreground">مسودة</span>
                )}
                {!isDesigner && (task.status === 'design_done' || task.status === 'ready') && (
                  <Button size="sm" className="text-xs h-8" disabled={updating === task.id}
                    onClick={() => updateStatus(task.id, 'published')}>
                    {updating === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : '✓ تم النشر'}
                  </Button>
                )}
                {!isDesigner && task.status === 'published' && (
                  <span className="text-xs text-center py-1.5 rounded-md bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    ✓ تم النشر
                  </span>
                )}
              </div>
            </div>

            {/* Expandable briefing section */}
            {detailCount > 0 && (
              <>
                <button
                  onClick={() => toggleExpand(cardKey)}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {isExpanded ? 'إخفاء التفاصيل' : `عرض ملخص المنشور (${detailCount} حقول)`}
                </button>

                {isExpanded && (
                  <div className="mt-3 rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/40 border-b border-border/40 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold">ملخص المنشور</span>
                    </div>

                    <div className="px-4 divide-y divide-border/30">
                      {hasDesignText && (
                        <DetailRow icon={Type} label="نص التصميم">
                          <div className="bg-background rounded-lg border border-border/40 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                            {task.design_text}
                          </div>
                        </DetailRow>
                      )}
                      {hasPostText && (
                        <DetailRow icon={MessageSquareText} label="نص المنشور">
                          <div className="bg-background rounded-lg border border-border/40 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                            {task.post_text}
                          </div>
                        </DetailRow>
                      )}
                      {hasDesignNotes && (
                        <DetailRow icon={FileText} label="ملاحظات التصميم">
                          <p className="text-xs text-muted-foreground leading-relaxed">{task.design_notes}</p>
                        </DetailRow>
                      )}
                      {hasCta && (
                        <DetailRow icon={MousePointerClick} label="CTA">
                          <Badge variant="outline" className="text-xs font-medium">{task.cta}</Badge>
                        </DetailRow>
                      )}
                      {hasHashtags && (
                        <DetailRow icon={Hash} label="الهاشتاقات">
                          <p className="text-xs text-muted-foreground leading-relaxed" dir="ltr">{task.hashtags}</p>
                        </DetailRow>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Design URL */}
            {isDesigner && task.status !== 'published' && (
              <div className="flex gap-2 items-center max-w-md mt-3">
                <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Input
                  placeholder="رابط التصميم (Figma, Drive...)"
                  defaultValue={task.design_file_url || ''}
                  dir="ltr"
                  className="h-8 text-xs"
                  onBlur={(e) => {
                    if (e.target.value !== (task.design_file_url || '')) {
                      updateDesignUrl(task.id, e.target.value);
                    }
                  }}
                />
              </div>
            )}

            {/* Design link for publisher */}
            {!isDesigner && task.design_file_url && (
              <a
                href={task.design_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-3"
              >
                <ExternalLink className="h-3 w-3" />
                عرض التصميم
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const activeDesignList = designTasks.filter(t => t.status !== 'published');
  const activePublishList = publishTasks.filter(t => ['design_done', 'ready'].includes(t.status));
  const hasNoTasks = activeDesignList.length === 0 && activePublishList.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          مهام التسويق
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">المهام المسندة إليك في تقويم المحتوى</p>
      </div>

      {/* Urgent tasks alert banner */}
      {urgentDesignTasks.length > 0 && (
        <Card className="border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-4 py-3 bg-red-100/60 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
              <div className="p-1.5 rounded-lg bg-red-200/80 dark:bg-red-800/50">
                <BellRing className="h-4 w-4 text-red-600 dark:text-red-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-800 dark:text-red-300">
                  ⚠️ مهام عاجلة تحتاج تصميم ({urgentDesignTasks.length})
                </h3>
                <p className="text-xs text-red-600 dark:text-red-400">
                  منشورات قارب موعد نشرها ولم يكتمل تصميمها بعد
                </p>
              </div>
            </div>
            <div className="divide-y divide-red-200/60 dark:divide-red-800/40">
              {urgentDesignTasks.map(task => {
                const urgency = getUrgencyInfo(task.publish_date);
                return (
                  <div key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {urgency.level === 'overdue' && <Flame className="h-4 w-4 text-red-500 shrink-0 animate-pulse" />}
                      {urgency.level === 'today' && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                      {urgency.level === 'tomorrow' && <Clock className="h-4 w-4 text-amber-500 shrink-0" />}
                      {urgency.level === 'soon' && <Clock3 className="h-4 w-4 text-orange-500 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPublishDate(task.publish_date)}
                          {task.publish_time && ` • ${task.publish_time}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={cn('text-[10px]', {
                        'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200': urgency.level === 'overdue' || urgency.level === 'today',
                        'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200': urgency.level === 'tomorrow',
                        'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200': urgency.level === 'soon',
                      })}>
                        {urgency.label}
                      </Badge>
                      <Badge className={cn('text-[10px]', statusColors[task.status])}>
                        {statusLabels[task.status]}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-orange-200/50 dark:border-orange-800/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/30">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">قيد التنفيذ</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200/50 dark:border-blue-800/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{awaitingPublish}</p>
              <p className="text-xs text-muted-foreground">بانتظار النشر</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200/50 dark:border-green-800/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">تم الإنجاز هذا الأسبوع</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {hasNoTasks && completedRecently.length === 0 && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Inbox className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold text-lg mb-1">لا توجد مهام حالياً</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              عندما يتم إسناد منشورات إليك كمصمم أو ناشر، ستظهر هنا
            </p>
          </CardContent>
        </Card>
      )}

      {/* Design Tasks */}
      {activeDesignList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-purple-600" />
            <h2 className="font-semibold text-base">مهام التصميم</h2>
            <Badge variant="secondary" className="text-xs">{activeDesignList.length}</Badge>
          </div>
          <div className="space-y-3">
            {activeDesignList.map(task => renderTaskCard(task, 'designer'))}
          </div>
        </div>
      )}

      {/* Publish Tasks */}
      {activePublishList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-emerald-600" />
            <h2 className="font-semibold text-base">مهام النشر</h2>
            <Badge variant="secondary" className="text-xs">{activePublishList.length}</Badge>
          </div>
          <div className="space-y-3">
            {activePublishList.map(task => renderTaskCard(task, 'publisher'))}
          </div>
        </div>
      )}

      {/* Completed recently */}
      {completedRecently.length > 0 && (
        <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
            <ChevronDown className={cn('h-4 w-4 transition-transform', completedOpen && 'rotate-180')} />
            <CheckCircle2 className="h-4 w-4" />
            <span>تم الإنجاز مؤخراً ({completedRecently.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            {completedRecently.map(task => {
              const isDesigner = designTasks.some(d => d.id === task.id);
              return renderTaskCard(task, isDesigner ? 'designer' : 'publisher');
            })}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
