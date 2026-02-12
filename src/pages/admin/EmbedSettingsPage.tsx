import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Code2, Copy, Check, Plus, Trash2, Globe, Loader2, Shield, 
  Activity, Building2, Search, UserPlus, Key, Eye, EyeOff,
  Clock, AlertCircle, ExternalLink, FileCode, HelpCircle, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ApiKey {
  id: string;
  organization_id: string;
  api_key: string;
  name: string;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  allowed_domains: string[] | null;
  created_at: string;
  organization?: { id: string; name: string };
}

interface Organization {
  id: string;
  name: string;
}

const EmbedSettingsPage = () => {
  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgSearch, setOrgSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showUniversalCode, setShowUniversalCode] = useState(false);

  const [newApiKey, setNewApiKey] = useState({
    name: 'المفتاح الرئيسي',
    organization_id: '',
    allowed_domains: '',
    allow_any_domain: true
  });

  const baseUrl = 'https://webyan.sa';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [orgsRes, apiKeysRes] = await Promise.all([
        supabase.from('client_organizations').select('id, name').eq('is_active', true).order('name'),
        supabase.from('client_api_keys').select('*, organization:client_organizations(id, name)').order('created_at', { ascending: false })
      ]);
      if (orgsRes.data) setOrganizations(orgsRes.data);
      if (apiKeysRes.data) setApiKeys(apiKeysRes.data as any);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'wbyn_';
    for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  const handleCreateApiKey = async () => {
    if (!newApiKey.organization_id) { toast.error('يرجى اختيار العميل'); return; }
    setCreatingApiKey(true);
    try {
      const key = generateApiKey();
      const domains = newApiKey.allowed_domains.split(',').map(d => d.trim()).filter(d => d);
      const { error } = await supabase.from('client_api_keys').insert({
        api_key: key, name: newApiKey.name, organization_id: newApiKey.organization_id,
        allowed_domains: domains.length > 0 ? domains : null, is_active: true
      });
      if (error) throw error;
      toast.success('تم إنشاء API Key بنجاح');
      setShowCreateDialog(false);
      setNewApiKey({ name: 'المفتاح الرئيسي', organization_id: '', allowed_domains: '', allow_any_domain: true });
      fetchData();
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('فشل في إنشاء المفتاح');
    } finally {
      setCreatingApiKey(false);
    }
  };

  const handleToggleApiKey = async (ak: ApiKey) => {
    try {
      const { error } = await supabase.from('client_api_keys').update({ is_active: !ak.is_active }).eq('id', ak.id);
      if (error) throw error;
      toast.success(ak.is_active ? 'تم تعطيل المفتاح' : 'تم تفعيل المفتاح');
      fetchData();
    } catch { toast.error('فشل في تحديث المفتاح'); }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المفتاح؟')) return;
    try {
      const { error } = await supabase.from('client_api_keys').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف المفتاح');
      fetchData();
    } catch { toast.error('فشل في حذف المفتاح'); }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('تم النسخ');
    } catch { toast.error('فشل في النسخ'); }
  };

  const getUniversalTicketCode = (key: string) =>
