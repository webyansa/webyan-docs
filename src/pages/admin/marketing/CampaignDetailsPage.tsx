import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Pause, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import CampaignAnalytics from '@/components/marketing/CampaignAnalytics';
import RecipientsList from '@/components/marketing/RecipientsList';

const goalLabels: Record<string, string> = { renewal: 'تجديد', incentive: 'تحفيز', education: 'تثقيف', upgrade: 'ترقية', alert: 'تنبيه' };
const statusLabels: Record<string, string> = { draft: 'مسودة', scheduled: 'مجدولة', sending: 'قيد الإرسال', completed: 'مكتملة', paused: 'متوقفة', cancelled: 'ملغاة' };

export default function CampaignDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const [campRes, recRes, eventsRes, auditRes] = await Promise.all([
      supabase.from('marketing_campaigns').select('*').eq('id', id).single() as any,
      supabase.from('campaign_recipients').select('*, client_organizations(name, contact_email)').eq('campaign_id', id).order('created_at') as any,
      supabase.from('email_engagement_events').select('*').eq('campaign_id', id).order('created_at', { ascending: false }) as any,
      supabase.from('campaign_audit_log').select('*').eq('campaign_id', id).order('created_at', { ascending: false }) as any,
    ]);
    setCampaign(campRes.data);
    setRecipients(recRes.data || []);
    setEvents(eventsRes.data || []);
    setAuditLog(auditRes.data || []);
    setLoading(false);
  };

  const handlePause = async () => {
    await supabase.from('marketing_campaigns').update({ status: 'paused' }).eq('id', id) as any;
    toast.success('تم إيقاف الحملة');
    fetchData();
  };

  const handleRetryFailed = async () => {
    // Reset failed recipients to pending
    await supabase.from('campaign_recipients').update({ email_status: 'pending', error_message: null }).eq('campaign_id', id).eq('email_status', 'failed') as any;
    // Trigger resend
    const { error } = await supabase.functions.invoke('send-campaign', { body: { campaign_id: id } });
    if (error) {
      toast.error('فشل إعادة الإرسال');
    } else {
      toast.success('تم بدء إعادة الإرسال');
    }
    fetchData();
  };

  if (loading || !campaign) {
    return <div className="p-6 text-center text-muted-foreground">جاري التحميل...</div>;
  }

  const openCount = events.filter((e: any) => e.event_type === 'open').length;
  const clickCount = events.filter((e: any) => e.event_type === 'click').length;
  const unsubCount = events.filter((e: any) => e.event_type === 'unsubscribe').length;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{goalLabels[campaign.goal] || campaign.goal}</Badge>
              <Badge>{statusLabels[campaign.status] || campaign.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'sending' && (
            <Button variant="destructive" onClick={handlePause} className="gap-2">
              <Pause className="h-4 w-4" /> إيقاف
            </Button>
          )}
          {campaign.failed_count > 0 && (
            <Button variant="outline" onClick={handleRetryFailed} className="gap-2">
              <RotateCw className="h-4 w-4" /> إعادة الإرسال للفاشلة
            </Button>
          )}
        </div>
      </div>

      <CampaignAnalytics
        campaign={campaign}
        openCount={openCount}
        clickCount={clickCount}
        unsubCount={unsubCount}
      />

      <Tabs defaultValue="recipients">
        <TabsList>
          <TabsTrigger value="recipients">المستلمون ({recipients.length})</TabsTrigger>
          <TabsTrigger value="events">أحداث التفاعل ({events.length})</TabsTrigger>
          <TabsTrigger value="audit">سجل التدقيق ({auditLog.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="recipients">
          <RecipientsList recipients={recipients} />
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">لا توجد أحداث بعد</div>
                ) : (
                  events.slice(0, 50).map((e: any) => (
                    <div key={e.id} className="p-3 flex items-center justify-between">
                      <div>
                        <Badge variant="outline" className="ml-2">
                          {e.event_type === 'open' ? 'فتح' : e.event_type === 'click' ? 'نقر' : e.event_type === 'unsubscribe' ? 'إلغاء' : e.event_type}
                        </Badge>
                        {e.link_url && <span className="text-sm text-muted-foreground">{e.link_url}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString('ar-SA')}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {auditLog.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">لا توجد سجلات</div>
                ) : (
                  auditLog.map((a: any) => (
                    <div key={a.id} className="p-3 flex items-center justify-between">
                      <span className="text-sm">{a.action}</span>
                      <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString('ar-SA')}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
