
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  MessageSquare, Send, Loader2, CheckCircle2, XCircle, AlertCircle,
  ChevronDown, Bug, Clock, Zap, FileText, Eye, History, Search,
  BookOpen, Database,
} from 'lucide-react';

interface Source {
  id: string;
  title: string;
  section_path: string;
  category: string;
  content: string;
  token_estimate: number;
  priority: string;
  similarity_score: number;
  keyword_score: number;
  metadata_boost: number;
  final_score: number;
  ranking_reasons: string[];
  matched_keywords: string[];
  source_file: string;
}

interface TestResult {
  success: boolean;
  is_grounded: boolean;
  final_answer: string;
  sources: Source[];
  confidence: number;
  model?: string;
  latency_ms: number;
  token_usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  response_status: string;
  debug?: Record<string, any>;
}

interface HistoryItem {
  id: string;
  question: string;
  model: string | null;
  response_status: string;
  latency_ms: number | null;
  is_grounded: boolean;
  confidence_score: number | null;
  sources_json: any;
  created_at: string;
}

export default function GroundedChatTestPage() {
  const [question, setQuestion] = useState('');
  const [model, setModel] = useState('');
  const [topK, setTopK] = useState('5');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [viewSource, setViewSource] = useState<Source | null>(null);
  const [viewDetail, setViewDetail] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('test');

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  const loadModels = async () => {
    try {
      const { data } = await supabase.functions.invoke('manage-ai-providers', {
        body: { action: 'get-status', provider_name: 'OpenRouter' },
      });
      if (data?.provider?.models_cache?.models) {
        setModels(data.provider.models_cache.models);
        if (data.provider.default_model) setModel(data.provider.default_model);
      }
    } catch { /* ignore */ }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await supabase.functions.invoke('grounded-chat-test', {
        body: { action: 'history' },
      });
      setHistory(data?.tests || []);
    } catch { /* ignore */ }
    setHistoryLoading(false);
  };

  const handleAsk = async () => {
    if (!question.trim()) { toast.error('أدخل سؤالاً'); return; }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('grounded-chat-test', {
        body: {
          action: 'test',
          question: question.trim(),
          model: model || undefined,
          top_k: parseInt(topK),
          category_filter: categoryFilter || undefined,
          search_mode: 'hybrid_rerank',
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setResult(data as TestResult);
      if (data?.is_grounded && data?.response_status === 'success') {
        toast.success(`تم الإجابة بنجاح (${data.latency_ms}ms)`);
      } else if (!data?.is_grounded) {
        toast.warning('لم يتم العثور على معلومات كافية');
      } else {
        toast.error('حدث خطأ أثناء التوليد');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const loadTestDetail = async (testId: string) => {
    try {
      const { data } = await supabase.functions.invoke('grounded-chat-test', {
        body: { action: 'get', test_id: testId },
      });
      if (data?.test) setViewDetail(data.test);
    } catch { /* ignore */ }
  };

  const statusBadge = (status: string, isGrounded: boolean) => {
    if (status === 'success' && isGrounded) return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 ml-1" />grounded</Badge>;
    if (status === 'no_grounding') return <Badge variant="secondary"><AlertCircle className="h-3 w-3 ml-1" />غير كافٍ</Badge>;
    return <Badge variant="destructive"><XCircle className="h-3 w-3 ml-1" />خطأ</Badge>;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          اختبار المحادثة الذكية (Grounded Chat)
        </h1>
        <p className="text-muted-foreground">اختبر خط أنابيب RAG: استرجاع → بناء Prompt → OpenRouter → إجابة مرجعية</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="test" className="gap-1.5"><Search className="h-3.5 w-3.5" />اختبار جديد</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" />سجل الاختبارات</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-4 mt-4">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إعدادات الاختبار</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>السؤال</Label>
                <Textarea
                  placeholder="مثال: ماهي خطط الاشتراك في ويبيان؟"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label>الموديل</Label>
                  {models.length > 0 ? (
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger><SelectValue placeholder="الافتراضي" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {models.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name || m.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground pt-2">اجلب الموديلات من صفحة مزودي AI أولاً</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>عدد المصادر (top_k)</Label>
                  <Select value={topK} onValueChange={setTopK}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>تصنيف (اختياري)</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="pricing">التسعير</SelectItem>
                      <SelectItem value="faq">أسئلة شائعة</SelectItem>
                      <SelectItem value="facts">حقائق</SelectItem>
                      <SelectItem value="support">الدعم</SelectItem>
                      <SelectItem value="policies">السياسات</SelectItem>
                      <SelectItem value="product">المنتج</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>وضع Debug</Label>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch checked={debugMode} onCheckedChange={setDebugMode} />
                    <span className="text-sm text-muted-foreground">{debugMode ? 'مفعّل' : 'معطّل'}</span>
                  </div>
                </div>
              </div>

              <Button onClick={handleAsk} disabled={loading || !question.trim()} size="lg" className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                اسأل المساعد
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* A) Final Answer */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    الإجابة النهائية
                  </CardTitle>
                  {statusBadge(result.response_status, result.is_grounded)}
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg bg-muted/30 border whitespace-pre-wrap text-sm leading-relaxed">
                    {result.final_answer}
                  </div>
                </CardContent>
              </Card>

              {/* B) Sources Used */}
              {result.sources && result.sources.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      المصادر المستخدمة ({result.sources.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.sources.map((s, i) => (
                        <div key={s.id} className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">[مرجع {i + 1}] {s.title}</span>
                                <Badge variant="outline" className="text-xs">{s.category}</Badge>
                                <Badge variant="secondary" className="text-xs">
                                  تشابه: {(s.final_score * 100).toFixed(1)}%
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>{s.source_file}</span>
                                <span>{s.section_path}</span>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setViewSource(s)} className="shrink-0">
                              <Eye className="h-3.5 w-3.5 ml-1" />عرض
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{s.content.slice(0, 200)}...</p>
                          {s.ranking_reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {s.ranking_reasons.map((r, ri) => (
                                <Badge key={ri} variant="outline" className="text-[10px]">{r}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* C) Retrieval Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    ملخص الاسترجاع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{result.sources?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">مصادر</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{result.model || '-'}</div>
                      <div className="text-xs text-muted-foreground">الموديل</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{result.latency_ms}ms</div>
                      <div className="text-xs text-muted-foreground">زمن الاستجابة</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{(result.confidence * 100).toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">الثقة</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{result.is_grounded ? '✓' : '✗'}</div>
                      <div className="text-xs text-muted-foreground">Grounded</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Debug Panel */}
              {debugMode && result.debug && (
                <Collapsible defaultOpen>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Bug className="h-5 w-5" />
                          Debug Panel
                          <ChevronDown className="h-4 w-4 mr-auto" />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="space-y-4 font-mono text-xs" dir="ltr">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <DebugField label="Original Question" value={result.debug.rewritten_query ? question : question} />
                            <DebugField label="Rewritten Query" value={result.debug.rewritten_query || '—'} />
                            <DebugField label="Detected Intent" value={result.debug.detected_intent || '—'} />
                            <DebugField label="AI Query Rewrite" value={result.debug.query_rewrite_used_ai ? 'Yes' : 'No'} />
                            <DebugField label="Model Used" value={result.debug.model_used || result.model || '—'} />
                            <DebugField label="Status Code" value={result.debug.status_code?.toString() || '—'} />
                            <DebugField label="Candidates Count" value={result.debug.candidates_count?.toString() || '—'} />
                          </div>

                          {result.debug.sub_queries?.length > 0 && (
                            <div>
                              <p className="font-semibold mb-1">Sub Queries:</p>
                              <ul className="list-disc list-inside space-y-0.5">
                                {result.debug.sub_queries.map((sq: string, i: number) => <li key={i}>{sq}</li>)}
                              </ul>
                            </div>
                          )}

                          {result.debug.keywords_ar?.length > 0 && (
                            <DebugField label="Keywords AR" value={result.debug.keywords_ar.join(', ')} />
                          )}
                          {result.debug.keywords_en?.length > 0 && (
                            <DebugField label="Keywords EN" value={result.debug.keywords_en.join(', ')} />
                          )}

                          {result.debug.timings && (
                            <div>
                              <p className="font-semibold mb-1">Timings:</p>
                              <div className="grid gap-1 sm:grid-cols-3">
                                {Object.entries(result.debug.timings).map(([k, v]) => (
                                  <div key={k} className="flex justify-between p-1.5 bg-muted/30 rounded">
                                    <span>{k}:</span><span>{String(v)}ms</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {result.token_usage && (
                            <div>
                              <p className="font-semibold mb-1">Token Usage:</p>
                              <div className="flex gap-4">
                                <span>Prompt: {result.token_usage.prompt_tokens}</span>
                                <span>Completion: {result.token_usage.completion_tokens}</span>
                                <span>Total: {result.token_usage.total_tokens}</span>
                              </div>
                            </div>
                          )}

                          {result.debug.raw_response_snippet && (
                            <div>
                              <p className="font-semibold mb-1">Raw Response Snippet:</p>
                              <pre className="p-2 bg-muted/30 rounded overflow-auto max-h-40 whitespace-pre-wrap text-[10px]">
                                {result.debug.raw_response_snippet}
                              </pre>
                            </div>
                          )}
                        </div>
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
            <CardHeader>
              <CardTitle className="text-lg">سجل الاختبارات</CardTitle>
              <CardDescription>آخر 50 اختبار للمحادثة الذكية</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد اختبارات سابقة</p>
              ) : (
                <div className="space-y-2">
                  {history.map(h => (
                    <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{h.question}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(h.created_at).toLocaleString('ar-SA')}</span>
                          {h.model && <span>{h.model}</span>}
                          {h.latency_ms && <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{h.latency_ms}ms</span>}
                          <span>{Array.isArray(h.sources_json) ? h.sources_json.length : 0} مصادر</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(h.response_status, h.is_grounded)}
                        <Button variant="ghost" size="sm" onClick={() => loadTestDetail(h.id)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Source Detail Modal */}
      <Dialog open={!!viewSource} onOpenChange={() => setViewSource(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{viewSource?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{viewSource?.category}</Badge>
                <Badge variant="secondary">تشابه: {((viewSource?.final_score || 0) * 100).toFixed(1)}%</Badge>
                <Badge variant="secondary">أولوية: {viewSource?.priority}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>الملف: {viewSource?.source_file}</p>
                <p>المسار: {viewSource?.section_path}</p>
              </div>
              <Separator />
              <div className="whitespace-pre-wrap leading-relaxed">{viewSource?.content}</div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Test Detail Modal */}
      <Dialog open={!!viewDetail} onOpenChange={() => setViewDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الاختبار</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            {viewDetail && (
              <div className="space-y-4 text-sm">
                <div><strong>السؤال:</strong> {viewDetail.question}</div>
                <div><strong>الموديل:</strong> {viewDetail.model}</div>
                <div><strong>الحالة:</strong> {statusBadge(viewDetail.response_status, viewDetail.is_grounded)}</div>
                <Separator />
                <div>
                  <strong>الإجابة:</strong>
                  <div className="mt-1 p-3 rounded-lg bg-muted/30 whitespace-pre-wrap">{viewDetail.final_answer}</div>
                </div>
                {viewDetail.sources_json && Array.isArray(viewDetail.sources_json) && (
                  <div>
                    <strong>المصادر ({viewDetail.sources_json.length}):</strong>
                    <div className="mt-1 space-y-2">
                      {viewDetail.sources_json.map((s: any, i: number) => (
                        <div key={i} className="p-2 border rounded text-xs">
                          <span className="font-medium">{s.title}</span> — {s.category} — Score: {(s.final_score * 100).toFixed(1)}%
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {viewDetail.prompt_sent && (
                  <div>
                    <strong>Prompt المرسل:</strong>
                    <pre className="mt-1 p-3 bg-muted/30 rounded text-xs overflow-auto max-h-60 whitespace-pre-wrap" dir="ltr">{viewDetail.prompt_sent}</pre>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DebugField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 bg-muted/20 rounded">
      <span className="text-muted-foreground">{label}: </span>
      <span>{value}</span>
    </div>
  );
}
