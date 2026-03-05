import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowRight, Plus, CalendarIcon, Edit, Trash2, Eye, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { KpiTargetsEditor } from '@/components/marketing/KpiTargetsEditor';
import { KpiPerformanceDashboard } from '@/components/marketing/KpiPerformanceDashboard';
import { aggregateMetrics, type KpiTargets, type KpiMetrics } from '@/lib/marketing/kpiConfig';

const statusLabels: Record<string, string> = { planning: 'تخطيط', in_progress: 'قيد التنفيذ', completed: 'مكتملة' };
const statusColors: Record<string, string> = { planning: 'bg-blue-100 text-blue-800', in_progress: 'bg-amber-100 text-amber-800', completed: 'bg-green-100 text-green-800' };
const campaignTypeLabels: Record<string, string> = {
  awareness: 'توعوية', launch: 'إطلاق', product_intro: 'تعريف بالمنتج',
  value_highlight: 'إبراز القيمة', success_story: 'قصة نجاح',
  engagement: 'تفاعل', sales: 'بيعية', trial_invite: 'دعوة للتجربة',
};

const campaignStatusLabels: Record<string, string> = { planning: 'تخطيط', active: 'نشطة', paused: 'متوقفة', completed: 'مكتملة' };
const campaignStatusColors: Record<string, string> = { planning: 'bg-blue-100 text-blue-800', active: 'bg-green-100 text-green-800', paused: 'bg-amber-100 text-amber-800', completed: 'bg-gray-100 text-gray-800' };

interface CampaignForm {
  name: string;
  campaign_types: string[];
  target_audience: string;
  key_message: string;
  target_kpi: string;
  kpi_targets: KpiTargets;
  start_date: Date | undefined;
  end_date: Date | undefined;
  status: string;
  notes: string;
}

const emptyCampaignForm: CampaignForm = {
  name: '', campaign_types: [], target_audience: '', key_message: '',
  target_kpi: '', kpi_targets: {}, start_date: undefined, end_date: undefined, status: 'planning', notes: '',
};

