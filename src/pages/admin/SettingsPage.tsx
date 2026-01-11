import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Globe, Bell, Shield, Database, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const handleSave = () => {
    toast.success('تم حفظ الإعدادات بنجاح');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground">
          إعدادات نظام التوثيق
        </p>
      </div>

      {/* General Settings */}
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
              defaultValue="دليل استخدام ويبيان"
              placeholder="اسم الدليل"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-description">وصف الدليل</Label>
            <Input
              id="site-description"
              defaultValue="الدليل الشامل لاستخدام لوحة تحكم ويبيان"
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
