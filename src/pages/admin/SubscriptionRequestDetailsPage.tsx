import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowRight, Building2, Mail, Phone, MapPin, Calendar, User, FileText, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

const STATUS_OPTIONS = [
  { value: 'new', label: 'جديد' },
  { value: 'reviewing', label: 'قيد المراجعة' },
  { value: 'contacted', label: 'تم التواصل' },
  { value: 'pending_payment', label: 'بانتظار السداد' },
  { value: 'activated', label: 'تم التفعيل' },
  { value: 'cancelled', label: 'ملغي' },
];

export default function SubscriptionRequestDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');

  const { data: request, isLoading } = useQuery({
    queryKey: ['subscription-request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_subscription_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['subscription-request-timeline', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_subscription_request_timeline')
        .select('*')
        .eq('request_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const oldStatus = request?.status;
      const { error } = await supabase
        .from('website_subscription_requests')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;

      await supabase.from('website_subscription_request_timeline').insert({
        request_id: id,
        action: 'status_changed',
        performed_by: user?.id,
        old_value: oldStatus,
        new_value: newStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-request', id] });
      queryClient.invalidateQueries({ queryKey: ['subscription-request-timeline', id] });
      toast.success('تم تحديث الحالة');
    },
    onError: () => toast.error('حدث خطأ'),
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!noteText.trim()) return;
      // Update notes on request
      const currentNotes = request?.notes || '';
      const newNotes = currentNotes
        ? `${currentNotes}\n---\n${noteText.trim()}`
        : noteText.trim();

      const { error } = await supabase
        .from('website_subscription_requests')
        .update({ notes: newNotes })
        .eq('id', id);
      if (error) throw error;

      await supabase.from('website_subscription_request_timeline').insert({
        request_id: id,
        action: 'note_added',
        performed_by: user?.id,
        details: { note: noteText.trim() },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-request', id] });
      queryClient.invalidateQueries({ queryKey: ['subscription-request-timeline', id] });
      setNoteText('');
      toast.success('تمت إضافة الملاحظة');
    },
  });

  const convertToOrgMutation = useMutation({
    mutationFn: async () => {
      const { data: org, error } = await supabase
        .from('client_organizations')
        .insert({
          name: request.organization_name,
          contact_email: request.email,
          contact_phone: request.phone,
          region: request.region,
          address: request.address,
          organization_type: request.entity_type === 'جمعية خيرية' ? 'charity' : 'nonprofit',
          subscription_plan: request.plan_name,
          subscription_status: 'trial',
        })
        .select('id')
        .single();
      if (error) throw error;

      await supabase
        .from('website_subscription_requests')
        .update({ converted_organization_id: org.id, status: 'activated' })
        .eq('id', id);

      await supabase.from('website_subscription_request_timeline').insert({
        request_id: id,
        action: 'converted',
        performed_by: user?.id,
        new_value: org.id,
        details: { organization_name: request.organization_name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-request', id] });
      queryClient.invalidateQueries({ queryKey: ['subscription-request-timeline', id] });
      toast.success('تم تحويل الطلب إلى منظمة بنجاح');
    },
    onError: () => toast.error('حدث خطأ في التحويل'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return <div className="text-center py-20 text-muted-foreground">الطلب غير موجود</div>;
  }

  const addons = (request.selected_addons || []) as any[];

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      created: 'إنشاء الطلب',
      status_changed: 'تغيير الحالة',
      assigned: 'تعيين مسؤول',
      note_added: 'إضافة ملاحظة',
      converted: 'تحويل إلى منظمة',
      email_sent: 'إرسال بريد',
    };
    return map[action] || action;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/admin/subscription-requests" className="hover:text-primary flex items-center gap-1">
          <ArrowRight className="h-4 w-4" />
          طلبات الاشتراك
        </Link>
        <span>/</span>
        <span>{request.request_number}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{request.organization_name}</h1>
          <p className="text-muted-foreground font-mono">{request.request_number}</p>
        </div>
        <div className="flex gap-2">
          {!request.converted_organization_id && (
            <Button
              variant="outline"
              onClick={() => convertToOrgMutation.mutate()}
              disabled={convertToOrgMutation.isPending}
            >
              <Building2 className="h-4 w-4 ml-2" />
              تحويل إلى منظمة
            </Button>
          )}
          {request.converted_organization_id && (
            <Link to={`/admin/clients/${request.converted_organization_id}`}>
              <Button variant="outline">
                <Building2 className="h-4 w-4 ml-2" />
                عرض المنظمة
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">بيانات المنظمة</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">الكيان:</span>
                <span className="font-medium">{request.organization_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">المسؤول:</span>
                <span className="font-medium">{request.contact_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">البريد:</span>
                <span className="font-medium" dir="ltr">{request.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">الجوال:</span>
                <span className="font-medium" dir="ltr">{request.phone || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">نوع الكيان:</span>
                <span className="font-medium">{request.entity_type || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">المنطقة:</span>
                <span className="font-medium">{request.region || '-'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تفاصيل الباقة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>{request.plan_name}</span>
                <span className="font-bold">{request.plan_price?.toLocaleString('ar-SA')} ر.س</span>
              </div>
              {addons.length > 0 && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground font-medium">الإضافات:</p>
                  {addons.map((a: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{a.name}</span>
                      <span>{a.price?.toLocaleString('ar-SA')} ر.س</span>
                    </div>
                  ))}
                </>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>الإجمالي</span>
                <span className="text-primary">{request.total_amount?.toLocaleString('ar-SA')} ر.س</span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">سجل النشاط</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-muted-foreground text-sm">لا يوجد نشاط بعد</p>
              ) : (
                <div className="space-y-4">
                  {timeline.map(t => (
                    <div key={t.id} className="flex gap-3 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">{actionLabel(t.action)}</p>
                        {t.old_value && t.new_value && (
                          <p className="text-muted-foreground">{t.old_value} ← {t.new_value}</p>
                        )}
                        {t.details?.note && (
                          <p className="text-muted-foreground">{t.details.note}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(t.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">الحالة</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={request.status} onValueChange={v => updateStatusMutation.mutate(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">معلومات إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المصدر:</span>
                <span>{request.page_source || request.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">التاريخ:</span>
                <span>{format(new Date(request.created_at), 'dd/MM/yyyy', { locale: ar })}</span>
              </div>
              {request.utm_source && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UTM:</span>
                  <span className="text-xs">{request.utm_source}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">إضافة ملاحظة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="اكتب ملاحظة..."
                rows={3}
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => addNoteMutation.mutate()}
                disabled={!noteText.trim() || addNoteMutation.isPending}
              >
                إضافة ملاحظة
              </Button>
            </CardContent>
          </Card>

          {request.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">الملاحظات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{request.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
