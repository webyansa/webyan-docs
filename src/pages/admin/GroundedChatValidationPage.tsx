
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
  ShieldCheck, FlaskConical, Sparkles, BarChart3,
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

interface ValidationResult {
  success: boolean; is_grounded: boolean; final_answer: string;
  sources: Source[]; confidence: number; model?: string;
  latency_ms: number; token_usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  response_status: string; debug?: Record<string, any>;
  validation_status: string; validation_notes: ValidationCheck[];
}

interface HistoryItem {
  id: string; question: string; model: string | null;
  response_status: string; latency_ms: number | null;
  is_grounded: boolean; confidence_score: number | null;
  sources_json: any; validation_status: string;
  validation_notes: any; created_at: string;
}

// ─── Models ───
const MODELS = [
  { group: 'Production Models', items: [
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', badge: 'Recommended', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', badge: 'Premium', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', badge: 'Premium', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  ]},
  { group: 'Free Test Models', items: [
    { id: 'openai/gpt-oss-20b:free', name: 'GPT-OSS 20B', badge: 'Free', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B', badge: 'Free', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', badge: 'Free', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  ]},
];

const QUICK_TESTS = [
  'ما هي خطط الاشتراك في ويبيان؟',
  'ما البريد الرسمي لمنصة ويبيان؟',
  'ما الذي لا يجب قوله عن ويبيان؟',
  'ما الفئة المستهدفة في ويبيان؟',
  'هل ويبيان تقدم نظام محاسبة ورواتب؟',
];

const CATEGORIES = ['pricing', 'faq', 'facts', 'support', 'policies', 'product', 'modules', 'do_not_say', 'writing_style', 'ai_guidelines'];
const ALL_CATEGORIES_VALUE = 'all';

export default function GroundedChatValidationPage() {
  const [question, setQuestion] = useState('');
  const [model, setModel] = useState('openai/gpt-4o-mini');
  const [topK, setTopK] = useState('5');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES_VALUE);
  const [debugMode, setDebugMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [viewSource, setViewSource] = useState<Source | null>(null);
  const [viewDetail, setViewDetail] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('test');

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const resp = await supabase.functions.invoke('grounded-chat-test', {
        body: { action: 'validation-history' },
      });
      if (resp.data?.success) setHistory(resp.data.validations || []);
    } catch { toast.error('فشل تحميل السجل'); }
    finally { setHistoryLoading(false); }
  };

  const runValidation = async () => {
    if (!question.trim()) { toast.error('أدخل السؤال أولاً'); return; }
    setLoading(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('يجب تسجيل الدخول'); return; }
      const resp = await supabase.functions.invoke('grounded-chat-test', {
        body: {
          action: 'validate',
          question,
          model,
          top_k: parseInt(topK),
          category_filter: categoryFilter === ALL_CATEGORIES_VALUE ? undefined : categoryFilter,
        },
      });
      if (resp.error) throw resp.error;
      if (resp.data?.error) { toast.error(resp.data.error); return; }
      setResult(resp.data);
      toast.success('تم التحقق بنجاح');
    } catch (e: any) { toast.error(e.message || 'خطأ'); }
    finally { setLoading(false); }
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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            التحقق من صحة المحادثة
          </h1>
          <p className="text-muted-foreground mt-1">اختبار وتحقق من أن نظام الذكاء الاصطناعي يجيب من قاعدة المعرفة فقط</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="test" className="gap-1"><FlaskConical className="h-4 w-4" /> اختبار التحقق</TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><History className="h-4 w-4" /> سجل التحقق</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-6 mt-4">
          {/* Quick Test Cases */}
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
                                {m.name}
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
                      <SelectItem value="">الكل</SelectItem>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={debugMode} onCheckedChange={setDebugMode} id="debug" />
                    <Label htmlFor="debug" className="flex items-center gap-1"><Bug className="h-3.5 w-3.5" /> Debug</Label>
                  </div>
                </div>
              </div>

              <Button onClick={runValidation} disabled={loading} className="w-full gap-2" size="lg">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {loading ? 'جارِ التحقق...' : 'تشغيل الاختبار'}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* A) Final Answer */}
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

              {/* B) Sources Used */}
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
                              <Badge variant="outline" className="text-[10px]">
                                Score: {s.final_score}
                              </Badge>
                              <Button variant="ghost" size="sm" onClick={() => setViewSource(s)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
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

              {/* C) Retrieval Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> ملخص الاسترجاع</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: 'الأجزاء المسترجعة', value: result.sources.length },
                      { label: 'التصنيف', value: categoryFilter || 'الكل' },
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

              {/* D) Validation Result */}
              {result.validation_notes && (
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
                            <DebugRow label="السؤال الأصلي" value={question} />
                            <DebugRow label="السؤال المعاد صياغته" value={result.debug.rewritten_query} />
                            <DebugRow label="الأسئلة الفرعية" value={JSON.stringify(result.debug.sub_queries, null, 2)} />
                            <DebugRow label="الكلمات المفتاحية (عربي)" value={JSON.stringify(result.debug.keywords_ar)} />
                            <DebugRow label="الكلمات المفتاحية (إنجليزي)" value={JSON.stringify(result.debug.keywords_en)} />
                            <DebugRow label="القصد المكتشف" value={result.debug.detected_intent} />
                            <DebugRow label="إعادة كتابة AI" value={result.debug.query_rewrite_used_ai ? 'نعم' : 'لا'} />
                            <DebugRow label="عدد المرشحين" value={result.debug.candidates_count} />
                            <DebugRow label="النموذج المستخدم" value={result.debug.model_used} />
                            <DebugRow label="OpenRouter Endpoint" value="api.openrouter.ai/v1/chat/completions" />
                            <DebugRow label="Response Status Code" value={result.debug.status_code} />
                            <DebugRow label="Token Usage" value={JSON.stringify(result.debug.token_usage, null, 2)} />
                            <Separator />
                            <div>
                              <p className="text-muted-foreground mb-1">Prompt النهائي:</p>
                              <pre className="bg-muted p-2 rounded text-[10px] whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                {result.debug.raw_response_snippet}
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

function DebugRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0 min-w-[140px]">{label}:</span>
      <span className="break-all">{String(value ?? '-')}</span>
    </div>
  );
}
