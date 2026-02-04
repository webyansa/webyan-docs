import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  User,
  Edit,
  Save,
  X,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { LifecycleBadge, LifecycleStage, lifecycleConfig } from '../LifecycleBadge';
import { CustomerTypeBadge, CustomerType, customerTypeConfig } from '../CustomerTypeBadge';
import { CustomerNotesSection } from '../CustomerNotesSection';

interface BasicInfoTabProps {
  organization: {
    id: string;
    name: string;
    organization_type: string;
    customer_type: CustomerType;
    lifecycle_stage: LifecycleStage;
    registration_number?: string | null;
    website_url?: string | null;
    contact_email: string;
    contact_phone?: string | null;
    city?: string | null;
    address?: string | null;
    internal_notes?: string | null;
    tags?: string[] | null;
    created_at: string;
    primary_contact_name?: string | null;
    primary_contact_email?: string | null;
    primary_contact_phone?: string | null;
    use_org_contact_info?: boolean | null;
    // حقول العنوان الوطني
    tax_number?: string | null;
    street_name?: string | null;
    building_number?: string | null;
    secondary_number?: string | null;
    district?: string | null;
    postal_code?: string | null;
  };
  contacts: Array<{
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    job_title?: string | null;
    is_primary_contact: boolean;
    is_active: boolean;
  }>;
  onUpdate: () => void;
}

const organizationTypes = [
  { value: 'charity', label: 'جمعية خيرية' },
  { value: 'nonprofit', label: 'منظمة غير ربحية' },
  { value: 'foundation', label: 'مؤسسة' },
  { value: 'cooperative', label: 'جمعية تعاونية' },
  { value: 'other', label: 'أخرى' },
];

