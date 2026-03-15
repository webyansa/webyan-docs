
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Send, Loader2, CheckCircle2, XCircle, AlertTriangle, AlertCircle,
  ChevronDown, Bug, Clock, Zap, FileText, Eye, History, Search,
  ShieldCheck, FlaskConical, Sparkles, BarChart3, HeartPulse, RefreshCw,
  Lightbulb, WifiOff, KeyRound, ServerCrash,
} from 'lucide-react';

// ─── Types ───
interface Source {
  id: string; title: string; section_path: string; category: string;
  content: string; token_estimate: number; priority: string;
  similarity_score: number; keyword_score: number; metadata_boost: number;
  final_score: number; ranking_reasons: string[]; matched_keywords: string[];
  source_file: string;
}

interface ValidationCheck {
  check: string; label: string; passed: boolean; detail: string; critical: boolean;
}

interface TechnicalDetails {
  stage_failed: 'openrouter_request' | 'retrieval' | 'prompt_builder' | 'validation' | null;
  selected_model: string | null;
  retrieval_succeeded: boolean;
  retrieved_chunks_count: number;
  prompt_size_estimate: number;
  status_code: number;
  provider_error: string | null;
  raw_error_snippet: string | null;
  provider_used: string;
  endpoint: string | null;
}

interface ValidationResult {
  success: boolean; is_grounded: boolean; final_answer: string;
  sources: Source[]; confidence: number; model?: string;
  latency_ms: number; token_usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  response_status: string; debug?: Record<string, any>;
  validation_status: string; validation_notes: ValidationCheck[];
  fallback_message?: string;
  error_type?: string;
  message?: string;
  suggestion?: string;
  stage_failed?: TechnicalDetails['stage_failed'];
  technical_details?: TechnicalDetails;
  debug_notes?: string[];
}

interface HistoryItem {
  id: string; question: string; model: string | null;
  response_status: string; latency_ms: number | null;
  is_grounded: boolean; confidence_score: number | null;
  sources_json: any; validation_status: string;
  validation_notes: any; created_at: string;
}

interface HealthCheckResult {
  healthy: boolean;
  provider_status?: string;
  last_checked?: string;
  suggested_default_model?: string;
  connection_state?: string;
  checks: {
    openai_key: boolean;
    openrouter_provider: boolean;
    openrouter_reachable: boolean;
    provider_status?: string;
    default_model?: string;
    checked_at: string;
  };
}

interface DebugRunReport {
  success: boolean;
  stage_failed: TechnicalDetails['stage_failed'];
  selected_model: string;
  retrieved_chunks_count: number;
  prompt_size_estimate: number;
  response_status: number;
  provider_error: string | null;
  debug_notes: string[];
  technical_details?: TechnicalDetails;
  message?: string;
}

