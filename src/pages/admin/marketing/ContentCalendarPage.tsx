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
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Plus, CalendarIcon, Edit, Trash2, LayoutGrid, CalendarDays, List, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

const contentTypeLabels: Record<string, string> = { design: 'تصميم', video: 'فيديو', article: 'مقال', ad: 'إعلان', tweet: 'تغريدة' };
const designStatusLabels: Record<string, string> = { draft: 'مسودة', in_progress: 'قيد التنفيذ', ready: 'جاهز', approved: 'معتمد' };
const statusLabels: Record<string, string> = { draft: 'مسودة', waiting_design: 'بانتظار التصميم', waiting_approval: 'بانتظار الموافقة', ready: 'جاهز للنشر', published: 'تم النشر' };
const statusColors: Record<string, string> = { draft: 'bg-gray-100 text-gray-800', waiting_design: 'bg-purple-100 text-purple-800', waiting_approval: 'bg-amber-100 text-amber-800', ready: 'bg-blue-100 text-blue-800', published: 'bg-green-100 text-green-800' };

const ALL_CHANNELS = ['X', 'LinkedIn', 'Instagram', 'Website', 'Email', 'WhatsApp', 'أخرى'];

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
  design_notes: string;
  design_status: string;
  channels: string[];
  status: string;
}

const emptyForm: ContentForm = {
  campaign_id: '', title: '', content_type: 'design', publish_date: undefined,
  publish_time: '', post_text: '', hashtags: '', cta: '', design_file_url: '',
  design_notes: '', design_status: 'draft', channels: [], status: 'draft',
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

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [itemsRes, campsRes] = await Promise.all([
      supabase.from('content_calendar').select('*, campaign:marketing_plan_campaigns(name)').order('publish_date', { ascending: true }) as any,
      supabase.from('marketing_plan_campaigns').select('id, name').order('name') as any,
    ]);
    setItems(itemsRes.data || []);
    setCampaigns(campsRes.data || []);
    setLoading(false);
  };

  const filteredItems = useMemo(() => {
    if (!filterCampaign) return items;
    return items.filter((i: any) => i.campaign_id === filterCampaign);
  }, [items, filterCampaign]);

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm, campaign_id: filterCampaign }); setDialogOpen(true); };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      campaign_id: item.campaign_id || '', title: item.title, content_type: item.content_type,
      publish_date: item.publish_date ? new Date(item.publish_date) : undefined,
      publish_time: item.publish_time || '', post_text: item.post_text || '',
      hashtags: item.hashtags || '', cta: item.cta || '', design_file_url: item.design_file_url || '',
      design_notes: item.design_notes || '', design_status: item.design_status || 'draft',
      channels: item.channels || [], status: item.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('عنوان المنشور مطلوب'); return; }
    const payload = {
      campaign_id: form.campaign_id || null, title: form.title, content_type: form.content_type,
      publish_date: form.publish_date ? format(form.publish_date, 'yyyy-MM-dd') : null,
      publish_time: form.publish_time || null, post_text: form.post_text || null,
      hashtags: form.hashtags || null, cta: form.cta || null,
      design_file_url: form.design_file_url || null, design_notes: form.design_notes || null,
      design_status: form.design_status, channels: form.channels, status: form.status,
    };
    if (editingId) {
      const { error } = await (supabase.from('content_calendar').update(payload).eq('id', editingId) as any);
      if (error) { toast.error('فشل التحديث'); return; }
      toast.success('تم التحديث');
    } else {
      const { error } = await (supabase.from('content_calendar').insert(payload) as any);
      if (error) { toast.error('فشل الإنشاء'); return; }
      toast.success('تم الإنشاء');
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

  // Kanban columns
  const kanbanColumns = [
    { key: 'draft', label: 'مسودة' },
    { key: 'waiting_design', label: 'بانتظار التصميم' },
    { key: 'waiting_approval', label: 'بانتظار الموافقة' },
    { key: 'ready', label: 'جاهز للنشر' },
    { key: 'published', label: 'تم النشر' },
  ];

  // Calendar view
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  // Pad start to align with week (Saturday start for Arabic)
  const startDay = monthStart.getDay();
  const padDays = (startDay + 1) % 7; // Sat = 0

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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل المحتوى' : 'محتوى جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <label className="text-sm font-medium">ملاحظات التصميم</label>
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

            {/* Status */}
            <div>
              <label className="text-sm font-medium">حالة المنشور</label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="waiting_design">بانتظار التصميم</SelectItem>
                  <SelectItem value="waiting_approval">بانتظار الموافقة</SelectItem>
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
    </div>
  );
}