export default function PlanDetailsPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyCampaignForm);
  const [contentItems, setContentItems] = useState<any[]>([]);
  useEffect(() => {
    if (planId) fetchData();
  }, [planId]);

  const fetchData = async () => {
    setLoading(true);
    const [planRes, campsRes, contentRes] = await Promise.all([
      supabase.from('marketing_plans').select('*, responsible:staff_members!marketing_plans_responsible_id_fkey(full_name)').eq('id', planId).single() as any,
      supabase.from('marketing_plan_campaigns').select('*').eq('plan_id', planId).order('created_at', { ascending: false }) as any,
      supabase.from('content_calendar').select('id, campaign_id, metrics').not('campaign_id', 'is', null) as any,
    ]);
    setPlan(planRes.data);
    setCampaigns(campsRes.data || []);
    setContentItems(contentRes.data || []);
    setLoading(false);
  };

  const openCreate = () => { setEditingId(null); setForm(emptyCampaignForm); setDialogOpen(true); };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    const types = c.campaign_types?.length ? c.campaign_types : (c.campaign_type ? [c.campaign_type] : []);
    setForm({
      name: c.name, campaign_types: types, target_audience: c.target_audience || '',
      key_message: c.key_message || '', target_kpi: c.target_kpi || '',
      kpi_targets: (c.kpi_targets as KpiTargets) || {},
      start_date: c.start_date ? new Date(c.start_date) : undefined,
      end_date: c.end_date ? new Date(c.end_date) : undefined,
      status: c.status, notes: c.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('اسم الحملة مطلوب'); return; }
    const payload: any = {
      plan_id: planId,
      name: form.name, campaign_types: form.campaign_types, campaign_type: form.campaign_types[0] || 'awareness',
      target_audience: form.target_audience || null, key_message: form.key_message || null,
      target_kpi: form.target_kpi || null,
      kpi_targets: form.kpi_targets,
      start_date: form.start_date ? format(form.start_date, 'yyyy-MM-dd') : null,
      end_date: form.end_date ? format(form.end_date, 'yyyy-MM-dd') : null,
      status: form.status, notes: form.notes || null,
    };
    if (editingId) {
      const { error } = await (supabase.from('marketing_plan_campaigns').update(payload).eq('id', editingId) as any);
      if (error) { toast.error('فشل التحديث'); return; }
      toast.success('تم تحديث الحملة');
    } else {
      const { error } = await (supabase.from('marketing_plan_campaigns').insert(payload) as any);
      if (error) { toast.error('فشل الإنشاء'); return; }
      toast.success('تم إنشاء الحملة');
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحملة؟')) return;
    await (supabase.from('marketing_plan_campaigns').delete().eq('id', id) as any);
    toast.success('تم حذف الحملة');
    fetchData();
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">جاري التحميل...</div>;
  if (!plan) return <div className="p-6 text-center text-muted-foreground">الخطة غير موجودة</div>;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing/plans')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{plan.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cn('text-xs', statusColors[plan.status])}>{statusLabels[plan.status]}</Badge>
            <span className="text-sm text-muted-foreground">{plan.start_date} → {plan.end_date}</span>
            {plan.responsible && <span className="text-sm text-muted-foreground">• {plan.responsible.full_name}</span>}
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> حملة جديدة
        </Button>
      </div>

      {plan.objective && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm"><strong>الهدف:</strong> {plan.objective}</p>
          </CardContent>
        </Card>
      )}

      {/* Plan-level KPI Dashboard */}
      {(() => {
        const planTargets = (plan.kpi_targets as KpiTargets) || {};
        const campaignIds = campaigns.map((c: any) => c.id);
        const planContent = contentItems.filter((ci: any) => campaignIds.includes(ci.campaign_id));
        const planActuals = aggregateMetrics(planContent);
        const hasTargets = Object.keys(planTargets).some(k => planTargets[k] > 0);
        if (!hasTargets) return null;
        return <KpiPerformanceDashboard targets={planTargets} actuals={planActuals} title="أداء مؤشرات الخطة" />;
      })()}

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> الحملات ({campaigns.length})
        </h2>
        {campaigns.length === 0 ? (
          <Card><CardContent className="text-center py-8 text-muted-foreground">لا توجد حملات بعد</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{c.name}</h3>
                    <Badge className={cn('text-xs', campaignStatusColors[c.status])}>{campaignStatusLabels[c.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(c.campaign_types?.length ? c.campaign_types : (c.campaign_type ? [c.campaign_type] : [])).map((t: string) => (
                      <Badge key={t} variant="outline" className="text-xs">{campaignTypeLabels[t] || t}</Badge>
                    ))}
                  </div>
                  {c.target_audience && <p className="text-xs text-muted-foreground">🎯 {c.target_audience}</p>}
                  {c.start_date && <p className="text-xs text-muted-foreground">📅 {c.start_date} → {c.end_date || '—'}</p>}
                  {/* Campaign KPI compact bar */}
                  {(() => {
                    const campTargets = (c.kpi_targets as KpiTargets) || {};
                    const hasT = Object.keys(campTargets).some(k => campTargets[k] > 0);
                    if (!hasT) return null;
                    const campContent = contentItems.filter((ci: any) => ci.campaign_id === c.id);
                    const campActuals = aggregateMetrics(campContent);
                    return <KpiPerformanceDashboard targets={campTargets} actuals={campActuals} compact />;
                  })()}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/marketing/content?campaign=${c.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل الحملة' : 'حملة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">اسم الحملة *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-2 block">أنواع الحملة</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(campaignTypeLabels).map(([key, label]) => (
                    <label key={key} className={cn("flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors", form.campaign_types.includes(key) && "border-primary bg-primary/5")}>
                      <Checkbox
                        checked={form.campaign_types.includes(key)}
                        onCheckedChange={(checked) => {
                          setForm(prev => ({
                            ...prev,
                            campaign_types: checked
                              ? [...prev.campaign_types, key]
                              : prev.campaign_types.filter(t => t !== key),
                          }));
                        }}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">الحالة</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">تخطيط</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="paused">متوقفة</SelectItem>
                    <SelectItem value="completed">مكتملة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">الجمهور المستهدف</label>
              <Input value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">الرسالة الرئيسية</label>
              <Textarea value={form.key_message} onChange={(e) => setForm({ ...form, key_message: e.target.value })} rows={2} />
            </div>
            <KpiTargetsEditor value={form.kpi_targets} onChange={(v) => setForm({ ...form, kpi_targets: v })} compact />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">تاريخ البداية</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-right", !form.start_date && "text-muted-foreground")}>
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {form.start_date ? format(form.start_date, 'yyyy-MM-dd') : 'اختر'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.start_date} onSelect={(d) => setForm({ ...form, start_date: d })} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium">تاريخ النهاية</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-right", !form.end_date && "text-muted-foreground")}>
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {form.end_date ? format(form.end_date, 'yyyy-MM-dd') : 'اختر'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.end_date} onSelect={(d) => setForm({ ...form, end_date: d })} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">ملاحظات</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
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
