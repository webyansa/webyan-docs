import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Settings, Globe, Bell, Shield, Database, Save, Mail, Loader2, Upload, FileImage, Sparkles, Eye, EyeOff, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';

interface SystemSettings {
  admin_email: string;
  accounts_email: string;
  company_name: string;
  support_response_time: string;
  max_upload_size_mb: string;
  allowed_file_types: string;
  // AI settings (unified OpenAI only)
  ai_mode: string;
  ai_openai_api_key: string;
  ai_vector_store_id: string;
  ai_assistant_id: string;
  ai_temperature: string;
  ai_top_p: string;
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    admin_email: '',
    accounts_email: '',
    company_name: '',
    support_response_time: '48',
    max_upload_size_mb: '1',
    allowed_file_types: 'image/jpeg,image/png,image/gif,image/webp',
    ai_mode: 'responses',
    ai_openai_api_key: '',
    ai_vector_store_id: 'vs_69a6d92075cc8191970d2cabc1282f01',
    ai_assistant_id: '',
    ai_temperature: '0.5',
    ai_top_p: '0.9',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [healthCheckRunning, setHealthCheckRunning] = useState(false);
  const [healthResults, setHealthResults] = useState<any>(null);

  const allFileTypes = [
    { value: 'image/jpeg', label: 'JPEG' },
    { value: 'image/png', label: 'PNG' },
    { value: 'image/gif', label: 'GIF' },
    { value: 'image/webp', label: 'WebP' },
  ];

  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'دليل استخدام ويبيان',
    siteDescription: 'الدليل الشامل لاستخدام لوحة تحكم ويبيان',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap: SystemSettings = {
        admin_email: '',
        accounts_email: '',
        company_name: '',
        support_response_time: '48',
        max_upload_size_mb: '1',
        allowed_file_types: 'image/jpeg,image/png,image/gif,image/webp',
        ai_mode: 'responses',
        ai_openai_api_key: '',
        ai_vector_store_id: 'vs_69a6d92075cc8191970d2cabc1282f01',
        ai_assistant_id: '',
        ai_temperature: '0.5',
        ai_top_p: '0.9',
      };

      data?.forEach((item: { key: string; value: string }) => {
        if (item.key in settingsMap) {
          (settingsMap as any)[item.key] = item.value;
        }
      });

      setSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (keys: string[]) => {
    setIsSaving(true);
    try {
      for (const key of keys) {
        const value = (settings as any)[key] || '';
        const { data: updated, error: updateError } = await supabase
          .from('system_settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key)
          .select();

        if (updateError) throw updateError;

        if (!updated || updated.length === 0) {
          const { error: insertError } = await supabase
            .from('system_settings')
            .insert({ key, value, description: key });
          if (insertError) throw insertError;
        }
      }

      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHealthCheck = async () => {
    setHealthCheckRunning(true);
    setHealthResults(null);
    try {
      // Save settings first
      await handleSaveSettings(['ai_mode', 'ai_openai_api_key', 'ai_vector_store_id', 'ai_assistant_id', 'ai_temperature', 'ai_top_p']);
      
      const { data, error } = await supabase.functions.invoke('ai-health-check', { body: {} });
      if (error) throw error;
      setHealthResults(data);
      const allPass = data.api_reachable?.pass && data.vector_store_reachable?.pass && data.retrieval_used?.pass;
      if (allPass) {
        toast.success('✅ جميع الفحوصات ناجحة');
      } else {
        toast.warning('⚠️ بعض الفحوصات لم تنجح');
      }
    } catch (err: any) {
      toast.error(`فشل الفحص: ${err.message}`);
    } finally {
      setHealthCheckRunning(false);
    }
  };

  const handleSave = () => {
    toast.success('تم حفظ الإعدادات بنجاح');
  };

  const modelDisplay = settings.ai_mode === 'assistants' ? 'gpt-4-0125-preview' : 'gpt-4.1';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground">إعدادات نظام التوثيق</p>
      </div>

      {/* Email Settings */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            إعدادات البريد الإلكتروني
          </CardTitle>
          <CardDescription>إعدادات إشعارات البريد الإلكتروني للتذاكر</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="admin-email">البريد الإلكتروني للإدارة</Label>
            <Input id="admin-email" type="email" value={settings.admin_email} onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })} placeholder="admin@example.com" dir="ltr" />
            <p className="text-sm text-muted-foreground">سيتم إرسال إشعارات التذاكر الجديدة إلى هذا البريد</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="accounts-email">بريد مسؤول الحسابات</Label>
            <Input id="accounts-email" type="email" value={settings.accounts_email} onChange={(e) => setSettings({ ...settings, accounts_email: e.target.value })} placeholder="accounts@example.com" dir="ltr" />
            <p className="text-sm text-muted-foreground">سيتم إرسال طلبات إصدار الفواتير إلى هذا البريد</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="company-name">اسم الشركة</Label>
            <Input id="company-name" value={settings.company_name} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} placeholder="اسم الشركة" />
            <p className="text-sm text-muted-foreground">يظهر في رسائل البريد الإلكتروني المرسلة للعملاء</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="response-time">وقت الاستجابة المتوقع (ساعات)</Label>
            <Input id="response-time" type="number" min="1" max="168" value={settings.support_response_time} onChange={(e) => setSettings({ ...settings, support_response_time: e.target.value })} placeholder="48" dir="ltr" className="w-32" />
            <p className="text-sm text-muted-foreground">يظهر في رسالة تأكيد استلام التذكرة للعميل</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 mt-4">
            <h4 className="font-medium mb-2 flex items-center gap-2"><Bell className="h-4 w-4" />إشعارات البريد الإلكتروني</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ إشعار للإدارة عند وصول تذكرة جديدة</li>
              <li>✓ رسالة تأكيد للعميل عند إنشاء تذكرة</li>
              <li>✓ إشعار للعميل عند الرد على تذكرته</li>
              <li>✓ إشعار للعميل عند تحديث حالة التذكرة</li>
            </ul>
          </div>
          <Button onClick={() => handleSaveSettings(['admin_email', 'accounts_email', 'company_name', 'support_response_time'])} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ إعدادات البريد
          </Button>
        </CardContent>
      </Card>

