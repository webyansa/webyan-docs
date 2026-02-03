import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Plus, 
  Search,
  Edit,
  Trash2,
  Users,
  Eye,
  MoreHorizontal,
  Mail,
  Phone,
  Globe,
  Calendar,
  CheckCircle,
  XCircle,
  Upload,
  Filter,
  SlidersHorizontal,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronDown,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { ClientsImportDialog } from '@/components/crm/ClientsImportDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface ClientOrganization {
  id: string;
  name: string;
  organization_type: string;
  registration_number: string | null;
  website_url: string | null;
  contact_email: string;
  contact_phone: string | null;
  city: string | null;
  subscription_status: string;
  subscription_plan: string | null;
  subscription_end_date: string | null;
  is_active: boolean;
  created_at: string;
  accounts_count?: number;
}

interface ClientAccount {
  id: string;
  user_id: string | null;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  is_primary_contact: boolean;
  is_active: boolean;
  created_at: string;
}

const organizationTypes = [
  { value: 'charity', label: 'جمعية خيرية' },
  { value: 'nonprofit', label: 'منظمة غير ربحية' },
  { value: 'foundation', label: 'مؤسسة' },
  { value: 'cooperative', label: 'جمعية تعاونية' },
  { value: 'other', label: 'أخرى' },
];

const subscriptionStatuses = [
  { value: 'trial', label: 'تجريبي', color: 'blue' },
  { value: 'active', label: 'نشط', color: 'green' },
  { value: 'pending_renewal', label: 'في انتظار التجديد', color: 'yellow' },
  { value: 'expired', label: 'منتهي', color: 'red' },
  { value: 'cancelled', label: 'ملغي', color: 'gray' },
];

const subscriptionPlans = [
  { value: 'basic', label: 'الأساسية' },
  { value: 'professional', label: 'الاحترافية' },
  { value: 'enterprise', label: 'المؤسسية' },
];

const sortOptions = [
  { value: 'created_desc', label: 'الأحدث أولاً' },
  { value: 'created_asc', label: 'الأقدم أولاً' },
  { value: 'name_asc', label: 'الاسم (أ-ي)' },
  { value: 'name_desc', label: 'الاسم (ي-أ)' },
  { value: 'accounts_desc', label: 'الأكثر حسابات' },
];

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; borderColor: string; icon: any }> = {
  trial: { 
    label: 'تجريبي', 
    bgColor: 'bg-blue-50', 
    textColor: 'text-blue-700', 
    borderColor: 'border-blue-200',
    icon: Clock
  },
  active: { 
    label: 'نشط', 
    bgColor: 'bg-emerald-50', 
    textColor: 'text-emerald-700', 
    borderColor: 'border-emerald-200',
    icon: CheckCircle
  },
  pending_renewal: { 
    label: 'انتظار التجديد', 
    bgColor: 'bg-amber-50', 
    textColor: 'text-amber-700', 
    borderColor: 'border-amber-200',
    icon: AlertTriangle
  },
  expired: { 
    label: 'منتهي', 
    bgColor: 'bg-red-50', 
    textColor: 'text-red-700', 
    borderColor: 'border-red-200',
    icon: XCircle
  },
  cancelled: { 
    label: 'ملغي', 
    bgColor: 'bg-gray-50', 
    textColor: 'text-gray-600', 
    borderColor: 'border-gray-200',
    icon: XCircle
  },
};

