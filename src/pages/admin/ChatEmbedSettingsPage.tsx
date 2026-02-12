import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Code2, Copy, Check, Plus, Trash2, Globe, Loader2, Shield, 
  Activity, Building2, Search, UserPlus, Key, Eye, EyeOff,
  Clock, MessageCircle, FileCode, HelpCircle, Palette, Sparkles,
  MessageSquare, AlertCircle
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
import { Textarea } from '@/components/ui/textarea';
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

interface EmbedToken {
  id: string;
  organization_id: string;
  token: string;
  name: string;
  allowed_domains: string[];
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  usage_count: number;
  last_used_at: string | null;
  welcome_message?: string;
  default_message?: string;
  primary_color?: string;
  secondary_color?: string;
  organization?: { id: string; name: string };
}

interface Organization {
  id: string;
  name: string;
}

const welcomePresets = [
  { label: 'ترحيب ودي', text: 'مرحباً بك! 👋 يسعدنا التواصل معك. فريق الدعم الفني جاهز لمساعدتك.' },
  { label: 'ترحيب رسمي', text: 'أهلاً وسهلاً بك في خدمة الدعم الفني. نحن هنا لمساعدتك في أي استفسار.' },
  { label: 'ترحيب مختصر', text: 'مرحباً! كيف يمكننا مساعدتك اليوم؟' },
];

export default function ChatEmbedSettingsPage() {
  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [chatTokens, setChatTokens] = useState<EmbedToken[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgSearch, setOrgSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showUniversalCode, setShowUniversalCode] = useState(false);
  const [activeTab, setActiveTab] = useState('apikeys');

  // Chat token management for legacy
  const [selectedToken, setSelectedToken] = useState<EmbedToken | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateTokenDialog, setShowCreateTokenDialog] = useState(false);
  const [tokenOrgSearch, setTokenOrgSearch] = useState('');

  const [newApiKey, setNewApiKey] = useState({
    name: 'المفتاح الرئيسي',
    organization_id: '',
    allowed_domains: '',
    allow_any_domain: true
  });

  const [newToken, setNewToken] = useState({
    name: '', organization_id: '', allowed_domains: '', expires_days: '0', allow_any_domain: true,
    welcome_message: welcomePresets[0].text, default_message: '', primary_color: '#263c84', secondary_color: '#24c2ec'
  });

  const [editSettings, setEditSettings] = useState({
    welcome_message: '', default_message: '', primary_color: '#263c84', secondary_color: '#24c2ec'
  });

  const baseUrl = 'https://webyan.sa';

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (selectedToken) {
      setEditSettings({
        welcome_message: selectedToken.welcome_message || welcomePresets[0].text,
        default_message: selectedToken.default_message || '',
        primary_color: selectedToken.primary_color || '#263c84',
        secondary_color: selectedToken.secondary_color || '#24c2ec'
      });
    }
  }, [selectedToken]);

  const fetchData = async () => {
    try {
      const [orgsRes, apiKeysRes, tokensRes] = await Promise.all([
        supabase.from('client_organizations').select('id, name').eq('is_active', true).order('name'),
        supabase.from('client_api_keys').select('*, organization:client_organizations(id, name)').order('created_at', { ascending: false }),
        supabase.from('embed_tokens').select('*, organization:client_organizations(id, name)').filter('token_type', 'eq', 'chat').order('created_at', { ascending: false })
      ]);
      if (orgsRes.data) setOrganizations(orgsRes.data);
      if (apiKeysRes.data) setApiKeys(apiKeysRes.data as any);
      if (tokensRes.data) setChatTokens(tokensRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('فشل في تحميل البيانات');
    } finally { setLoading(false); }
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
      console.error('Error:', error);
      toast.error('فشل في إنشاء المفتاح');
    } finally { setCreatingApiKey(false); }
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

  // Legacy chat token functions
  const handleCreateToken = async () => {
    if (!newToken.name || !newToken.organization_id) { toast.error('يرجى ملء الحقول المطلوبة'); return; }
    setCreating(true);
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let token = 'chat_';
      for (let i = 0; i < 32; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
      const domains = newToken.allowed_domains.split(',').map(d => d.trim()).filter(d => d);
      const expiresAt = newToken.expires_days !== '0' ? new Date(Date.now() + parseInt(newToken.expires_days) * 86400000).toISOString() : null;
      const { error } = await supabase.from('embed_tokens').insert({
        token, name: newToken.name, organization_id: newToken.organization_id, allowed_domains: domains,
        expires_at: expiresAt, is_active: true, welcome_message: newToken.welcome_message,
        default_message: newToken.default_message, primary_color: newToken.primary_color,
        secondary_color: newToken.secondary_color, token_type: 'chat'
      } as any);
      if (error) throw error;
      toast.success('تم إنشاء رمز الدردشة');
      setShowCreateTokenDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('فشل في إنشاء الرمز');
    } finally { setCreating(false); }
  };

  const handleSaveSettings = async () => {
    if (!selectedToken) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('embed_tokens').update({
        welcome_message: editSettings.welcome_message, default_message: editSettings.default_message,
        primary_color: editSettings.primary_color, secondary_color: editSettings.secondary_color
      }).eq('id', selectedToken.id);
      if (error) throw error;
      toast.success('تم حفظ الإعدادات');
      setSelectedToken({ ...selectedToken, ...editSettings });
      fetchData();
    } catch { toast.error('فشل في الحفظ'); } finally { setSaving(false); }
  };

  const handleToggleToken = async (token: EmbedToken) => {
    try {
      const { error } = await supabase.from('embed_tokens').update({ is_active: !token.is_active }).eq('id', token.id);
      if (error) throw error;
      toast.success(token.is_active ? 'تم تعطيل الرمز' : 'تم تفعيل الرمز');
      fetchData();
    } catch { toast.error('فشل في التحديث'); }
  };

  const handleDeleteToken = async (id: string) => {
    if (!confirm('هل أنت متأكد؟')) return;
    try {
      const { error } = await supabase.from('embed_tokens').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم الحذف');
      setSelectedToken(null);
      fetchData();
    } catch { toast.error('فشل في الحذف'); }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('تم النسخ');
    } catch { toast.error('فشل في النسخ'); }
  };

  const getUniversalChatCode = (key: string) =>