      {/* File Upload Settings */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-orange-500" />
            إعدادات رفع الملفات
          </CardTitle>
          <CardDescription>التحكم في حجم وأنواع الملفات المسموح برفعها</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="max-upload-size">الحد الأقصى لحجم الملف (ميجابايت)</Label>
            <Select value={settings.max_upload_size_mb} onValueChange={(value) => setSettings({ ...settings, max_upload_size_mb: value })}>
              <SelectTrigger className="w-32"><SelectValue placeholder="اختر الحجم" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5 MB</SelectItem>
                <SelectItem value="1">1 MB</SelectItem>
                <SelectItem value="2">2 MB</SelectItem>
                <SelectItem value="5">5 MB</SelectItem>
                <SelectItem value="10">10 MB</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">الحد الأقصى المسموح به لحجم الصور المرفقة مع التذاكر</p>
          </div>
          <Separator />
          <div className="space-y-3">
            <Label className="flex items-center gap-2"><FileImage className="h-4 w-4" />أنواع الصور المسموح بها</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {allFileTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={type.value}
                    checked={settings.allowed_file_types.includes(type.value)}
                    onCheckedChange={(checked) => {
                      const types = settings.allowed_file_types.split(',').filter(Boolean);
                      if (checked) types.push(type.value);
                      else {
                        const idx = types.indexOf(type.value);
                        if (idx > -1) types.splice(idx, 1);
                      }
                      setSettings({ ...settings, allowed_file_types: types.join(',') });
                    }}
                  />
                  <Label htmlFor={type.value} className="cursor-pointer">{type.label}</Label>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={() => handleSaveSettings(['max_upload_size_mb', 'allowed_file_types'])} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ إعدادات الملفات
          </Button>
        </CardContent>
      </Card>

      {/* AI Settings - Unified OpenAI */}
      <Card className="border-violet-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            إعدادات الذكاء الاصطناعي
          </CardTitle>
          <CardDescription>إعدادات OpenAI الموحدة لتوليد المحتوى التسويقي (Responses API + file_search)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>وضع الذكاء الاصطناعي (AI Mode)</Label>
              <Select value={settings.ai_mode} onValueChange={v => setSettings({ ...settings, ai_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="responses">Responses API (موصى به)</SelectItem>
                  <SelectItem value="assistants">Assistants API (تجريبي)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>النموذج (ثابت)</Label>
              <Input value={modelDisplay} disabled dir="ltr" className="bg-muted font-mono" />
              <p className="text-xs text-muted-foreground">يتم تحديده تلقائياً حسب الوضع المختار</p>
            </div>
          </div>

          <Separator />

          {/* API Key */}
          <div className="space-y-2">
            <Label>OpenAI API Key</Label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={settings.ai_openai_api_key}
                onChange={e => setSettings({ ...settings, ai_openai_api_key: e.target.value })}
                placeholder="sk-..."
                dir="ltr"
                className="pr-10"
              />
              <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={() => setShowApiKey(!showApiKey)}>
                {showApiKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              احصل على مفتاح API من{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">platform.openai.com</a>
            </p>
          </div>

          {/* Vector Store ID */}
          <div className="space-y-2">
            <Label>Vector Store ID</Label>
            <Input
              value={settings.ai_vector_store_id}
              onChange={e => setSettings({ ...settings, ai_vector_store_id: e.target.value })}
              placeholder="vs_..."
              dir="ltr"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">معرف مخزن المعرفة (Knowledge Store) في OpenAI لتفعيل file_search</p>
          </div>

          {/* Assistant ID (only for Assistants mode) */}
          {settings.ai_mode === 'assistants' && (
            <div className="space-y-2">
              <Label>Assistant ID</Label>
              <Input
                value={settings.ai_assistant_id}
                onChange={e => setSettings({ ...settings, ai_assistant_id: e.target.value })}
                placeholder="asst_..."
                dir="ltr"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">معرف المساعد في OpenAI (مطلوب في وضع Assistants API)</p>
            </div>
          )}

          <Separator />

          {/* Temperature & TopP */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Temperature</Label>
                <span className="text-sm font-mono text-muted-foreground">{settings.ai_temperature}</span>
              </div>
              <Slider
                value={[parseFloat(settings.ai_temperature)]}
                onValueChange={v => setSettings({ ...settings, ai_temperature: v[0].toFixed(2) })}
                min={0} max={1} step={0.05}
              />
              <p className="text-xs text-muted-foreground">قيمة أقل = إخراج أكثر تحفظاً، قيمة أعلى = أكثر إبداعاً</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Top P</Label>
                <span className="text-sm font-mono text-muted-foreground">{settings.ai_top_p}</span>
              </div>
              <Slider
                value={[parseFloat(settings.ai_top_p)]}
                onValueChange={v => setSettings({ ...settings, ai_top_p: v[0].toFixed(2) })}
                min={0} max={1} step={0.05}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => handleSaveSettings(['ai_mode', 'ai_openai_api_key', 'ai_vector_store_id', 'ai_assistant_id', 'ai_temperature', 'ai_top_p'])} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ إعدادات الذكاء الاصطناعي
            </Button>
            <Separator orientation="vertical" className="h-9" />
            <Button variant="outline" onClick={handleHealthCheck} disabled={healthCheckRunning} className="gap-2">
              {healthCheckRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              تشغيل فحص الصحة (Health Check)
            </Button>
          </div>

          {/* Health Check Results */}
          {healthResults && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3 mt-4">
              <h4 className="font-semibold text-sm">نتائج الفحص</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { key: 'api_reachable', label: 'API متاح' },
                  { key: 'vector_store_reachable', label: 'Vector Store متصل' },
                  { key: 'retrieval_used', label: 'Retrieval يعمل' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-start gap-2 p-3 rounded-md bg-background border">
                    {healthResults[key]?.pass ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{healthResults[key]?.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              {healthResults.sample_response && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium mb-1">عينة الرد:</h5>
                  <div className="bg-background rounded-md p-3 text-sm max-h-[200px] overflow-auto border">
                    {healthResults.sample_response}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />إعدادات عامة</CardTitle>
          <CardDescription>إعدادات أساسية للدليل</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="site-name">اسم الدليل</Label>
            <Input id="site-name" value={generalSettings.siteName} onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })} placeholder="اسم الدليل" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-description">وصف الدليل</Label>
            <Input id="site-description" value={generalSettings.siteDescription} onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })} placeholder="وصف مختصر" />
          </div>
        </CardContent>
      </Card>

      {/* Localization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />اللغة والتوطين</CardTitle>
          <CardDescription>إعدادات اللغة والمنطقة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5"><Label>اللغة الافتراضية</Label><p className="text-sm text-muted-foreground">العربية</p></div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5"><Label>دعم اللغة الإنجليزية</Label><p className="text-sm text-muted-foreground">إتاحة المحتوى باللغة الإنجليزية</p></div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />الإشعارات</CardTitle>
          <CardDescription>إعدادات التنبيهات والإشعارات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5"><Label>إشعارات البلاغات الجديدة</Label><p className="text-sm text-muted-foreground">تلقي إشعار عند وصول بلاغ جديد</p></div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5"><Label>تقرير أسبوعي</Label><p className="text-sm text-muted-foreground">إرسال ملخص أسبوعي للإحصائيات</p></div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />الأمان</CardTitle>
          <CardDescription>إعدادات الأمان والوصول</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5"><Label>السماح بالتسجيل العام</Label><p className="text-sm text-muted-foreground">السماح لأي شخص بإنشاء حساب</p></div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5"><Label>التحقق بخطوتين</Label><p className="text-sm text-muted-foreground">طلب التحقق بخطوتين للمدراء</p></div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />البيانات</CardTitle>
          <CardDescription>إدارة بيانات النظام</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5"><Label>تصدير البيانات</Label><p className="text-sm text-muted-foreground">تصدير جميع المقالات والإعدادات</p></div>
            <Button variant="outline">تصدير</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5"><Label>استيراد البيانات</Label><p className="text-sm text-muted-foreground">استيراد بيانات من ملف</p></div>
            <Button variant="outline">استيراد</Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" />حفظ الإعدادات</Button>
      </div>
    </div>
  );
}
