import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Code2, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  RefreshCw,
  Globe,
  Calendar,
  Eye,
  EyeOff,
  AlertCircle,
  ExternalLink,
  FileCode,
  Loader2,
  Shield,
  Clock,
  Activity,
  HelpCircle,
  Building2
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
  organization?: {
    id: string;
    name: string;
  };
}

interface Organization {
  id: string;
  name: string;
}

const EmbedSettingsPage = () => {
  const [tokens, setTokens] = useState<EmbedToken[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<EmbedToken | null>(null);
  
  const [newToken, setNewToken] = useState({
    name: '',
    organization_id: '',
    allowed_domains: '',
    expires_days: '0',
    allow_any_domain: true // Default to unrestricted
  });

  const baseUrl = window.location.origin;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tokensRes, orgsRes] = await Promise.all([
        supabase
          .from('embed_tokens')
          .select('*, organization:client_organizations(id, name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('client_organizations')
          .select('id, name')
          .eq('is_active', true)
          .order('name')
      ]);

      if (tokensRes.data) setTokens(tokensRes.data);
      if (orgsRes.data) setOrganizations(orgsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'emb_';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const handleCreateToken = async () => {
    if (!newToken.name || !newToken.organization_id) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setCreating(true);

    try {
      const token = generateToken();
      const domains = newToken.allowed_domains
        .split(',')
        .map(d => d.trim())
        .filter(d => d);
      
      const expiresAt = newToken.expires_days !== '0' 
        ? new Date(Date.now() + parseInt(newToken.expires_days) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('embed_tokens')
        .insert({
          token,
          name: newToken.name,
          organization_id: newToken.organization_id,
          allowed_domains: domains,
          expires_at: expiresAt,
          is_active: true
        });

      if (error) throw error;

      toast.success('تم إنشاء رمز التضمين بنجاح');
      setShowCreateDialog(false);
      setNewToken({ name: '', organization_id: '', allowed_domains: '', expires_days: '0', allow_any_domain: true });
      fetchData();
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error('فشل في إنشاء الرمز');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (token: EmbedToken) => {
    try {
      const { error } = await supabase
        .from('embed_tokens')
        .update({ is_active: !token.is_active })
        .eq('id', token.id);

      if (error) throw error;

      toast.success(token.is_active ? 'تم تعطيل الرمز' : 'تم تفعيل الرمز');
      fetchData();
    } catch (error) {
      toast.error('فشل في تحديث الرمز');
    }
  };

  const handleDeleteToken = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرمز؟')) return;

    try {
      const { error } = await supabase
        .from('embed_tokens')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('تم حذف الرمز بنجاح');
      setSelectedToken(null);
      fetchData();
    } catch (error) {
      toast.error('فشل في حذف الرمز');
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('تم النسخ');
    } catch (err) {
      toast.error('فشل في النسخ');
    }
  };

  const getEmbedUrl = (token: string) => `${baseUrl}/embed/ticket?token=${token}`;

  const getIframeCode = (token: string) => 
`<iframe
  src="${getEmbedUrl(token)}"
  width="100%"
  height="700"
  frameborder="0"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"
  allow="clipboard-write"
></iframe>`;

  const getWidgetCode = (token: string) => 
`<!-- Webyan Support Widget - Inline Embed -->
<div id="webyan-support-widget"></div>
<script>
(function() {
  var container = document.getElementById('webyan-support-widget');
  var iframe = document.createElement('iframe');
  iframe.src = '${getEmbedUrl(token)}&mode=compact';
  iframe.style.cssText = 'width:100%;height:600px;border:none;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);';
  iframe.allow = 'clipboard-write';
  container.appendChild(iframe);
})();
</script>`;

  const getPopupCode = (token: string) =>
`<!-- Webyan Support Widget - Floating Button (مثل Intercom) -->
<style>
#webyan-widget-btn{position:fixed;bottom:24px;right:24px;z-index:999999;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);color:#fff;border:none;cursor:pointer;box-shadow:0 8px 32px rgba(59,130,246,0.4);display:flex;align-items:center;justify-content:center;transition:all .3s cubic-bezier(.4,0,.2,1);animation:webyan-pulse 2s infinite}
#webyan-widget-btn:hover{transform:scale(1.1) translateY(-2px);box-shadow:0 12px 40px rgba(59,130,246,0.5)}
#webyan-widget-btn svg{width:28px;height:28px;transition:transform .3s}
#webyan-widget-btn.open svg{transform:rotate(45deg)}
@keyframes webyan-pulse{0%,100%{box-shadow:0 8px 32px rgba(59,130,246,0.4)}50%{box-shadow:0 8px 48px rgba(59,130,246,0.6)}}
#webyan-widget-popup{position:fixed;bottom:100px;right:24px;z-index:999998;width:400px;max-width:calc(100vw - 48px);height:600px;max-height:calc(100vh - 140px);background:#fff;border-radius:20px;box-shadow:0 25px 80px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transform:translateY(20px) scale(0.95);transition:all .3s cubic-bezier(.4,0,.2,1);overflow:hidden}
#webyan-widget-popup.open{opacity:1;visibility:visible;transform:translateY(0) scale(1)}
#webyan-widget-popup iframe{width:100%;height:100%;border:none}
@media(max-width:480px){#webyan-widget-popup{width:100%;height:100%;max-height:100vh;bottom:0;right:0;left:0;border-radius:0}#webyan-widget-btn{bottom:16px;right:16px}}
</style>
<button id="webyan-widget-btn" onclick="webyanToggle()">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
</button>
<div id="webyan-widget-popup">
  <iframe src="${getEmbedUrl(token)}&mode=compact" allow="clipboard-write"></iframe>
</div>
<script>
function webyanToggle(){
  var btn=document.getElementById('webyan-widget-btn');
  var popup=document.getElementById('webyan-widget-popup');
  var isOpen=popup.classList.toggle('open');
  btn.classList.toggle('open',isOpen);
  btn.innerHTML=isOpen?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
}
document.addEventListener('click',function(e){if(!e.target.closest('#webyan-widget-btn')&&!e.target.closest('#webyan-widget-popup')){document.getElementById('webyan-widget-popup').classList.remove('open');document.getElementById('webyan-widget-btn').classList.remove('open');document.getElementById('webyan-widget-btn').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';}});
window.addEventListener('message',function(e){if(e.data.type==='WEBYAN_TICKET_CREATED'){webyanToggle();setTimeout(function(){alert('تم إرسال التذكرة بنجاح!\\nرقم التذكرة: '+e.data.ticketNumber);},300);}});
</script>`;

  const getModalCode = (token: string) =>
`<!-- Webyan Support Widget - Modal on Click (أي زر يفتح النموذج) -->
<style>
#webyan-modal-overlay{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);opacity:0;visibility:hidden;transition:all .3s;display:flex;align-items:center;justify-content:center;padding:20px}
#webyan-modal-overlay.open{opacity:1;visibility:visible}
#webyan-modal-content{background:#fff;border-radius:20px;width:100%;max-width:600px;height:700px;max-height:calc(100vh - 40px);position:relative;transform:scale(0.9) translateY(20px);transition:all .3s cubic-bezier(.4,0,.2,1);overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,0.3)}
#webyan-modal-overlay.open #webyan-modal-content{transform:scale(1) translateY(0)}
#webyan-modal-close{position:absolute;top:12px;left:12px;z-index:10;width:40px;height:40px;border-radius:50%;background:#f1f5f9;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
#webyan-modal-close:hover{background:#e2e8f0;transform:scale(1.1)}
#webyan-modal-content iframe{width:100%;height:100%;border:none}
</style>
<div id="webyan-modal-overlay" onclick="if(event.target===this)webyanCloseModal()">
  <div id="webyan-modal-content">
    <button id="webyan-modal-close" onclick="webyanCloseModal()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
    <iframe src="${getEmbedUrl(token)}" allow="clipboard-write"></iframe>
  </div>
</div>
<script>
function webyanOpenModal(){document.getElementById('webyan-modal-overlay').classList.add('open');document.body.style.overflow='hidden';}
function webyanCloseModal(){document.getElementById('webyan-modal-overlay').classList.remove('open');document.body.style.overflow='';}
document.addEventListener('keydown',function(e){if(e.key==='Escape')webyanCloseModal();});
window.addEventListener('message',function(e){if(e.data.type==='WEBYAN_TICKET_CREATED'){webyanCloseModal();setTimeout(function(){alert('تم إرسال التذكرة بنجاح!\\nرقم التذكرة: '+e.data.ticketNumber);},300);}});
// لفتح النموذج أضف onclick="webyanOpenModal()" لأي زر
</script>`;

  const getButtonSnippet = () =>
`<!-- أضف هذا لأي زر أو رابط لفتح نموذج الدعم -->
<button onclick="webyanOpenModal()" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:600;">
  📩 فتح تذكرة دعم
</button>`;

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
            إعدادات التضمين
          </h1>
          <p className="text-muted-foreground mt-1">
            أنشئ رموز تضمين آمنة لإضافة نموذج فتح التذاكر في المواقع الخارجية
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إنشاء رمز جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>إنشاء رمز تضمين جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>اسم الرمز *</Label>
                <Input
                  placeholder="مثال: موقع الجمعية الرئيسي"
                  value={newToken.name}
                  onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>المنظمة *</Label>
                <Select 
                  value={newToken.organization_id}
                  onValueChange={(value) => setNewToken({ ...newToken, organization_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المنظمة" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">السماح من أي نطاق</Label>
                      <p className="text-xs text-muted-foreground">
                        تمكين التضمين من أي موقع أو نظام خارجي
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={newToken.allow_any_domain}
                    onCheckedChange={(checked) => setNewToken({ 
                      ...newToken, 
                      allow_any_domain: checked,
                      allowed_domains: checked ? '' : newToken.allowed_domains 
                    })}
                  />
                </div>
                
                {!newToken.allow_any_domain && (
                  <div className="space-y-2">
                    <Label>النطاقات المسموحة</Label>
                    <Input
                      placeholder="example.com, *.example.org (افصل بفاصلة)"
                      value={newToken.allowed_domains}
                      onChange={(e) => setNewToken({ ...newToken, allowed_domains: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      حدد نطاقات معينة مسموح لها التضمين. استخدم * للنطاقات الفرعية.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>مدة الصلاحية</Label>
                <Select 
                  value={newToken.expires_days}
                  onValueChange={(value) => setNewToken({ ...newToken, expires_days: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">بدون انتهاء</SelectItem>
                    <SelectItem value="7">أسبوع</SelectItem>
                    <SelectItem value="30">شهر</SelectItem>
                    <SelectItem value="90">3 أشهر</SelectItem>
                    <SelectItem value="365">سنة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
              <Button onClick={handleCreateToken} disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                إنشاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-xl text-white">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-blue-600">إجمالي الرموز</p>
              <p className="text-2xl font-bold text-blue-700">{tokens.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-500 rounded-xl text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-green-600">رموز نشطة</p>
              <p className="text-2xl font-bold text-green-700">{tokens.filter(t => t.is_active).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-500 rounded-xl text-white">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-purple-600">إجمالي الاستخدام</p>
              <p className="text-2xl font-bold text-purple-700">{tokens.reduce((sum, t) => sum + (t.usage_count || 0), 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tokens List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tokens List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">رموز التضمين</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {tokens.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Code2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد رموز تضمين</p>
                    <p className="text-sm">أنشئ رمزاً جديداً للبدء</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {tokens.map((token) => (
                      <button
                        key={token.id}
                        onClick={() => setSelectedToken(token)}
                        className={`w-full p-4 text-right hover:bg-muted/50 transition-colors ${
                          selectedToken?.id === token.id ? 'bg-primary/5 border-r-2 border-primary' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{token.name}</p>
                              <Badge variant={token.is_active ? 'default' : 'secondary'} className="text-xs">
                                {token.is_active ? 'نشط' : 'معطل'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {token.organization?.name || 'غير محدد'}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {token.usage_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {token.allowed_domains?.length > 0 ? 'محدد' : 'عام'}
                              </span>
                              {token.expires_at && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(token.expires_at), 'yyyy/MM/dd', { locale: ar })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Token Details */}
        <div className="lg:col-span-2">
          {selectedToken ? (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedToken.name}
                      <Badge variant={selectedToken.is_active ? 'default' : 'secondary'}>
                        {selectedToken.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Building2 className="w-4 h-4" />
                      {selectedToken.organization?.name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={selectedToken.is_active}
                      onCheckedChange={() => handleToggleActive(selectedToken)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteToken(selectedToken.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="embed" className="space-y-4">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="embed">أكواد التضمين</TabsTrigger>
                    <TabsTrigger value="info">المعلومات</TabsTrigger>
                    <TabsTrigger value="domains">النطاقات</TabsTrigger>
                    <TabsTrigger value="help">المساعدة</TabsTrigger>
                  </TabsList>

                  <TabsContent value="embed" className="space-y-4">
                    {/* Quick Start */}
                    <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                      <HelpCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        <strong>البداية السريعة:</strong> انسخ كود "الزر العائم" والصقه قبل &lt;/body&gt; في موقعك
                      </AlertDescription>
                    </Alert>

                    {/* Direct URL */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        رابط التضمين المباشر
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={getEmbedUrl(selectedToken.token)}
                          readOnly
                          className="font-mono text-sm"
                          dir="ltr"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(getEmbedUrl(selectedToken.token), 'url')}
                        >
                          {copiedField === 'url' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(getEmbedUrl(selectedToken.token), '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Floating Button - Most Popular */}
                    <div className="space-y-2 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-primary" />
                          <span className="text-primary font-semibold">🔥 الزر العائم (الأكثر شيوعاً - مثل Intercom)</span>
                        </Label>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => copyToClipboard(getPopupCode(selectedToken.token), 'popup')}
                        >
                          {copiedField === 'popup' ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                          نسخ
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        زر عائم في أسفل الشاشة يفتح نافذة منبثقة عند النقر - الطريقة الأكثر احترافية
                      </p>
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto max-h-48" dir="ltr">
                        {getPopupCode(selectedToken.token)}
                      </pre>
                    </div>

                    {/* Modal on Click */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <FileCode className="w-4 h-4" />
                          نافذة منبثقة (Modal) - للربط مع أي زر
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getModalCode(selectedToken.token), 'modal')}
                        >
                          {copiedField === 'modal' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          نسخ
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        أضف onclick="webyanOpenModal()" لأي زر في موقعك لفتح النموذج
                      </p>
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto max-h-48" dir="ltr">
                        {getModalCode(selectedToken.token)}
                      </pre>
                      <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm text-amber-800 font-medium mb-1">مثال على زر الفتح:</p>
                        <pre className="bg-amber-900/10 text-amber-900 p-2 rounded text-xs" dir="ltr">
                          {getButtonSnippet()}
                        </pre>
                      </div>
                    </div>

                    <Separator />

                    {/* iFrame Code */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <FileCode className="w-4 h-4" />
                          كود iFrame (للتضمين المباشر في الصفحة)
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getIframeCode(selectedToken.token), 'iframe')}
                        >
                          {copiedField === 'iframe' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          نسخ
                        </Button>
                      </div>
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto" dir="ltr">
                        {getIframeCode(selectedToken.token)}
                      </pre>
                    </div>

                    {/* Inline Widget */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Code2 className="w-4 h-4" />
                          Widget مضغوط (للمساحات الصغيرة)
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getWidgetCode(selectedToken.token), 'widget')}
                        >
                          {copiedField === 'widget' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          نسخ
                        </Button>
                      </div>
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto max-h-48" dir="ltr">
                        {getWidgetCode(selectedToken.token)}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="info" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
                        <p className="font-medium">{format(new Date(selectedToken.created_at), 'PPP', { locale: ar })}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">تاريخ الانتهاء</p>
                        <p className="font-medium">
                          {selectedToken.expires_at 
                            ? format(new Date(selectedToken.expires_at), 'PPP', { locale: ar })
                            : 'بدون انتهاء'}
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">عدد الاستخدامات</p>
                        <p className="font-medium">{selectedToken.usage_count || 0} مرة</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">آخر استخدام</p>
                        <p className="font-medium">
                          {selectedToken.last_used_at
                            ? format(new Date(selectedToken.last_used_at), 'PPP', { locale: ar })
                            : 'لم يستخدم بعد'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>رمز التضمين</Label>
                      <div className="flex gap-2">
                        <Input
                          value={selectedToken.token}
                          readOnly
                          className="font-mono text-sm"
                          dir="ltr"
                          type="password"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(selectedToken.token, 'token')}
                        >
                          {copiedField === 'token' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="domains" className="space-y-4">
                    {selectedToken.allowed_domains && selectedToken.allowed_domains.length > 0 ? (
                      <div className="space-y-4">
                        <Alert className="bg-amber-50 border-amber-200">
                          <Shield className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-amber-800">
                            <strong>وضع محدود:</strong> هذا الرمز يعمل فقط من النطاقات المحددة أدناه.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <Label>النطاقات المسموحة</Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedToken.allowed_domains.map((domain, i) => (
                              <Badge key={i} variant="outline" className="text-sm py-1 bg-white">
                                <Globe className="w-3 h-3 ml-1" />
                                {domain}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Alert className="bg-green-50 border-green-200">
                          <Globe className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            <strong>وضع عام (مفتوح):</strong> هذا الرمز يعمل من أي نطاق أو نظام خارجي بدون قيود.
                          </AlertDescription>
                        </Alert>
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-500 rounded-lg text-white">
                              <Globe className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-green-900">التضمين العام</h4>
                              <p className="text-sm text-green-700">مناسب للأنظمة الخارجية المتعددة</p>
                            </div>
                          </div>
                          <ul className="space-y-2 text-sm text-green-800">
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-600" />
                              يمكن تضمينه في أي لوحة تحكم للعميل
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-600" />
                              التذاكر مرتبطة تلقائياً بـ: <strong>{selectedToken.organization?.name}</strong>
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-600" />
                              لا يحتاج لتعديل عند تغيير النطاق
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="help" className="space-y-4">
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-2">كيفية الاستخدام</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                          <li>انسخ أحد أكواد التضمين أعلاه</li>
                          <li>الصقه في كود HTML لموقعك في المكان المناسب</li>
                          <li>احفظ التغييرات وسيظهر النموذج تلقائياً</li>
                        </ol>
                      </div>

                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <h4 className="font-medium text-amber-900 mb-2">استكشاف الأخطاء</h4>
                        <ul className="list-disc list-inside space-y-2 text-sm text-amber-800">
                          <li>تأكد من أن الرمز نشط ولم تنته صلاحيته</li>
                          <li>إذا حددت نطاقات معينة، تأكد من إضافة نطاق موقعك</li>
                          <li>تأكد من استخدام HTTPS في موقعك</li>
                          <li>جرب فتح رابط التضمين مباشرة للتحقق</li>
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Code2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">اختر رمز تضمين</h3>
                <p className="text-muted-foreground">
                  اختر رمزاً من القائمة لعرض تفاصيله وأكواد التضمين
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmbedSettingsPage;
