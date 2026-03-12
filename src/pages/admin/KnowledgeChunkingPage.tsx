import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Upload, FileText, Layers, Activity, RefreshCw, Eye, Pencil, Trash2,
  Play, Clock, CheckCircle2, XCircle, AlertTriangle, Database, Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'product', label: 'المنتج' },
  { value: 'architecture', label: 'البنية التقنية' },
  { value: 'modules', label: 'الوحدات' },
  { value: 'ai_guidelines', label: 'إرشادات AI' },
  { value: 'writing_style', label: 'أسلوب الكتابة' },
  { value: 'pricing', label: 'التسعير' },
  { value: 'faq', label: 'الأسئلة الشائعة' },
  { value: 'policies', label: 'السياسات' },
  { value: 'support', label: 'الدعم' },
  { value: 'marketing', label: 'التسويق' },
  { value: 'nonprofit_sector', label: 'القطاع غير الربحي' },
  { value: 'facts', label: 'حقائق' },
  { value: 'general', label: 'عام' },
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'قيد الانتظار', variant: 'outline' },
  processing: { label: 'جاري المعالجة', variant: 'secondary' },
  completed: { label: 'مكتمل', variant: 'default' },
  failed: { label: 'فشل', variant: 'destructive' },
};

const PRIORITY_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  high: { label: 'عالي', variant: 'destructive' },
  medium: { label: 'متوسط', variant: 'secondary' },
  low: { label: 'منخفض', variant: 'outline' },
};

