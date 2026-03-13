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

// ===== Embeddings Tab =====
function EmbeddingsTab() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: embStats, isLoading } = useQuery({
    queryKey: ['embedding-stats'],
    queryFn: () => invokeKnowledge('embedding-stats'),
    refetchInterval: isGenerating ? 3000 : false,
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      setIsGenerating(true);
      return invokeKnowledge('generate-embeddings');
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      toast.success(`تم التضمين: ${data.embedded_count} ناجح، ${data.failed_count} فاشل`);
      queryClient.invalidateQueries({ queryKey: ['embedding-stats'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks'] });
    },
    onError: (e: Error) => { setIsGenerating(false); toast.error(e.message); },
  });

  const retryMutation = useMutation({
    mutationFn: () => {
      setIsGenerating(true);
      return invokeKnowledge('retry-failed-embeddings');
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      toast.success(`إعادة المحاولة: ${data.embedded_count} ناجح، ${data.failed_count} فاشل`);
      queryClient.invalidateQueries({ queryKey: ['embedding-stats'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks'] });
    },
    onError: (e: Error) => { setIsGenerating(false); toast.error(e.message); },
  });

  const pending = embStats?.pending || 0;
  const embedded = embStats?.embedded || 0;
  const failed = embStats?.failed || 0;
  const total = embStats?.total || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">التضمين / Vector Sync</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || pending === 0}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {generateMutation.isPending ? 'جاري التضمين...' : 'Generate Embeddings'}
          </Button>
          <Button
            variant="outline"
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending || failed === 0}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Failed
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">الإجمالي</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">قيد الانتظار</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">مُضمّنة</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{embedded}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">فاشلة</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{failed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {total > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">تقدم التضمين</span>
              <span className="text-sm font-medium text-foreground">{total > 0 ? Math.round((embedded / total) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-500"
                style={{ width: `${total > 0 ? (embedded / total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{embedded} مُضمّنة</span>
              <span>{pending} قيد الانتظار</span>
              {failed > 0 && <span className="text-destructive">{failed} فاشلة</span>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===== Retrieval Test Tab =====
function RetrievalTestTab() {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('all');
  const [topK, setTopK] = useState('5');
  const [searchMode, setSearchMode] = useState('hybrid_rerank');
  const [results, setResults] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [viewResult, setViewResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async () => {
      setIsSearching(true);
      return invokeKnowledge('retrieval-test', {
        question,
        category: category !== 'all' ? category : undefined,
        top_k: parseInt(topK),
        search_mode: searchMode,
      });
    },
    onSuccess: (data) => {
      setIsSearching(false);
      setResults(data.results || []);
      setDebugInfo(data.debug || null);
      if (data.results?.length === 0) toast.info('لم يتم العثور على نتائج مطابقة');
    },
    onError: (e: Error) => { setIsSearching(false); toast.error(e.message); },
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['retrieval-logs'],
    queryFn: () => invokeKnowledge('retrieval-logs').then(d => d.logs || []),
    enabled: showLogs,
  });

  const modeLabels: Record<string, string> = {
    vector_only: 'Vector فقط',
    hybrid: 'Hybrid',
    hybrid_rerank: 'Hybrid + Reranking',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">اختبار الاسترجاع المتقدم</h3>
          <p className="text-sm text-muted-foreground">بحث هجين مع إعادة ترتيب ذكية وتحليل الاستعلام</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowLogs(!showLogs)} className="gap-2">
          <Activity className="h-4 w-4" />
          {showLogs ? 'إخفاء السجلات' : 'سجلات البحث'}
        </Button>
      </div>

      {/* Search Controls */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">السؤال</label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="اكتب سؤالاً لاختبار البحث..."
              className="mt-1"
              rows={3}
              dir="auto"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="w-[200px]">
              <label className="text-sm font-medium text-foreground">وضع البحث</label>
              <Select value={searchMode} onValueChange={setSearchMode}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vector_only">Vector فقط</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="hybrid_rerank">Hybrid + Reranking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-sm font-medium text-foreground">التصنيف (اختياري)</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التصنيفات</SelectItem>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[120px]">
              <label className="text-sm font-medium text-foreground">عدد النتائج</label>
              <Select value={topK} onValueChange={setTopK}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={() => searchMutation.mutate()}
            disabled={!question.trim() || isSearching}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isSearching ? 'جاري البحث...' : 'بحث'}
          </Button>
        </CardContent>
      </Card>

      {/* Debug Panel */}
      {debugInfo && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" /> تحليل الاستعلام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Query Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">السؤال الأصلي:</span>
                <p className="font-medium text-foreground" dir="auto">{debugInfo.original_query}</p>
              </div>
              {debugInfo.rewritten_query !== debugInfo.original_query && (
                <div>
                  <span className="text-muted-foreground">الاستعلام المُحسّن:</span>
                  <p className="font-medium text-foreground" dir="auto">{debugInfo.rewritten_query}</p>
                </div>
              )}
              {debugInfo.sub_queries?.length > 0 && (
                <div>
                  <span className="text-muted-foreground">استعلامات فرعية:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {debugInfo.sub_queries.map((sq: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{sq}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">النية المكتشفة:</span>
                <Badge variant="secondary" className="mr-2">{debugInfo.detected_intent}</Badge>
                {debugInfo.query_rewrite_used_ai && <Badge variant="outline" className="text-xs">AI Rewrite</Badge>}
              </div>
            </div>

            {/* Keywords & Boosts */}
            <div className="flex flex-wrap gap-2">
              {debugInfo.keywords_ar?.map((k: string, i: number) => (
                <Badge key={`ar-${i}`} variant="secondary" className="text-xs">🔑 {k}</Badge>
              ))}
              {debugInfo.keywords_en?.map((k: string, i: number) => (
                <Badge key={`en-${i}`} variant="outline" className="text-xs">🔑 {k}</Badge>
              ))}
              {debugInfo.boosted_categories?.map((c: string, i: number) => (
                <Badge key={`boost-${i}`} className="text-xs bg-amber-500/20 text-amber-700 border-amber-300">⬆ {c}</Badge>
              ))}
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-4 text-xs border-t border-border pt-3">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">المرشحين:</span>
                <span className="font-bold text-foreground">{debugInfo.candidates_before_rerank}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">النتائج النهائية:</span>
                <span className="font-bold text-foreground">{debugInfo.final_results_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">الثقة:</span>
                <span className={`font-bold ${debugInfo.confidence >= 0.5 ? 'text-green-600' : debugInfo.confidence >= 0.3 ? 'text-amber-600' : 'text-destructive'}`}>
                  {Math.round(debugInfo.confidence * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">الوقت:</span>
                <span className="font-bold text-foreground">{debugInfo.timing_ms?.total || 0}ms</span>
              </div>
              {debugInfo.timing_ms && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  (تحليل: {debugInfo.timing_ms.query_rewrite || 0}ms | بحث: {debugInfo.timing_ms.vector_search || 0}ms | كلمات: {debugInfo.timing_ms.keyword_search || 0}ms | ترتيب: {debugInfo.timing_ms.reranking || 0}ms)
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">النتائج ({results.length})</h4>
          {results.map((r: any, idx: number) => (
            <Card key={r.id || idx}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                      <span className="font-semibold text-foreground">{r.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORIES.find(c => c.value === r.category)?.label || r.category}
                      </Badge>
                      <Badge variant={PRIORITY_CONFIG[r.priority]?.variant || 'outline'} className="text-xs">
                        {PRIORITY_CONFIG[r.priority]?.label || r.priority}
                      </Badge>
                    </div>

                    {/* Score Bars */}
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">تشابه دلالي</span>
                          <span className="font-medium text-foreground">{Math.round(r.similarity_score * 100)}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${r.similarity_score * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">كلمات مفتاحية</span>
                          <span className="font-medium text-foreground">{Math.round(r.keyword_score * 100)}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${r.keyword_score * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">النتيجة النهائية</span>
                          <span className="font-bold text-primary">{Math.round(r.final_score * 100)}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${r.final_score * 100}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Ranking Reasons */}
                    {r.ranking_reasons?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {r.ranking_reasons.map((reason: string, ri: number) => (
                          <Badge key={ri} variant="outline" className="text-[10px] bg-muted/50">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>📄 {r.source_file}</span>
                      <span>• {r.section_path}</span>
                      <span>• {r.token_estimate} token</span>
                      {r.metadata_boost > 1 && <span>• ⬆ boost: {r.metadata_boost}x</span>}
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-3" dir="auto">{r.content.substring(0, 300)}...</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setViewResult(r)} className="shrink-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Retrieval Logs */}
      {showLogs && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">سجلات البحث الأخيرة</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد سجلات</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الاستعلام</TableHead>
                      <TableHead className="text-right">الوضع</TableHead>
                      <TableHead className="text-right">النية</TableHead>
                      <TableHead className="text-right">الثقة</TableHead>
                      <TableHead className="text-right">النتائج</TableHead>
                      <TableHead className="text-right">الوقت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="max-w-[200px] truncate text-sm">{log.original_query}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{modeLabels[log.search_mode] || log.search_mode}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{log.detected_intent}</Badge></TableCell>
                        <TableCell className="text-sm font-medium">{Math.round((log.confidence_score || 0) * 100)}%</TableCell>
                        <TableCell className="text-sm">{log.final_results_count}/{log.candidates_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('ar-SA')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Full chunk view */}
      <Dialog open={!!viewResult} onOpenChange={() => setViewResult(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewResult?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-primary/20 text-primary border-primary/30">
                النتيجة: {Math.round((viewResult?.final_score || 0) * 100)}%
              </Badge>
              <Badge variant="outline">تشابه: {Math.round((viewResult?.similarity_score || 0) * 100)}%</Badge>
              <Badge variant="outline">كلمات: {Math.round((viewResult?.keyword_score || 0) * 100)}%</Badge>
              <Badge variant="secondary">{viewResult?.category}</Badge>
              <Badge variant="outline">المسار: {viewResult?.section_path}</Badge>
              <Badge variant="outline">{viewResult?.token_estimate} token</Badge>
              <Badge variant="outline">📄 {viewResult?.source_file}</Badge>
            </div>
            {viewResult?.ranking_reasons?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {viewResult.ranking_reasons.map((r: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{r}</Badge>
                ))}
              </div>
            )}
            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[50vh] text-sm whitespace-pre-wrap font-mono text-foreground" dir="auto">
              {viewResult?.content}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
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
        <TabsList className="grid w-full grid-cols-6">
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
          <TabsTrigger value="embeddings" className="gap-2">
            <Database className="h-4 w-4" /> التضمين
          </TabsTrigger>
          <TabsTrigger value="retrieval" className="gap-2">
            <Sparkles className="h-4 w-4" /> اختبار الاسترجاع
          </TabsTrigger>
        </TabsList>
        <TabsContent value="documents"><DocumentsTab /></TabsContent>
        <TabsContent value="chunks"><ChunksExplorerTab /></TabsContent>
        <TabsContent value="jobs"><ChunkingJobsTab /></TabsContent>
        <TabsContent value="logs"><ProcessingLogsTab /></TabsContent>
        <TabsContent value="embeddings"><EmbeddingsTab /></TabsContent>
        <TabsContent value="retrieval"><RetrievalTestTab /></TabsContent>
      </Tabs>
    </div>
  );
}