// ─── Models ───
const MODELS = [
  { group: 'Production Models', items: [
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', badge: 'Recommended', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', badge: 'Premium', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', badge: 'Premium', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', badge: 'Fast', badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', badge: 'Premium', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  ]},
  { group: 'Free Test Models', items: [
    { id: 'openai/gpt-oss-20b:free', name: 'GPT-OSS 20B', provider: 'OpenAI', badge: 'Free', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B', provider: 'Google', badge: 'Free', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', provider: 'Meta', badge: 'Free', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  ]},
];

const getModelInfo = (modelId: string) => {
  for (const group of MODELS) {
    const found = group.items.find(m => m.id === modelId);
    if (found) return found;
  }
  return null;
};

const QUICK_TESTS = [
  'ما هي خطط الاشتراك في ويبيان؟',
  'ما البريد الرسمي لمنصة ويبيان؟',
  'ما الذي لا يجب قوله عن ويبيان؟',
  'ما الفئة المستهدفة في ويبيان؟',
  'هل ويبيان تقدم نظام محاسبة ورواتب؟',
];

const CATEGORIES = ['pricing', 'faq', 'facts', 'support', 'policies', 'product', 'modules', 'do_not_say', 'writing_style', 'ai_guidelines'];
const ALL_CATEGORIES_VALUE = 'all';

const ERROR_ICONS: Record<string, React.ReactNode> = {
  api_key_missing: <KeyRound className="h-5 w-5" />,
  invalid_api_key: <KeyRound className="h-5 w-5" />,
  provider_unavailable: <WifiOff className="h-5 w-5" />,
  model_not_found: <ServerCrash className="h-5 w-5" />,
  rate_limit: <Clock className="h-5 w-5" />,
  timeout: <Clock className="h-5 w-5" />,
  empty_retrieval: <Search className="h-5 w-5" />,
  prompt_too_large: <FileText className="h-5 w-5" />,
};

export default function GroundedChatValidationPage() {
  const [question, setQuestion] = useState('');
  const [model, setModel] = useState('openai/gpt-4o-mini');
  const [topK, setTopK] = useState('5');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES_VALUE);
  const [debugMode, setDebugMode] = useState(false);
  const [enableFallback, setEnableFallback] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [viewSource, setViewSource] = useState<Source | null>(null);
  const [viewDetail, setViewDetail] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('test');

  // Health check state
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Last error/success
  const [lastError, setLastError] = useState<any>(null);
  const [lastSuccess, setLastSuccess] = useState<any>(null);
  const [openRouterOnlyResult, setOpenRouterOnlyResult] = useState<DebugRunReport | null>(null);
  const [debugRunResult, setDebugRunResult] = useState<DebugRunReport | null>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState<'openrouter' | 'grounded' | null>(null);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  // Load last error + success on mount
  useEffect(() => {
    loadLastErrorAndSuccess();
  }, []);

  const loadLastErrorAndSuccess = async () => {
    try {
      const [errResp, succResp] = await Promise.all([
        supabase.functions.invoke('grounded-chat-test', { body: { action: 'last-error' } }),
        supabase.functions.invoke('grounded-chat-test', { body: { action: 'last-success' } }),
      ]);
      if (errResp.data?.success) setLastError(errResp.data.error_log);
      if (succResp.data?.success) setLastSuccess(succResp.data.last_success);
    } catch { /* ignore */ }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const resp = await supabase.functions.invoke('grounded-chat-test', {
        body: { action: 'validation-history' },
      });
      if (resp.data?.success) setHistory(resp.data.validations || []);
    } catch { toast.error('فشل تحميل السجل'); }
    finally { setHistoryLoading(false); }
  };

  const runHealthCheck = async () => {
    setHealthLoading(true);
    try {
      const resp = await supabase.functions.invoke('grounded-chat-test', {
        body: { action: 'health-check' },
      });
      if (resp.data?.success) {
        setHealthCheck(resp.data);
        toast[resp.data.healthy ? 'success' : 'warning'](resp.data.healthy ? 'جميع الأنظمة تعمل بشكل سليم' : 'توجد مشاكل في المزود');
      }
    } catch {
      toast.error('تعذر تنفيذ فحص صحة المزود.');
    } finally {
      setHealthLoading(false);
    }
  };

  const extractErrorPayload = async (error: any): Promise<any | null> => {
    if (!error) return null;
    if (typeof error === 'string') {
      try { return JSON.parse(error); } catch { return { message: error }; }
    }
    if (error.context) {
      try {
        const cloned = error.context.clone ? error.context.clone() : error.context;
        return await cloned.json();
      } catch {
        try {
          const text = await error.context.text();
          return JSON.parse(text);
        } catch {
          return null;
        }
      }
    }
    return error;
  };

  const toValidationErrorResult = (payload: any): ValidationResult => ({
    success: false,
    is_grounded: false,
    final_answer: '',
    sources: [],
    confidence: 0,
    latency_ms: 0,
    response_status: 'error',
    validation_status: 'failed',
    validation_notes: [],
    error_type: payload?.error_type || 'provider_error',
    message: payload?.message || 'تعذر تحديد سبب الفشل من الخادم.',
    suggestion: payload?.suggestion,
    stage_failed: payload?.stage_failed,
    technical_details: payload?.technical_details,
    debug_notes: payload?.debug_notes || [],
    debug: payload?.debug || payload,
  });

  const runValidation = async () => {
    if (!question.trim()) { toast.error('أدخل السؤال أولاً'); return; }
    setLoading(true);
    setResult(null);
    try {
      const resp = await supabase.functions.invoke('grounded-chat-test', {
        body: {
          action: 'validate',
          question,
          model,
          top_k: parseInt(topK),
          category_filter: categoryFilter === ALL_CATEGORIES_VALUE ? undefined : categoryFilter,
          enable_fallback: enableFallback,
        },
      });

      if (resp.error) {
        const payload = await extractErrorPayload(resp.error);
        const normalized = toValidationErrorResult(payload);
        setResult(normalized);
        toast.error(normalized.message || 'تعذر تنفيذ الاختبار.');
        loadLastErrorAndSuccess();
        return;
      }

      const data = resp.data;
      if (data && data.success === false) {
        const normalized = toValidationErrorResult(data);
        setResult(normalized);
        toast.error(normalized.message || 'تعذر تنفيذ الاختبار.');
        loadLastErrorAndSuccess();
        return;
      }

      setResult(data);
      if (data?.fallback_message) toast.info(data.fallback_message);
      else toast.success('تم تنفيذ الاختبار بنجاح');
      loadLastErrorAndSuccess();
    } catch (e: any) {
      const payload = await extractErrorPayload(e);
      const normalized = toValidationErrorResult(payload || { message: 'لم يصل رد تشخيصي من الخادم.' });
      setResult(normalized);
      toast.error(normalized.message);
    } finally {
      setLoading(false);
    }
  };

  const runOpenRouterOnly = async () => {
    setDiagnosticLoading('openrouter');
    setOpenRouterOnlyResult(null);
    try {
      const resp = await supabase.functions.invoke('grounded-chat-test', { body: { action: 'openrouter-debug-test' } });
      if (resp.error) {
        const payload = await extractErrorPayload(resp.error);
        setOpenRouterOnlyResult(payload as DebugRunReport);
        toast.error(payload?.message || 'فشل اختبار OpenRouter المباشر.');
        return;
      }
      setOpenRouterOnlyResult(resp.data as DebugRunReport);
      toast.success('تم تنفيذ Test OpenRouter Only.');
    } finally {
      setDiagnosticLoading(null);
    }
  };

  const runDebugGroundedRun = async () => {
    if (!question.trim()) { toast.error('أدخل السؤال أولاً'); return; }
    setDiagnosticLoading('grounded');
    setDebugRunResult(null);
    try {
      const resp = await supabase.functions.invoke('grounded-chat-test', {
        body: {
          action: 'debug-run',
          question,
          model,
          top_k: parseInt(topK),
          category_filter: categoryFilter === ALL_CATEGORIES_VALUE ? undefined : categoryFilter,
        },
      });
      if (resp.error) {
        const payload = await extractErrorPayload(resp.error);
        setDebugRunResult(payload as DebugRunReport);
        toast.error(payload?.message || 'فشل Debug Grounded Run.');
        return;
      }
      setDebugRunResult(resp.data as DebugRunReport);
      toast[resp.data?.success ? 'success' : 'error'](resp.data?.success ? 'Debug Grounded Run نجح.' : 'Debug Grounded Run كشف سبب الفشل.');
    } finally {
      setDiagnosticLoading(null);
    }
  };

  const retryLastFailed = async () => {
    if (lastError?.question) {
      setQuestion(lastError.question);
      if (lastError.model_used) setModel(lastError.model_used);
      toast.info('تم تحميل آخر سؤال فاشل. اضغط "تشغيل الاختبار" لإعادة المحاولة.');
    } else {
      toast.info('لا يوجد اختبار فاشل سابق');
    }
  };

  const loadValidationDetail = async (id: string) => {
    try {
      const resp = await supabase.functions.invoke('grounded-chat-test', {
        body: { action: 'validation-get', validation_id: id },
      });
      if (resp.data?.success) setViewDetail(resp.data.validation);
    } catch { toast.error('فشل تحميل التفاصيل'); }
  };

  const statusIcon = (s: string) => {
    if (s === 'pass') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    if (s === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  const statusBadge = (s: string) => {
    if (s === 'pass') return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Pass ✓</Badge>;
    if (s === 'warning') return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Warning ⚠</Badge>;
    return <Badge variant="destructive">Failed ✗</Badge>;
  };

  const currentModelInfo = getModelInfo(model);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header with status badges */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            التحقق من صحة المحادثة
          </h1>
          <p className="text-muted-foreground mt-1">اختبار وتحقق من أن نظام الذكاء الاصطناعي يجيب من قاعدة المعرفة فقط</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Model status badge */}
          {currentModelInfo && (
            <Badge variant="outline" className="gap-1">
              {currentModelInfo.provider} • {currentModelInfo.name}
            </Badge>
          )}
          {/* Provider status */}
          {healthCheck && (
            <Badge className={healthCheck.healthy ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}>
              {healthCheck.healthy ? '✓ المزود متصل' : '✗ مشكلة في المزود'}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={runHealthCheck} disabled={healthLoading} className="gap-1">
            {healthLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HeartPulse className="h-3.5 w-3.5" />}
            فحص صحة المزود
          </Button>
          <Button variant="outline" size="sm" onClick={retryLastFailed} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            إعادة آخر فشل
          </Button>
        </div>
      </div>

      {/* Health Check Results */}
      {healthCheck && (
        <Card className={healthCheck.healthy ? 'border-emerald-200 dark:border-emerald-800' : 'border-destructive/50'}>
          <CardContent className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <HealthItem label="مفتاح OpenAI" ok={healthCheck.checks.openai_key} />
              <HealthItem label="مزود OpenRouter" ok={healthCheck.checks.openrouter_provider} />
              <HealthItem label="الاتصال بالمزود" ok={healthCheck.checks.openrouter_reachable} />
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground">آخر فحص</p>
                <p className="text-xs font-medium mt-0.5">{new Date(healthCheck.checks.checked_at).toLocaleTimeString('ar-SA')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Error / Last Success */}
      {(lastError || lastSuccess) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lastError && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" /> آخر خطأ
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <p><span className="text-muted-foreground">النوع:</span> {lastError.error_type}</p>
                <p><span className="text-muted-foreground">النموذج:</span> {lastError.model_used}</p>
                <p><span className="text-muted-foreground">الرسالة:</span> {lastError.error_message}</p>
                <p><span className="text-muted-foreground">الوقت:</span> {new Date(lastError.created_at).toLocaleString('ar-SA')}</p>
              </CardContent>
            </Card>
          )}
          {lastSuccess && (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> آخر نجاح
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <p><span className="text-muted-foreground">السؤال:</span> {lastSuccess.question?.slice(0, 60)}</p>
                <p><span className="text-muted-foreground">النموذج:</span> {lastSuccess.model}</p>
                <p><span className="text-muted-foreground">الزمن:</span> {lastSuccess.latency_ms}ms</p>
                <p><span className="text-muted-foreground">الوقت:</span> {new Date(lastSuccess.created_at).toLocaleString('ar-SA')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="test" className="gap-1"><FlaskConical className="h-4 w-4" /> اختبار التحقق</TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><History className="h-4 w-4" /> سجل التحقق</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-6 mt-4">
          {/* Quick Tests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> أسئلة اختبار سريعة</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {QUICK_TESTS.map((q, i) => (
                <Button key={i} variant="outline" size="sm" onClick={() => setQuestion(q)} className="text-xs">
                  {q}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">إعدادات الاختبار</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>سؤال المستخدم</Label>
                <Textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="أدخل السؤال هنا..." className="mt-1" rows={3} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Model Selector */}
                <div>
                  <Label>النموذج</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODELS.map(group => (
                        <SelectGroup key={group.group}>
                          <SelectLabel className="text-xs font-bold text-muted-foreground">{group.group}</SelectLabel>
                          {group.items.map(m => (
                            <SelectItem key={m.id} value={m.id}>
                              <span className="flex items-center gap-2">
                                <span>{m.name}</span>
                                <span className="text-[10px] text-muted-foreground">— {m.provider}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${m.badgeClass}`}>{m.badge}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Top K</Label>
                  <Select value={topK} onValueChange={setTopK}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>التصنيف (اختياري)</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="الكل" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_CATEGORIES_VALUE}>الكل</SelectItem>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2 justify-end">
                  <div className="flex items-center gap-2">
                    <Switch checked={debugMode} onCheckedChange={setDebugMode} id="debug" />
                    <Label htmlFor="debug" className="flex items-center gap-1"><Bug className="h-3.5 w-3.5" /> Debug</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={enableFallback} onCheckedChange={setEnableFallback} id="fallback" />
                    <Label htmlFor="fallback" className="flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5" /> Fallback</Label>
                  </div>
                </div>
              </div>

              <Button onClick={runValidation} disabled={loading} className="w-full gap-2" size="lg">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {loading ? 'جارِ التحقق...' : 'تشغيل الاختبار'}
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button variant="outline" onClick={runOpenRouterOnly} disabled={diagnosticLoading !== null} className="gap-2">
                  {diagnosticLoading === 'openrouter' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Test OpenRouter Only
                </Button>
                <Button variant="outline" onClick={runDebugGroundedRun} disabled={diagnosticLoading !== null} className="gap-2">
                  {diagnosticLoading === 'grounded' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
                  Debug Grounded Run
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error Display (structured) */}
          {result && !result.success && result.error_type && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="text-destructive shrink-0 mt-1">
                    {ERROR_ICONS[result.error_type] || <AlertCircle className="h-5 w-5" />}
                  </div>
                  <div className="space-y-2 flex-1">
                    <p className="font-semibold text-destructive">{result.message}</p>
                    {result.suggestion && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>{result.suggestion}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">{result.error_type}</Badge>
                      {result.debug?.status_code ? <Badge variant="outline" className="text-xs">Status: {result.debug.status_code}</Badge> : null}
                      {result.debug?.model_used && <Badge variant="outline" className="text-xs">Model: {result.debug.model_used}</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Results */}
          {result && result.success && (
            <div className="space-y-4">
              {/* Fallback notice */}
              {result.fallback_message && (
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                  <CardContent className="py-3 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">{result.fallback_message}</p>
                  </CardContent>
                </Card>
              )}

              {/* Error within successful response (e.g. OpenRouter failed but we still return validation) */}
              {result.response_status === 'error' && result.error_type && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive">{result.message}</p>
                        {result.suggestion && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> {result.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Final Answer */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> الإجابة النهائية</CardTitle>
                    <div className="flex items-center gap-2">
                      {result.is_grounded
                        ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Grounded ✓</Badge>
                        : <Badge variant="destructive">Not Grounded</Badge>}
                      {result.validation_status && statusBadge(result.validation_status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed">
                    {result.final_answer}
                  </div>
                </CardContent>
              </Card>

              {/* Sources */}
              {result.sources.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> المصادر المستخدمة ({result.sources.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.sources.map((s, i) => (
                        <div key={s.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">[مرجع {i + 1}] {s.title}</p>
                              <p className="text-xs text-muted-foreground">{s.source_file} • {s.category} • {s.section_path}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">Score: {s.final_score}</Badge>
                              <Button variant="ghost" size="sm" onClick={() => setViewSource(s)}><Eye className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{s.content}</p>
                          <div className="flex flex-wrap gap-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">Similarity: {s.similarity_score}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">Keyword: {s.keyword_score}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">Boost: {s.metadata_boost}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Retrieval Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> ملخص الاسترجاع</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: 'الأجزاء المسترجعة', value: result.sources.length },
                      { label: 'التصنيف', value: categoryFilter === ALL_CATEGORIES_VALUE ? 'الكل' : categoryFilter },
                      { label: 'Top K', value: topK },
                      { label: 'زمن الاسترجاع', value: `${result.debug?.timings?.retrieval_total || 0}ms` },
                      { label: 'الزمن الكلي', value: `${result.latency_ms}ms` },
                      { label: 'النموذج', value: result.model || model },
                    ].map((item, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-semibold mt-0.5 truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Validation Checks */}
              {result.validation_notes && result.validation_notes.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> نتيجة التحقق</CardTitle>
                      {statusBadge(result.validation_status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.validation_notes.map((check, i) => (
                        <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border ${check.passed ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' : check.critical ? 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800' : 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800'}`}>
                          {check.passed
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            : check.critical
                              ? <XCircle className="h-4 w-4 text-destructive shrink-0" />
                              : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{check.label}</p>
                            <p className="text-xs text-muted-foreground">{check.detail}</p>
                          </div>
                          {check.critical && <Badge variant="outline" className="text-[10px] shrink-0">حرج</Badge>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Debug Panel */}
              {debugMode && result.debug && (
                <Collapsible defaultOpen>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Bug className="h-4 w-4" /> وضع التصحيح
                          <ChevronDown className="h-4 w-4 mr-auto" />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-3 text-xs font-mono">
                            <DebugRow label="النموذج المطلوب" value={result.debug.model_requested || model} />
                            <DebugRow label="النموذج المستخدم" value={result.debug.model_used} />
                            <DebugRow label="Fallback مستخدم" value={result.debug.fallback_used ? 'نعم ✓' : 'لا'} />
                            <DebugRow label="المزود" value={result.debug.provider || 'OpenRouter'} />
                            <DebugRow label="Endpoint" value={result.debug.endpoint || '-'} />
                            <Separator />
                            <DebugRow label="السؤال الأصلي" value={question} />
                            <DebugRow label="السؤال المعاد صياغته" value={result.debug.rewritten_query} />
                            <DebugRow label="الأسئلة الفرعية" value={JSON.stringify(result.debug.sub_queries, null, 2)} />
                            <DebugRow label="الكلمات المفتاحية (عربي)" value={JSON.stringify(result.debug.keywords_ar)} />
                            <DebugRow label="الكلمات المفتاحية (إنجليزي)" value={JSON.stringify(result.debug.keywords_en)} />
                            <DebugRow label="القصد المكتشف" value={result.debug.detected_intent} />
                            <DebugRow label="إعادة كتابة AI" value={result.debug.query_rewrite_used_ai ? 'نعم' : 'لا'} />
                            <Separator />
                            <DebugRow label="عدد المرشحين" value={result.debug.candidates_count} />
                            <DebugRow label="الأجزاء المسترجعة" value={result.debug.retrieved_chunks_count} />
                            <DebugRow label="حجم الـ Prompt" value={`~${result.debug.prompt_size_estimate || '-'} tokens`} />
                            <DebugRow label="Response Status Code" value={result.debug.status_code} />
                            <DebugRow label="Token Usage" value={JSON.stringify(result.debug.token_usage, null, 2)} />
                            {result.debug.error_type && (
                              <>
                                <Separator />
                                <DebugRow label="نوع الخطأ" value={result.debug.error_type} />
                                <DebugRow label="رسالة المزود" value={result.debug.provider_message} />
                              </>
                            )}
                            <Separator />
                            <div>
                              <p className="text-muted-foreground mb-1">مقتطف رد المزود:</p>
                              <pre className="bg-muted p-2 rounded text-[10px] whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                {result.debug.raw_response_snippet || '-'}
                              </pre>
                            </div>
                            <Separator />
                            <div>
                              <p className="text-muted-foreground mb-1">التوقيتات:</p>
                              {result.debug.timings && Object.entries(result.debug.timings).map(([k, v]) => (
                                <div key={k} className="flex justify-between py-0.5">
                                  <span>{k}</span><span>{String(v)}ms</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">سجل التحقق</CardTitle>
                <Button variant="outline" size="sm" onClick={loadHistory} disabled={historyLoading}>
                  {historyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'تحديث'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد سجلات بعد</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>السؤال</TableHead>
                      <TableHead>النموذج</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الزمن</TableHead>
                      <TableHead>المصادر</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map(h => (
                      <TableRow key={h.id}>
                        <TableCell className="max-w-[200px] truncate text-sm">{h.question}</TableCell>
                        <TableCell className="text-xs">{h.model?.split('/').pop() || '-'}</TableCell>
                        <TableCell>{statusBadge(h.validation_status)}</TableCell>
                        <TableCell className="text-xs">{h.latency_ms}ms</TableCell>
                        <TableCell className="text-xs">{Array.isArray(h.sources_json) ? h.sources_json.length : 0}</TableCell>
                        <TableCell className="text-xs">{new Date(h.created_at).toLocaleString('ar-SA')}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => loadValidationDetail(h.id)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Source Detail Dialog */}
      <Dialog open={!!viewSource} onOpenChange={() => setViewSource(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{viewSource?.title}</DialogTitle>
          </DialogHeader>
          {viewSource && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">الملف:</span> {viewSource.source_file}</div>
                <div><span className="text-muted-foreground">التصنيف:</span> {viewSource.category}</div>
                <div><span className="text-muted-foreground">المسار:</span> {viewSource.section_path}</div>
                <div><span className="text-muted-foreground">الأولوية:</span> {viewSource.priority}</div>
                <div><span className="text-muted-foreground">Score:</span> {viewSource.final_score}</div>
                <div><span className="text-muted-foreground">Similarity:</span> {viewSource.similarity_score}</div>
              </div>
              <Separator />
              <div className="whitespace-pre-wrap bg-muted/50 rounded p-3">{viewSource.content}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Validation Detail Dialog */}
      <Dialog open={!!viewDetail} onOpenChange={() => setViewDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل التحقق</DialogTitle>
          </DialogHeader>
          {viewDetail && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">الحالة:</span>
                {statusBadge(viewDetail.validation_status)}
              </div>
              <div><span className="text-muted-foreground">السؤال:</span> {viewDetail.question}</div>
              <div><span className="text-muted-foreground">النموذج:</span> {viewDetail.model}</div>
              <Separator />
              <div>
                <p className="font-medium mb-2">الإجابة:</p>
                <div className="bg-muted/50 rounded p-3 whitespace-pre-wrap">{viewDetail.final_answer}</div>
              </div>
              {viewDetail.validation_notes && (
                <div>
                  <p className="font-medium mb-2">نتائج التحقق:</p>
                  <div className="space-y-1.5">
                    {(viewDetail.validation_notes as ValidationCheck[]).map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {c.passed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                        <span>{c.label}</span>
                        <span className="text-muted-foreground">— {c.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HealthItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`rounded-lg p-3 text-center border ${ok ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800'}`}>
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
      </div>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}

function DebugRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0 min-w-[140px]">{label}:</span>
      <span className="break-all">{String(value ?? '-')}</span>
    </div>
  );
}
