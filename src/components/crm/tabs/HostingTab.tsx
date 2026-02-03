import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Server, 
  Globe, 
  Lock, 
  Eye, 
  EyeOff, 
  Copy, 
  ExternalLink,
  RefreshCw,
  Shield,
  History
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CustomerNotesSection } from '../CustomerNotesSection';

interface HostingTabProps {
  organizationId: string;
}

interface SystemData {
  id: string;
  account_id: string;
  system_type: string;
  name: string;
  description: string | null;
  url: string | null;
  admin_url: string | null;
  username: string | null;
  password_encrypted: string | null;
  access_status: string;
  access_log: Record<string, any>[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const SYSTEM_TYPES = [
  { value: 'website', label: 'الموقع الرئيسي', icon: Globe },
  { value: 'admin_panel', label: 'لوحة التحكم', icon: Lock },
  { value: 'client_portal', label: 'بوابة العملاء', icon: Shield },
  { value: 'database', label: 'قاعدة البيانات', icon: Server },
  { value: 'email', label: 'البريد الإلكتروني', icon: Globe },
  { value: 'other', label: 'أخرى', icon: Globe },
];

export function HostingTab({ organizationId }: HostingTabProps) {
  const [systems, setSystems] = useState<SystemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    system_type: 'website',
    name: '',
    url: '',
    admin_url: '',
    username: '',
    password: '',
    notes: '',
  });

  useEffect(() => {
    fetchSystems();
  }, [organizationId]);

  const fetchSystems = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_systems')
        .select('*')
        .eq('account_id', organizationId)
        .order('created_at', { ascending: false }) as { data: SystemData[] | null; error: any };

      if (error) throw error;
      setSystems(data || []);
    } catch (error) {
      console.error('Error fetching systems:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = async (systemId: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(systemId)) {
      newVisible.delete(systemId);
    } else {
      newVisible.add(systemId);
      // Log the view action
      await logAccessAction(systemId, 'viewed');
    }
    setVisiblePasswords(newVisible);
  };

  const copyToClipboard = async (text: string, systemId: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`تم نسخ ${fieldName}`);
      if (fieldName === 'كلمة المرور') {
        await logAccessAction(systemId, 'copied');
      }
    } catch (error) {
      toast.error('فشل النسخ');
    }
  };

  const logAccessAction = async (systemId: string, action: string) => {
    try {
      const system = systems.find((s: SystemData) => s.id === systemId);
      if (!system) return;

      const newLog = {
        action,
        performed_at: new Date().toISOString(),
        performed_by: 'current_user', // In real app, get from auth context
      };

      const updatedLog = [...(system.access_log || []), newLog];

      await supabase
        .from('crm_systems')
        .update({ access_log: updatedLog })
        .eq('id', systemId);
    } catch (error) {
      console.error('Error logging access:', error);
    }
  };

  const handleAddSystem = async () => {
    if (!formData.name.trim()) {
      toast.error('الرجاء إدخال اسم النظام');
      return;
    }

    try {
      const { error } = await supabase
        .from('crm_systems')
        .insert({
          account_id: organizationId,
          system_type: formData.system_type,
          name: formData.name,
          url: formData.url || null,
          admin_url: formData.admin_url || null,
          username: formData.username || null,
          password_encrypted: formData.password || null,
          notes: formData.notes || null,
          access_log: [{ action: 'created', performed_at: new Date().toISOString() }],
        });

      if (error) throw error;

      toast.success('تم إضافة النظام بنجاح');
      setShowAddDialog(false);
      setFormData({
        system_type: 'website',
        name: '',
        url: '',
        admin_url: '',
        username: '',
        password: '',
        notes: '',
      });
      fetchSystems();
    } catch (error) {
      console.error('Error adding system:', error);
      toast.error('حدث خطأ أثناء إضافة النظام');
    }
  };

  const getSystemTypeInfo = (type: string) => {
    return SYSTEM_TYPES.find(t => t.value === type) || SYSTEM_TYPES[5];
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      active: { label: 'نشط', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      suspended: { label: 'موقوف', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
      expired: { label: 'منتهي', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
      revoked: { label: 'ملغي', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
    };
    const config = statusConfig[status] || statusConfig.active;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Systems & Credentials */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            الأنظمة وبيانات الوصول ({systems.length})
          </CardTitle>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة نظام
          </Button>
        </CardHeader>
        <CardContent>
          {systems.length === 0 ? (
            <div className="text-center py-8">
              <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد أنظمة مسجلة بعد</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة أول نظام
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {systems.map((system) => {
                const typeInfo = getSystemTypeInfo(system.system_type);
                const TypeIcon = typeInfo.icon;
                const isPasswordVisible = visiblePasswords.has(system.id);

                return (
                  <div key={system.id} className="border rounded-lg p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <TypeIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{system.name}</h4>
                          <p className="text-sm text-muted-foreground">{typeInfo.label}</p>
                        </div>
                      </div>
                      {getStatusBadge(system.access_status)}
                    </div>

                    {/* URLs */}
                    {(system.url || system.admin_url) && (
                      <div className="flex flex-wrap gap-2">
                        {system.url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={system.url} target="_blank" rel="noopener noreferrer">
                              <Globe className="h-4 w-4 ml-2" />
                              الموقع
                              <ExternalLink className="h-3 w-3 mr-2" />
                            </a>
                          </Button>
                        )}
                        {system.admin_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={system.admin_url} target="_blank" rel="noopener noreferrer">
                              <Lock className="h-4 w-4 ml-2" />
                              لوحة التحكم
                              <ExternalLink className="h-3 w-3 mr-2" />
                            </a>
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Credentials */}
                    {(system.username || system.password_encrypted) && (
                      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <h5 className="text-sm font-medium flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          بيانات الدخول
                        </h5>
                        
                        {system.username && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">المستخدم:</span>
                            <div className="flex items-center gap-2">
                              <code className="bg-background px-2 py-1 rounded text-sm">{system.username}</code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => copyToClipboard(system.username!, system.id, 'اسم المستخدم')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {system.password_encrypted && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">كلمة المرور:</span>
                            <div className="flex items-center gap-2">
                              <code className="bg-background px-2 py-1 rounded text-sm font-mono">
                                {isPasswordVisible ? system.password_encrypted : '••••••••••••'}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => togglePasswordVisibility(system.id)}
                              >
                                {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => copyToClipboard(system.password_encrypted!, system.id, 'كلمة المرور')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Access Log Preview */}
                        {system.access_log && system.access_log.length > 0 && (
                          <div className="pt-2 border-t">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <History className="h-3 w-3" />
                              آخر وصول: {format(parseISO(system.access_log[system.access_log.length - 1].performed_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {system.notes && (
                      <p className="text-sm text-muted-foreground">{system.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add System Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة نظام جديد</DialogTitle>
            <DialogDescription>
              أضف بيانات نظام أو موقع للعميل
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نوع النظام</Label>
              <Select
                value={formData.system_type}
                onValueChange={(value) => setFormData({ ...formData, system_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>اسم النظام *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: الموقع الرئيسي"
              />
            </div>

            <div className="space-y-2">
              <Label>رابط الموقع</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label>رابط لوحة التحكم</Label>
              <Input
                value={formData.admin_url}
                onChange={(e) => setFormData({ ...formData, admin_url: e.target.value })}
                placeholder="https://admin.example.com"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم المستخدم</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="admin"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="أي ملاحظات إضافية..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddSystem}>
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hosting Notes */}
      <CustomerNotesSection 
        organizationId={organizationId} 
        noteType="hosting"
        title="ملاحظات الاستضافة"
      />
    </div>
  );
}
