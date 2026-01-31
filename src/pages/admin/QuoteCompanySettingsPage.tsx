import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Save,
  Loader2,
  Image as ImageIcon,
  Stamp,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';

interface CompanySettings {
  quote_company_name_ar: string;
  quote_company_name_en: string;
  quote_company_email: string;
  quote_company_phone: string;
  quote_company_address: string;
  quote_company_city: string;
  quote_company_tax_number: string;
  quote_company_cr_number: string;
  quote_company_website: string;
  quote_company_logo_url: string;
  quote_webyan_logo_url: string;
  quote_company_stamp_url: string;
  quote_default_validity_days: string;
  quote_default_terms: string;
}

const defaultSettings: CompanySettings = {
  quote_company_name_ar: 'شركة رنين للتقنية',
  quote_company_name_en: 'Raneen Technology Co.',
  quote_company_email: 'info@raneen.sa',
  quote_company_phone: '+966 50 123 4567',
  quote_company_address: 'طريق الملك فهد',
  quote_company_city: 'الرياض',
  quote_company_tax_number: '300000000000003',
  quote_company_cr_number: '1010000000',
  quote_company_website: 'https://raneen.sa',
  quote_company_logo_url: '/raneen-logo.png',
  quote_webyan_logo_url: '/webyan-logo-02.svg',
  quote_company_stamp_url: '',
  quote_default_validity_days: '30',
  quote_default_terms: 'يسري هذا العرض لمدة 30 يوماً من تاريخ الإصدار. الأسعار شاملة ضريبة القيمة المضافة 15%. يتم الدفع خلال 15 يوماً من تاريخ الفاتورة.',
};