`<script 
  src="${baseUrl}/embed/webyan-chat-widget.js"
  data-api-key="${key}"
  data-position="bottom-right"
  data-color="#10b981">
</script>`;

  const getChatEmbedUrl = (token: string) => `${baseUrl}/embed/chat?token=${token}`;

  const getFloatingButtonCode = (token: string) => 
`<!-- Webyan Chat Widget -->
<style>
#webyan-chat-btn{position:fixed;bottom:24px;right:24px;z-index:999999;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;cursor:pointer;box-shadow:0 8px 32px rgba(16,185,129,0.4);display:flex;align-items:center;justify-content:center;transition:all .3s;animation:wcp 2s infinite}
#webyan-chat-btn:hover{transform:scale(1.1) translateY(-2px)}
@keyframes wcp{0%,100%{box-shadow:0 8px 32px rgba(16,185,129,0.4)}50%{box-shadow:0 8px 48px rgba(16,185,129,0.6)}}
#webyan-chat-popup{position:fixed;bottom:100px;right:24px;z-index:999998;width:400px;max-width:calc(100vw - 48px);height:600px;max-height:calc(100vh - 140px);background:#fff;border-radius:20px;box-shadow:0 25px 80px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transform:translateY(20px) scale(0.95);transition:all .3s;overflow:hidden}
#webyan-chat-popup.open{opacity:1;visibility:visible;transform:translateY(0) scale(1)}
#webyan-chat-popup iframe{width:100%;height:100%;border:none}
</style>
<button id="webyan-chat-btn" onclick="webyanChatToggle()">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
</button>
<div id="webyan-chat-popup"><iframe src="${getChatEmbedUrl(token)}" allow="clipboard-write"></iframe></div>
<script>
var wco=false;function webyanChatToggle(){wco=!wco;document.getElementById('webyan-chat-popup').classList.toggle('open',wco);document.getElementById('webyan-chat-btn').innerHTML=wco?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';}
document.addEventListener('click',function(e){if(!e.target.closest('#webyan-chat-btn')&&!e.target.closest('#webyan-chat-popup')&&wco)webyanChatToggle();});
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
            <MessageCircle className="w-7 h-7 text-green-600" />
            تضمين الدردشة المباشرة
          </h1>
          <p className="text-muted-foreground mt-1">
            كود تضمين موحد لنافذة الدردشة — أنشئ API Key لكل عميل أو استخدم رموز التضمين
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-500 rounded-xl text-white"><Key className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-green-600">مفاتيح API</p>
              <p className="text-2xl font-bold text-green-700">{apiKeys.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-cyan-500 rounded-xl text-white"><MessageCircle className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-cyan-600">رموز الدردشة</p>
              <p className="text-2xl font-bold text-cyan-700">{chatTokens.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-500 rounded-xl text-white"><Activity className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-purple-600">إجمالي الاستخدام</p>
              <p className="text-2xl font-bold text-purple-700">
                {apiKeys.reduce((s, k) => s + (k.usage_count || 0), 0) + chatTokens.reduce((s, t) => s + (t.usage_count || 0), 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Universal Chat Embed Code */}
      <Card className="border-green-300/50 bg-gradient-to-r from-green-50/50 to-emerald-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCode className="w-5 h-5 text-green-600" />
              كود التضمين الموحد للدردشة
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowUniversalCode(!showUniversalCode)}>
              {showUniversalCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showUniversalCode ? 'إخفاء' : 'عرض'}
            </Button>
          </div>
          <CardDescription>كود واحد لجميع العملاء — فقط غيّر الـ API Key</CardDescription>
        </CardHeader>
        {showUniversalCode && (
          <CardContent className="pt-0">
            <Alert className="mb-3">
              <HelpCircle className="h-4 w-4" />
              <AlertDescription>
                انسخ هذا الكود والصقه قبل <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> في موقع العميل
              </AlertDescription>
            </Alert>
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto" dir="ltr">
{`<script 
  src="${baseUrl}/embed/webyan-chat-widget.js"
  data-api-key="YOUR_API_KEY"
  data-position="bottom-right"
  data-color="#10b981">