`<script 
  src="${baseUrl}/embed/webyan-ticket-widget.js"
  data-api-key="${key}"
  data-position="bottom-right"
  data-color="#3b82f6">
</script>`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Code2 className="w-7 h-7 text-primary" />
            تضمين تذاكر الدعم
          </h1>
          <p className="text-muted-foreground mt-1">
            كود تضمين موحد لنموذج تذاكر الدعم — أنشئ API Key لكل عميل
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إنشاء API Key جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>إنشاء API Key جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>اسم المفتاح</Label>
                <Input
                  placeholder="مثال: المفتاح الرئيسي"
                  value={newApiKey.name}
                  onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>العميل *</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={newApiKey.organization_id} onValueChange={(v) => setNewApiKey({ ...newApiKey, organization_id: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                      <SelectContent>
                        <div className="p-2 sticky top-0 bg-popover border-b">
                          <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-background">
                            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                            <input placeholder="بحث..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" value={orgSearch} onChange={(e) => setOrgSearch(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} />
                          </div>
                        </div>
                        <ScrollArea className="max-h-[200px]">
                          {organizations.filter(o => o.name.toLowerCase().includes(orgSearch.toLowerCase())).map(org => (
                            <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" size="icon" title="إضافة عميل جديد" onClick={() => navigate('/admin/clients')}>
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">السماح من أي نطاق</Label>
                      <p className="text-xs text-muted-foreground">تمكين من أي موقع</p>
                    </div>
                  </div>
                  <Switch checked={newApiKey.allow_any_domain} onCheckedChange={(c) => setNewApiKey({ ...newApiKey, allow_any_domain: c, allowed_domains: c ? '' : newApiKey.allowed_domains })} />
                </div>
                {!newApiKey.allow_any_domain && (
                  <div className="space-y-2">
                    <Label>النطاقات المسموحة</Label>
                    <Input placeholder="example.com, *.example.org" value={newApiKey.allowed_domains} onChange={(e) => setNewApiKey({ ...newApiKey, allowed_domains: e.target.value })} />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
              <Button onClick={handleCreateApiKey} disabled={creatingApiKey}>
                {creatingApiKey && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                إنشاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-xl text-white"><Key className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-blue-600">إجمالي المفاتيح</p>
              <p className="text-2xl font-bold text-blue-700">{apiKeys.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-500 rounded-xl text-white"><Shield className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-green-600">مفاتيح نشطة</p>
              <p className="text-2xl font-bold text-green-700">{apiKeys.filter(k => k.is_active).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-500 rounded-xl text-white"><Activity className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-purple-600">إجمالي الاستخدام</p>
              <p className="text-2xl font-bold text-purple-700">{apiKeys.reduce((s, k) => s + (k.usage_count || 0), 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Universal Embed Code */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCode className="w-5 h-5 text-primary" />
              كود التضمين الموحد لتذاكر الدعم
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowUniversalCode(!showUniversalCode)}>
              {showUniversalCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showUniversalCode ? 'إخفاء' : 'عرض'}
            </Button>
          </div>
          <CardDescription>
            كود واحد لجميع العملاء — فقط غيّر الـ API Key لكل عميل
          </CardDescription>
        </CardHeader>
        {showUniversalCode && (
          <CardContent className="pt-0">
            <Alert className="mb-3">
              <HelpCircle className="h-4 w-4" />
              <AlertDescription>
                انسخ هذا الكود والصقه قبل <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> في موقع العميل، ثم استبدل <code className="bg-muted px-1 rounded">YOUR_API_KEY</code> بمفتاح العميل
              </AlertDescription>
            </Alert>
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto" dir="ltr">
{`<script 
  src="${baseUrl}/embed/webyan-ticket-widget.js"
  data-api-key="YOUR_API_KEY"
  data-position="bottom-right"
  data-color="#3b82f6">
</script>`}
              </pre>
              <Button variant="secondary" size="sm" className="absolute top-2 left-2" onClick={() => copyToClipboard(`<script \n  src="${baseUrl}/embed/webyan-ticket-widget.js"\n  data-api-key="YOUR_API_KEY"\n  data-position="bottom-right"\n  data-color="#3b82f6">\n</script>`, 'universal')}>
                {copiedField === 'universal' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="w-5 h-5" />
            مفاتيح API العملاء
          </CardTitle>
          <CardDescription>كل عميل يحصل على مفتاح فريد يُضاف في كود التضمين</CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد مفاتيح API</p>
              <p className="text-sm mt-1">أنشئ مفتاحاً جديداً لكل عميل للبدء</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((ak) => (
                <div key={ak.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border hover:border-primary/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{ak.organization?.name || 'غير محدد'}</span>
                      <Badge variant={ak.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                        {ak.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-background px-2 py-1 rounded border font-mono truncate max-w-[280px]" dir="ltr">
                        {ak.api_key}
                      </code>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(ak.api_key, `key-${ak.id}`)}>
                        {copiedField === `key-${ak.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{ak.usage_count || 0} استخدام</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(ak.created_at), 'yyyy/MM/dd', { locale: ar })}</span>
                      {ak.allowed_domains && ak.allowed_domains.length > 0 && (
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{ak.allowed_domains.length} نطاق</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => copyToClipboard(getUniversalTicketCode(ak.api_key), `code-${ak.id}`)}>
                      {copiedField === `code-${ak.id}` ? <Check className="w-3 h-3 text-green-500 ml-1" /> : <Copy className="w-3 h-3 ml-1" />}
                      كود التضمين
                    </Button>
                    <Switch checked={ak.is_active} onCheckedChange={() => handleToggleApiKey(ak)} />
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => handleDeleteApiKey(ak.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmbedSettingsPage;