const ClientsPage = () => {
  const [organizations, setOrganizations] = useState<ClientOrganization[]>([]);
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('organizations');
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<ClientOrganization | null>(null);
  const [editingAccount, setEditingAccount] = useState<ClientAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // Filter states
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState('created_desc');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const [orgForm, setOrgForm] = useState({
    name: '',
    organization_type: 'charity',
    registration_number: '',
    website_url: '',
    contact_email: '',
    contact_phone: '',
    city: '',
    address: '',
    subscription_status: 'trial',
    subscription_plan: 'basic',
    subscription_start_date: '',
    subscription_end_date: '',
    notes: ''
  });

  const [accountForm, setAccountForm] = useState({
    organization_id: '',
    full_name: '',
    email: '',
    phone: '',
    job_title: '',
    is_primary_contact: false,
    password: '',
    useOrgEmail: false
  });

  const selectedOrg = organizations.find(org => org.id === accountForm.organization_id);

  const validateSaudiPhone = (phone: string): boolean => {
    if (!phone) return true;
    const saudiPhoneRegex = /^05\d{8}$/;
    return saudiPhoneRegex.test(phone);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: orgsData, error: orgsError } = await supabase
        .from('client_organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      const { data: accountsData, error: accountsError } = await supabase
        .from('client_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      const orgsWithCount = orgsData?.map(org => ({
        ...org,
        accounts_count: accountsData?.filter(a => a.organization_id === org.id).length || 0
      })) || [];

      setOrganizations(orgsWithCount);
      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // Filtered and sorted organizations
  const filteredOrganizations = useMemo(() => {
    let result = [...organizations];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(org => 
        org.name.toLowerCase().includes(query) ||
        org.contact_email.toLowerCase().includes(query) ||
        org.contact_phone?.includes(query) ||
        org.city?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      result = result.filter(org => selectedStatuses.includes(org.subscription_status));
    }

    // Type filter
    if (selectedTypes.length > 0) {
      result = result.filter(org => selectedTypes.includes(org.organization_type));
    }

    // Plan filter
    if (selectedPlans.length > 0) {
      result = result.filter(org => org.subscription_plan && selectedPlans.includes(org.subscription_plan));
    }

    // Inactive filter
    if (showInactiveOnly) {
      result = result.filter(org => !org.is_active);
    }

    // Sorting
    switch (sortBy) {
      case 'created_asc':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name, 'ar'));
        break;
      case 'accounts_desc':
        result.sort((a, b) => (b.accounts_count || 0) - (a.accounts_count || 0));
        break;
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [organizations, searchQuery, selectedStatuses, selectedTypes, selectedPlans, showInactiveOnly, sortBy]);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts;
    const query = searchQuery.toLowerCase();
    return accounts.filter(acc =>
      acc.full_name.toLowerCase().includes(query) ||
      acc.email.toLowerCase().includes(query) ||
      acc.phone?.includes(query)
    );
  }, [accounts, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: organizations.length,
    active: organizations.filter(o => o.subscription_status === 'active').length,
    trial: organizations.filter(o => o.subscription_status === 'trial').length,
    needsRenewal: organizations.filter(o => ['pending_renewal', 'expired'].includes(o.subscription_status)).length,
    totalAccounts: accounts.length,
    inactive: organizations.filter(o => !o.is_active).length,
  }), [organizations, accounts]);

  const activeFiltersCount = selectedStatuses.length + selectedTypes.length + selectedPlans.length + (showInactiveOnly ? 1 : 0);

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setSelectedPlans([]);
    setShowInactiveOnly(false);
    setSearchQuery('');
  };

  const handleSaveOrganization = async () => {
    if (!orgForm.name || !orgForm.contact_email) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    setSaving(true);
    try {
      const orgData = {
        name: orgForm.name,
        organization_type: orgForm.organization_type as any,
        registration_number: orgForm.registration_number || null,
        website_url: orgForm.website_url || null,
        contact_email: orgForm.contact_email,
        contact_phone: orgForm.contact_phone || null,
        city: orgForm.city || null,
        address: orgForm.address || null,
        subscription_status: orgForm.subscription_status as any,
        subscription_plan: orgForm.subscription_plan || null,
        subscription_start_date: orgForm.subscription_start_date || null,
        subscription_end_date: orgForm.subscription_end_date || null,
        notes: orgForm.notes || null
      };

      if (editingOrg) {
        const { error } = await supabase
          .from('client_organizations')
          .update(orgData)
          .eq('id', editingOrg.id);

        if (error) throw error;
        toast.success('تم تحديث بيانات المؤسسة');
      } else {
        const { error } = await supabase
          .from('client_organizations')
          .insert(orgData);

        if (error) throw error;
        toast.success('تم إضافة المؤسسة بنجاح');
      }

      setOrgDialogOpen(false);
      resetOrgForm();
      fetchData();
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!accountForm.organization_id || !accountForm.full_name || !accountForm.email) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    if (!editingAccount && (!accountForm.password || accountForm.password.length < 6)) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (accountForm.phone && !validateSaudiPhone(accountForm.phone)) {
      toast.error('رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
      return;
    }

    setSaving(true);
    try {
      if (editingAccount) {
        const { error } = await supabase
          .from('client_accounts')
          .update({
            full_name: accountForm.full_name,
            phone: accountForm.phone || null,
            job_title: accountForm.job_title || null,
            is_primary_contact: accountForm.is_primary_contact
          })
          .eq('id', editingAccount.id);

        if (error) throw error;
        toast.success('تم تحديث بيانات الحساب');
      } else {
        const { data, error } = await supabase.functions.invoke('create-client-account', {
          body: {
            organization_id: accountForm.organization_id,
            full_name: accountForm.full_name,
            email: accountForm.email,
            password: accountForm.password,
            phone: accountForm.phone || null,
            job_title: accountForm.job_title || null,
            is_primary_contact: accountForm.is_primary_contact
          }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        toast.success('تم إنشاء الحساب بنجاح');
      }

      setAccountDialogOpen(false);
      resetAccountForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving account:', error);
      if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
        toast.error('البريد الإلكتروني مسجل مسبقاً');
      } else {
        toast.error(error.message || 'حدث خطأ أثناء الحفظ');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrganization = async (org: ClientOrganization) => {
    if (!confirm(`هل أنت متأكد من حذف ${org.name}؟\n\nسيتم حذف جميع الحسابات والبيانات المرتبطة.`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-client', {
        body: { organization_id: org.id, delete_organization: true }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('تم حذف المؤسسة بنجاح');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleDeleteAccount = async (account: ClientAccount) => {
    if (!confirm(`هل أنت متأكد من حذف حساب ${account.full_name}؟`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-client', {
        body: { client_account_id: account.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('تم حذف الحساب بنجاح');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleToggleOrgStatus = async (org: ClientOrganization) => {
    const newStatus = !org.is_active;
    
    try {
      const { error } = await supabase
        .from('client_organizations')
        .update({ is_active: newStatus })
        .eq('id', org.id);

      if (error) throw error;
      toast.success(newStatus ? 'تم تفعيل المؤسسة' : 'تم تعطيل المؤسسة');
      fetchData();
    } catch (error) {
      console.error('Error toggling organization status:', error);
      toast.error('حدث خطأ');
    }
  };

  const resetOrgForm = () => {
    setEditingOrg(null);
    setOrgForm({
      name: '',
      organization_type: 'charity',
      registration_number: '',
      website_url: '',
      contact_email: '',
      contact_phone: '',
      city: '',
      address: '',
      subscription_status: 'trial',
      subscription_plan: 'basic',
      subscription_start_date: '',
      subscription_end_date: '',
      notes: ''
    });
  };

  const resetAccountForm = () => {
    setEditingAccount(null);
    setAccountForm({
      organization_id: '',
      full_name: '',
      email: '',
      phone: '',
      job_title: '',
      is_primary_contact: false,
      password: '',
      useOrgEmail: false
    });
  };

  const openEditOrg = (org: ClientOrganization) => {
    setEditingOrg(org);
    setOrgForm({
      name: org.name,
      organization_type: org.organization_type,
      registration_number: org.registration_number || '',
      website_url: org.website_url || '',
      contact_email: org.contact_email,
      contact_phone: org.contact_phone || '',
      city: org.city || '',
      address: '',
      subscription_status: org.subscription_status,
      subscription_plan: org.subscription_plan || 'basic',
      subscription_start_date: '',
      subscription_end_date: org.subscription_end_date || '',
      notes: ''
    });
    setOrgDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">إدارة العملاء</h1>
              <p className="text-sm text-muted-foreground">إدارة المؤسسات وحسابات العملاء</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-4 h-4 ml-2" />
              استيراد
            </Button>
            <Dialog open={accountDialogOpen} onOpenChange={(open) => { setAccountDialogOpen(open); if (!open) resetAccountForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4 ml-2" />
                  حساب جديد
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingAccount ? 'تعديل الحساب' : 'إضافة حساب جديد'}</DialogTitle>
                  <DialogDescription>أدخل بيانات حساب العميل</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>المؤسسة *</Label>
                    <Select 
                      value={accountForm.organization_id} 
                      onValueChange={(v) => {
                        const org = organizations.find(o => o.id === v);
                        setAccountForm({ 
                          ...accountForm, 
                          organization_id: v,
                          email: accountForm.useOrgEmail && org ? org.contact_email : accountForm.email
                        });
                      }}
                      disabled={!!editingAccount}
                    >
                      <SelectTrigger><SelectValue placeholder="اختر المؤسسة" /></SelectTrigger>
                      <SelectContent>
                        {organizations.map(org => (
                          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم الكامل *</Label>
                    <Input
                      value={accountForm.full_name}
                      onChange={(e) => setAccountForm({ ...accountForm, full_name: e.target.value })}
                    />
                  </div>
                  {!editingAccount && selectedOrg && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Checkbox
                        id="useOrgEmail"
                        checked={accountForm.useOrgEmail}
                        onCheckedChange={(checked) => {
                          const useOrg = !!checked;
                          setAccountForm({
                            ...accountForm,
                            useOrgEmail: useOrg,
                            email: useOrg ? selectedOrg.contact_email : ''
                          });
                        }}
                      />
                      <Label htmlFor="useOrgEmail" className="cursor-pointer text-sm">
                        استخدم بريد المؤسسة ({selectedOrg.contact_email})
                      </Label>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني *</Label>
                    <Input
                      type="email"
                      value={accountForm.email}
                      onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value, useOrgEmail: false })}
                      disabled={!!editingAccount || accountForm.useOrgEmail}
                    />
                  </div>
                  {!editingAccount && (
                    <div className="space-y-2">
                      <Label>كلمة المرور *</Label>
                      <Input
                        type="password"
                        value={accountForm.password}
                        onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                        placeholder="6 أحرف على الأقل"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input
                      value={accountForm.phone}
                      onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value.replace(/[^0-9]/g, '') })}
                      placeholder="05xxxxxxxx"
                      maxLength={10}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>المسمى الوظيفي</Label>
                    <Input
                      value={accountForm.job_title}
                      onChange={(e) => setAccountForm({ ...accountForm, job_title: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => { setAccountDialogOpen(false); resetAccountForm(); }}>
                    إلغاء
                  </Button>
                  <Button onClick={handleSaveAccount} disabled={saving}>
                    {saving ? 'جاري الحفظ...' : 'حفظ'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={orgDialogOpen} onOpenChange={(open) => { setOrgDialogOpen(open); if (!open) resetOrgForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 ml-2" />
                  مؤسسة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingOrg ? 'تعديل المؤسسة' : 'إضافة مؤسسة جديدة'}</DialogTitle>
                  <DialogDescription>أدخل بيانات المؤسسة</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>اسم المؤسسة *</Label>
                    <Input
                      value={orgForm.name}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                      placeholder="اسم الجمعية أو المؤسسة"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نوع المؤسسة</Label>
                    <Select value={orgForm.organization_type} onValueChange={(v) => setOrgForm({ ...orgForm, organization_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {organizationTypes.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني *</Label>
                    <Input
                      type="email"
                      value={orgForm.contact_email}
                      onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input
                      value={orgForm.contact_phone}
                      onChange={(e) => setOrgForm({ ...orgForm, contact_phone: e.target.value })}
                      placeholder="05xxxxxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الترخيص</Label>
                    <Input
                      value={orgForm.registration_number}
                      onChange={(e) => setOrgForm({ ...orgForm, registration_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الموقع الإلكتروني</Label>
                    <Input
                      type="url"
                      value={orgForm.website_url}
                      onChange={(e) => setOrgForm({ ...orgForm, website_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>المدينة</Label>
                    <Input
                      value={orgForm.city}
                      onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>حالة الاشتراك</Label>
                    <Select value={orgForm.subscription_status} onValueChange={(v) => setOrgForm({ ...orgForm, subscription_status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {subscriptionStatuses.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الباقة</Label>
                    <Select value={orgForm.subscription_plan} onValueChange={(v) => setOrgForm({ ...orgForm, subscription_plan: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {subscriptionPlans.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ انتهاء الاشتراك</Label>
                    <Input
                      type="date"
                      value={orgForm.subscription_end_date}
                      onChange={(e) => setOrgForm({ ...orgForm, subscription_end_date: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>ملاحظات</Label>
                    <Textarea
                      value={orgForm.notes}
                      onChange={(e) => setOrgForm({ ...orgForm, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => { setOrgDialogOpen(false); resetOrgForm(); }}>
                    إلغاء
                  </Button>
                  <Button onClick={handleSaveOrganization} disabled={saving}>
                    {saving ? 'جاري الحفظ...' : 'حفظ'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <button 
            onClick={() => { clearFilters(); }}
            className="group p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-right"
          >
            <div className="flex items-center justify-between mb-1">
              <Building2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">إجمالي المؤسسات</p>
          </button>

          <button 
            onClick={() => { setSelectedStatuses(['active']); }}
            className={`group p-4 rounded-xl border transition-all text-right ${
              selectedStatuses.includes('active') 
                ? 'bg-emerald-50 border-emerald-200' 
                : 'bg-card border-border hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <CheckCircle className={`w-5 h-5 ${selectedStatuses.includes('active') ? 'text-emerald-600' : 'text-emerald-500'}`} />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
            <p className="text-xs text-muted-foreground">اشتراك نشط</p>
          </button>

          <button 
            onClick={() => { setSelectedStatuses(['trial']); }}
            className={`group p-4 rounded-xl border transition-all text-right ${
              selectedStatuses.includes('trial') 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-card border-border hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Clock className={`w-5 h-5 ${selectedStatuses.includes('trial') ? 'text-blue-600' : 'text-blue-500'}`} />
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.trial}</p>
            <p className="text-xs text-muted-foreground">تجريبي</p>
          </button>

          <button 
            onClick={() => { setSelectedStatuses(['pending_renewal', 'expired']); }}
            className={`group p-4 rounded-xl border transition-all text-right ${
              selectedStatuses.some(s => ['pending_renewal', 'expired'].includes(s))
                ? 'bg-amber-50 border-amber-200' 
                : 'bg-card border-border hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <AlertTriangle className={`w-5 h-5 ${selectedStatuses.some(s => ['pending_renewal', 'expired'].includes(s)) ? 'text-amber-600' : 'text-amber-500'}`} />
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.needsRenewal}</p>
            <p className="text-xs text-muted-foreground">تحتاج تجديد</p>
          </button>

          <button 
            onClick={() => { setActiveTab('accounts'); clearFilters(); }}
            className="group p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-right"
          >
            <div className="flex items-center justify-between mb-1">
              <Users className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalAccounts}</p>
            <p className="text-xs text-muted-foreground">إجمالي الحسابات</p>
          </button>

          <button 
            onClick={() => { setShowInactiveOnly(true); }}
            className={`group p-4 rounded-xl border transition-all text-right ${
              showInactiveOnly 
                ? 'bg-red-50 border-red-200' 
                : 'bg-card border-border hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <XCircle className={`w-5 h-5 ${showInactiveOnly ? 'text-red-600' : 'text-red-500'}`} />
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
            <p className="text-xs text-muted-foreground">معطّل</p>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث بالاسم، البريد، الهاتف، المدينة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-background"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                <span>تصفية</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">تصفية النتائج</h4>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-1 text-xs">
                      مسح الكل
                    </Button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">حالة الاشتراك</Label>
                  <div className="flex flex-wrap gap-2">
                    {subscriptionStatuses.map(status => (
                      <button
                        key={status.value}
                        onClick={() => {
                          setSelectedStatuses(prev => 
                            prev.includes(status.value) 
                              ? prev.filter(s => s !== status.value)
                              : [...prev, status.value]
                          );
                        }}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          selectedStatuses.includes(status.value)
                            ? `${statusConfig[status.value].bgColor} ${statusConfig[status.value].textColor} ${statusConfig[status.value].borderColor}`
                            : 'bg-background hover:bg-muted border-border'
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type Filter */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">نوع المؤسسة</Label>
                  <div className="flex flex-wrap gap-2">
                    {organizationTypes.map(type => (
                      <button
                        key={type.value}
                        onClick={() => {
                          setSelectedTypes(prev => 
                            prev.includes(type.value) 
                              ? prev.filter(t => t !== type.value)
                              : [...prev, type.value]
                          );
                        }}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          selectedTypes.includes(type.value)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-border'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plan Filter */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">الباقة</Label>
                  <div className="flex flex-wrap gap-2">
                    {subscriptionPlans.map(plan => (
                      <button
                        key={plan.value}
                        onClick={() => {
                          setSelectedPlans(prev => 
                            prev.includes(plan.value) 
                              ? prev.filter(p => p !== plan.value)
                              : [...prev, plan.value]
                          );
                        }}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          selectedPlans.includes(plan.value)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-border'
                        }`}
                      >
                        {plan.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inactive Toggle */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Checkbox
                    id="showInactive"
                    checked={showInactiveOnly}
                    onCheckedChange={(checked) => setShowInactiveOnly(!!checked)}
                  />
                  <Label htmlFor="showInactive" className="text-sm cursor-pointer">
                    المعطّلة فقط
                  </Label>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px] h-9">
              <ArrowUpDown className="w-4 h-4 ml-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Mode */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 ${viewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button variant="ghost" size="icon" onClick={fetchData} className="h-9 w-9">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Active Filters Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">الفلاتر النشطة:</span>
          {selectedStatuses.map(status => (
            <Badge key={status} variant="secondary" className="gap-1">
              {statusConfig[status]?.label}
              <button onClick={() => setSelectedStatuses(prev => prev.filter(s => s !== status))}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {selectedTypes.map(type => (
            <Badge key={type} variant="secondary" className="gap-1">
              {organizationTypes.find(t => t.value === type)?.label}
              <button onClick={() => setSelectedTypes(prev => prev.filter(t => t !== type))}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {selectedPlans.map(plan => (
            <Badge key={plan} variant="secondary" className="gap-1">
              {subscriptionPlans.find(p => p.value === plan)?.label}
              <button onClick={() => setSelectedPlans(prev => prev.filter(p => p !== plan))}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {showInactiveOnly && (
            <Badge variant="secondary" className="gap-1">
              المعطّلة فقط
              <button onClick={() => setShowInactiveOnly(false)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
            مسح الكل
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="organizations" className="gap-2">
            <Building2 className="w-4 h-4" />
            المؤسسات ({filteredOrganizations.length})
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <Users className="w-4 h-4" />
            الحسابات ({filteredAccounts.length})
          </TabsTrigger>
        </TabsList>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="mt-4">
          {filteredOrganizations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-2">لا توجد نتائج</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {searchQuery || activeFiltersCount > 0 
                    ? 'جرّب تغيير معايير البحث أو الفلترة'
                    : 'ابدأ بإضافة مؤسسة جديدة'
                  }
                </p>
                {(searchQuery || activeFiltersCount > 0) && (
                  <Button variant="outline" onClick={clearFilters}>
                    مسح الفلاتر
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'cards' ? (
            <div className="grid gap-3">
              {filteredOrganizations.map(org => {
                const status = statusConfig[org.subscription_status];
                const StatusIcon = status?.icon || CheckCircle;
                return (
                  <Card key={org.id} className={`group hover:shadow-md transition-all ${!org.is_active ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Link 
                                to={`/admin/clients/${org.id}`}
                                className="font-semibold text-foreground hover:text-primary transition-colors truncate"
                              >
                                {org.name}
                              </Link>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${status?.bgColor} ${status?.textColor} ${status?.borderColor}`}>
                                <StatusIcon className="w-3 h-3" />
                                {status?.label}
                              </span>
                              {!org.is_active && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                  معطل
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[180px]">{org.contact_email}</span>
                              </span>
                              {org.contact_phone && (
                                <span className="flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5" />
                                  {org.contact_phone}
                                </span>
                              )}
                              {org.website_url && (
                                <span className="flex items-center gap-1.5">
                                  <Globe className="w-3.5 h-3.5" />
                                  <span className="truncate max-w-[150px]">{org.website_url.replace(/^https?:\/\//, '')}</span>
                                </span>
                              )}
                              <span className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                {org.accounts_count} حساب
                              </span>
                            </div>
                            {org.subscription_end_date && (
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                ينتهي: {format(new Date(org.subscription_end_date), 'dd MMMM yyyy', { locale: ar })}
                              </p>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/admin/clients/${org.id}`}>
                                <Eye className="w-4 h-4 ml-2" />
                                عرض التفاصيل
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditOrg(org)}>
                              <Edit className="w-4 h-4 ml-2" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleOrgStatus(org)}>
                              {org.is_active ? (
                                <>
                                  <XCircle className="w-4 h-4 ml-2" />
                                  تعطيل
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 ml-2" />
                                  تفعيل
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteOrganization(org)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <ScrollArea className="w-full">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right p-3 font-medium text-sm">المؤسسة</th>
                      <th className="text-right p-3 font-medium text-sm">البريد</th>
                      <th className="text-right p-3 font-medium text-sm">الهاتف</th>
                      <th className="text-right p-3 font-medium text-sm">الحالة</th>
                      <th className="text-right p-3 font-medium text-sm">الحسابات</th>
                      <th className="text-right p-3 font-medium text-sm w-[80px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrganizations.map(org => {
                      const status = statusConfig[org.subscription_status];
                      return (
                        <tr key={org.id} className={`border-b hover:bg-muted/30 ${!org.is_active ? 'opacity-60' : ''}`}>
                          <td className="p-3">
                            <Link to={`/admin/clients/${org.id}`} className="font-medium hover:text-primary">
                              {org.name}
                            </Link>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{org.contact_email}</td>
                          <td className="p-3 text-sm text-muted-foreground" dir="ltr">{org.contact_phone || '-'}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${status?.bgColor} ${status?.textColor} ${status?.borderColor}`}>
                              {status?.label}
                            </span>
                          </td>
                          <td className="p-3 text-sm">{org.accounts_count}</td>
                          <td className="p-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/admin/clients/${org.id}`}>
                                    <Eye className="w-4 h-4 ml-2" />
                                    عرض
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditOrg(org)}>
                                  <Edit className="w-4 h-4 ml-2" />
                                  تعديل
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteOrganization(org)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 ml-2" />
                                  حذف
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="mt-4">
          {filteredAccounts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-2">لا توجد حسابات</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? 'جرّب تغيير معايير البحث' : 'ابدأ بإضافة حساب جديد'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredAccounts.map(account => {
                const org = organizations.find(o => o.id === account.organization_id);
                return (
                  <Card key={account.id} className={`group hover:shadow-md transition-all ${!account.is_active ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{account.full_name}</span>
                              {account.is_primary_contact && (
                                <Badge variant="secondary" className="text-xs">جهة اتصال رئيسية</Badge>
                              )}
                              {!account.is_active && (
                                <Badge variant="destructive" className="text-xs">معطل</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" />
                                {account.email}
                              </span>
                              {account.phone && (
                                <span className="flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5" />
                                  {account.phone}
                                </span>
                              )}
                              {org && (
                                <Link to={`/admin/clients/${org.id}`} className="flex items-center gap-1.5 hover:text-primary">
                                  <Building2 className="w-3.5 h-3.5" />
                                  {org.name}
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleDeleteAccount(account)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <ClientsImportDialog 
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default ClientsPage;
