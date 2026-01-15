import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, Settings, Users, Clock, Zap, 
  Save, Loader2, RefreshCw, Volume2, VolumeX 
} from 'lucide-react';

type AutoAssignMode = 'disabled' | 'round_robin' | 'least_active' | 'by_team';

interface ChatSettings {
  id: string;
  auto_assign_mode: AutoAssignMode;
  welcome_message: string;
  offline_message: string;
  business_hours_enabled: boolean;
  business_hours: Record<string, unknown>;
  sound_enabled: boolean;
}

const autoAssignModes = [
  { value: 'disabled', label: 'معطل', description: 'الإسناد يدوي فقط', icon: Settings },
  { value: 'round_robin', label: 'التوزيع الدوري', description: 'توزيع بالتناوب على الموظفين', icon: RefreshCw },
  { value: 'least_active', label: 'الأقل انشغالاً', description: 'الموظف الذي لديه أقل محادثات', icon: Users },
];

export default function ChatSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data as ChatSettings);
    } catch (error) {
      console.error('Error fetching chat settings:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل إعدادات المحادثات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('chat_settings')
        .update({
          auto_assign_mode: settings.auto_assign_mode,
          welcome_message: settings.welcome_message,
          offline_message: settings.offline_message,
          business_hours_enabled: settings.business_hours_enabled,
          sound_enabled: settings.sound_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات المحادثات بنجاح'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ الإعدادات',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            إعدادات المحادثات
          </h1>
          <p className="text-muted-foreground">تخصيص إعدادات نظام المحادثات المباشرة</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
          ) : (
            <Save className="h-4 w-4 ml-2" />
          )}
          حفظ الإعدادات
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">عام</TabsTrigger>
          <TabsTrigger value="assignment">الإسناد التلقائي</TabsTrigger>
          <TabsTrigger value="messages">الرسائل</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات عامة</CardTitle>
              <CardDescription>ضبط الإعدادات الأساسية للمحادثات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    {settings.sound_enabled ? (
                      <Volume2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                    )}
                    تنبيهات صوتية
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    تشغيل صوت عند وصول رسالة جديدة
                  </p>
                </div>
                <Switch
                  checked={settings.sound_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, sound_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    ساعات العمل
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    تحديد أوقات التوفر للمحادثات
                  </p>
                </div>
                <Switch
                  checked={settings.business_hours_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, business_hours_enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                الإسناد التلقائي
              </CardTitle>
              <CardDescription>
                تحديد كيفية توزيع المحادثات الجديدة على الموظفين
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {autoAssignModes.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = settings.auto_assign_mode === mode.value;
                  return (
                    <div
                      key={mode.value}
                      onClick={() => setSettings({ ...settings, auto_assign_mode: mode.value as AutoAssignMode })}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-muted'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{mode.label}</h4>
                        <p className="text-sm text-muted-foreground">{mode.description}</p>
                      </div>
                      {isSelected && (
                        <Badge variant="default">مفعّل</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>رسائل تلقائية</CardTitle>
              <CardDescription>تخصيص الرسائل التلقائية للعملاء</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>رسالة الترحيب</Label>
                <Textarea
                  value={settings.welcome_message}
                  onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                  placeholder="مرحباً! كيف يمكننا مساعدتك اليوم؟"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  تظهر عند بدء محادثة جديدة
                </p>
              </div>

              <div className="space-y-2">
                <Label>رسالة عدم التوفر</Label>
                <Textarea
                  value={settings.offline_message}
                  onChange={(e) => setSettings({ ...settings, offline_message: e.target.value })}
                  placeholder="عذراً، فريق الدعم غير متاح حالياً..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  تظهر عندما لا يكون هناك موظفين متاحين
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
