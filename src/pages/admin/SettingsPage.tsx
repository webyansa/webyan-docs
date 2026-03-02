import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Globe, Bell, Shield, Database, Save, Mail, Loader2, Upload, FileImage, Sparkles, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
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
  ai_default_provider: string;
  ai_openai_api_key: string;
  ai_gemini_api_key: string;
  ai_default_model_openai: string;
  ai_default_model_gemini: string;
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
    ai_default_provider: 'lovable',
    ai_openai_api_key: '',
    ai_gemini_api_key: '',
    ai_default_model_openai: 'gpt-4o',
    ai_default_model_gemini: 'gemini-2.5-flash',
  });
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'success' | 'error' | null>>({});

  const handleTestConnection = async (provider: 'openai' | 'gemini' | 'lovable') => {
    setTestingProvider(provider);
    setConnectionStatus(prev => ({ ...prev, [provider]: null }));
    try {
      // First save the keys
      await handleSaveSettings(['ai_default_provider', 'ai_openai_api_key', 'ai_gemini_api_key', 'ai_default_model_openai', 'ai_default_model_gemini']);
      
      // Then test by calling the edge function
      const { data, error } = await supabase.functions.invoke('generate-marketing-content', {
        body: {
          provider,
          idea_description: 'اختبار اتصال - test connection',
          platform: 'x',
          tone: 'formal',
          language: 'ar',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.title || data?.post_text) {
        setConnectionStatus(prev => ({ ...prev, [provider]: 'success' }));
        toast.success(`✅ تم الاتصال بنجاح بـ ${provider === 'openai' ? 'OpenAI' : provider === 'gemini' ? 'Google Gemini' : 'Lovable AI'}`);
      } else {
        throw new Error('لم يتم استلام نتيجة صحيحة');
      }
    } catch (err: any) {
      console.error('Connection test failed:', err);
      setConnectionStatus(prev => ({ ...prev, [provider]: 'error' }));
      toast.error(`❌ فشل الاتصال: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setTestingProvider(null);
    }
  };

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
        ai_default_provider: 'lovable',
        ai_openai_api_key: '',
        ai_gemini_api_key: '',
        ai_default_model_openai: 'gpt-4o',
        ai_default_model_gemini: 'gemini-2.5-flash',
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
        
        // First try update
        const { data: updated, error: updateError } = await supabase
          .from('system_settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key)
          .select();

        if (updateError) throw updateError;

        // If no rows updated, insert new record
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

  const handleSave = () => {
    toast.success('تم حفظ الإعدادات بنجاح');
  };

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
        <p className="text-muted-foreground">
          إعدادات نظام التوثيق
        </p>
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
            <Input
              id="admin-email"
              type="email"
              value={settings.admin_email}
              onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
              placeholder="admin@example.com"
              dir="ltr"
            />
            <p className="text-sm text-muted-foreground">
              سيتم إرسال إشعارات التذاكر الجديدة إلى هذا البريد
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="accounts-email">بريد مسؤول الحسابات</Label>
            <Input
              id="accounts-email"
              type="email"
              value={settings.accounts_email}
              onChange={(e) => setSettings({ ...settings, accounts_email: e.target.value })}
              placeholder="accounts@example.com"
              dir="ltr"
            />
            <p className="text-sm text-muted-foreground">
              سيتم إرسال طلبات إصدار الفواتير إلى هذا البريد
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="company-name">اسم الشركة</Label>
            <Input
              id="company-name"
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              placeholder="اسم الشركة"
            />
            <p className="text-sm text-muted-foreground">
              يظهر في رسائل البريد الإلكتروني المرسلة للعملاء
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="response-time">وقت الاستجابة المتوقع (ساعات)</Label>
            <Input
              id="response-time"
              type="number"
              min="1"
              max="168"
              value={settings.support_response_time}
              onChange={(e) => setSettings({ ...settings, support_response_time: e.target.value })}
              placeholder="48"
              dir="ltr"
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              يظهر في رسالة تأكيد استلام التذكرة للعميل
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mt-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              إشعارات البريد الإلكتروني
            </h4>
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
            <Select 
              value={settings.max_upload_size_mb} 
              onValueChange={(value) => setSettings({ ...settings, max_upload_size_mb: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="اختر الحجم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5 MB</SelectItem>
                <SelectItem value="1">1 MB</SelectItem>
                <SelectItem value="2">2 MB</SelectItem>
                <SelectItem value="5">5 MB</SelectItem>
                <SelectItem value="10">10 MB</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              الحد الأقصى المسموح به لحجم الصور المرفقة مع التذاكر
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              أنواع الصور المسموح بها
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {allFileTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={type.value}
                    checked={settings.allowed_file_types.includes(type.value)}
                    onCheckedChange={(checked) => {
                      const types = settings.allowed_file_types.split(',').filter(Boolean);
                      if (checked) {
                        types.push(type.value);
                      } else {
                        const index = types.indexOf(type.value);
                        if (index > -1) types.splice(index, 1);
                      }
                      setSettings({ ...settings, allowed_file_types: types.join(',') });
                    }}
                  />
                  <Label htmlFor={type.value} className="cursor-pointer">{type.label}</Label>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              حدد أنواع الصور التي يمكن للعملاء رفعها مع التذاكر
            </p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 mt-4">
            <h4 className="font-medium mb-2 text-orange-700 dark:text-orange-400">ملاحظة</h4>
            <p className="text-sm text-orange-600 dark:text-orange-300">
              يتم التحقق من حجم ونوع الملف قبل رفعه. الملفات التي لا تطابق هذه الإعدادات سيتم رفضها تلقائياً.
            </p>
          </div>

          <Button onClick={() => handleSaveSettings(['max_upload_size_mb', 'allowed_file_types'])} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ إعدادات الملفات
          </Button>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card className="border-violet-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            إعدادات الذكاء الاصطناعي
          </CardTitle>
          <CardDescription>ربط مزودي الذكاء الاصطناعي لتوليد المحتوى التسويقي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Provider */}
          <div className="space-y-2">
            <Label>المزود الافتراضي</Label>
            <Select value={settings.ai_default_provider} onValueChange={v => setSettings({ ...settings, ai_default_provider: v })}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">Lovable AI (مجاني - مدمج)</SelectItem>
                <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                <SelectItem value="gemini">Google (Gemini)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Lovable AI مدمج ولا يحتاج مفتاح. لاستخدام OpenAI أو Gemini أدخل مفتاح API أدناه.
            </p>
          </div>

          <Separator />

          {/* OpenAI */}
          <div className="space-y-3 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">OpenAI (ChatGPT)</Label>
              {settings.ai_openai_api_key ? (
                <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> مفعّل</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5" /> غير مفعّل</span>
              )}
            </div>
            <div className="relative">
              <Input
                type={showOpenAIKey ? 'text' : 'password'}
                value={settings.ai_openai_api_key}
                onChange={e => setSettings({ ...settings, ai_openai_api_key: e.target.value })}
                placeholder="sk-..."
                dir="ltr"
                className="pr-10"
              />
              <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={() => setShowOpenAIKey(!showOpenAIKey)}>
                {showOpenAIKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">النموذج الافتراضي</Label>
              <Select value={settings.ai_default_model_openai} onValueChange={v => setSettings({ ...settings, ai_default_model_openai: v })}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              احصل على مفتاح API من{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">platform.openai.com</a>
            </p>
          </div>

          {/* Gemini */}
          <div className="space-y-3 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Google Gemini</Label>
              {settings.ai_gemini_api_key ? (
                <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> مفعّل</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5" /> غير مفعّل</span>
              )}
            </div>
            <div className="relative">
              <Input
                type={showGeminiKey ? 'text' : 'password'}
                value={settings.ai_gemini_api_key}
                onChange={e => setSettings({ ...settings, ai_gemini_api_key: e.target.value })}
                placeholder="AIza..."
                dir="ltr"
                className="pr-10"
              />
              <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={() => setShowGeminiKey(!showGeminiKey)}>
                {showGeminiKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">النموذج الافتراضي</Label>
              <Select value={settings.ai_default_model_gemini} onValueChange={v => setSettings({ ...settings, ai_default_model_gemini: v })}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                  <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                  <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              احصل على مفتاح API من{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a>
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => handleSaveSettings(['ai_default_provider', 'ai_openai_api_key', 'ai_gemini_api_key', 'ai_default_model_openai', 'ai_default_model_gemini'])} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ إعدادات الذكاء الاصطناعي
            </Button>

            <Separator orientation="vertical" className="h-9" />

            {settings.ai_openai_api_key && (
              <Button variant="outline" onClick={() => handleTestConnection('openai')} disabled={testingProvider !== null} className="gap-2">
                {testingProvider === 'openai' ? <Loader2 className="h-4 w-4 animate-spin" /> : connectionStatus.openai === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : connectionStatus.openai === 'error' ? <XCircle className="h-4 w-4 text-destructive" /> : <Sparkles className="h-4 w-4" />}
                اختبار OpenAI
              </Button>
            )}
            {settings.ai_gemini_api_key && (
              <Button variant="outline" onClick={() => handleTestConnection('gemini')} disabled={testingProvider !== null} className="gap-2">
                {testingProvider === 'gemini' ? <Loader2 className="h-4 w-4 animate-spin" /> : connectionStatus.gemini === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : connectionStatus.gemini === 'error' ? <XCircle className="h-4 w-4 text-destructive" /> : <Sparkles className="h-4 w-4" />}
                اختبار Gemini
              </Button>
            )}
            <Button variant="outline" onClick={() => handleTestConnection('lovable')} disabled={testingProvider !== null} className="gap-2">
              {testingProvider === 'lovable' ? <Loader2 className="h-4 w-4 animate-spin" /> : connectionStatus.lovable === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : connectionStatus.lovable === 'error' ? <XCircle className="h-4 w-4 text-destructive" /> : <Sparkles className="h-4 w-4" />}
              اختبار Lovable AI
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إعدادات عامة
          </CardTitle>
          <CardDescription>إعدادات أساسية للدليل</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="site-name">اسم الدليل</Label>
            <Input
              id="site-name"
              value={generalSettings.siteName}
              onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
              placeholder="اسم الدليل"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-description">وصف الدليل</Label>
            <Input
              id="site-description"
              value={generalSettings.siteDescription}
              onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })}
              placeholder="وصف مختصر"
            />
          </div>
        </CardContent>
      </Card>

      {/* Localization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            اللغة والتوطين
          </CardTitle>
          <CardDescription>إعدادات اللغة والمنطقة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>اللغة الافتراضية</Label>
              <p className="text-sm text-muted-foreground">العربية</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>دعم اللغة الإنجليزية</Label>
              <p className="text-sm text-muted-foreground">
                إتاحة المحتوى باللغة الإنجليزية
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            الإشعارات
          </CardTitle>
          <CardDescription>إعدادات التنبيهات والإشعارات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>إشعارات البلاغات الجديدة</Label>
              <p className="text-sm text-muted-foreground">
                تلقي إشعار عند وصول بلاغ جديد
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>تقرير أسبوعي</Label>
              <p className="text-sm text-muted-foreground">
                إرسال ملخص أسبوعي للإحصائيات
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            الأمان
          </CardTitle>
          <CardDescription>إعدادات الأمان والوصول</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>السماح بالتسجيل العام</Label>
              <p className="text-sm text-muted-foreground">
                السماح لأي شخص بإنشاء حساب
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>التحقق بخطوتين</Label>
              <p className="text-sm text-muted-foreground">
                طلب التحقق بخطوتين للمدراء
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            البيانات
          </CardTitle>
          <CardDescription>إدارة بيانات النظام</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>تصدير البيانات</Label>
              <p className="text-sm text-muted-foreground">
                تصدير جميع المقالات والإعدادات
              </p>
            </div>
            <Button variant="outline">تصدير</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>استيراد البيانات</Label>
              <p className="text-sm text-muted-foreground">
                استيراد بيانات من ملف
              </p>
            </div>
            <Button variant="outline">استيراد</Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
}