export default function QuoteCompanySettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);

  const { data: fetchedSettings, isLoading } = useQuery({
    queryKey: ['quote-company-settings-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .like('key', 'quote_%');
      
      if (error) throw error;
      
      const settingsMap: Partial<CompanySettings> = {};
      data?.forEach(s => {
        settingsMap[s.key as keyof CompanySettings] = s.value;
      });
      return { ...defaultSettings, ...settingsMap };
    },
  });

  useEffect(() => {
    if (fetchedSettings) {
      setSettings(fetchedSettings);
    }
  }, [fetchedSettings]);

  const saveMutation = useMutation({
    mutationFn: async (newSettings: CompanySettings) => {
      const entries = Object.entries(newSettings);
      
      for (const [key, value] of entries) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key,
            value,
            description: getSettingDescription(key),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-company-settings'] });
      queryClient.invalidateQueries({ queryKey: ['quote-company-settings-admin'] });
      toast.success('تم حفظ الإعدادات بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    },
  });

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      quote_company_name_ar: 'اسم الشركة بالعربية لعروض الأسعار',
      quote_company_name_en: 'اسم الشركة بالإنجليزية لعروض الأسعار',
      quote_company_email: 'البريد الإلكتروني للشركة',
      quote_company_phone: 'رقم الهاتف للشركة',
      quote_company_address: 'عنوان الشركة',
      quote_company_city: 'مدينة الشركة',
      quote_company_tax_number: 'الرقم الضريبي',
      quote_company_cr_number: 'رقم السجل التجاري',
      quote_company_website: 'موقع الشركة الإلكتروني',
      quote_company_logo_url: 'رابط شعار الشركة',
      quote_webyan_logo_url: 'رابط شعار ويبيان',
      quote_company_stamp_url: 'رابط ختم الشركة',
      quote_default_validity_days: 'عدد أيام صلاحية العرض افتراضياً',
      quote_default_terms: 'الشروط والأحكام الافتراضية',
    };
    return descriptions[key] || key;
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const updateSetting = (key: keyof CompanySettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إعدادات عروض الأسعار</h1>
          <p className="text-muted-foreground">
            إدارة بيانات الشركة والإعدادات الافتراضية لعروض الأسعار
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 ml-2" />
          )}
          حفظ الإعدادات
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              معلومات الشركة
            </CardTitle>
            <CardDescription>
              البيانات الأساسية التي تظهر في عروض الأسعار
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_ar">اسم الشركة (عربي)</Label>
                <Input
                  id="name_ar"
                  value={settings.quote_company_name_ar}
                  onChange={(e) => updateSetting('quote_company_name_ar', e.target.value)}
                  placeholder="اسم الشركة بالعربية"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_en">اسم الشركة (إنجليزي)</Label>
                <Input
                  id="name_en"
                  value={settings.quote_company_name_en}
                  onChange={(e) => updateSetting('quote_company_name_en', e.target.value)}
                  placeholder="Company Name in English"
                  dir="ltr"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                value={settings.quote_company_email}
                onChange={(e) => updateSetting('quote_company_email', e.target.value)}
                placeholder="info@company.com"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                رقم الهاتف
              </Label>
              <Input
                id="phone"
                value={settings.quote_company_phone}
                onChange={(e) => updateSetting('quote_company_phone', e.target.value)}
                placeholder="+966 50 123 4567"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  المدينة
                </Label>
                <Input
                  id="city"
                  value={settings.quote_company_city}
                  onChange={(e) => updateSetting('quote_company_city', e.target.value)}
                  placeholder="الرياض"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Input
                  id="address"
                  value={settings.quote_company_address}
                  onChange={(e) => updateSetting('quote_company_address', e.target.value)}
                  placeholder="طريق الملك فهد"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                الموقع الإلكتروني
              </Label>
              <Input
                id="website"
                value={settings.quote_company_website}
                onChange={(e) => updateSetting('quote_company_website', e.target.value)}
                placeholder="https://company.com"
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tax & Legal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              المعلومات الضريبية والقانونية
            </CardTitle>
            <CardDescription>
              أرقام التسجيل الرسمية للشركة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax_number">الرقم الضريبي (VAT)</Label>
              <Input
                id="tax_number"
                value={settings.quote_company_tax_number}
                onChange={(e) => updateSetting('quote_company_tax_number', e.target.value)}
                placeholder="300000000000003"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cr_number">رقم السجل التجاري</Label>
              <Input
                id="cr_number"
                value={settings.quote_company_cr_number}
                onChange={(e) => updateSetting('quote_company_cr_number', e.target.value)}
                placeholder="1010000000"
                dir="ltr"
              />
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <Label htmlFor="validity_days">أيام صلاحية العرض (افتراضي)</Label>
              <Input
                id="validity_days"
                type="number"
                value={settings.quote_default_validity_days}
                onChange={(e) => updateSetting('quote_default_validity_days', e.target.value)}
                placeholder="30"
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        {/* Logo & Stamp Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              الشعارات والختم
            </CardTitle>
            <CardDescription>
              روابط صور الشعارات والختم لعروض الأسعار
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logo_url">رابط شعار الشركة (Raneen)</Label>
              <Input
                id="logo_url"
                value={settings.quote_company_logo_url}
                onChange={(e) => updateSetting('quote_company_logo_url', e.target.value)}
                placeholder="/raneen-logo.png"
                dir="ltr"
              />
              {settings.quote_company_logo_url && (
                <div className="mt-2 p-3 border rounded-lg bg-muted/30">
                  <img 
                    src={settings.quote_company_logo_url} 
                    alt="Company Logo Preview" 
                    className="h-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="webyan_logo_url">رابط شعار ويبيان</Label>
              <Input
                id="webyan_logo_url"
                value={settings.quote_webyan_logo_url}
                onChange={(e) => updateSetting('quote_webyan_logo_url', e.target.value)}
                placeholder="/webyan-logo-02.svg"
                dir="ltr"
              />
              {settings.quote_webyan_logo_url && (
                <div className="mt-2 p-3 border rounded-lg bg-muted/30">
                  <img 
                    src={settings.quote_webyan_logo_url} 
                    alt="Webyan Logo Preview" 
                    className="h-10 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="stamp_url" className="flex items-center gap-2">
                <Stamp className="h-4 w-4" />
                رابط ختم الشركة (PNG)
              </Label>
              <Input
                id="stamp_url"
                value={settings.quote_company_stamp_url}
                onChange={(e) => updateSetting('quote_company_stamp_url', e.target.value)}
                placeholder="/company-stamp.png"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                يُفضل استخدام صورة PNG بخلفية شفافة بأبعاد 200×200 بكسل
              </p>
              {settings.quote_company_stamp_url && (
                <div className="mt-2 p-3 border rounded-lg bg-muted/30 flex justify-center">
                  <img 
                    src={settings.quote_company_stamp_url} 
                    alt="Company Stamp Preview" 
                    className="h-20 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Default Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              الشروط والأحكام الافتراضية
            </CardTitle>
            <CardDescription>
              النص الافتراضي الذي يظهر في عروض الأسعار
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="default_terms">الشروط والأحكام</Label>
              <Textarea
                id="default_terms"
                value={settings.quote_default_terms}
                onChange={(e) => updateSetting('quote_default_terms', e.target.value)}
                placeholder="أدخل الشروط والأحكام الافتراضية..."
                className="min-h-[150px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>معاينة البيانات</CardTitle>
          <CardDescription>
            هذه البيانات ستظهر في رأس عروض الأسعار
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {settings.quote_company_logo_url && (
                  <img 
                    src={settings.quote_company_logo_url} 
                    alt="Logo" 
                    className="h-14 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                {settings.quote_webyan_logo_url && (
                  <img 
                    src={settings.quote_webyan_logo_url} 
                    alt="Webyan" 
                    className="h-10 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <div className="text-right">
                <h3 className="font-bold text-lg">{settings.quote_company_name_ar}</h3>
                <p className="text-sm text-muted-foreground">{settings.quote_company_name_en}</p>
                <p className="text-sm">{settings.quote_company_email}</p>
                <p className="text-sm">{settings.quote_company_phone}</p>
                <p className="text-sm">{settings.quote_company_city}، {settings.quote_company_address}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  الرقم الضريبي: {settings.quote_company_tax_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  السجل التجاري: {settings.quote_company_cr_number}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
