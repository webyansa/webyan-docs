import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Loader2, Palette, Send, CheckCircle2, Clock, Megaphone,
  ExternalLink, ChevronDown, ChevronUp, Inbox, CalendarDays, Hash,
  Type, FileText, MousePointerClick, Image, MessageSquareText, Sparkles,
  Clock3, Globe, AlertTriangle, Flame, BellRing, LayoutGrid, List,
  ChevronRight, ChevronLeft, Eye, Layers, ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  differenceInDays, format, isToday, isTomorrow, isPast, parseISO,
  startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths
} from 'date-fns';
import { ar } from 'date-fns/locale';

// === Shared Config ===
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
  design: 'تصميم', ad: 'إعلان', tweet: 'تغريدة',
};
const channelIcons: Record<string, string> = {
  X: '𝕏', LinkedIn: '💼', Instagram: '📸', Website: '🌐', Email: '📧', WhatsApp: '💬',
};

interface ContentTask {
  id: string; title: string; status: string; channels: string[] | null;
  publish_date: string | null; publish_time: string | null;
  design_notes: string | null; design_text: string | null;
  design_status: string | null; post_text: string | null;
  design_file_url: string | null; hashtags: string | null;
  cta: string | null; updated_at: string; content_type: string;
  campaign?: { name: string } | null;
}

