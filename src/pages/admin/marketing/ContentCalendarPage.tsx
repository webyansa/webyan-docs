import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Plus, CalendarIcon, Edit, Trash2, LayoutGrid, CalendarDays, List, ChevronRight, ChevronLeft, Sparkles, RefreshCw, Loader2, Wand2, CheckCircle2, BrainCircuit } from 'lucide-react';
import { toast } from 'sonner';

const contentTypeLabels: Record<string, string> = { design: 'تصميم', video: 'فيديو', article: 'مقال', ad: 'إعلان', tweet: 'تغريدة' };
const designStatusLabels: Record<string, string> = { draft: 'مسودة', in_progress: 'قيد التنفيذ', ready: 'جاهز', approved: 'معتمد' };
const statusLabels: Record<string, string> = { draft: 'مسودة', waiting_design: 'بانتظار التصميم', in_design: 'قيد التصميم', design_done: 'تم التصميم', ready: 'جاهز للنشر', published: 'تم النشر' };
const statusColors: Record<string, string> = { draft: 'bg-gray-100 text-gray-800', waiting_design: 'bg-purple-100 text-purple-800', in_design: 'bg-orange-100 text-orange-800', design_done: 'bg-cyan-100 text-cyan-800', ready: 'bg-blue-100 text-blue-800', published: 'bg-green-100 text-green-800' };

const ALL_CHANNELS = ['X', 'LinkedIn', 'Instagram', 'Website', 'Email', 'WhatsApp', 'أخرى'];

const platformToContentType: Record<string, string> = { x: 'tweet', linkedin: 'article', instagram: 'design', website: 'article' };
const platformToChannel: Record<string, string> = { x: 'X', linkedin: 'LinkedIn', instagram: 'Instagram', website: 'Website' };

interface ContentForm {
  campaign_id: string;
  title: string;
  content_type: string;
  publish_date: Date | undefined;
  publish_time: string;
  post_text: string;
  hashtags: string;
  cta: string;
  design_file_url: string;
  design_text: string;
  design_notes: string;
  design_status: string;
  channels: string[];
  status: string;
  designer_id: string;
  publisher_id: string;
}

interface AIForm {
  idea: string;
  platform: string;
  tone: string;
  audience: string;
  key_message: string;
  cta: string;
  landing_url: string;
}

const emptyForm: ContentForm = {
  campaign_id: '', title: '', content_type: 'design', publish_date: undefined,
  publish_time: '', post_text: '', hashtags: '', cta: '', design_file_url: '',
  design_text: '', design_notes: '', design_status: 'draft', channels: [], status: 'draft',
  designer_id: '', publisher_id: '',
};

const emptyAIForm: AIForm = {
  idea: '', platform: 'X', tone: 'رسمي', audience: 'جمعيات أهلية', key_message: '', cta: 'تعرف أكثر', landing_url: 'https://webyan.sa',
};

