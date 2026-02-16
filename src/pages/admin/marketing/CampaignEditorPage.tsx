import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Save, Send, Clock } from 'lucide-react';
import AudienceBuilder from '@/components/marketing/AudienceBuilder';
import TemplateEditor from '@/components/marketing/TemplateEditor';

const goalOptions = [
  { value: 'renewal', label: 'تجديد الاشتراك' },
  { value: 'incentive', label: 'تحفيز' },
  { value: 'education', label: 'تثقيف' },
  { value: 'upgrade', label: 'ترقية الباقة' },
  { value: 'alert', label: 'تنبيه' },
];

export default function CampaignEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditing = !!id;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('renewal');

  // Step 2
  const [audienceType, setAudienceType] = useState<'segment' | 'manual'>('segment');
  const [filters, setFilters] = useState<any>({});
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [matchCount, setMatchCount] = useState(0);

  // Step 3
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [useExisting, setUseExisting] = useState(true);

  // Step 5
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState('');

  // Test send
  const [testEmail, setTestEmail] = useState('');
  const [testOrgId, setTestOrgId] = useState('');
  const [testOrgs, setTestOrgs] = useState<any[]>([]);

  useEffect(() => {
    fetchTemplates();
    fetchTestOrgs();
    if (isEditing) loadCampaign();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase.from('marketing_email_templates').select('*').eq('is_active', true).order('name') as any;
    setTemplates(data || []);
  };

  const fetchTestOrgs = async () => {
    const { data } = await supabase.from('client_organizations').select('id, name, contact_email').order('name').limit(50) as any;
    setTestOrgs(data || []);
  };

  const loadCampaign = async () => {
    const { data } = await supabase.from('marketing_campaigns').select('*, marketing_email_templates(*)').eq('id', id).single() as any;
    if (data) {
      setName(data.name);
      setGoal(data.goal);
      setAudienceType(data.audience_type);
      setFilters(data.audience_filters || {});
      if (data.marketing_email_templates) {
        setSelectedTemplateId(data.template_id);
        setSubject(data.marketing_email_templates.subject);
        setHtmlBody(data.marketing_email_templates.html_body);
      }
    }
  };

  const handleSave = async (status: string = 'draft') => {
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم الحملة');
      return;
    }

    setSaving(true);
    try {
      // Save or create template
      let templateId = selectedTemplateId;
      if (!useExisting && subject && htmlBody) {
        const { data: newTpl } = await supabase.from('marketing_email_templates').insert({
          name: `قالب حملة: ${name}`,
          subject,
          html_body: htmlBody,
          created_by: user?.id,
        }).select('id').single() as any;
        if (newTpl) templateId = newTpl.id;
      }

      const campaignData: any = {
        name,
        goal,
        template_id: templateId || null,
        audience_type: audienceType,
        audience_filters: audienceType === 'segment' ? filters : {},
        status,
        updated_by: user?.id,
      };

      if (status === 'scheduled' && scheduledAt) {
        campaignData.scheduled_at = scheduledAt;
      }

      let campaignId = id;
      if (isEditing) {
        await supabase.from('marketing_campaigns').update(campaignData).eq('id', id) as any;
      } else {
        campaignData.created_by = user?.id;
        const { data: newCamp } = await supabase.from('marketing_campaigns').insert(campaignData).select('id').single() as any;
        if (newCamp) campaignId = newCamp.id;
      }

      // Save recipients
      if (campaignId) {
        // Delete old recipients
        await supabase.from('campaign_recipients').delete().eq('campaign_id', campaignId) as any;

        let orgIds: string[] = [];
        if (audienceType === 'manual') {
          orgIds = selectedOrgIds;
        } else {
          // Fetch matching orgs based on filters
          let query = supabase.from('client_organizations').select('id') as any;
          const rules = filters?.rules || [];
          for (const rule of rules) {
            if (rule.field === 'remaining_days') continue;
            if (rule.field === 'is_active') {
              query = query.eq('is_active', rule.value === 'true');
            } else if (rule.operator === 'eq') {
              query = query.eq(rule.field, rule.value);
            } else if (rule.operator === 'neq') {
              query = query.neq(rule.field, rule.value);
            }
          }
          const { data: matchedOrgs } = await query;
          orgIds = (matchedOrgs || []).map((o: any) => o.id);
        }

        if (orgIds.length > 0) {
          const recipientsData = orgIds.map(orgId => ({
            campaign_id: campaignId,
            organization_id: orgId,
          }));
          await supabase.from('campaign_recipients').insert(recipientsData) as any;
          await supabase.from('marketing_campaigns').update({ total_recipients: orgIds.length }).eq('id', campaignId) as any;
        }
      }

      toast.success(status === 'draft' ? 'تم حفظ المسودة' : 'تم حفظ الحملة');
      
      if (status === 'sending' && campaignId) {
        // Trigger send
        const { error } = await supabase.functions.invoke('send-campaign', {
          body: { campaign_id: campaignId },
        });
        if (error) throw error;
        toast.success('تم بدء إرسال الحملة');
      }

      navigate('/admin/marketing');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
      console.error(error);
    }
    setSaving(false);
  };

  const handleTestSend = async () => {
    if (!testEmail || !testOrgId || !selectedTemplateId) {
      toast.error('يرجى تحديد البريد والمنظمة والقالب');
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('send-campaign', {
        body: { campaign_id: id || 'test', test_email: testEmail, test_org_id: testOrgId },
      });
      if (error) throw error;
      toast.success('تم إرسال البريد التجريبي');
    } catch {
      toast.error('فشل إرسال البريد التجريبي');
    }
  };

  const totalSteps = 5;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEditing ? 'تعديل الحملة' : 'إنشاء حملة جديدة'}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          الخطوة {step} من {totalSteps}
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>معلومات أساسية</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>اسم الحملة</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: حملة تجديد الاشتراكات" />
            </div>
            <div>
              <Label>هدف الحملة</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {goalOptions.map(g => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Audience */}
      {step === 2 && (
        <AudienceBuilder
          audienceType={audienceType}
          onAudienceTypeChange={setAudienceType}
          filters={filters}
          onFiltersChange={setFilters}
          selectedOrgIds={selectedOrgIds}
          onSelectedOrgIdsChange={setSelectedOrgIds}
          matchCount={matchCount}
          onMatchCountChange={setMatchCount}
        />
      )}

      {/* Step 3: Template */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <Button variant={useExisting ? 'default' : 'outline'} onClick={() => setUseExisting(true)}>اختيار قالب موجود</Button>
                <Button variant={!useExisting ? 'default' : 'outline'} onClick={() => setUseExisting(false)}>إنشاء قالب جديد</Button>
              </div>
              {useExisting && (
                <Select value={selectedTemplateId} onValueChange={(v) => {
                  setSelectedTemplateId(v);
                  const tpl = templates.find(t => t.id === v);
                  if (tpl) { setSubject(tpl.subject); setHtmlBody(tpl.html_body); }
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر قالب..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
          {(!useExisting || selectedTemplateId) && (
            <TemplateEditor
              subject={subject}
              onSubjectChange={setSubject}
              htmlBody={htmlBody}
              onHtmlBodyChange={setHtmlBody}
            />
          )}
        </div>
      )}

      {/* Step 4: Preview & Test */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>معاينة واختبار</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4 bg-white min-h-[300px]">
              <p className="text-sm text-muted-foreground mb-2">عنوان البريد: <strong>{subject}</strong></p>
              <div dangerouslySetInnerHTML={{ __html: htmlBody }} />
            </div>
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-medium">إرسال تجريبي</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="البريد الإلكتروني" />
                <Select value={testOrgId} onValueChange={setTestOrgId}>
                  <SelectTrigger><SelectValue placeholder="اختر منظمة للمعاينة" /></SelectTrigger>
                  <SelectContent>
                    {testOrgs.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleTestSend} variant="outline">إرسال تجريبي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Schedule */}
      {step === 5 && (
        <Card>
          <CardHeader><CardTitle>الجدولة والإرسال</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                variant={sendMode === 'now' ? 'default' : 'outline'}
                onClick={() => setSendMode('now')}
                className="gap-2 flex-1"
              >
                <Send className="h-4 w-4" /> إرسال فوري
              </Button>
              <Button
                variant={sendMode === 'schedule' ? 'default' : 'outline'}
                onClick={() => setSendMode('schedule')}
                className="gap-2 flex-1"
              >
                <Clock className="h-4 w-4" /> جدولة
              </Button>
            </div>
            {sendMode === 'schedule' && (
              <div>
                <Label>تاريخ ووقت الإرسال</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : navigate('/admin/marketing')} className="gap-2">
          <ArrowRight className="h-4 w-4" />
          {step > 1 ? 'السابق' : 'إلغاء'}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> حفظ كمسودة
          </Button>
          {step < totalSteps ? (
            <Button onClick={() => setStep(step + 1)} className="gap-2">
              التالي <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => handleSave(sendMode === 'now' ? 'sending' : 'scheduled')} disabled={saving} className="gap-2">
              <Send className="h-4 w-4" />
              {sendMode === 'now' ? 'إرسال الآن' : 'جدولة الحملة'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