// Urgency helpers
function getUrgencyInfo(publishDate: string | null) {
  if (!publishDate) return { level: 'none' as const, label: '', daysLeft: Infinity };
  const date = parseISO(publishDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = differenceInDays(date, today);
  if (isPast(date) && !isToday(date)) return { level: 'overdue' as const, label: 'متأخر!', daysLeft: days };
  if (isToday(date)) return { level: 'today' as const, label: 'اليوم!', daysLeft: 0 };
  if (isTomorrow(date)) return { level: 'tomorrow' as const, label: 'غداً', daysLeft: 1 };
  if (days <= 3) return { level: 'soon' as const, label: `بعد ${days} أيام`, daysLeft: days };
  return { level: 'normal' as const, label: '', daysLeft: days };
}
function formatPublishDate(publishDate: string | null) {
  if (!publishDate) return null;
  try { return format(parseISO(publishDate), 'EEEE d MMMM yyyy', { locale: ar }); } catch { return publishDate; }
}

// === Main Component ===
export default function StaffMarketing() {
  const { permissions } = useStaffAuth();
  const staffId = permissions.staffId;

  // My tasks state
  const [designTasks, setDesignTasks] = useState<ContentTask[]>([]);
  const [publishTasks, setPublishTasks] = useState<ContentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Calendar state
  const [allContent, setAllContent] = useState<ContentTask[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarView, setCalendarView] = useState('table');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [detailItem, setDetailItem] = useState<ContentTask | null>(null);

  // Top-level tab
  const [mainTab, setMainTab] = useState('my-tasks');

  const toggleExpand = (key: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (staffId) { fetchTasks(); fetchAllContent(); }
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

  const fetchAllContent = async () => {
    setCalendarLoading(true);
    const { data } = await (supabase.from('content_calendar')
      .select('*, campaign:marketing_plan_campaigns(name)')
      .order('publish_date', { ascending: true }) as any);
    setAllContent(data || []);
    setCalendarLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id);
    const { error } = await (supabase.from('content_calendar').update({ status: newStatus }).eq('id', id) as any);
    if (error) toast.error('فشل تحديث الحالة');
    else { toast.success('تم تحديث الحالة'); fetchTasks(); fetchAllContent(); }
    setUpdating(null);
  };

  const updateDesignUrl = async (id: string, url: string) => {
    const { error } = await (supabase.from('content_calendar').update({ design_file_url: url }).eq('id', id) as any);
    if (error) toast.error('فشل الحفظ');
    else toast.success('تم حفظ رابط التصميم');
  };

  // Urgent tasks
  const urgentDesignTasks = useMemo(() => {
    return designTasks.filter(t => {
      if (!['waiting_design', 'in_design', 'draft'].includes(t.status)) return false;
      const info = getUrgencyInfo(t.publish_date);
      return info.level !== 'normal' && info.level !== 'none';
    }).sort((a, b) => getUrgencyInfo(a.publish_date).daysLeft - getUrgencyInfo(b.publish_date).daysLeft);
  }, [designTasks]);

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const allMyTasks = [...designTasks, ...publishTasks];
  const uniqueIds = new Set<string>();
  const allUnique = allMyTasks.filter(t => { if (uniqueIds.has(t.id)) return false; uniqueIds.add(t.id); return true; });
  const completedRecently = allUnique.filter(t => t.status === 'published' && new Date(t.updated_at) >= weekAgo);
  const inProgressCount = designTasks.filter(t => ['waiting_design', 'in_design'].includes(t.status)).length;
  const activePublishTasks = publishTasks.filter(t => ['design_done', 'ready'].includes(t.status));
  const awaitingPublish = activePublishTasks.length;
  const completedCount = completedRecently.length;

  // Calendar helpers
  const kanbanColumns = [
    { key: 'draft', label: 'مسودة', icon: '📝' },
    { key: 'waiting_design', label: 'بانتظار التصميم', icon: '🎨' },
    { key: 'in_design', label: 'قيد التصميم', icon: '⚙️' },
    { key: 'design_done', label: 'تم التصميم', icon: '✅' },
    { key: 'ready', label: 'جاهز للنشر', icon: '🚀' },
    { key: 'published', label: 'تم النشر', icon: '📢' },
  ];
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const padDays = (startDay + 1) % 7;
  const getItemsForDay = (day: Date) => allContent.filter(i => i.publish_date && isSameDay(parseISO(i.publish_date), day));

  // Calendar stats
  const calendarStats = useMemo(() => {
    const total = allContent.length;
    const published = allContent.filter(i => i.status === 'published').length;
    const pending = allContent.filter(i => !['published'].includes(i.status)).length;
    const thisMonth = allContent.filter(i => {
      if (!i.publish_date) return false;
      const d = parseISO(i.publish_date);
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    }).length;
    return { total, published, pending, thisMonth };
  }, [allContent]);

  if (loading && calendarLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // === Sub-components ===
  const DateBadge = ({ publishDate, className }: { publishDate: string | null; className?: string }) => {
    if (!publishDate) return null;
    const urgency = getUrgencyInfo(publishDate);
    const formatted = formatPublishDate(publishDate);
    const urgencyStyles: Record<string, string> = {
      overdue: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
      today: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
      tomorrow: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
      soon: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
      normal: 'bg-muted/50 text-foreground border-border/50',
      none: '',
    };
    const urgencyIcons: Record<string, React.ReactNode> = {
      overdue: <Flame className="h-3.5 w-3.5 text-red-500 animate-pulse" />,
      today: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
      tomorrow: <Clock className="h-3.5 w-3.5 text-amber-500" />,
      soon: <Clock3 className="h-3.5 w-3.5 text-orange-500" />,
      normal: <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />,
      none: null,
    };
    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium", urgencyStyles[urgency.level], className)}>
        {urgencyIcons[urgency.level]}
        <span>{formatted}</span>
        {urgency.label && (
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0",
            urgency.level === 'overdue' && 'border-red-400 text-red-700 dark:text-red-300',
            urgency.level === 'today' && 'border-red-300 text-red-600 dark:text-red-300',
            urgency.level === 'tomorrow' && 'border-amber-300 text-amber-700 dark:text-amber-300',
            urgency.level === 'soon' && 'border-orange-300 text-orange-600 dark:text-orange-300',
          )}>{urgency.label}</Badge>
        )}
      </div>
    );
  };

  const DetailRow = ({ icon: Icon, label, children, className }: {
    icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode; className?: string;
  }) => (
    <div className={cn("flex items-start gap-2.5 py-2.5", className)}>
      <div className="flex items-center gap-1.5 min-w-[100px] shrink-0 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /><span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );

  // === My Task Card ===
  const renderTaskCard = (task: ContentTask, role: 'designer' | 'publisher') => {
    const isDesigner = role === 'designer';
    const cardKey = `${task.id}-${role}`;
    const isExpanded = expandedCards.has(cardKey);
    const urgency = getUrgencyInfo(task.publish_date);
    const hasDesignText = !!task.design_text; const hasDesignNotes = !!task.design_notes;
    const hasPostText = !!task.post_text; const hasCta = !!task.cta; const hasHashtags = !!task.hashtags;
    const detailCount = [hasDesignText, hasDesignNotes, hasPostText, hasCta, hasHashtags].filter(Boolean).length;

    const isUrgentDesign = isDesigner && ['waiting_design', 'in_design', 'draft'].includes(task.status);
    const urgentBorderClass = isUrgentDesign ? ({
      overdue: 'border-red-400 dark:border-red-700 shadow-red-100 dark:shadow-red-900/20 shadow-md',
      today: 'border-red-300 dark:border-red-800 shadow-sm', tomorrow: 'border-amber-300 dark:border-amber-800',
      soon: 'border-orange-200 dark:border-orange-800', normal: 'border-border/60', none: 'border-border/60',
    }[urgency.level]) : 'border-border/60';

    return (
      <Card key={cardKey} className={cn("group hover:shadow-md transition-all overflow-hidden", urgentBorderClass)}>
        <CardContent className="p-0">
          <div className={cn("h-1", isDesigner
            ? urgency.level === 'overdue' ? "bg-gradient-to-l from-red-400 to-red-600"
            : urgency.level === 'today' ? "bg-gradient-to-l from-red-300 to-red-500"
            : "bg-gradient-to-l from-purple-400 to-purple-600"
            : "bg-gradient-to-l from-emerald-400 to-emerald-600"
          )} />
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn('text-[10px] font-semibold shrink-0', isDesigner
                    ? 'border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:bg-purple-900/20'
                    : 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:bg-emerald-900/20'
                  )}>{isDesigner ? '🎨 مصمم' : '📢 ناشر'}</Badge>
                  <h3 className="font-semibold text-sm">{task.title}</h3>
                  <Badge className={cn('text-[10px]', statusColors[task.status])}>{statusLabels[task.status]}</Badge>
                  {task.content_type && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {contentTypeLabels[task.content_type] || task.content_type}
                    </Badge>
                  )}
                </div>
                <DateBadge publishDate={task.publish_date} />
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {task.publish_time && <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />وقت النشر: {task.publish_time}</span>}
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
                  <span className="text-xs text-center py-1.5 rounded-md bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">✓ مكتمل</span>
                )}
                {isDesigner && task.status === 'draft' && (
                  <span className="text-xs text-center py-1.5 text-muted-foreground">مسودة</span>
                )}
                {!isDesigner && ['design_done', 'ready'].includes(task.status) && (
                  <Button size="sm" className="text-xs h-8" disabled={updating === task.id}
                    onClick={() => updateStatus(task.id, 'published')}>
                    {updating === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : '✓ تم النشر'}
                  </Button>
                )}
                {!isDesigner && task.status === 'published' && (
                  <span className="text-xs text-center py-1.5 rounded-md bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">✓ تم النشر</span>
                )}
              </div>
            </div>

            {detailCount > 0 && (
              <>
                <button onClick={() => toggleExpand(cardKey)}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {isExpanded ? 'إخفاء التفاصيل' : `عرض ملخص المنشور (${detailCount} حقول)`}
                </button>
                {isExpanded && (
                  <div className="mt-3 rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/40 border-b border-border/40 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /><span className="text-xs font-semibold">ملخص المنشور</span>
                    </div>
                    <div className="px-4 divide-y divide-border/30">
                      {hasDesignText && <DetailRow icon={Type} label="نص التصميم"><div className="bg-background rounded-lg border border-border/40 p-3 text-xs leading-relaxed whitespace-pre-wrap">{task.design_text}</div></DetailRow>}
                      {hasPostText && <DetailRow icon={MessageSquareText} label="نص المنشور"><div className="bg-background rounded-lg border border-border/40 p-3 text-xs leading-relaxed whitespace-pre-wrap">{task.post_text}</div></DetailRow>}
                      {hasDesignNotes && <DetailRow icon={FileText} label="ملاحظات التصميم"><p className="text-xs text-muted-foreground leading-relaxed">{task.design_notes}</p></DetailRow>}
                      {hasCta && <DetailRow icon={MousePointerClick} label="CTA"><Badge variant="outline" className="text-xs font-medium">{task.cta}</Badge></DetailRow>}
                      {hasHashtags && <DetailRow icon={Hash} label="الهاشتاقات"><p className="text-xs text-muted-foreground leading-relaxed" dir="ltr">{task.hashtags}</p></DetailRow>}
                    </div>
                  </div>
                )}
              </>
            )}

            {isDesigner && task.status !== 'published' && (
              <div className="flex gap-2 items-center max-w-md mt-3">
                <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Input placeholder="رابط التصميم (Figma, Drive...)" defaultValue={task.design_file_url || ''} dir="ltr" className="h-8 text-xs"
                  onBlur={(e) => { if (e.target.value !== (task.design_file_url || '')) updateDesignUrl(task.id, e.target.value); }} />
              </div>
            )}
            {!isDesigner && task.design_file_url && (
              <a href={task.design_file_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-3">
                <ExternalLink className="h-3 w-3" />عرض التصميم
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

  // === Content Detail Dialog ===
  const ContentDetailDialog = () => {
    if (!detailItem) return null;
    const item = detailItem;
    const urgency = getUrgencyInfo(item.publish_date);

    return (
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base">{item.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Status & meta */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn('text-xs', statusColors[item.status])}>{statusLabels[item.status]}</Badge>
              <Badge variant="outline" className="text-xs">{contentTypeLabels[item.content_type] || item.content_type}</Badge>
              {item.campaign?.name && <Badge variant="secondary" className="text-xs">📢 {item.campaign.name}</Badge>}
            </div>

            <DateBadge publishDate={item.publish_date} />

            {item.publish_time && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="h-4 w-4" /><span>وقت النشر: {item.publish_time}</span>
              </div>
            )}

            {item.channels && item.channels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.channels.map(ch => (
                  <Badge key={ch} variant="secondary" className="text-xs gap-1">
                    {channelIcons[ch] || '📌'} {ch}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />

            {/* Content fields */}
            <div className="space-y-1 divide-y divide-border/30">
              {item.design_text && (
                <DetailRow icon={Type} label="نص التصميم">
                  <div className="bg-muted/30 rounded-lg border border-border/40 p-3 text-xs leading-relaxed whitespace-pre-wrap">{item.design_text}</div>
                </DetailRow>
              )}
              {item.post_text && (
                <DetailRow icon={MessageSquareText} label="نص المنشور">
                  <div className="bg-muted/30 rounded-lg border border-border/40 p-3 text-xs leading-relaxed whitespace-pre-wrap">{item.post_text}</div>
                </DetailRow>
              )}
              {item.design_notes && (
                <DetailRow icon={FileText} label="ملاحظات التصميم">
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.design_notes}</p>
                </DetailRow>
              )}
              {item.cta && (
                <DetailRow icon={MousePointerClick} label="CTA">
                  <Badge variant="outline" className="text-xs">{item.cta}</Badge>
                </DetailRow>
              )}
              {item.hashtags && (
                <DetailRow icon={Hash} label="الهاشتاقات">
                  <p className="text-xs text-muted-foreground" dir="ltr">{item.hashtags}</p>
                </DetailRow>
              )}
              {item.design_file_url && (
                <DetailRow icon={Image} label="رابط التصميم">
                  <a href={item.design_file_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />{item.design_file_url}
                  </a>
                </DetailRow>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10"><Megaphone className="h-6 w-6 text-primary" /></div>
          إدارة التسويق
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">مهامك وتقويم النشر الكامل</p>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="my-tasks" className="gap-2">
            <ClipboardList className="h-4 w-4" />مهامي
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-4 w-4" />تقويم النشر
          </TabsTrigger>
        </TabsList>

        {/* ============ MY TASKS TAB ============ */}
        <TabsContent value="my-tasks" className="space-y-6 mt-4">
          {/* Urgent banner */}
          {urgentDesignTasks.length > 0 && (
            <Card className="border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 px-4 py-3 bg-red-100/60 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
                  <div className="p-1.5 rounded-lg bg-red-200/80 dark:bg-red-800/50">
                    <BellRing className="h-4 w-4 text-red-600 dark:text-red-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-red-800 dark:text-red-300">⚠️ مهام عاجلة ({urgentDesignTasks.length})</h3>
                    <p className="text-xs text-red-600 dark:text-red-400">منشورات قارب موعد نشرها ولم يكتمل تصميمها</p>
                  </div>
                </div>
                <div className="divide-y divide-red-200/60 dark:divide-red-800/40">
                  {urgentDesignTasks.map(task => {
                    const urg = getUrgencyInfo(task.publish_date);
                    return (
                      <div key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {urg.level === 'overdue' && <Flame className="h-4 w-4 text-red-500 shrink-0 animate-pulse" />}
                          {urg.level === 'today' && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                          {urg.level === 'tomorrow' && <Clock className="h-4 w-4 text-amber-500 shrink-0" />}
                          {urg.level === 'soon' && <Clock3 className="h-4 w-4 text-orange-500 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            <p className="text-xs text-muted-foreground">{formatPublishDate(task.publish_date)}{task.publish_time && ` • ${task.publish_time}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={cn('text-[10px]', {
                            'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200': urg.level === 'overdue' || urg.level === 'today',
                            'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200': urg.level === 'tomorrow',
                            'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200': urg.level === 'soon',
                          })}>{urg.label}</Badge>
                          <Badge className={cn('text-[10px]', statusColors[task.status])}>{statusLabels[task.status]}</Badge>
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
                <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/30"><Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" /></div>
                <div><p className="text-2xl font-bold">{inProgressCount}</p><p className="text-xs text-muted-foreground">قيد التنفيذ</p></div>
              </CardContent>
            </Card>
            <Card className="border-blue-200/50 dark:border-blue-800/30">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30"><Send className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
                <div><p className="text-2xl font-bold">{awaitingPublish}</p><p className="text-xs text-muted-foreground">بانتظار النشر</p></div>
              </CardContent>
            </Card>
            <Card className="border-green-200/50 dark:border-green-800/30">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/30"><CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
                <div><p className="text-2xl font-bold">{completedCount}</p><p className="text-xs text-muted-foreground">تم الإنجاز هذا الأسبوع</p></div>
              </CardContent>
            </Card>
          </div>

          {/* Empty */}
          {hasNoTasks && completedRecently.length === 0 && (
            <Card><CardContent className="py-16 flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4"><Inbox className="h-10 w-10 text-muted-foreground/50" /></div>
              <h3 className="font-semibold text-lg mb-1">لا توجد مهام حالياً</h3>
              <p className="text-sm text-muted-foreground max-w-sm">عندما يتم إسناد منشورات إليك كمصمم أو ناشر، ستظهر هنا</p>
            </CardContent></Card>
          )}

          {/* Design Tasks */}
          {activeDesignList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-purple-600" /><h2 className="font-semibold text-base">مهام التصميم</h2>
                <Badge variant="secondary" className="text-xs">{activeDesignList.length}</Badge>
              </div>
              <div className="space-y-3">{activeDesignList.map(task => renderTaskCard(task, 'designer'))}</div>
            </div>
          )}

          {/* Publish Tasks */}
          {activePublishList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-emerald-600" /><h2 className="font-semibold text-base">مهام النشر</h2>
                <Badge variant="secondary" className="text-xs">{activePublishList.length}</Badge>
              </div>
              <div className="space-y-3">{activePublishList.map(task => renderTaskCard(task, 'publisher'))}</div>
            </div>
          )}

          {/* Completed recently */}
          {completedRecently.length > 0 && (
            <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
                <ChevronDown className={cn('h-4 w-4 transition-transform', completedOpen && 'rotate-180')} />
                <CheckCircle2 className="h-4 w-4" /><span>تم الإنجاز مؤخراً ({completedRecently.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                {completedRecently.map(task => {
                  const isDesigner = designTasks.some(d => d.id === task.id);
                  return renderTaskCard(task, isDesigner ? 'designer' : 'publisher');
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </TabsContent>

        {/* ============ CONTENT CALENDAR TAB ============ */}
        <TabsContent value="calendar" className="space-y-6 mt-4">
          {/* Calendar Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Layers className="h-4 w-4 text-primary" /></div>
                <div><p className="text-xl font-bold">{calendarStats.total}</p><p className="text-[11px] text-muted-foreground">إجمالي المحتوى</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"><CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" /></div>
                <div><p className="text-xl font-bold">{calendarStats.published}</p><p className="text-[11px] text-muted-foreground">تم نشره</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
                <div><p className="text-xl font-bold">{calendarStats.pending}</p><p className="text-[11px] text-muted-foreground">قيد الانتظار</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30"><CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" /></div>
                <div><p className="text-xl font-bold">{calendarStats.thisMonth}</p><p className="text-[11px] text-muted-foreground">هذا الشهر</p></div>
              </CardContent>
            </Card>
          </div>

          {/* View Switcher */}
          <Tabs value={calendarView} onValueChange={setCalendarView}>
            <TabsList>
              <TabsTrigger value="table" className="gap-2"><List className="h-4 w-4" />جدول</TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2"><CalendarDays className="h-4 w-4" />تقويم</TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2"><LayoutGrid className="h-4 w-4" />كانبان</TabsTrigger>
            </TabsList>

            {/* === TABLE VIEW === */}
            <TabsContent value="table" className="mt-4">
              {calendarLoading ? (
                <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>العنوان</TableHead>
                          <TableHead>النوع</TableHead>
                          <TableHead>تاريخ النشر</TableHead>
                          <TableHead>القنوات</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allContent.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">لا يوجد محتوى في الخطة</TableCell></TableRow>
                        ) : allContent.map((item, idx) => {
                          const urgency = getUrgencyInfo(item.publish_date);
                          const isMyTask = designTasks.some(d => d.id === item.id) || publishTasks.some(p => p.id === item.id);
                          return (
                            <TableRow key={item.id} className={cn(
                              "cursor-pointer hover:bg-muted/50 transition-colors",
                              isMyTask && "bg-primary/[0.03]",
                              urgency.level === 'overdue' && item.status !== 'published' && "bg-red-50/50 dark:bg-red-950/10",
                            )} onClick={() => setDetailItem(item)}>
                              <TableCell className="text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {isMyTask && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                                  <span className="font-medium text-sm">{item.title}</span>
                                </div>
                              </TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px]">{contentTypeLabels[item.content_type] || item.content_type}</Badge></TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm">
                                  {urgency.level !== 'none' && urgency.level !== 'normal' && item.status !== 'published' && (
                                    urgency.level === 'overdue' ? <Flame className="h-3 w-3 text-red-500" /> :
                                    urgency.level === 'today' ? <AlertTriangle className="h-3 w-3 text-red-500" /> :
                                    <Clock3 className="h-3 w-3 text-amber-500" />
                                  )}
                                  <span className={cn(
                                    urgency.level === 'overdue' && item.status !== 'published' && 'text-red-600 font-medium',
                                    urgency.level === 'today' && item.status !== 'published' && 'text-red-600 font-medium',
                                  )}>
                                    {item.publish_date ? format(parseISO(item.publish_date), 'd MMM', { locale: ar }) : '—'}
                                  </span>
                                  {item.publish_time && <span className="text-muted-foreground text-xs">{item.publish_time}</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {item.channels?.map(ch => (
                                    <span key={ch} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
                                      {channelIcons[ch] || '📌'} {ch}
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell><Badge className={cn('text-[10px]', statusColors[item.status])}>{statusLabels[item.status]}</Badge></TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setDetailItem(item); }}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* === CALENDAR VIEW === */}
            <TabsContent value="calendar" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    <h3 className="font-semibold text-lg">{format(calendarMonth, 'MMMM yyyy', { locale: ar })}</h3>
                    <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                    {['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'].map(d => (
                      <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
                    ))}
                    {Array.from({ length: padDays }).map((_, i) => (
                      <div key={`pad-${i}`} className="bg-background p-2 min-h-[90px]" />
                    ))}
                    {daysInMonth.map(day => {
                      const dayItems = getItemsForDay(day);
                      return (
                        <div key={day.toISOString()} className={cn("bg-background p-1.5 min-h-[90px] border-t", isToday(day) && "bg-primary/5 ring-1 ring-primary/20")}>
                          <div className={cn("text-xs font-medium mb-1 text-center", isToday(day) ? "text-primary font-bold bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center mx-auto" : "text-muted-foreground")}>
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-0.5">
                            {dayItems.slice(0, 3).map(item => {
                              const isMyTask = designTasks.some(d => d.id === item.id) || publishTasks.some(p => p.id === item.id);
                              return (
                                <div key={item.id}
                                  className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded cursor-pointer truncate transition-colors",
                                    statusColors[item.status],
                                    isMyTask && "ring-1 ring-primary/40 font-semibold"
                                  )}
                                  title={item.title}
                                  onClick={() => setDetailItem(item)}
                                >
                                  {item.title}
                                </div>
                              );
                            })}
                            {dayItems.length > 3 && (
                              <div className="text-[10px] text-muted-foreground text-center">+{dayItems.length - 3} أخرى</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground justify-center flex-wrap">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> مهامي</span>
                    {kanbanColumns.slice(0, -1).map(col => (
                      <span key={col.key} className="flex items-center gap-1">
                        <div className={cn("w-2 h-2 rounded-full", statusColors[col.key].split(' ')[0])} />{col.label}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* === KANBAN VIEW === */}
            <TabsContent value="kanban" className="mt-4">
              {calendarLoading ? (
                <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {kanbanColumns.map(col => {
                    const colItems = allContent.filter(i => i.status === col.key);
                    return (
                      <div key={col.key} className="min-w-[240px] flex-1">
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <span className="text-sm">{col.icon}</span>
                          <Badge className={cn('text-xs', statusColors[col.key])}>{col.label}</Badge>
                          <span className="text-xs text-muted-foreground font-mono">({colItems.length})</span>
                        </div>
                        <div className="space-y-2">
                          {colItems.length === 0 && (
                            <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-lg">فارغ</div>
                          )}
                          {colItems.map(item => {
                            const isMyTask = designTasks.some(d => d.id === item.id) || publishTasks.some(p => p.id === item.id);
                            const urgency = getUrgencyInfo(item.publish_date);
                            return (
                              <Card key={item.id}
                                className={cn(
                                  "cursor-pointer hover:shadow-md transition-all",
                                  isMyTask && "ring-1 ring-primary/30 bg-primary/[0.02]",
                                  urgency.level === 'overdue' && item.status !== 'published' && 'border-red-300 dark:border-red-800',
                                )}
                                onClick={() => setDetailItem(item)}
                              >
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-start justify-between gap-1">
                                    <p className="font-medium text-sm leading-tight">{item.title}</p>
                                    {isMyTask && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                                  </div>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <Badge variant="outline" className="text-[10px]">{contentTypeLabels[item.content_type] || item.content_type}</Badge>
                                    {item.channels?.slice(0, 3).map(ch => (
                                      <span key={ch} className="text-[10px] px-1 py-0.5 rounded bg-muted">{channelIcons[ch] || ch}</span>
                                    ))}
                                  </div>
                                  {item.publish_date && (
                                    <div className={cn(
                                      "text-[11px] flex items-center gap-1",
                                      urgency.level === 'overdue' && item.status !== 'published' ? 'text-red-600 font-medium' : 'text-muted-foreground'
                                    )}>
                                      {urgency.level === 'overdue' && item.status !== 'published' && <Flame className="h-3 w-3" />}
                                      📅 {format(parseISO(item.publish_date), 'd MMM', { locale: ar })}
                                      {item.publish_time && ` · ${item.publish_time}`}
                                    </div>
                                  )}
                                  {item.campaign?.name && (
                                    <div className="text-[10px] text-muted-foreground truncate">📢 {item.campaign.name}</div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <ContentDetailDialog />
    </div>
  );
}