async function invokeKnowledge(action: string, payload: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-knowledge-chunks`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action, ...payload }),
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

// ===== Documents Tab =====
function DocumentsTab() {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewRawOpen, setViewRawOpen] = useState(false);
  const [viewRawContent, setViewRawContent] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('general');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*, knowledge_chunks(count)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error('No file selected');
      const content = await uploadFile.text();
      const ext = uploadFile.name.split('.').pop()?.toLowerCase() || 'txt';
      return invokeKnowledge('upload', {
        title: uploadTitle || uploadFile.name,
        file_name: uploadFile.name,
        file_type: ext === 'md' ? 'md' : 'txt',
        category: uploadCategory,
        content_raw: content,
      });
    },
    onSuccess: () => {
      toast.success('تم رفع الملف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      setUploadOpen(false);
      setUploadTitle('');
      setUploadFile(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateMutation = useMutation({
    mutationFn: (docId: string) => invokeKnowledge('generate-chunks', { document_id: docId }),
    onSuccess: (data) => {
      const method = data.splitting_method === 'markdown_headers' ? 'عناوين Markdown' : data.splitting_method === 'text_fallback' ? 'تقسيم نصي (بدون عناوين)' : 'فقرات نصية';
      toast.success(`تم إنشاء ${data.chunks_created} chunk من ${data.sections_found} قسم`, {
        description: `طريقة التقسيم: ${method}`,
        duration: 6000,
      });
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-stats'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reprocessMutation = useMutation({
    mutationFn: (docId: string) => invokeKnowledge('reprocess', { document_id: docId }),
    onSuccess: (data) => {
      const method = data.splitting_method === 'markdown_headers' ? 'عناوين Markdown' : data.splitting_method === 'text_fallback' ? 'تقسيم نصي (بدون عناوين)' : 'فقرات نصية';
      toast.success(`إعادة التقسيم: ${data.chunks_created} chunk من ${data.sections_found} قسم`, {
        description: `طريقة التقسيم: ${method}`,
        duration: 6000,
      });
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-stats'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => invokeKnowledge('delete-document', { document_id: docId }),
    onSuccess: () => {
      toast.success('تم حذف المستند');
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ docId, category }: { docId: string; category: string }) =>
      invokeKnowledge('update-document', { document_id: docId, updates: { category } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">المستندات</h3>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" /> رفع ملف
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Database className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">لا توجد مستندات بعد</p>
            <Button variant="outline" onClick={() => setUploadOpen(true)}>رفع أول ملف</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">التصنيف</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">Chunks</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc: any) => {
                const status = STATUS_CONFIG[doc.processing_status] || STATUS_CONFIG.pending;
                const chunkCount = doc.knowledge_chunks?.[0]?.count || 0;
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.file_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={doc.category}
                        onValueChange={(val) => updateCategoryMutation.mutate({ docId: doc.id, category: val })}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>{chunkCount}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => { setViewRawContent(doc.content_raw); setViewRawOpen(true); }}
                          title="عرض المحتوى"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => generateMutation.mutate(doc.id)}
                          disabled={generateMutation.isPending}
                          title="توليد Chunks"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => reprocessMutation.mutate(doc.id)}
                          disabled={reprocessMutation.isPending}
                          title="إعادة المعالجة"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => { if (confirm('هل تريد حذف هذا المستند وجميع الـ chunks؟')) deleteMutation.mutate(doc.id); }}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>رفع ملف معرفة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">الملف (.md, .txt)</label>
              <Input
                type="file"
                accept=".md,.txt,.markdown"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setUploadFile(file); if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^.]+$/, '')); }
                }}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">العنوان</label>
              <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">التصنيف</label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>إلغاء</Button>
            <Button onClick={() => uploadMutation.mutate()} disabled={!uploadFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? 'جاري الرفع...' : 'رفع'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Raw Dialog */}
      <Dialog open={viewRawOpen} onOpenChange={setViewRawOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>المحتوى الخام</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[60vh] text-sm whitespace-pre-wrap font-mono text-foreground" dir="auto">
            {viewRawContent}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Chunks Explorer Tab =====
function ChunksExplorerTab() {
  const queryClient = useQueryClient();
  const [filterDoc, setFilterDoc] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterEmbedding, setFilterEmbedding] = useState('all');
  const [viewChunk, setViewChunk] = useState<any>(null);
  const [editChunk, setEditChunk] = useState<any>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState('medium');

  const { data: documents = [] } = useQuery({
    queryKey: ['knowledge-documents-list'],
    queryFn: async () => {
      const { data } = await supabase.from('knowledge_documents').select('id, title').order('title');
      return data || [];
    },
  });

  const { data: chunks = [], isLoading } = useQuery({
    queryKey: ['knowledge-chunks', filterDoc, filterCategory, filterPriority, filterEmbedding],
    queryFn: async () => {
      let q = supabase
        .from('knowledge_chunks')
        .select('*, knowledge_documents!inner(title, original_file_name)')
        .order('chunk_index');
      if (filterDoc !== 'all') q = q.eq('document_id', filterDoc);
      if (filterCategory !== 'all') q = q.eq('category', filterCategory);
      if (filterPriority !== 'all') q = q.eq('priority', filterPriority);
      if (filterEmbedding !== 'all') q = q.eq('embedding_status', filterEmbedding);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      invokeKnowledge('update-chunk', {
        chunk_id: editChunk.id,
        updates: { title: editTitle, content: editContent, priority: editPriority },
      }),
    onSuccess: () => {
      toast.success('تم تحديث الـ chunk');
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks'] });
      setEditChunk(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invokeKnowledge('delete-chunk', { chunk_id: id }),
    onSuccess: () => {
      toast.success('تم حذف الـ chunk');
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={filterDoc} onValueChange={setFilterDoc}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="المستند" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المستندات</SelectItem>
            {documents.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="التصنيف" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="الأولوية" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="high">عالي</SelectItem>
            <SelectItem value="medium">متوسط</SelectItem>
            <SelectItem value="low">منخفض</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEmbedding} onValueChange={setFilterEmbedding}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="حالة التضمين" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">قيد الانتظار</SelectItem>
            <SelectItem value="embedded">مُضمّن</SelectItem>
            <SelectItem value="failed">فشل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
      ) : chunks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Layers className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">لا توجد chunks</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">#</TableHead>
                <TableHead className="text-right">المستند</TableHead>
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">المسار</TableHead>
                <TableHead className="text-right">المعاينة</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">الأولوية</TableHead>
                <TableHead className="text-right">التضمين</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chunks.map((chunk: any) => {
                const pri = PRIORITY_CONFIG[chunk.priority] || PRIORITY_CONFIG.medium;
                return (
                  <TableRow key={chunk.id}>
                    <TableCell>{chunk.chunk_index}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{(chunk.knowledge_documents as any)?.title || '-'}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{chunk.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{chunk.section_path}</TableCell>
                    <TableCell className="text-xs max-w-[250px] truncate">{chunk.content.substring(0, 100)}...</TableCell>
                    <TableCell>{chunk.token_estimate}</TableCell>
                    <TableCell><Badge variant={pri.variant}>{pri.label}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={chunk.embedding_status === 'embedded' ? 'default' : 'outline'}>
                        {chunk.embedding_status === 'embedded' ? 'مُضمّن' : chunk.embedding_status === 'failed' ? 'فشل' : 'قيد الانتظار'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewChunk(chunk)} title="عرض">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditChunk(chunk);
                          setEditTitle(chunk.title);
                          setEditContent(chunk.content);
                          setEditPriority(chunk.priority);
                        }} title="تعديل">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          if (confirm('حذف هذا الـ chunk؟')) deleteMutation.mutate(chunk.id);
                        }} title="حذف">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Chunk Dialog */}
      <Dialog open={!!viewChunk} onOpenChange={() => setViewChunk(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewChunk?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">المسار: {viewChunk?.section_path}</Badge>
              <Badge variant={PRIORITY_CONFIG[viewChunk?.priority]?.variant || 'secondary'}>
                {PRIORITY_CONFIG[viewChunk?.priority]?.label || viewChunk?.priority}
              </Badge>
              <Badge variant="outline">{viewChunk?.token_estimate} token</Badge>
              <Badge variant="outline">{viewChunk?.char_count} حرف</Badge>
            </div>
            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[50vh] text-sm whitespace-pre-wrap font-mono text-foreground" dir="auto">
              {viewChunk?.content}
            </pre>
            {viewChunk?.metadata_json && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Metadata JSON</summary>
                <pre className="bg-muted p-2 rounded mt-1 overflow-auto text-foreground">
                  {JSON.stringify(viewChunk.metadata_json, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Chunk Dialog */}
      <Dialog open={!!editChunk} onOpenChange={() => setEditChunk(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل Chunk</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">العنوان</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">الأولوية</label>
              <Select value={editPriority} onValueChange={setEditPriority}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">عالي</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="low">منخفض</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">المحتوى</label>
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={10} className="mt-1 font-mono text-sm" dir="auto" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditChunk(null)}>إلغاء</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Jobs Tab =====
function ChunkingJobsTab() {
  const queryClient = useQueryClient();
  const [viewLogs, setViewLogs] = useState<string | null>(null);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['knowledge-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_chunk_jobs')
        .select('*, knowledge_documents(title, original_file_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rerunMutation = useMutation({
    mutationFn: (docId: string) => invokeKnowledge('reprocess', { document_id: docId }),
    onSuccess: (data) => {
      toast.success(`إعادة التنفيذ: ${data.chunks_created} chunk`);
      queryClient.invalidateQueries({ queryKey: ['knowledge-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">عمليات المعالجة</h3>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Activity className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">لا توجد عمليات معالجة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المستند</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">Chunks</TableHead>
                <TableHead className="text-right">البداية</TableHead>
                <TableHead className="text-right">الانتهاء</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job: any) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">
                    {(job.knowledge_documents as any)?.title || 'غير معروف'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{job.job_type === 'rechunking' ? 'إعادة' : 'تقسيم'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {statusIcon(job.status)}
                      <span className="text-sm">{STATUS_CONFIG[job.status]?.label || job.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>{job.chunks_created}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {job.started_at ? new Date(job.started_at).toLocaleString('ar-SA') : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {job.finished_at ? new Date(job.finished_at).toLocaleString('ar-SA') : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {job.logs && (
                        <Button variant="ghost" size="icon" onClick={() => setViewLogs(job.logs)} title="السجلات">
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => rerunMutation.mutate(job.document_id)}
                        disabled={rerunMutation.isPending}
                        title="إعادة التنفيذ"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!viewLogs} onOpenChange={() => setViewLogs(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>سجلات المعالجة</DialogTitle></DialogHeader>
          <pre className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap text-foreground" dir="auto">
            {viewLogs}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Processing Logs Tab =====
function ProcessingLogsTab() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['knowledge-jobs-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_chunk_jobs')
        .select('*, knowledge_documents(title)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">سجلات المعالجة</h3>
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertTriangle className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">لا توجد سجلات</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: any) => {
            const isFailed = job.status === 'failed';
            return (
              <Card key={job.id} className={isFailed ? 'border-destructive/50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isFailed ? (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        )}
                        <span className="font-medium text-foreground">
                          {(job.knowledge_documents as any)?.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {job.job_type === 'rechunking' ? 'إعادة معالجة' : 'تقسيم'}
                        </Badge>
                      </div>
                      {job.logs && (
                        <p className="text-sm text-muted-foreground mt-1" dir="auto">{job.logs}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(job.created_at).toLocaleString('ar-SA')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== Main Page =====
export default function KnowledgeChunkingPage() {
  const { data: stats } = useQuery({
    queryKey: ['knowledge-stats'],
    queryFn: async () => {
      const [docsRes, chunksRes, jobsRes] = await Promise.all([
        supabase.from('knowledge_documents').select('id', { count: 'exact', head: true }),
        supabase.from('knowledge_chunks').select('id', { count: 'exact', head: true }),
        supabase.from('knowledge_chunk_jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      ]);
      return {
        documents: docsRes.count || 0,
        chunks: chunksRes.count || 0,
        completedJobs: jobsRes.count || 0,
      };
    },
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">تقسيم المعرفة</h1>
        <p className="text-muted-foreground mt-1">إدارة ملفات المعرفة وتقسيمها إلى Chunks جاهزة للربط مع Vector DB</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المستندات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.documents || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chunks</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.chunks || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">عمليات مكتملة</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.completedJobs || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" /> المستندات
          </TabsTrigger>
          <TabsTrigger value="chunks" className="gap-2">
            <Layers className="h-4 w-4" /> استعراض Chunks
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-2">
            <Activity className="h-4 w-4" /> العمليات
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Sparkles className="h-4 w-4" /> السجلات
          </TabsTrigger>
        </TabsList>
        <TabsContent value="documents"><DocumentsTab /></TabsContent>
        <TabsContent value="chunks"><ChunksExplorerTab /></TabsContent>
        <TabsContent value="jobs"><ChunkingJobsTab /></TabsContent>
        <TabsContent value="logs"><ProcessingLogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
