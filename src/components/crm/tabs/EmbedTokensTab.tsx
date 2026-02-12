import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Code2, Copy, Check, Plus, Trash2, Globe, Eye, EyeOff,
  Ticket, MessageCircle, Loader2, Activity
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

interface Props {
  organizationId: string;
  organizationName: string;
}

export function EmbedTokensTab({ organizationId, organizationName }: Props) {
  const [tokens, setTokens] = useState<EmbedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [newToken, setNewToken] = useState({
    name: '',
    token_type: 'ticket' as 'ticket' | 'chat',
    allowed_domains: '',
    allow_any_domain: true,
    expires_days: '0',
  });

  const baseUrl = window.location.origin;

  useEffect(() => {
    fetchTokens();
  }, [organizationId]);

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('embed_tokens')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      toast.error('فشل في تحميل رموز التضمين');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
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
      fetchTokens();
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error('فشل في إنشاء الرمز');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (t: EmbedToken) => {
    try {
      const { error } = await supabase.from('embed_tokens').update({ is_active: !t.is_active }).eq('id', t.id);
      if (error) throw error;
      toast.success(t.is_active ? 'تم تعطيل الرمز' : 'تم تفعيل الرمز');
      fetchTokens();
    } catch { toast.error('فشل في تحديث الرمز'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرمز؟')) return;
    try {
      const { error } = await supabase.from('embed_tokens').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف الرمز');
      fetchTokens();
    } catch { toast.error('فشل في حذف الرمز'); }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('تم النسخ');
    } catch { toast.error('فشل في النسخ'); }
  };

  const getEmbedCode = (t: EmbedToken) => {
    if (t.token_type === 'chat') {
      const url = `${baseUrl}/embed/chat?token=${t.token}`;
      return `<iframe src="${url}" width="100%" height="600" frameborder="0" style="border:none;border-radius:12px;" allow="clipboard-write"></iframe>`;
    }
    const url = `${baseUrl}/embed/ticket?token=${t.token}`;
    return `<iframe src="${url}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;" allow="clipboard-write"></iframe>`;
  };

  const ticketTokens = tokens.filter(t => t.token_type !== 'chat');
  const chatTokens = tokens.filter(t => t.token_type === 'chat');

  if (loading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const renderTokenCard = (t: EmbedToken) => (
    <Card key={t.id} className="relative">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {t.token_type === 'chat' ? <MessageCircle className="w-4 h-4 text-green-600" /> : <Ticket className="w-4 h-4 text-primary" />}
            <span className="font-medium text-sm">{t.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={t.is_active ? 'default' : 'secondary'} className="text-xs">
              {t.is_active ? 'فعال' : 'معطل'}
            </Badge>
            <Switch checked={t.is_active} onCheckedChange={() => handleToggle(t)} />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="w-3 h-3" />
          <span>الاستخدام: {t.usage_count || 0}</span>
          {t.last_used_at && (
            <span>• آخر استخدام: {format(new Date(t.last_used_at), 'dd MMM yyyy', { locale: ar })}</span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs flex-1"
            onClick={() => copyToClipboard(getEmbedCode(t), `code-${t.id}`)}
          >
            {copiedField === `code-${t.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            نسخ كود التضمين
          </Button>
          <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDelete(t.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" />
            رموز التضمين
          </h3>
          <p className="text-sm text-muted-foreground">إدارة نماذج التضمين المرتبطة بـ {organizationName}</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4" />
          إنشاء رمز جديد
        </Button>
      </div>

      {/* Ticket Tokens */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" />
          تذاكر الدعم ({ticketTokens.length})
        </h4>
        {ticketTokens.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg text-center">لا توجد رموز تضمين تذاكر</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">{ticketTokens.map(renderTokenCard)}</div>
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
          <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg text-center">لا توجد رموز تضمين مراسلات</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">{chatTokens.map(renderTokenCard)}</div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إنشاء رمز تضمين جديد</DialogTitle>
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
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-sm font-medium">السماح من أي نطاق</Label>
                  <p className="text-xs text-muted-foreground">تمكين التضمين من أي موقع</p>
                </div>
              </div>
              <Switch checked={newToken.allow_any_domain} onCheckedChange={(c) => setNewToken({ ...newToken, allow_any_domain: c, allowed_domains: c ? '' : newToken.allowed_domains })} />
            </div>
            {!newToken.allow_any_domain && (
              <div className="space-y-2">
                <Label>النطاقات المسموحة</Label>
                <Input placeholder="example.com, *.example.org" value={newToken.allowed_domains} onChange={(e) => setNewToken({ ...newToken, allowed_domains: e.target.value })} />
              </div>
            )}
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
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
