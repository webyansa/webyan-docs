import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Tag,
  Plus,
  Edit,
  Loader2,
  Percent,
  DollarSign,
  CalendarIcon,
  Hash,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Discount {
  id: string;
  name: string;
  code: string | null;
  requires_code: boolean;
  discount_type: string;
  discount_value: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  scope_type: string;
  scope_ids: any;
  max_total_usage: number | null;
  max_per_client: number | null;
  current_usage: number;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const defaultFormState = {
  name: '',
  code: '',
  requires_code: false,
  discount_type: 'percentage',
  discount_value: '',
  start_date: new Date(),
  end_date: null as Date | null,
  no_end_date: false,
  is_active: true,
  scope_type: 'full_quote',
  scope_ids: [] as string[],
  max_total_usage: '',
  max_per_client: '',
  internal_notes: '',
};

function getDiscountStatus(d: Discount): { label: string; color: string } {
  if (!d.is_active) return { label: 'متوقف', color: 'bg-red-100 text-red-700' };
  if (d.max_total_usage && d.current_usage >= d.max_total_usage) return { label: 'استُنفد', color: 'bg-orange-100 text-orange-700' };
  if (d.end_date && new Date(d.end_date) < new Date()) return { label: 'منتهي', color: 'bg-muted text-muted-foreground' };
  const now = new Date();
  if (new Date(d.start_date) > now) return { label: 'مجدول', color: 'bg-blue-100 text-blue-700' };
  return { label: 'نشط', color: 'bg-green-100 text-green-700' };
}

export default function DiscountsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultFormState);

  // Fetch current staff
  const { data: currentStaff } = useQuery({
    queryKey: ['current-staff-discount', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('staff_members').select('id, full_name').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch discounts
  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ['discounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Discount[];
    },
  });

  // Fetch plans & services for scope selection
  const { data: plans = [] } = useQuery({
    queryKey: ['pricing-plans-for-discounts'],
    queryFn: async () => {
      const { data } = await supabase.from('pricing_plans').select('id, name').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['pricing-services-for-discounts'],
    queryFn: async () => {
      const { data } = await supabase.from('pricing_services').select('id, name').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name,
        code: form.code || null,
        requires_code: form.requires_code,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value) || 0,
        start_date: form.start_date.toISOString(),
        end_date: form.no_end_date ? null : form.end_date?.toISOString() || null,
        is_active: form.is_active,
        scope_type: form.scope_type,
        scope_ids: form.scope_ids,
        max_total_usage: form.max_total_usage ? parseInt(form.max_total_usage) : null,
        max_per_client: form.max_per_client ? parseInt(form.max_per_client) : null,
        internal_notes: form.internal_notes || null,
      };

      if (editingId) {
        const { error } = await supabase.from('discounts').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        payload.created_by = currentStaff?.id || null;
        const { error } = await supabase.from('discounts').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success(editingId ? 'تم تحديث الخصم بنجاح' : 'تم إنشاء الخصم بنجاح');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('حدث خطأ أثناء حفظ الخصم'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('discounts').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success('تم تحديث حالة الخصم');
    },
  });

  const resetForm = () => {
    setForm(defaultFormState);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (d: Discount) => {
    setEditingId(d.id);
    setForm({
      name: d.name,
      code: d.code || '',
      requires_code: d.requires_code,
      discount_type: d.discount_type,
      discount_value: d.discount_value.toString(),
      start_date: new Date(d.start_date),
      end_date: d.end_date ? new Date(d.end_date) : null,
      no_end_date: !d.end_date,
      is_active: d.is_active,
      scope_type: d.scope_type,
      scope_ids: Array.isArray(d.scope_ids) ? d.scope_ids : [],
      max_total_usage: d.max_total_usage?.toString() || '',
      max_per_client: d.max_per_client?.toString() || '',
      internal_notes: d.internal_notes || '',
    });
    setDialogOpen(true);
  };

  const scopeOptions = plans.length > 0 || services.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            إدارة الخصومات والعروض
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة العروض والخصومات وتطبيقها على عروض الأسعار</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          إنشاء خصم جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الخصومات', value: discounts.length, icon: Tag },
          { label: 'نشط حالياً', value: discounts.filter(d => getDiscountStatus(d).label === 'نشط').length, icon: Percent },
          { label: 'إجمالي الاستخدام', value: discounts.reduce((s, d) => s + d.current_usage, 0), icon: BarChart3 },
          { label: 'مستنفد', value: discounts.filter(d => getDiscountStatus(d).label === 'استُنفد').length, icon: Hash },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : discounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد خصومات حتى الآن</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>القيمة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الفترة</TableHead>
                  <TableHead>الاستخدام</TableHead>
                  <TableHead>تفعيل</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((d) => {
                  const status = getDiscountStatus(d);
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{d.name}</p>
                          {d.code && (
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">كود: {d.code}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {d.discount_type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {d.discount_type === 'percentage' ? `${d.discount_value}%` : `${d.discount_value} ر.س`}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('border-0', status.color)}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div>{format(new Date(d.start_date), 'dd/MM/yyyy')}</div>
                        <div>{d.end_date ? format(new Date(d.end_date), 'dd/MM/yyyy') : 'بدون نهاية'}</div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{d.current_usage}</span>
                        {d.max_total_usage && <span className="text-muted-foreground">/{d.max_total_usage}</span>}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={d.is_active}
                          onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: d.id, is_active: checked })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل الخصم' : 'إنشاء خصم جديد'}</DialogTitle>
            <DialogDescription>أدخل بيانات الخصم أو العرض الترويجي</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label>اسم الخصم / العرض *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: عرض إطلاق، خصم موسمي..." />
            </div>

            {/* Code + Requires Code */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>كود الخصم (اختياري)</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="LAUNCH2024" className="font-mono" />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Checkbox
                  id="requires_code"
                  checked={form.requires_code}
                  onCheckedChange={(c) => setForm({ ...form, requires_code: c === true })}
                />
                <Label htmlFor="requires_code" className="cursor-pointer text-sm">يتطلب إدخال كود</Label>
              </div>
            </div>

            {/* Type + Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع الخصم</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت (ر.س)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>قيمة الخصم *</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    placeholder="0"
                    className="pl-10"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {form.discount_type === 'percentage' ? '%' : 'ر.س'}
                  </span>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ البداية *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-right font-normal", !form.start_date && "text-muted-foreground")}>
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {form.start_date ? format(form.start_date, 'dd/MM/yyyy') : 'اختر التاريخ'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.start_date} onSelect={(d) => d && setForm({ ...form, start_date: d })} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>تاريخ النهاية</Label>
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="no_end" checked={form.no_end_date} onCheckedChange={(c) => setForm({ ...form, no_end_date: c === true, end_date: c ? null : form.end_date })} />
                    <Label htmlFor="no_end" className="text-xs cursor-pointer">بدون نهاية</Label>
                  </div>
                </div>
                {!form.no_end_date && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-right font-normal", !form.end_date && "text-muted-foreground")}>
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {form.end_date ? format(form.end_date, 'dd/MM/yyyy') : 'اختر التاريخ'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.end_date || undefined} onSelect={(d) => d && setForm({ ...form, end_date: d })} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {/* Scope */}
            <div className="space-y-2">
              <Label>نطاق التطبيق</Label>
              <Select value={form.scope_type} onValueChange={(v) => setForm({ ...form, scope_type: v, scope_ids: [] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_quote">ينطبق على كامل عرض السعر</SelectItem>
                  <SelectItem value="all_plans">جميع الخطط</SelectItem>
                  <SelectItem value="specific_plans">خطط محددة</SelectItem>
                  <SelectItem value="all_services">جميع الخدمات</SelectItem>
                  <SelectItem value="specific_services">خدمات محددة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.scope_type === 'specific_plans' && plans.length > 0 && (
              <div className="space-y-2 border rounded-lg p-3">
                <Label className="text-xs text-muted-foreground">اختر الخطط:</Label>
                <div className="space-y-1.5">
                  {plans.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={form.scope_ids.includes(p.id)}
                        onCheckedChange={(c) => {
                          setForm({
                            ...form,
                            scope_ids: c ? [...form.scope_ids, p.id] : form.scope_ids.filter((id: string) => id !== p.id),
                          });
                        }}
                      />
                      <span className="text-sm">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.scope_type === 'specific_services' && services.length > 0 && (
              <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                <Label className="text-xs text-muted-foreground">اختر الخدمات:</Label>
                <div className="space-y-1.5">
                  {services.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={form.scope_ids.includes(s.id)}
                        onCheckedChange={(c) => {
                          setForm({
                            ...form,
                            scope_ids: c ? [...form.scope_ids, s.id] : form.scope_ids.filter((id: string) => id !== s.id),
                          });
                        }}
                      />
                      <span className="text-sm">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usage Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>حد الاستخدام الإجمالي (اختياري)</Label>
                <Input type="number" value={form.max_total_usage} onChange={(e) => setForm({ ...form, max_total_usage: e.target.value })} placeholder="بلا حدود" />
              </div>
              <div className="space-y-2">
                <Label>حد الاستخدام لكل عميل (اختياري)</Label>
                <Input type="number" value={form.max_per_client} onChange={(e) => setForm({ ...form, max_per_client: e.target.value })} placeholder="بلا حدود" />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>ملاحظات داخلية (اختياري)</Label>
              <Textarea value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} placeholder="ملاحظات خاصة بالفريق..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>إلغاء</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.name.trim() || !form.discount_value || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : null}
              {editingId ? 'حفظ التعديلات' : 'إنشاء الخصم'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
