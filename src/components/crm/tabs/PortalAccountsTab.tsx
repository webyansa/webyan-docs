import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Plus, 
  Edit, 
  Key, 
  Trash2, 
  Mail, 
  Phone, 
  Briefcase, 
  Star, 
  StarOff,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  UserX
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ClientAccount {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  is_primary_contact: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface PortalAccountsTabProps {
  organizationId: string;
  organizationName: string;
}

export function PortalAccountsTab({ organizationId, organizationName }: PortalAccountsTabProps) {
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ClientAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    job_title: '',
    password: '',
    is_primary_contact: false
  });

  const [passwordForm, setPasswordForm] = useState({
    new_password: '',
    confirm_password: ''
  });

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('client_accounts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('is_primary_contact', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('حدث خطأ أثناء تحميل الحسابات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [organizationId]);

  const handleAdd = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      job_title: '',
      password: '',
      is_primary_contact: accounts.length === 0 // First account is primary
    });
    setShowAddDialog(true);
  };

  const handleEdit = (account: ClientAccount) => {
    setSelectedAccount(account);
    setFormData({
      full_name: account.full_name,
      email: account.email,
      phone: account.phone || '',
      job_title: account.job_title || '',
      password: '',
      is_primary_contact: account.is_primary_contact
    });
    setShowEditDialog(true);
  };

  const handlePasswordChange = (account: ClientAccount) => {
    if (!account.user_id) {
      toast.error('هذا الحساب غير مرتبط بمستخدم');
      return;
    }
    setSelectedAccount(account);
    setPasswordForm({ new_password: '', confirm_password: '' });
    setShowPasswordDialog(true);
  };

  const handleCreateAccount = async () => {
    if (!formData.full_name || !formData.email || !formData.password) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-client-account', {
        body: {
          organization_id: organizationId,
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || null,
          job_title: formData.job_title || null,
          is_primary_contact: formData.is_primary_contact
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data?.message || 'تم إنشاء الحساب بنجاح');
      setShowAddDialog(false);
      fetchAccounts();
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast.error(error.message || 'حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!selectedAccount || !formData.full_name) {
      toast.error('يرجى ملء الاسم');
      return;
    }

    setSaving(true);
    try {
      // Update client_accounts table
      const { error: accountError } = await supabase
        .from('client_accounts')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          job_title: formData.job_title || null,
          is_primary_contact: formData.is_primary_contact
        })
        .eq('id', selectedAccount.id);

      if (accountError) throw accountError;

      // If user has auth, update their profile via edge function
      if (selectedAccount.user_id) {
        const { error } = await supabase.functions.invoke('admin-update-user', {
          body: {
            user_id: selectedAccount.user_id,
            action: 'update_profile',
            full_name: formData.full_name
          }
        });

        if (error) {
          console.error('Error updating auth profile:', error);
        }
      }

      // If setting as primary, unset others
      if (formData.is_primary_contact) {
        await supabase
          .from('client_accounts')
          .update({ is_primary_contact: false })
          .eq('organization_id', organizationId)
          .neq('id', selectedAccount.id);
      }

      toast.success('تم تحديث الحساب بنجاح');
      setShowEditDialog(false);
      fetchAccounts();
    } catch (error: any) {
      console.error('Error updating account:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث الحساب');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!selectedAccount?.user_id) return;

    if (passwordForm.new_password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('كلمة المرور غير متطابقة');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-user', {
        body: {
          user_id: selectedAccount.user_id,
          action: 'update_password',
          new_password: passwordForm.new_password
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('تم تغيير كلمة المرور بنجاح');
      setShowPasswordDialog(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (account: ClientAccount) => {
    const newStatus = !account.is_active;
    const action = newStatus ? 'تفعيل' : 'تعطيل';

    try {
      const { error } = await supabase
        .from('client_accounts')
        .update({ is_active: newStatus })
        .eq('id', account.id);

      if (error) throw error;
      toast.success(`تم ${action} الحساب بنجاح`);
      fetchAccounts();
    } catch (error) {
      console.error('Error toggling account status:', error);
      toast.error(`حدث خطأ أثناء ${action} الحساب`);
    }
  };

  const handleDelete = async (account: ClientAccount) => {
    if (!confirm(`هل أنت متأكد من حذف حساب ${account.full_name}؟\n\nهذا الإجراء لا يمكن التراجع عنه!`)) return;

    try {
      if (account.user_id) {
        // Delete via edge function to clean up auth user
        const { data, error } = await supabase.functions.invoke('admin-update-user', {
          body: {
            user_id: account.user_id,
            action: 'delete_user'
          }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else {
        // Just delete the client_account record
        const { error } = await supabase
          .from('client_accounts')
          .delete()
          .eq('id', account.id);

        if (error) throw error;
      }

      toast.success('تم حذف الحساب بنجاح');
      fetchAccounts();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'حدث خطأ أثناء حذف الحساب');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'لم يسجل دخول بعد';
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            حسابات بوابة العملاء ({accounts.length})
          </CardTitle>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            إضافة مستخدم
          </Button>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد حسابات مسجلة بعد</p>
              <Button onClick={handleAdd} variant="outline" className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                إضافة أول مستخدم
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {account.is_active ? (
                        <UserCheck className="w-6 h-6 text-primary" />
                      ) : (
                        <UserX className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{account.full_name}</span>
                        {account.is_primary_contact && (
                          <Badge variant="default" className="gap-1">
                            <Star className="w-3 h-3" />
                            جهة الاتصال الرئيسية
                          </Badge>
                        )}
                        {!account.is_active && (
                          <Badge variant="secondary">معطّل</Badge>
                        )}
                        {!account.user_id && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                            بدون حساب دخول
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {account.email}
                        </span>
                        {account.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {account.phone}
                          </span>
                        )}
                        {account.job_title && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" />
                            {account.job_title}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        آخر دخول: {formatDate(account.last_login_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(account)}
                      title="تعديل"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {account.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePasswordChange(account)}
                        title="تغيير كلمة المرور"
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(account)}
                      title={account.is_active ? 'تعطيل' : 'تفعيل'}
                    >
                      {account.is_active ? (
                        <UserX className="w-4 h-4 text-orange-500" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(account)}
                      title="حذف"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              إضافة مستخدم جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم الكامل *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="أدخل الاسم الكامل"
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@domain.com"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="6 أحرف على الأقل"
                  className="pl-10"
                  dir="ltr"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>المسمى الوظيفي</Label>
                <Input
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="مثال: مدير المشاريع"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <Label className="cursor-pointer">جهة الاتصال الرئيسية</Label>
              </div>
              <Switch
                checked={formData.is_primary_contact}
                onCheckedChange={(checked) => setFormData({ ...formData, is_primary_contact: checked })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateAccount} disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إنشاء الحساب
              </Button>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              تعديل المستخدم
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم الكامل *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                value={formData.email}
                disabled
                className="bg-muted"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">لا يمكن تغيير البريد الإلكتروني</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>المسمى الوظيفي</Label>
                <Input
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <Label className="cursor-pointer">جهة الاتصال الرئيسية</Label>
              </div>
              <Switch
                checked={formData.is_primary_contact}
                onCheckedChange={(checked) => setFormData({ ...formData, is_primary_contact: checked })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdateAccount} disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                حفظ التغييرات
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              تغيير كلمة المرور
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                تغيير كلمة المرور للمستخدم: <strong>{selectedAccount?.full_name}</strong>
              </p>
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور الجديدة</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  placeholder="6 أحرف على الأقل"
                  className="pl-10"
                  dir="ltr"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>تأكيد كلمة المرور</Label>
              <Input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                placeholder="أعد إدخال كلمة المرور"
                dir="ltr"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdatePassword} disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                تغيير كلمة المرور
              </Button>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
