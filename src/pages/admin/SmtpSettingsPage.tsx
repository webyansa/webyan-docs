import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  Server, 
  Save, 
  Loader2, 
  Eye, 
  EyeOff, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  Lock,
  Globe,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SmtpSettings {
  smtp_enabled: boolean;
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_sender_email: string;
  smtp_sender_name: string;
  smtp_encryption: string;
  public_base_url: string;
}

export default function SmtpSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [settings, setSettings] = useState<SmtpSettings>({
    smtp_enabled: false,
    smtp_host: '',
    smtp_port: '587',
    smtp_username: '',
    smtp_password: '',
    smtp_sender_email: '',
    smtp_sender_name: 'ويبيان',
    smtp_encryption: 'tls',
    public_base_url: 'https://docs.webyan.net',
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

      const settingsMap: SmtpSettings = { ...settings };

      data?.forEach((item: { key: string; value: string }) => {
        if (item.key in settingsMap) {
          if (item.key === 'smtp_enabled') {
            (settingsMap as any)[item.key] = item.value === 'true';
          } else {
            (settingsMap as any)[item.key] = item.value;
          }
        }
      });

      setSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching SMTP settings:', error);
      toast.error('حدث خطأ أثناء تحميل الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value),
      }));

      for (const update of updates) {
        // Try to update first
        const { error: updateError } = await supabase
          .from('system_settings')
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq('key', update.key);

        // If no rows affected, insert new record
        if (updateError) {
          const { error: insertError } = await supabase
            .from('system_settings')
            .insert({ 
              key: update.key, 
              value: update.value,
              description: getSettingDescription(update.key)
            });
          
          if (insertError) {
            console.error('Error saving setting:', update.key, insertError);
          }
        }
      }

      toast.success('تم حفظ إعدادات SMTP بنجاح');
    } catch (error: any) {
      console.error('Error saving SMTP settings:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      smtp_enabled: 'تفعيل SMTP المخصص',
      smtp_host: 'عنوان سيرفر SMTP',
      smtp_port: 'منفذ SMTP',
      smtp_username: 'اسم مستخدم SMTP',
      smtp_password: 'كلمة مرور SMTP',
      smtp_sender_email: 'بريد المرسل',
      smtp_sender_name: 'اسم المرسل',
      smtp_encryption: 'نوع التشفير',
      public_base_url: 'رابط الموقع الرسمي',
    };
    return descriptions[key] || key;
  };

  const handleTestConnection = async () => {
    if (!testEmail) {
      toast.error('يرجى إدخال بريد إلكتروني للاختبار');
      return;
    }

    setIsTesting(true);
    try {
      // Call edge function to test SMTP
      const { data, error } = await supabase.functions.invoke('test-smtp', {
        body: {
          to_email: testEmail,
          smtp_settings: settings
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('تم إرسال رسالة الاختبار بنجاح! تحقق من بريدك الإلكتروني');
      } else {
        toast.error(data?.message || 'فشل إرسال رسالة الاختبار');
      }
    } catch (error: any) {
      console.error('Error testing SMTP:', error);
      toast.error('حدث خطأ أثناء اختبار الاتصال: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setIsTesting(false);
    }
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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" />
          إعدادات SMTP
        </h1>
        <p className="text-muted-foreground">
          إعداد سيرفر البريد الإلكتروني لإرسال رسائل النظام
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          إعدادات SMTP تتحكم في إرسال رسائل البريد الإلكتروني مثل إشعارات التذاكر، ترحيب العملاء، وتنبيهات الموظفين.
          <br />
          <strong>ملاحظة:</strong> لتغيير رسائل المصادقة (استعادة كلمة المرور، تأكيد البريد)، يجب ضبط SMTP من إعدادات الخلفية.
        </AlertDescription>
      </Alert>

      {/* Enable/Disable SMTP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            تفعيل SMTP المخصص
          </CardTitle>
          <CardDescription>
            استخدام سيرفر SMTP خاص بدلاً من الافتراضي (Resend)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>تفعيل SMTP المخصص</Label>
              <p className="text-sm text-muted-foreground">
                عند التفعيل، سيتم استخدام إعدادات SMTP أدناه لإرسال البريد
              </p>
            </div>
            <Switch
              checked={settings.smtp_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, smtp_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Public Base URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            رابط الموقع الرسمي
          </CardTitle>
          <CardDescription>
            الرابط المستخدم في جميع روابط البريد الإلكتروني
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="public-url">رابط الموقع (Site URL)</Label>
            <Input
              id="public-url"
              value={settings.public_base_url}
              onChange={(e) => setSettings({ ...settings, public_base_url: e.target.value })}
              placeholder="https://docs.webyan.net"
              dir="ltr"
            />
            <p className="text-sm text-muted-foreground">
              هذا الرابط سيستخدم في جميع الروابط المرسلة عبر البريد الإلكتروني
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SMTP Server Settings */}
      <Card className={!settings.smtp_enabled ? 'opacity-60' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-orange-500" />
            إعدادات السيرفر
          </CardTitle>
          <CardDescription>بيانات الاتصال بسيرفر SMTP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">عنوان السيرفر (Host)</Label>
              <Input
                id="smtp-host"
                value={settings.smtp_host}
                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                placeholder="smtp.webyan.net"
                disabled={!settings.smtp_enabled}
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-port">المنفذ (Port)</Label>
              <Select 
                value={settings.smtp_port} 
                onValueChange={(value) => {
                  // Keep port/encryption in a compatible pairing to reduce SMTP test failures
                  const next: SmtpSettings = { ...settings, smtp_port: value };
                  if (value === '465') next.smtp_encryption = 'ssl';
                  else if (value === '587') next.smtp_encryption = 'tls';
                  else if (value === '25') next.smtp_encryption = 'none';
                  setSettings(next);
                }}
                disabled={!settings.smtp_enabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنفذ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 (غير مشفر)</SelectItem>
                  <SelectItem value="465">465 (SSL)</SelectItem>
                  <SelectItem value="587">587 (TLS - موصى به)</SelectItem>
                  <SelectItem value="2525">2525 (بديل)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp-encryption">نوع التشفير</Label>
            <Select 
              value={settings.smtp_encryption} 
              onValueChange={(value) => setSettings({ ...settings, smtp_encryption: value })}
              disabled={!settings.smtp_enabled}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="اختر التشفير" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون تشفير</SelectItem>
                <SelectItem value="ssl">SSL</SelectItem>
                <SelectItem value="tls">TLS (موصى به)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-username">اسم المستخدم (Username)</Label>
              <Input
                id="smtp-username"
                value={settings.smtp_username}
                onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })}
                placeholder="noreply@webyan.net"
                disabled={!settings.smtp_enabled}
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-password">كلمة المرور (Password)</Label>
              <div className="relative">
                <Input
                  id="smtp-password"
                  type={showPassword ? "text" : "password"}
                  value={settings.smtp_password}
                  onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                  placeholder="••••••••"
                  disabled={!settings.smtp_enabled}
                  dir="ltr"
                  className="pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={!settings.smtp_enabled}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sender Settings */}
      <Card className={!settings.smtp_enabled ? 'opacity-60' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-green-500" />
            إعدادات المرسل
          </CardTitle>
          <CardDescription>معلومات المرسل التي تظهر في رسائل البريد</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sender-email">بريد المرسل (From Email)</Label>
              <Input
                id="sender-email"
                type="email"
                value={settings.smtp_sender_email}
                onChange={(e) => setSettings({ ...settings, smtp_sender_email: e.target.value })}
                placeholder="noreply@webyan.net"
                disabled={!settings.smtp_enabled}
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sender-name">اسم المرسل (From Name)</Label>
              <Input
                id="sender-name"
                value={settings.smtp_sender_name}
                onChange={(e) => setSettings({ ...settings, smtp_sender_name: e.target.value })}
                placeholder="ويبيان"
                disabled={!settings.smtp_enabled}
              />
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <strong>معاينة المرسل:</strong>{' '}
              <span dir="ltr" className="font-mono">
                {settings.smtp_sender_name} &lt;{settings.smtp_sender_email || 'noreply@webyan.net'}&gt;
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Test Connection */}
      <Card className={!settings.smtp_enabled ? 'opacity-60' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-purple-500" />
            اختبار الاتصال
          </CardTitle>
          <CardDescription>إرسال رسالة اختبار للتأكد من صحة الإعدادات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="أدخل بريدك للاختبار"
                disabled={!settings.smtp_enabled || isTesting}
                dir="ltr"
              />
            </div>
            <Button 
              onClick={handleTestConnection} 
              disabled={!settings.smtp_enabled || isTesting || !testEmail}
              variant="outline"
              className="gap-2"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              إرسال رسالة اختبار
            </Button>
          </div>
          
          <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              تأكد من حفظ الإعدادات قبل إجراء الاختبار. قد يستغرق الاختبار بضع ثوانٍ.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Common SMTP Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            مزودي SMTP الشائعين
          </CardTitle>
          <CardDescription>إعدادات مسبقة لأشهر مزودي البريد الإلكتروني</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Gmail / Google Workspace</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Host: smtp.gmail.com</li>
                <li>Port: 587 (TLS) أو 465 (SSL)</li>
                <li>يتطلب "App Password"</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Microsoft 365 / Outlook</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Host: smtp.office365.com</li>
                <li>Port: 587 (TLS)</li>
                <li>يتطلب Modern Auth</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">SendGrid</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Host: smtp.sendgrid.net</li>
                <li>Port: 587 (TLS)</li>
                <li>Username: apikey</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Mailgun</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Host: smtp.mailgun.org</li>
                <li>Port: 587 (TLS)</li>
                <li>استخدم SMTP credentials</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Amazon SES</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Host: email-smtp.{'{region}'}.amazonaws.com</li>
                <li>Port: 587 (TLS)</li>
                <li>استخدم IAM credentials</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">cPanel / Hosting</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Host: mail.yourdomain.com</li>
                <li>Port: 465 (SSL) أو 587 (TLS)</li>
                <li>استخدم بريد الاستضافة</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={fetchSettings} disabled={isSaving}>
          إعادة التحميل
        </Button>
        <Button onClick={handleSaveSettings} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ إعدادات SMTP
        </Button>
      </div>
    </div>
  );
}
