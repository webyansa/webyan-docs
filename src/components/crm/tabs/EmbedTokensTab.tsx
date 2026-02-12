import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Code2, Copy, Check, Plus, Trash2, Globe, Eye, EyeOff,
  Ticket, MessageCircle, Loader2, Activity, Key, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface EmbedToken {
  id: string;
  token: string;
  name: string;
  token_type: string;
  is_active: boolean;
  created_at: string;
  usage_count: number;
  last_used_at: string | null;
  allowed_domains: string[];
  expires_at: string | null;
}

interface ApiKeyItem {
  id: string;
  api_key: string;
  name: string;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  allowed_domains: string[] | null;
  created_at: string;
}

interface Props {
  organizationId: string;
  organizationName: string;
}

export function EmbedTokensTab({ organizationId, organizationName }: Props) {
  const [tokens, setTokens] = useState<EmbedToken[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateApiKeyDialog, setShowCreateApiKeyDialog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [newToken, setNewToken] = useState({
    name: '',
    token_type: 'ticket' as 'ticket' | 'chat',
    allowed_domains: '',
    allow_any_domain: true,
    expires_days: '0',
  });
  const [newApiKeyName, setNewApiKeyName] = useState('المفتاح الرئيسي');

  const baseUrl = window.location.origin;

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      const [tokensRes, apiKeysRes] = await Promise.all([
        supabase
          .from('embed_tokens')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('client_api_keys')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
      ]);

      if (tokensRes.data) setTokens((tokensRes.data as any[]) || []);
      if (apiKeysRes.data) setApiKeys((apiKeysRes.data as any[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    setCreating(true);
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let key = 'wbyn_';
      for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));

      const { error } = await supabase.from('client_api_keys').insert({
        api_key: key,
        name: newApiKeyName,
        organization_id: organizationId,
        is_active: true
      });

      if (error) throw error;
      toast.success('تم إنشاء API Key بنجاح');
      setShowCreateApiKeyDialog(false);
      setNewApiKeyName('المفتاح الرئيسي');
      fetchData();
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('فشل في إنشاء المفتاح');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateToken = async () => {
    if (!newToken.name) {
      toast.error('يرجى إدخال اسم الرمز');
      return;
    }
    setCreating(true);
    try {
      const prefix = newToken.token_type === 'chat' ? 'chat_' : 'emb_';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let token = prefix;
      for (let i = 0; i < 32; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));

      const domains = newToken.allowed_domains.split(',').map(d => d.trim()).filter(d => d);
      const expiresAt = newToken.expires_days !== '0'
        ? new Date(Date.now() + parseInt(newToken.expires_days) * 86400000).toISOString()
        : null;

      const { error } = await supabase
        .from('embed_tokens')
        .insert({
          token,
          name: newToken.name,
          organization_id: organizationId,
          allowed_domains: domains,
          expires_at: expiresAt,
          is_active: true,
          token_type: newToken.token_type,
        } as any);

      if (error) throw error;
      toast.success('تم إنشاء رمز التضمين بنجاح');
      setShowCreateDialog(false);
      setNewToken({ name: '', token_type: 'ticket', allowed_domains: '', allow_any_domain: true, expires_days: '0' });
      fetchData();
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error('فشل في إنشاء الرمز');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleToken = async (t: EmbedToken) => {
    try {
      const { error } = await supabase.from('embed_tokens').update({ is_active: !t.is_active }).eq('id', t.id);
      if (error) throw error;
      toast.success(t.is_active ? 'تم تعطيل الرمز' : 'تم تفعيل الرمز');
      fetchData();
    } catch { toast.error('فشل في تحديث الرمز'); }
  };

  const handleToggleApiKey = async (ak: ApiKeyItem) => {
    try {
      const { error } = await supabase.from('client_api_keys').update({ is_active: !ak.is_active }).eq('id', ak.id);
      if (error) throw error;
      toast.success(ak.is_active ? 'تم تعطيل المفتاح' : 'تم تفعيل المفتاح');
      fetchData();
    } catch { toast.error('فشل في تحديث المفتاح'); }
  };

  const handleDeleteToken = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرمز؟')) return;
    try {
      const { error } = await supabase.from('embed_tokens').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف الرمز');
      fetchData();
    } catch { toast.error('فشل في حذف الرمز'); }
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

  const getTicketWidgetCode = (key: string) =>
`<script 
  src="${baseUrl}/embed/webyan-ticket-widget.js"
  data-api-key="${key}"
  data-position="bottom-right"
  data-color="#3b82f6">
</script>`;

  const getChatWidgetCode = (key: string) =>
`<script 
  src="${baseUrl}/embed/webyan-chat-widget.js"
  data-api-key="${key}"
  data-position="bottom-right"
  data-color="#10b981">
</script>`;

  const getTokenEmbedCode = (t: EmbedToken) => {
    if (t.token_type === 'chat') {
      return `<iframe src="${baseUrl}/embed/chat?token=${t.token}" width="100%" height="600" frameborder="0" style="border:none;border-radius:12px;" allow="clipboard-write"></iframe>`;
    }
    return `<iframe src="${baseUrl}/embed/ticket?token=${t.token}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;" allow="clipboard-write"></iframe>`;
  };

  const ticketTokens = tokens.filter(t => t.token_type !== 'chat');
  const chatTokens = tokens.filter(t => t.token_type === 'chat');

  if (loading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* API Keys Section - NEW */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              مفاتيح API
            </h3>
            <p className="text-sm text-muted-foreground">مفتاح API موحد لتضمين نماذج التذاكر والمراسلات - كود تضمين واحد لجميع المواقع</p>
          </div>
          <Button className="gap-2" onClick={() => setShowCreateApiKeyDialog(true)}>
            <Plus className="w-4 h-4" />
            إنشاء مفتاح API
          </Button>
        </div>

        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>لا توجد مفاتيح API لهذا العميل</p>
              <p className="text-xs mt-1">أنشئ مفتاحاً لتستخدمه في كود التضمين الموحد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {apiKeys.map(ak => (
              <Card key={ak.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{ak.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={ak.is_active ? 'default' : 'secondary'} className="text-xs">
                        {ak.is_active ? 'فعال' : 'معطل'}
                      </Badge>
                      <Switch checked={ak.is_active} onCheckedChange={() => handleToggleApiKey(ak)} />
                      <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => handleDeleteApiKey(ak.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* API Key display */}
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono truncate" dir="ltr">
                      {ak.api_key}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(ak.api_key, `key-${ak.id}`)}>
                      {copiedField === `key-${ak.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>

                  {/* Usage stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {ak.usage_count || 0} استخدام</span>
                    {ak.last_used_at && <span>آخر استخدام: {format(new Date(ak.last_used_at), 'dd MMM yyyy', { locale: ar })}</span>}
                  </div>

                  {/* Embed codes */}
                  <div className="grid gap-2 md:grid-cols-2">
                    <Button
                      size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => copyToClipboard(getTicketWidgetCode(ak.api_key), `ticket-code-${ak.id}`)}
                    >
                      {copiedField === `ticket-code-${ak.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <Ticket className="w-3 h-3" />
                      نسخ كود تذاكر الدعم
                    </Button>
                    <Button
                      size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => copyToClipboard(getChatWidgetCode(ak.api_key), `chat-code-${ak.id}`)}
                    >
                      {copiedField === `chat-code-${ak.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <MessageCircle className="w-3 h-3" />
                      نسخ كود المراسلات
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Legacy Embed Tokens Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Code2 className="w-5 h-5 text-muted-foreground" />
            رموز التضمين (النظام القديم)
          </h3>
          <p className="text-sm text-muted-foreground">رموز التضمين المرتبطة بـ {organizationName}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4" />
          إنشاء رمز
        </Button>
      </div>

      {/* Ticket Tokens */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" />
          تذاكر الدعم ({ticketTokens.length})
        </h4>
        {ticketTokens.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg text-center">لا توجد رموز</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {ticketTokens.map(t => (
              <Card key={t.id} className="relative">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.is_active ? 'default' : 'secondary'} className="text-xs">{t.is_active ? 'فعال' : 'معطل'}</Badge>
                      <Switch checked={t.is_active} onCheckedChange={() => handleToggleToken(t)} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1 text-xs flex-1" onClick={() => copyToClipboard(getTokenEmbedCode(t), `code-${t.id}`)}>
                      {copiedField === `code-${t.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      نسخ كود التضمين
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteToken(t.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Chat Tokens */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-600" />
          المراسلات ({chatTokens.length})
        </h4>
        {chatTokens.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg text-center">لا توجد رموز</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {chatTokens.map(t => (
              <Card key={t.id} className="relative">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.is_active ? 'default' : 'secondary'} className="text-xs">{t.is_active ? 'فعال' : 'معطل'}</Badge>
                      <Switch checked={t.is_active} onCheckedChange={() => handleToggleToken(t)} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1 text-xs flex-1" onClick={() => copyToClipboard(getTokenEmbedCode(t), `code-${t.id}`)}>
                      {copiedField === `code-${t.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      نسخ كود التضمين
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteToken(t.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateApiKeyDialog} onOpenChange={setShowCreateApiKeyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إنشاء مفتاح API جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم المفتاح</Label>
              <Input value={newApiKeyName} onChange={(e) => setNewApiKeyName(e.target.value)} placeholder="مثال: المفتاح الرئيسي" />
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>سيتم إنشاء مفتاح فريد بصيغة <code className="text-primary">wbyn_xxxxx</code> يمكنك استخدامه في كود التضمين الموحد لتذاكر الدعم والمراسلات.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateApiKeyDialog(false)}>إلغاء</Button>
            <Button onClick={handleCreateApiKey} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Legacy Token Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إنشاء رمز تضمين (نظام قديم)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>نوع التضمين *</Label>
              <Select value={newToken.token_type} onValueChange={(v) => setNewToken({ ...newToken, token_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ticket">تذاكر الدعم</SelectItem>
                  <SelectItem value="chat">المراسلات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اسم الرمز *</Label>
              <Input placeholder="مثال: نموذج الدعم الرئيسي" value={newToken.name} onChange={(e) => setNewToken({ ...newToken, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>مدة الصلاحية</Label>
              <Select value={newToken.expires_days} onValueChange={(v) => setNewToken({ ...newToken, expires_days: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">بدون انتهاء</SelectItem>
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
              {creating ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
