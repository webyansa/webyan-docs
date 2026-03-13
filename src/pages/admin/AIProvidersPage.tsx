
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Plug, TestTube, Download, Sparkles, ChevronDown, Bug, Loader2,
  CheckCircle2, XCircle, AlertCircle, Clock, Zap
} from 'lucide-react';

interface ProviderData {
  id?: string;
  provider_name: string;
  api_key_encrypted: string;
  base_url: string;
  default_model: string;
  enabled: boolean;
  status: string;
  last_tested_at: string | null;
  last_test_result: string | null;
  last_test_latency_ms: number | null;
  models_cache: { models?: { id: string; name: string }[]; fetched_at?: string } | null;
}

interface DebugInfo {
  endpoint?: string;
  model?: string;
  status_code?: number;
  response_snippet?: string;
  error?: string;
}

export default function AIProvidersPage() {
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://openrouter.ai/api/v1');
  const [defaultModel, setDefaultModel] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingGen, setTestingGen] = useState(false);
  const [genResult, setGenResult] = useState('');
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  const invoke = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke('manage-ai-providers', {
      body: { action, provider_name: 'OpenRouter', ...extra },
    });
    if (error) throw new Error(error.message);
    return data;
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await invoke('get-status');
      if (data.provider) {
        setProvider(data.provider);
        setBaseUrl(data.provider.base_url || 'https://openrouter.ai/api/v1');
        setDefaultModel(data.provider.default_model || '');
        setEnabled(data.provider.enabled || false);
        if (data.provider.models_cache?.models) {
          setModels(data.provider.models_cache.models);
        }
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await invoke('save', {
        api_key: apiKey || undefined,
        base_url: baseUrl,
        default_model: defaultModel,
        enabled,
      });
      if (data.error) throw new Error(data.error);
      setProvider(data.provider);
      setApiKey('');
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setDebugInfo(null);
    try {
      const data = await invoke('test-connection');
      setDebugInfo({
        endpoint: `${baseUrl}/models`,
        status_code: data.status_code,
        response_snippet: data.result,
      });
      if (data.success) {
        toast.success(`الاتصال ناجح (${data.latency_ms}ms)`);
      } else {
        toast.error(data.result);
      }
      await loadStatus();
    } catch (e: any) {
      toast.error(e.message);
      setDebugInfo({ error: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    try {
      const data = await invoke('fetch-models');
      if (data.error) throw new Error(data.error);
      setModels(data.models || []);
      toast.success(`تم جلب ${data.count} موديل`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFetchingModels(false);
    }
  };

  const handleTestGeneration = async () => {
    setTestingGen(true);
    setGenResult('');
    setDebugInfo(null);
    try {
      const data = await invoke('test-generation');
      setDebugInfo({
        endpoint: `${baseUrl}/chat/completions`,
        model: data.model,
        status_code: data.status_code,
        response_snippet: data.response_snippet?.slice(0, 300),
        error: data.error,
      });
      if (data.success) {
        setGenResult(data.content);
        toast.success(`اختبار التوليد ناجح (${data.latency_ms}ms)`);
      } else {
        toast.error(data.error || 'فشل اختبار التوليد');
      }
      await loadStatus();
    } catch (e: any) {
      toast.error(e.message);
      setDebugInfo({ error: e.message });
    } finally {
      setTestingGen(false);
    }
  };

  const statusBadge = () => {
    const s = provider?.status || 'inactive';
    if (s === 'active') return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 ml-1" />يعمل</Badge>;
    if (s === 'error') return <Badge variant="destructive"><XCircle className="h-3 w-3 ml-1" />خطأ</Badge>;
    return <Badge variant="secondary"><AlertCircle className="h-3 w-3 ml-1" />غير مفعّل</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">مزودي الذكاء الاصطناعي</h1>
        <p className="text-muted-foreground">إدارة مزودي خدمات الذكاء الاصطناعي المتصلة بالنظام</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              OpenRouter
            </CardTitle>
            <CardDescription>مزود موديلات AI متعدد عبر واجهة OpenRouter</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {statusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status info */}
          {provider && (provider.last_tested_at || provider.last_test_latency_ms) && (
            <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-muted/50 text-sm">
              {provider.last_tested_at && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  آخر اختبار: {new Date(provider.last_tested_at).toLocaleString('ar-SA')}
                </div>
              )}
              {provider.last_test_latency_ms != null && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Zap className="h-3.5 w-3.5" />
                  زمن الاستجابة: {provider.last_test_latency_ms}ms
                </div>
              )}
            </div>
          )}

          {provider?.last_test_result && (
            <div className={`p-3 rounded-lg text-sm ${provider.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive'}`}>
              {provider.last_test_result}
            </div>
          )}

          {/* Form */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder={provider?.api_key_encrypted ? `الحالي: ${provider.api_key_encrypted}` : 'أدخل مفتاح API'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">يُخزّن بشكل آمن ولا يُعرض كاملاً</p>
            </div>

            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
              />
            </div>

            <div className="space-y-2">
              <Label>الموديل الافتراضي</Label>
              {models.length > 0 ? (
                <Select value={defaultModel} onValueChange={setDefaultModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر موديل" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || m.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  placeholder="مثال: openai/gpt-4o"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>التفعيل</Label>
              <div className="flex items-center gap-3 pt-1">
                <Switch checked={enabled} onCheckedChange={setEnabled} />
                <span className="text-sm text-muted-foreground">{enabled ? 'مفعّل' : 'معطّل'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              حفظ الإعدادات
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testing || !provider}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <TestTube className="h-4 w-4 ml-2" />}
              اختبار الاتصال
            </Button>
            <Button variant="outline" onClick={handleFetchModels} disabled={fetchingModels || !provider}>
              {fetchingModels ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Download className="h-4 w-4 ml-2" />}
              جلب الموديلات
            </Button>
            <Button variant="outline" onClick={handleTestGeneration} disabled={testingGen || !provider}>
              {testingGen ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Sparkles className="h-4 w-4 ml-2" />}
              اختبار توليد
            </Button>
          </div>

          {/* Generation result */}
          {genResult && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium mb-1">نتيجة التوليد:</p>
              <p className="text-sm">{genResult}</p>
            </div>
          )}

          {/* Debug Panel */}
          <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <Bug className="h-4 w-4" />
                Debug Panel
                <ChevronDown className={`h-4 w-4 transition-transform ${debugOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {debugInfo ? (
                <div className="mt-2 p-4 rounded-lg bg-muted/30 border text-sm font-mono space-y-1" dir="ltr">
                  {debugInfo.endpoint && <div><span className="text-muted-foreground">Endpoint:</span> {debugInfo.endpoint}</div>}
                  {debugInfo.model && <div><span className="text-muted-foreground">Model:</span> {debugInfo.model}</div>}
                  {debugInfo.status_code != null && <div><span className="text-muted-foreground">Status:</span> {debugInfo.status_code}</div>}
                  {debugInfo.response_snippet && (
                    <div>
                      <span className="text-muted-foreground">Response:</span>
                      <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap">{debugInfo.response_snippet}</pre>
                    </div>
                  )}
                  {debugInfo.error && <div className="text-destructive"><span className="text-muted-foreground">Error:</span> {debugInfo.error}</div>}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">لا توجد بيانات تصحيح بعد. نفّذ عملية أولاً.</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}