</script>`}
              </pre>
              <Button variant="secondary" size="sm" className="absolute top-2 left-2" onClick={() => copyToClipboard(`<script \n  src="${baseUrl}/embed/webyan-chat-widget.js"\n  data-api-key="YOUR_API_KEY"\n  data-position="bottom-right"\n  data-color="#10b981">\n</script>`, 'universal')}>
                {copiedField === 'universal' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Main Tabs: API Keys vs Legacy Tokens */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="apikeys" className="gap-2"><Key className="w-4 h-4" />مفاتيح API (الجديد)</TabsTrigger>
          <TabsTrigger value="tokens" className="gap-2"><Code2 className="w-4 h-4" />رموز الدردشة (القديم)</TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="apikeys" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><Key className="w-5 h-5" />مفاتيح API العملاء</CardTitle>
                  <CardDescription>مفتاح واحد لكل عميل يُستخدم في كود التضمين الموحد</CardDescription>
                </div>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><Plus className="w-4 h-4" />إنشاء API Key</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>إنشاء API Key جديد</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>اسم المفتاح</Label>
                        <Input placeholder="المفتاح الرئيسي" value={newApiKey.name} onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })} />
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
                          <Button type="button" variant="outline" size="icon" onClick={() => navigate('/admin/clients')}><UserPlus className="w-4 h-4" /></Button>
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
                        {creatingApiKey && <Loader2 className="w-4 h-4 animate-spin ml-2" />}إنشاء
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">لا توجد مفاتيح API</p>
                  <p className="text-sm mt-1">أنشئ مفتاحاً لكل عميل</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((ak) => (
                    <div key={ak.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border hover:border-primary/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate">{ak.organization?.name || 'غير محدد'}</span>
                          <Badge variant={ak.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">{ak.is_active ? 'نشط' : 'معطل'}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-background px-2 py-1 rounded border font-mono truncate max-w-[280px]" dir="ltr">{ak.api_key}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(ak.api_key, `key-${ak.id}`)}>
                            {copiedField === `key-${ak.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{ak.usage_count || 0} استخدام</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(ak.created_at), 'yyyy/MM/dd', { locale: ar })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => copyToClipboard(getUniversalChatCode(ak.api_key), `code-${ak.id}`)}>
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
        </TabsContent>

        {/* Legacy Tokens Tab */}
        <TabsContent value="tokens" className="mt-4">
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              هذه الرموز القديمة لا تزال تعمل للتوافق. يُنصح باستخدام نظام API Keys الجديد.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end mb-4">
            <Dialog open={showCreateTokenDialog} onOpenChange={setShowCreateTokenDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Plus className="w-4 h-4" />إنشاء رمز دردشة</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>إنشاء رمز تضمين دردشة جديد</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم الرمز *</Label>
                      <Input placeholder="موقع العميل" value={newToken.name} onChange={(e) => setNewToken({ ...newToken, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>المنظمة *</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select value={newToken.organization_id} onValueChange={(v) => setNewToken({ ...newToken, organization_id: v })}>
                            <SelectTrigger><SelectValue placeholder="اختر المنظمة" /></SelectTrigger>
                            <SelectContent>
                              <div className="p-2 sticky top-0 bg-popover border-b">
                                <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-background">
                                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <input placeholder="بحث..." className="flex-1 bg-transparent text-sm outline-none" value={tokenOrgSearch} onChange={(e) => setTokenOrgSearch(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} />
                                </div>
                              </div>
                              <ScrollArea className="max-h-[200px]">
                                {organizations.filter(o => o.name.toLowerCase().includes(tokenOrgSearch.toLowerCase())).map(org => (
                                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                                ))}
                              </ScrollArea>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="button" variant="outline" size="icon" onClick={() => navigate('/admin/clients')}><UserPlus className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-cyan-500" />رسالة الترحيب</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {welcomePresets.map((p, i) => (
                        <Badge key={i} variant={newToken.welcome_message === p.text ? 'default' : 'outline'} className="cursor-pointer hover:bg-primary/10" onClick={() => setNewToken({ ...newToken, welcome_message: p.text })}>{p.label}</Badge>
                      ))}
                    </div>
                    <Textarea value={newToken.welcome_message} onChange={(e) => setNewToken({ ...newToken, welcome_message: e.target.value })} rows={2} className="resize-none" />
                  </div>
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2"><Palette className="w-4 h-4 text-cyan-500" />الألوان</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">اللون الأساسي</Label>
                        <div className="flex gap-2">
                          <input type="color" value={newToken.primary_color} onChange={(e) => setNewToken({ ...newToken, primary_color: e.target.value })} className="h-10 w-14 rounded border cursor-pointer" />
                          <Input value={newToken.primary_color} onChange={(e) => setNewToken({ ...newToken, primary_color: e.target.value })} className="flex-1" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">اللون الثانوي</Label>
                        <div className="flex gap-2">
                          <input type="color" value={newToken.secondary_color} onChange={(e) => setNewToken({ ...newToken, secondary_color: e.target.value })} className="h-10 w-14 rounded border cursor-pointer" />
                          <Input value={newToken.secondary_color} onChange={(e) => setNewToken({ ...newToken, secondary_color: e.target.value })} className="flex-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateTokenDialog(false)}>إلغاء</Button>
                  <Button onClick={handleCreateToken} disabled={creating}>
                    {creating && <Loader2 className="w-4 h-4 animate-spin ml-2" />}إنشاء
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">رموز الدردشة</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    {chatTokens.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>لا توجد رموز</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {chatTokens.map((token) => (
                          <div key={token.id} onClick={() => setSelectedToken(token)} className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedToken?.id === token.id ? 'bg-primary/5 border-r-2 border-r-primary' : ''}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{token.name}</span>
                              <Badge variant={token.is_active ? 'default' : 'secondary'} className="text-[10px]">{token.is_active ? 'مفعّل' : 'معطّل'}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{token.organization?.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              {selectedToken ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{selectedToken.name}</CardTitle>
                        <CardDescription>{selectedToken.organization?.name}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={selectedToken.is_active} onCheckedChange={() => handleToggleToken(selectedToken)} />
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteToken(selectedToken.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Embed Code */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><FileCode className="w-4 h-4" />كود الزر العائم</Label>
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-48 text-left" dir="ltr">{getFloatingButtonCode(selectedToken.token)}</pre>
                        <Button variant="secondary" size="sm" className="absolute top-2 left-2" onClick={() => copyToClipboard(getFloatingButtonCode(selectedToken.token), 'floating')}>
                          {copiedField === 'floating' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Separator />
                    {/* Messages Settings */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-cyan-500" />رسالة الترحيب</Label>
                      <Textarea value={editSettings.welcome_message} onChange={(e) => setEditSettings({ ...editSettings, welcome_message: e.target.value })} rows={2} className="resize-none" />
                    </div>
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2"><Palette className="w-4 h-4 text-cyan-500" />الألوان</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex gap-2">
                          <input type="color" value={editSettings.primary_color} onChange={(e) => setEditSettings({ ...editSettings, primary_color: e.target.value })} className="h-10 w-14 rounded border cursor-pointer" />
                          <Input value={editSettings.primary_color} onChange={(e) => setEditSettings({ ...editSettings, primary_color: e.target.value })} className="flex-1" />
                        </div>
                        <div className="flex gap-2">
                          <input type="color" value={editSettings.secondary_color} onChange={(e) => setEditSettings({ ...editSettings, secondary_color: e.target.value })} className="h-10 w-14 rounded border cursor-pointer" />
                          <Input value={editSettings.secondary_color} onChange={(e) => setEditSettings({ ...editSettings, secondary_color: e.target.value })} className="flex-1" />
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
                      {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}حفظ الإعدادات
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center min-h-[300px]">
                  <div className="text-center p-6">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">اختر رمزاً لعرض الإعدادات</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