export function BasicInfoTab({ organization, contacts, onUpdate }: BasicInfoTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: organization.name,
    organization_type: organization.organization_type,
    customer_type: organization.customer_type,
    lifecycle_stage: organization.lifecycle_stage,
    registration_number: organization.registration_number || '',
    website_url: organization.website_url || '',
    contact_email: organization.contact_email,
    contact_phone: organization.contact_phone || '',
    address: organization.address || '',
    primary_contact_name: organization.primary_contact_name || '',
    primary_contact_email: organization.primary_contact_email || '',
    primary_contact_phone: organization.primary_contact_phone || '',
    use_org_contact_info: organization.use_org_contact_info || false,
    // حقول العنوان الوطني
    tax_number: organization.tax_number || '',
    street_name: organization.street_name || '',
    building_number: organization.building_number || '',
    secondary_number: organization.secondary_number || '',
    district: organization.district || '',
    postal_code: organization.postal_code || '',
    city: organization.city || '',
  });

  // Auto-fill primary contact when checkbox is checked
  useEffect(() => {
    if (form.use_org_contact_info) {
      setForm(prev => ({
        ...prev,
        primary_contact_name: prev.name,
        primary_contact_email: prev.contact_email,
        primary_contact_phone: prev.contact_phone,
      }));
    }
  }, [form.use_org_contact_info, form.name, form.contact_email, form.contact_phone]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('client_organizations')
        .update({
          name: form.name,
          organization_type: form.organization_type as any,
          customer_type: form.customer_type as any,
          lifecycle_stage: form.lifecycle_stage as any,
          registration_number: form.registration_number || null,
          website_url: form.website_url || null,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone || null,
          address: form.address || null,
          primary_contact_name: form.primary_contact_name || null,
          primary_contact_email: form.primary_contact_email || null,
          primary_contact_phone: form.primary_contact_phone || null,
          use_org_contact_info: form.use_org_contact_info,
          // حقول العنوان الوطني
          tax_number: form.tax_number || null,
          street_name: form.street_name || null,
          building_number: form.building_number || null,
          secondary_number: form.secondary_number || null,
          district: form.district || null,
          postal_code: form.postal_code || null,
          city: form.city || null,
        })
        .eq('id', organization.id);

      if (error) throw error;
      
      toast.success('تم حفظ التغييرات');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setForm({
      name: organization.name,
      organization_type: organization.organization_type,
      customer_type: organization.customer_type,
      lifecycle_stage: organization.lifecycle_stage,
      registration_number: organization.registration_number || '',
      website_url: organization.website_url || '',
      contact_email: organization.contact_email,
      contact_phone: organization.contact_phone || '',
      address: organization.address || '',
      primary_contact_name: organization.primary_contact_name || '',
      primary_contact_email: organization.primary_contact_email || '',
      primary_contact_phone: organization.primary_contact_phone || '',
      use_org_contact_info: organization.use_org_contact_info || false,
      tax_number: organization.tax_number || '',
      street_name: organization.street_name || '',
      building_number: organization.building_number || '',
      secondary_number: organization.secondary_number || '',
      district: organization.district || '',
      postal_code: organization.postal_code || '',
      city: organization.city || '',
    });
    setIsEditing(false);
  };

  const primaryContact = contacts.find(c => c.is_primary_contact);

  return (
    <div className="space-y-6">
      {/* Edit Mode Toggle - زر واحد فقط للتعديل */}
      <div className="flex justify-end">
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 ml-2" />
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 ml-2" />
            تعديل البيانات
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-primary" />
              معلومات المؤسسة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label>اسم المؤسسة</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع المؤسسة</Label>
                    <Select value={form.organization_type} onValueChange={(v) => setForm({ ...form, organization_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {organizationTypes.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>نوع العميل</Label>
                    <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v as CustomerType })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(customerTypeConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>مرحلة العميل</Label>
                  <Select value={form.lifecycle_stage} onValueChange={(v) => setForm({ ...form, lifecycle_stage: v as LifecycleStage })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(lifecycleConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.icon} {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>رقم السجل</Label>
                  <Input
                    value={form.registration_number}
                    onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                    placeholder="اختياري"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">نوع المؤسسة</span>
                  <span>{organizationTypes.find(t => t.value === organization.organization_type)?.label}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">نوع العميل</span>
                  <CustomerTypeBadge type={organization.customer_type} size="sm" />
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">مرحلة العميل</span>
                  <LifecycleBadge stage={organization.lifecycle_stage} size="sm" />
                </div>
                {organization.registration_number && (
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground">رقم السجل</span>
                    <span>{organization.registration_number}</span>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">تاريخ الإنشاء</span>
                  <span>{format(new Date(organization.created_at), 'dd MMMM yyyy', { locale: ar })}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="w-5 h-5 text-primary" />
              بيانات التواصل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الموقع الإلكتروني</Label>
                  <Input
                    value={form.website_url}
                    onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="العنوان التفصيلي"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${organization.contact_email}`} className="text-primary hover:underline">
                    {organization.contact_email}
                  </a>
                </div>
                {organization.contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${organization.contact_phone}`} className="hover:text-primary">
                      {organization.contact_phone}
                    </a>
                  </div>
                )}
                {organization.website_url && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a 
                      href={organization.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {organization.website_url}
                    </a>
                  </div>
                )}
                {organization.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{organization.address}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Primary Contact (Authorized) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="w-5 h-5 text-primary" />
              جهة الاتصال المخولة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="use_org_contact"
                    checked={form.use_org_contact_info}
                    onCheckedChange={(checked) => setForm({ ...form, use_org_contact_info: checked as boolean })}
                  />
                  <label htmlFor="use_org_contact" className="text-sm cursor-pointer">
                    استخدام نفس بيانات المؤسسة
                  </label>
                </div>
                <div className="space-y-2">
                  <Label>اسم جهة الاتصال</Label>
                  <Input
                    value={form.primary_contact_name}
                    onChange={(e) => setForm({ ...form, primary_contact_name: e.target.value })}
                    disabled={form.use_org_contact_info}
                  />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={form.primary_contact_email}
                    onChange={(e) => setForm({ ...form, primary_contact_email: e.target.value })}
                    disabled={form.use_org_contact_info}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الجوال</Label>
                  <Input
                    value={form.primary_contact_phone}
                    onChange={(e) => setForm({ ...form, primary_contact_phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    disabled={form.use_org_contact_info}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {organization.primary_contact_name ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {organization.primary_contact_name.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{organization.primary_contact_name}</p>
                        {organization.use_org_contact_info && (
                          <Badge variant="outline" className="text-xs">نفس بيانات المؤسسة</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      {organization.primary_contact_email && <p>{organization.primary_contact_email}</p>}
                      {organization.primary_contact_phone && <p>{organization.primary_contact_phone}</p>}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">لم يتم تحديد جهة اتصال مخولة</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* National Address - العنوان الوطني */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5 text-primary" />
              العنوان الوطني
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label>الرقم الضريبي</Label>
                  <Input
                    value={form.tax_number}
                    onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                    placeholder="300000000000003"
                    dir="ltr"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>رقم المبنى</Label>
                    <Input
                      value={form.building_number}
                      onChange={(e) => setForm({ ...form, building_number: e.target.value })}
                      placeholder="1234"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الرقم الفرعي</Label>
                    <Input
                      value={form.secondary_number}
                      onChange={(e) => setForm({ ...form, secondary_number: e.target.value })}
                      placeholder="5678"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>اسم الشارع</Label>
                  <Input
                    value={form.street_name}
                    onChange={(e) => setForm({ ...form, street_name: e.target.value })}
                    placeholder="شارع الملك فهد"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الحي</Label>
                    <Input
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                      placeholder="العليا"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الرمز البريدي</Label>
                    <Input
                      value={form.postal_code}
                      onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                      placeholder="12345"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>المدينة</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="الرياض"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {(organization.tax_number || organization.building_number || organization.street_name || organization.district || organization.postal_code || organization.city) ? (
                  <div className="space-y-3">
                    {organization.tax_number && (
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-muted-foreground text-sm">الرقم الضريبي</span>
                        <span className="font-mono font-medium" dir="ltr">{organization.tax_number}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {organization.building_number && (
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                          <span className="text-muted-foreground text-sm">رقم المبنى</span>
                          <span className="font-medium" dir="ltr">{organization.building_number}</span>
                        </div>
                      )}
                      {organization.secondary_number && (
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                          <span className="text-muted-foreground text-sm">الرقم الفرعي</span>
                          <span className="font-medium" dir="ltr">{organization.secondary_number}</span>
                        </div>
                      )}
                    </div>
                    {organization.street_name && (
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-muted-foreground text-sm">الشارع</span>
                        <span className="font-medium">{organization.street_name}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {organization.district && (
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                          <span className="text-muted-foreground text-sm">الحي</span>
                          <span className="font-medium">{organization.district}</span>
                        </div>
                      )}
                      {organization.postal_code && (
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                          <span className="text-muted-foreground text-sm">الرمز البريدي</span>
                          <span className="font-medium" dir="ltr">{organization.postal_code}</span>
                        </div>
                      )}
                    </div>
                    {organization.city && (
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-muted-foreground text-sm">المدينة</span>
                        <span className="font-medium">{organization.city}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <MapPin className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground text-sm">لم يتم إدخال العنوان الوطني بعد</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Customer Notes */}
      <CustomerNotesSection 
        organizationId={organization.id} 
        showAll={true}
        title="جميع الملاحظات"
      />

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-primary" />
              جهات الاتصال ({contacts.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length > 0 ? (
            <div className="divide-y">
              {contacts.map((contact) => (
                <div key={contact.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {contact.full_name.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {contact.full_name}
                        {contact.is_primary_contact && (
                          <Badge variant="secondary" className="text-xs">رئيسي</Badge>
                        )}
                        {!contact.is_active && (
                          <Badge variant="destructive" className="text-xs">معطّل</Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{contact.email}</p>
                    </div>
                  </div>
                  {contact.job_title && (
                    <span className="text-sm text-muted-foreground">{contact.job_title}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">لا توجد جهات اتصال</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
