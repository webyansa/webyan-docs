import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Plus, CalendarIcon, Target, Edit, Trash2, Eye, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { KpiTargetsEditor } from '@/components/marketing/KpiTargetsEditor';
import { KpiPerformanceDashboard } from '@/components/marketing/KpiPerformanceDashboard';
import { aggregateMetrics, type KpiTargets } from '@/lib/marketing/kpiConfig';

const statusLabels: Record<string, string> = {
  planning: 'تخطيط',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
};

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
};

interface PlanForm {
  name: string;
  objective: string;
  start_date: Date | undefined;
  end_date: Date | undefined;
  budget: string;
  responsible_id: string;
  status: string;
  notes: string;
  kpi_targets: KpiTargets;
}

const emptyForm: PlanForm = {
  name: '', objective: '', start_date: undefined, end_date: undefined,
  budget: '', responsible_id: '', status: 'planning', notes: '', kpi_targets: {},
};

export default function MarketingPlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [plansRes, staffRes] = await Promise.all([
      supabase.from('marketing_plans').select('*, responsible:staff_members!marketing_plans_responsible_id_fkey(full_name)').order('created_at', { ascending: false }) as any,
      supabase.from('staff_members').select('id, full_name').eq('is_active', true) as any,
    ]);
    setPlans(plansRes.data || []);
    setStaff(staffRes.data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (plan: any) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      objective: plan.objective || '',
      start_date: plan.start_date ? new Date(plan.start_date) : undefined,
      end_date: plan.end_date ? new Date(plan.end_date) : undefined,
      budget: plan.budget?.toString() || '',
      responsible_id: plan.responsible_id || '',
      status: plan.status,
      notes: plan.notes || '',
      kpi_targets: (plan.kpi_targets as KpiTargets) || {},
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      toast.error('يرجى ملء الحقول الإجبارية');
      return;
    }
    const payload: any = {
      name: form.name,
      objective: form.objective || null,
      start_date: format(form.start_date, 'yyyy-MM-dd'),
      end_date: format(form.end_date, 'yyyy-MM-dd'),
      budget: form.budget ? parseFloat(form.budget) : null,
      responsible_id: form.responsible_id || null,
      status: form.status,
      notes: form.notes || null,
      kpi_targets: form.kpi_targets,
    };

    if (editingId) {
      const { error } = await (supabase.from('marketing_plans').update(payload).eq('id', editingId) as any);
      if (error) { toast.error('فشل التحديث'); return; }
      toast.success('تم تحديث الخطة');
    } else {
      const { error } = await (supabase.from('marketing_plans').insert(payload) as any);
      if (error) { toast.error('فشل الإنشاء'); return; }
      toast.success('تم إنشاء الخطة');
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخطة؟')) return;
    await (supabase.from('marketing_plans').delete().eq('id', id) as any);
    toast.success('تم حذف الخطة');
    fetchData();
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-7 w-7 text-primary" />
            الخطط التسويقية
          </h1>
          <p className="text-muted-foreground mt-1">إنشاء وإدارة خطط التسويق ومتابعة تنفيذها</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> خطة جديدة
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            لا توجد خطط تسويقية بعد. أنشئ خطتك الأولى!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/admin/marketing/plans/${plan.id}`)}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg leading-tight">{plan.name}</h3>
                  <Badge className={cn('text-xs', statusColors[plan.status])}>
                    {statusLabels[plan.status]}
                  </Badge>
                </div>
                {plan.objective && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{plan.objective}</p>
                )}
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>📅 {plan.start_date} → {plan.end_date}</div>
                  {plan.responsible && <div>👤 {plan.responsible.full_name}</div>}
                  {plan.budget && <div>💰 {Number(plan.budget).toLocaleString()} ر.س</div>}
                </div>
                <div className="flex gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/marketing/plans/${plan.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(plan)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(plan.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل الخطة' : 'خطة تسويقية جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">اسم الخطة *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">الهدف من الخطة</label>
              <Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">تاريخ البداية *</label>
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
                <label className="text-sm font-medium">تاريخ النهاية *</label>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">الميزانية (ر.س)</label>
                <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">الحالة</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">تخطيط</SelectItem>
                    <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                    <SelectItem value="completed">مكتملة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">المسؤول</label>
              <Select value={form.responsible_id} onValueChange={(v) => setForm({ ...form, responsible_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المسؤول" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