export default function ContentCalendarPage() {
  const [searchParams] = useSearchParams();
  const initialCampaign = searchParams.get('campaign') || '';
  const [items, setItems] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContentForm>({ ...emptyForm, campaign_id: initialCampaign });
  const [filterCampaign, setFilterCampaign] = useState(initialCampaign);
  const [viewTab, setViewTab] = useState('board');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // AI state
  const [aiForm, setAIForm] = useState<AIForm>({ ...emptyAIForm });
  const [aiLoading, setAILoading] = useState(false);
  const [aiRefiningField, setAIRefiningField] = useState<string | null>(null);
  const [lastAIResult, setLastAIResult] = useState<any>(null);
  const [showAISection, setShowAISection] = useState(false);

  // Monthly Plan state
  const [monthlyPlanOpen, setMonthlyPlanOpen] = useState(false);
  const [monthlyPlanLoading, setMonthlyPlanLoading] = useState(false);
  const [monthlyPlanDirective, setMonthlyPlanDirective] = useState('');
  const [monthlyPlanCount, setMonthlyPlanCount] = useState(12);
  const [monthlyPlanAudience, setMonthlyPlanAudience] = useState('جمعيات أهلية وكيانات غير ربحية');
  const [monthlyPlanPlatforms, setMonthlyPlanPlatforms] = useState<string[]>(['X', 'LinkedIn', 'Instagram', 'WhatsApp']);
  const [monthlyPlanLanding, setMonthlyPlanLanding] = useState('https://webyan.sa');
  const [monthlyPlanResult, setMonthlyPlanResult] = useState<any>(null);
  const [monthlyPlanDateMode, setMonthlyPlanDateMode] = useState<'month' | 'range'>('month');
  const [monthlyPlanMonth, setMonthlyPlanMonth] = useState(() => format(addMonths(new Date(), 0), 'yyyy-MM'));
  const [monthlyPlanStartDate, setMonthlyPlanStartDate] = useState('');
  const [monthlyPlanEndDate, setMonthlyPlanEndDate] = useState('');
  const [marketingStaff, setMarketingStaff] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [itemsRes, campsRes, staffRes] = await Promise.all([
      supabase.from('content_calendar').select('*, campaign:marketing_plan_campaigns(name)').order('publish_date', { ascending: true }) as any,
      supabase.from('marketing_plan_campaigns').select('id, name').order('name') as any,
      supabase.from('staff_members').select('id, full_name').eq('is_active', true) as any,
    ]);
    setItems(itemsRes.data || []);
    setCampaigns(campsRes.data || []);
    setMarketingStaff(staffRes.data || []);
    setLoading(false);
  };

  const filteredItems = useMemo(() => {
    if (!filterCampaign) return items;
    return items.filter((i: any) => i.campaign_id === filterCampaign);
  }, [items, filterCampaign]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, campaign_id: filterCampaign });
    setAIForm({ ...emptyAIForm });
    setLastAIResult(null);
    setShowAISection(false);
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      campaign_id: item.campaign_id || '', title: item.title, content_type: item.content_type,
      publish_date: item.publish_date ? new Date(item.publish_date) : undefined,
      publish_time: item.publish_time || '', post_text: item.post_text || '',
      hashtags: item.hashtags || '', cta: item.cta || '', design_file_url: item.design_file_url || '',
      design_text: item.design_text || '', design_notes: item.design_notes || '', design_status: item.design_status || 'draft',
      channels: item.channels || [], status: item.status,
      designer_id: item.designer_id || '', publisher_id: item.publisher_id || '',
    });
    setAIForm({ ...emptyAIForm });
    setLastAIResult(null);
    setShowAISection(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('عنوان المنشور مطلوب'); return; }
    const payload: any = {
      campaign_id: form.campaign_id || null, title: form.title, content_type: form.content_type,
      publish_date: form.publish_date ? format(form.publish_date, 'yyyy-MM-dd') : null,
      publish_time: form.publish_time || null, post_text: form.post_text || null,
      hashtags: form.hashtags || null, cta: form.cta || null,
      design_file_url: form.design_file_url || null, design_text: form.design_text || null,
      design_notes: form.design_notes || null,
      design_status: form.design_status, channels: form.channels, status: form.status,
      designer_id: form.designer_id || null, publisher_id: form.publisher_id || null,
    };
    if (editingId) {
      const { error } = await (supabase.from('content_calendar').update(payload).eq('id', editingId) as any);
      if (error) { toast.error('فشل التحديث'); return; }
      toast.success('تم التحديث');
    } else {
      const { data: newContent, error } = await (supabase.from('content_calendar').insert(payload).select('id').single() as any);
      if (error) { toast.error('فشل الإنشاء'); return; }
      toast.success('تم الإنشاء');
      if (lastAIResult && newContent?.id) {
        await (supabase.from('ai_generations' as any).update({ content_id: newContent.id }).is('content_id', null).order('created_at', { ascending: false }).limit(1) as any);
      }
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا المحتوى؟')) return;
    await (supabase.from('content_calendar').delete().eq('id', id) as any);
    toast.success('تم الحذف');
    fetchData();
  };

  const toggleChannel = (ch: string) => {
    setForm(prev => ({
      ...prev,
      channels: prev.channels.includes(ch) ? prev.channels.filter(c => c !== ch) : [...prev.channels, ch],
    }));
  };

  // AI Generation
  const handleAIGenerate = async () => {
    if (!aiForm.idea.trim()) {
      toast.error('يرجى كتابة وصف فكرة المحتوى');
      return;
    }

    setAILoading(true);

    try {
      const payload = {
        product: 'Webyan',
        platform: aiForm.platform,
        tone: aiForm.tone,
        content_type: form.content_type || 'Post',
        audience: aiForm.audience,
        key_message: aiForm.key_message,
        cta: aiForm.cta,
        landing_url: aiForm.landing_url,
        demos: { plus: 'https://Plus.webyan.sa', basic: 'https://basic.webyan.sa' },
        constraints: { max_hashtags: 3, no_exaggeration: true, avoid_words: ['الأفضل', 'مضمون 100%', 'حل سحري', 'خرافي'], x_max_chars: 280 },
        idea: aiForm.idea,
      };

      const { data, error } = await supabase.functions.invoke('ai-generate-content', { body: payload });

      if (error) throw error;
      if (!data) { toast.error('لم يتم استلام رد من الخادم'); return; }
      if (data?.error) { toast.error(data.error); return; }

      console.log('AI Response:', JSON.stringify(data, null, 2));
      setLastAIResult(data);

      // Map AI response to form fields - handle both nested and flat schemas
      const primaryText = data.post_copy?.primary_text || data.primary_text || data.content || '';
      const headline = data.design_copy?.headline || data.headline || '';
      const subheadline = data.design_copy?.subheadline || data.subheadline || '';
      const ctaText = data.design_copy?.cta_text || data.CTA || data.cta_text || '';
      const hashtags = data.post_copy?.hashtags || data.hashtags || [];
      const aiTitle = data.title || headline || '';

      setForm(prev => ({
        ...prev,
        title: aiTitle || prev.title,
        post_text: primaryText || prev.post_text,
        cta: ctaText || prev.cta,
        hashtags: (Array.isArray(hashtags) ? hashtags : []).join(' '),
        design_text: [headline, subheadline].filter(Boolean).join('\n') || prev.design_text,
        design_notes: ctaText ? `CTA: ${ctaText}` : prev.design_notes,
        channels: prev.channels.length === 0 ? [aiForm.platform] : prev.channels,
      }));

      // Show compliance info
      const compliance = data.meta?.compliance;
      if (compliance && !compliance.within_char_limit) {
        toast.warning('⚠️ النص يتجاوز الحد المسموح للمنصة');
      }
      if (compliance && !compliance.used_file_search) {
        toast.warning('⚠️ لم يتم استخدام file_search - قد لا يكون المحتوى مبنياً على ملفات المعرفة');
      }

      toast.success('تم توليد المحتوى بنجاح ✨');
    } catch (err: any) {
      console.error('AI generation error:', err);
      toast.error(err.message || 'فشل توليد المحتوى');
    } finally {
      setAILoading(false);
    }
  };

  // Monthly Plan Generation
  const handleMonthlyPlanGenerate = async () => {
    if (!monthlyPlanDirective.trim()) {
      toast.error('يرجى كتابة التوجيه الرئيسي للخطة');
      return;
    }

    setMonthlyPlanLoading(true);
    setMonthlyPlanResult(null);

    try {
      const payload: any = {
        action: 'monthly_plan',
        directive: monthlyPlanDirective,
        post_count: monthlyPlanCount,
        audience: monthlyPlanAudience,
        platforms: monthlyPlanPlatforms,
        landing_url: monthlyPlanLanding,
        campaign_id: filterCampaign || null,
        auto_save: true,
      };

      if (monthlyPlanDateMode === 'range' && monthlyPlanStartDate && monthlyPlanEndDate) {
        payload.start_date = monthlyPlanStartDate;
        payload.end_date = monthlyPlanEndDate;
      } else {
        payload.target_month = monthlyPlanMonth;
      }

      const { data, error } = await supabase.functions.invoke('ai-generate-content', { body: payload });

      if (error) throw error;
      if (!data) { toast.error('لم يتم استلام رد'); return; }
      if (data?.error) { toast.error(data.error); return; }

      setMonthlyPlanResult(data);
      toast.success(`تم إنشاء ${data.saved_count || data.posts_count} منشور بنجاح! ✨`);
      fetchData();
    } catch (err: any) {
      console.error('Monthly plan error:', err);
      toast.error(err.message || 'فشل إنشاء الخطة');
    } finally {
      setMonthlyPlanLoading(false);
    }
  };

  const toggleMonthlyPlatform = (p: string) => {
    setMonthlyPlanPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  // Validation
  const handleValidate = () => {
    const issues: string[] = [];
    const platformLimits: Record<string, number> = { X: 280, LinkedIn: 1200, Instagram: 2200, WhatsApp: 1000 };
    const limit = platformLimits[aiForm.platform] || 280;
    if (form.post_text && form.post_text.length > limit) {
      issues.push(`نص المنشور يتجاوز الحد (${form.post_text.length}/${limit})`);
    }
    const banned = ['الأفضل', 'مضمون 100%', 'حل سحري', 'خرافي'];
    const found = banned.filter(w => form.post_text?.includes(w));
    if (found.length) issues.push(`كلمات ممنوعة: ${found.join('، ')}`);
    if (!form.post_text?.includes('https://')) issues.push('لا يوجد رابط في النص');
    
    if (issues.length === 0) {
      toast.success('✅ المحتوى يجتاز جميع الفحوصات');
    } else {
      issues.forEach(i => toast.warning(i));
    }
  };

  // Kanban columns
  const kanbanColumns = [
    { key: 'draft', label: 'مسودة' },
    { key: 'waiting_design', label: 'بانتظار التصميم' },
    { key: 'in_design', label: 'قيد التصميم' },
    { key: 'design_done', label: 'تم التصميم' },
    { key: 'ready', label: 'جاهز للنشر' },
    { key: 'published', label: 'تم النشر' },
  ];

  // Calendar view
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const padDays = (startDay + 1) % 7;

  const getItemsForDay = (day: Date) => filteredItems.filter((i: any) => i.publish_date && isSameDay(new Date(i.publish_date), day));

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" />
            تقويم المحتوى
          </h1>
          <p className="text-muted-foreground mt-1">إدارة وجدولة المحتوى التسويقي</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterCampaign || 'all'} onValueChange={v => setFilterCampaign(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="كل الحملات" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحملات</SelectItem>
              {campaigns.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setMonthlyPlanResult(null); setMonthlyPlanDirective(''); setMonthlyPlanOpen(true); }} className="gap-2">
            <BrainCircuit className="h-4 w-4" />
            خطة شهرية بالذكاء الاصطناعي
          </Button>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> محتوى جديد</Button>
        </div>
      </div>

      <Tabs value={viewTab} onValueChange={setViewTab}>
        <TabsList>
          <TabsTrigger value="board" className="gap-2"><LayoutGrid className="h-4 w-4" /> كانبان</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2"><CalendarDays className="h-4 w-4" /> تقويم</TabsTrigger>
          <TabsTrigger value="table" className="gap-2"><List className="h-4 w-4" /> جدول</TabsTrigger>
        </TabsList>

        {/* Kanban Board */}
        <TabsContent value="board">
          {loading ? <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div> : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {kanbanColumns.map(col => {
                const colItems = filteredItems.filter((i: any) => i.status === col.key);
                return (
                  <div key={col.key} className="min-w-[260px] flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={cn('text-xs', statusColors[col.key])}>{col.label}</Badge>
                      <span className="text-xs text-muted-foreground">({colItems.length})</span>
                    </div>
                    <div className="space-y-2">
                      {colItems.map((item: any) => (
                        <Card key={item.id} className="cursor-pointer hover:shadow-sm" onClick={() => openEdit(item)}>
                          <CardContent className="p-3 space-y-1">
                            <div className="font-medium text-sm">{item.title}</div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">{contentTypeLabels[item.content_type]}</Badge>
                              {item.channels?.map((ch: string) => (
                                <Badge key={ch} variant="secondary" className="text-xs">{ch}</Badge>
                              ))}
                            </div>
                            {item.publish_date && <div className="text-xs text-muted-foreground">📅 {item.publish_date} {item.publish_time || ''}</div>}
                            {item.campaign && <div className="text-xs text-muted-foreground">📢 {item.campaign.name}</div>}
                            <div className="flex gap-1 pt-1" onClick={e => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar">
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
              <div key={`pad-${i}`} className="bg-background p-2 min-h-[80px]" />
            ))}
            {daysInMonth.map(day => {
              const dayItems = getItemsForDay(day);
              return (
                <div key={day.toISOString()} className={cn("bg-background p-1 min-h-[80px] border-t", isToday(day) && "bg-primary/5")}>
                  <div className={cn("text-xs font-medium mb-1", isToday(day) ? "text-primary font-bold" : "text-muted-foreground")}>
                    {format(day, 'd')}
                  </div>
                  {dayItems.slice(0, 3).map((item: any) => (
                    <div key={item.id} className={cn("text-xs px-1 py-0.5 rounded mb-0.5 truncate cursor-pointer", statusColors[item.status])} onClick={() => openEdit(item)}>
                      {item.title}
                    </div>
                  ))}
                  {dayItems.length > 3 && <div className="text-xs text-muted-foreground">+{dayItems.length - 3}</div>}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Table View */}
        <TabsContent value="table">
          {loading ? <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div> : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>العنوان</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الحملة</TableHead>
                      <TableHead>تاريخ النشر</TableHead>
                      <TableHead>القنوات</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التصميم</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا يوجد محتوى</TableCell></TableRow>
                    ) : filteredItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{contentTypeLabels[item.content_type]}</Badge></TableCell>
                        <TableCell className="text-sm">{item.campaign?.name || '—'}</TableCell>
                        <TableCell className="text-sm">{item.publish_date || '—'} {item.publish_time || ''}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {item.channels?.map((ch: string) => <Badge key={ch} variant="secondary" className="text-xs">{ch}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell><Badge className={cn('text-xs', statusColors[item.status])}>{statusLabels[item.status]}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{designStatusLabels[item.design_status] || '—'}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(item)}><Edit className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل المحتوى' : 'محتوى جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* AI Generation Section */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between p-3 bg-gradient-to-l from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-colors"
                onClick={() => setShowAISection(!showAISection)}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm">توليد المحتوى بالذكاء الاصطناعي</span>
                </div>
                <ChevronLeft className={cn("h-4 w-4 transition-transform", showAISection && "-rotate-90")} />
              </button>

              {showAISection && (
                <div className="p-4 space-y-3 bg-muted/30">
                  <div>
                    <label className="text-sm font-medium">وصف فكرة المحتوى *</label>
                    <Textarea
                      value={aiForm.idea}
                      onChange={e => setAIForm(p => ({ ...p, idea: e.target.value }))}
                      rows={3}
                      placeholder="مثال: منشور تعريفي بمنصة ويبيان لإدارة الجمعيات الخيرية..."
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-medium">المنصة المستهدفة</label>
                      <Select value={aiForm.platform} onValueChange={v => setAIForm(p => ({ ...p, platform: v }))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="X">X (تويتر)</SelectItem>
                          <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                          <SelectItem value="Instagram">Instagram</SelectItem>
                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">نبرة المحتوى</label>
                      <Select value={aiForm.tone} onValueChange={v => setAIForm(p => ({ ...p, tone: v }))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="رسمي">رسمي</SelectItem>
                          <SelectItem value="تنفيذي">تنفيذي</SelectItem>
                          <SelectItem value="سعودي_أبيض">سعودي أبيض</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">الجمهور المستهدف</label>
                      <Input className="h-9" value={aiForm.audience} onChange={e => setAIForm(p => ({ ...p, audience: e.target.value }))} placeholder="جمعيات أهلية" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">CTA</label>
                      <Select value={aiForm.cta} onValueChange={v => setAIForm(p => ({ ...p, cta: v }))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="تعرف أكثر">تعرف أكثر</SelectItem>
                          <SelectItem value="اطلب عرض">اطلب عرض</SelectItem>
                          <SelectItem value="ابدأ الآن">ابدأ الآن</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">الرسالة الرئيسية</label>
                      <Input className="h-9" value={aiForm.key_message} onChange={e => setAIForm(p => ({ ...p, key_message: e.target.value }))} placeholder="إبراز الأثر، حوكمة..." />
                    </div>
                    <div>
                      <label className="text-xs font-medium">رابط الهبوط</label>
                      <Input className="h-9" value={aiForm.landing_url} onChange={e => setAIForm(p => ({ ...p, landing_url: e.target.value }))} placeholder="https://webyan.sa" dir="ltr" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAIGenerate} disabled={aiLoading} className="gap-2">
                      {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {aiLoading ? 'جاري التوليد...' : 'توليد المحتوى'}
                    </Button>
                    {lastAIResult && (
                      <>
                        <Button variant="outline" onClick={handleAIGenerate} disabled={aiLoading} className="gap-2">
                          <RefreshCw className="h-4 w-4" />
                          إعادة توليد
                        </Button>
                        <Button variant="secondary" onClick={handleValidate} className="gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          فحص المحتوى
                        </Button>
                      </>
                    )}
                  </div>
                  {lastAIResult?.meta?.compliance && (
                    <div className="flex gap-2 text-xs">
                      <span className={lastAIResult.meta.compliance.within_char_limit ? 'text-green-600' : 'text-destructive'}>
                        {lastAIResult.meta.compliance.within_char_limit ? '✅' : '❌'} حد الأحرف
                      </span>
                      <span className={lastAIResult.meta.compliance.used_file_search ? 'text-green-600' : 'text-destructive'}>
                        {lastAIResult.meta.compliance.used_file_search ? '✅' : '❌'} File Search
                      </span>
                      <span className={lastAIResult.meta.compliance.no_banned_words ? 'text-green-600' : 'text-destructive'}>
                        {lastAIResult.meta.compliance.no_banned_words ? '✅' : '❌'} كلمات ممنوعة
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* General */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium">عنوان المنشور *</label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">نوع المحتوى</label>
                <Select value={form.content_type} onValueChange={v => setForm({ ...form, content_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="design">تصميم</SelectItem>
                    <SelectItem value="video">فيديو</SelectItem>
                    <SelectItem value="article">مقال</SelectItem>
                    <SelectItem value="ad">إعلان</SelectItem>
                    <SelectItem value="tweet">تغريدة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">الحملة</label>
                <Select value={form.campaign_id || 'none'} onValueChange={v => setForm({ ...form, campaign_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="اختر حملة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون حملة</SelectItem>
                    {campaigns.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">تاريخ النشر</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-right", !form.publish_date && "text-muted-foreground")}>
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {form.publish_date ? format(form.publish_date, 'yyyy-MM-dd') : 'اختر'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.publish_date} onSelect={d => setForm({ ...form, publish_date: d })} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium">وقت النشر</label>
                <Input type="time" value={form.publish_time} onChange={e => setForm({ ...form, publish_time: e.target.value })} />
              </div>
            </div>

            {/* Text content */}
            <div>
              <label className="text-sm font-medium">نص المنشور</label>
              <Textarea value={form.post_text} onChange={e => setForm({ ...form, post_text: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">الوسوم (Hashtags)</label>
                <Input value={form.hashtags} onChange={e => setForm({ ...form, hashtags: e.target.value })} placeholder="#تسويق #محتوى" />
              </div>
              <div>
                <label className="text-sm font-medium">CTA (دعوة للإجراء)</label>
                <Input value={form.cta} onChange={e => setForm({ ...form, cta: e.target.value })} placeholder="اشترك الآن" />
              </div>
            </div>

            {/* Design */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">رابط ملف التصميم</label>
                <Input value={form.design_file_url} onChange={e => setForm({ ...form, design_file_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">حالة التصميم</label>
                <Select value={form.design_status} onValueChange={v => setForm({ ...form, design_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                    <SelectItem value="ready">جاهز</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">نص التصميم</label>
              <p className="text-xs text-muted-foreground mb-1">المحتوى النصي الذي سيظهر داخل التصميم (عناوين، شعارات، نصوص رئيسية)</p>
              <Textarea value={form.design_text} onChange={e => setForm({ ...form, design_text: e.target.value })} rows={2} placeholder="مثال: عنوان التصميم الرئيسي، النص الفرعي، أرقام إحصائية..." />
            </div>
            <div>
              <label className="text-sm font-medium">ملاحظات التصميم / وصف التصميم</label>
              <Textarea value={form.design_notes} onChange={e => setForm({ ...form, design_notes: e.target.value })} rows={2} />
            </div>

            {/* Channels */}
            <div>
              <label className="text-sm font-medium mb-2 block">قنوات النشر</label>
              <div className="flex flex-wrap gap-3">
                {ALL_CHANNELS.map(ch => (
                  <label key={ch} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.channels.includes(ch)} onCheckedChange={() => toggleChannel(ch)} />
                    <span className="text-sm">{ch}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Execution Assignment */}
            <Separator />
            <div>
              <label className="text-sm font-semibold mb-2 block">إسناد التنفيذ</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">مسؤول التصميم</label>
                  <Select value={form.designer_id || 'none'} onValueChange={v => setForm({ ...form, designer_id: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="اختر موظف" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون</SelectItem>
                      {marketingStaff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">مسؤول النشر</label>
                  <Select value={form.publisher_id || 'none'} onValueChange={v => setForm({ ...form, publisher_id: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="اختر موظف" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون</SelectItem>
                      {marketingStaff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium">حالة المنشور</label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="waiting_design">بانتظار التصميم</SelectItem>
                  <SelectItem value="in_design">قيد التصميم</SelectItem>
                  <SelectItem value="design_done">تم التصميم</SelectItem>
                  <SelectItem value="ready">جاهز للنشر</SelectItem>
                  <SelectItem value="published">تم النشر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave}>{editingId ? 'تحديث' : 'إنشاء'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Monthly AI Plan Dialog */}
      <Dialog open={monthlyPlanOpen} onOpenChange={setMonthlyPlanOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="h-6 w-6 text-primary" />
              إنشاء خطة محتوى شهرية بالذكاء الاصطناعي
            </DialogTitle>
          </DialogHeader>
          
          {!monthlyPlanResult ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-l from-primary/5 to-primary/10 rounded-lg p-4 text-sm text-muted-foreground">
                <p>أدخل توجيهك الرئيسي وسيقوم الذكاء الاصطناعي بإنشاء خطة محتوى متكاملة تتضمن منشورات متنوعة موزعة بذكاء على أيام الشهر مع تحديد المنصات والأوقات المثلى.</p>
              </div>

              <div>
                <label className="text-sm font-medium">التوجيه الرئيسي *</label>
                <Textarea
                  value={monthlyPlanDirective}
                  onChange={e => setMonthlyPlanDirective(e.target.value)}
                  rows={4}
                  placeholder="مثال: أريد خطة محتوى تركز على التعريف بمنصة ويبيان وخدماتها للجمعيات الأهلية، مع التركيز على مزايا الحوكمة والشفافية والتقارير المالية..."
                  className="mt-1"
                />
              </div>

              {/* Date selection */}
              <div>
                <label className="text-xs font-medium mb-2 block">الفترة الزمنية</label>
                <div className="flex gap-2 mb-2">
                  <Button type="button" size="sm" variant={monthlyPlanDateMode === 'month' ? 'default' : 'outline'} onClick={() => setMonthlyPlanDateMode('month')}>
                    شهر محدد
                  </Button>
                  <Button type="button" size="sm" variant={monthlyPlanDateMode === 'range' ? 'default' : 'outline'} onClick={() => setMonthlyPlanDateMode('range')}>
                    بين تاريخين
                  </Button>
                </div>
                {monthlyPlanDateMode === 'month' ? (
                  <Input type="month" className="h-9" value={monthlyPlanMonth} onChange={e => setMonthlyPlanMonth(e.target.value)} />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground">من تاريخ</label>
                      <Input type="date" className="h-9" value={monthlyPlanStartDate} onChange={e => setMonthlyPlanStartDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">إلى تاريخ</label>
                      <Input type="date" className="h-9" value={monthlyPlanEndDate} onChange={e => setMonthlyPlanEndDate(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">عدد المنشورات</label>
                  <Select value={String(monthlyPlanCount)} onValueChange={v => setMonthlyPlanCount(Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8 منشورات</SelectItem>
                      <SelectItem value="12">12 منشور</SelectItem>
                      <SelectItem value="16">16 منشور</SelectItem>
                      <SelectItem value="20">20 منشور</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">الجمهور المستهدف</label>
                  <Input className="h-9" value={monthlyPlanAudience} onChange={e => setMonthlyPlanAudience(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-2 block">المنصات</label>
                <div className="flex flex-wrap gap-3">
                  {['X', 'LinkedIn', 'Instagram', 'WhatsApp'].map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={monthlyPlanPlatforms.includes(p)} onCheckedChange={() => toggleMonthlyPlatform(p)} />
                      <span className="text-sm">{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">رابط الهبوط</label>
                <Input className="h-9" value={monthlyPlanLanding} onChange={e => setMonthlyPlanLanding(e.target.value)} dir="ltr" />
              </div>

              <Button onClick={handleMonthlyPlanGenerate} disabled={monthlyPlanLoading} className="w-full gap-2" size="lg">
                {monthlyPlanLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جاري إنشاء الخطة... قد يستغرق دقيقة
                  </>
                ) : (
                  <>
                    <BrainCircuit className="h-5 w-5" />
                    إنشاء الخطة الشهرية
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <h3 className="font-bold text-green-800 dark:text-green-200 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  {monthlyPlanResult.plan_title}
                </h3>
                {monthlyPlanResult.plan_description && (
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">{monthlyPlanResult.plan_description}</p>
                )}
                <p className="text-sm mt-2 font-medium">
                  تم إنشاء {monthlyPlanResult.saved_count} منشور وحفظها كمسودات
                </p>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {(monthlyPlanResult.posts || []).map((post: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{post.title || `منشور ${i + 1}`}</span>
                          <div className="flex gap-1">
                            {post.channels?.map((ch: string) => (
                              <Badge key={ch} variant="secondary" className="text-xs">{ch}</Badge>
                            )) || <Badge variant="secondary" className="text-xs">{post.platform || 'X'}</Badge>}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {post.post_copy?.primary_text || post.primary_text || ''}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {post.publish_date && <span>📅 {post.publish_date}</span>}
                          {post.publish_time && <span>🕐 {post.publish_time}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button variant="outline" onClick={() => setMonthlyPlanResult(null)}>
                  إنشاء خطة جديدة
                </Button>
                <Button onClick={() => setMonthlyPlanOpen(false)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
