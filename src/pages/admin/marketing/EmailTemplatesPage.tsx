import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import TemplateEditor from '@/components/marketing/TemplateEditor';

export default function EmailTemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from('marketing_email_templates').select('*').order('created_at', { ascending: false }) as any;
    setTemplates(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setCategory('general');
    setSubject('');
    setHtmlBody('');
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (tpl: any) => {
    setEditingId(tpl.id);
    setName(tpl.name);
    setCategory(tpl.category || 'general');
    setSubject(tpl.subject);
    setHtmlBody(tpl.html_body);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }
    try {
      const data: any = { name, category, subject, html_body: htmlBody };
      if (editingId) {
        await supabase.from('marketing_email_templates').update(data).eq('id', editingId) as any;
        toast.success('تم تحديث القالب');
      } else {
        data.created_by = user?.id;
        await supabase.from('marketing_email_templates').insert(data) as any;
        toast.success('تم إنشاء القالب');
      }
      setDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) return;
    await supabase.from('marketing_email_templates').delete().eq('id', id) as any;
    toast.success('تم حذف القالب');
    fetchTemplates();
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            القوالب البريدية
          </h1>
          <p className="text-muted-foreground mt-1">إنشاء وإدارة قوالب البريد الإلكتروني</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> قالب جديد
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>العنوان</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
              ) : templates.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد قوالب بعد</TableCell></TableRow>
              ) : (
                templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-sm">{t.subject}</TableCell>
                    <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? 'default' : 'secondary'}>
                        {t.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل القالب' : 'إنشاء قالب جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>اسم القالب</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: قالب تجديد الاشتراك" />
              </div>
              <div>
                <Label>التصنيف</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="general" />
              </div>
            </div>
            <TemplateEditor
              subject={subject}
              onSubjectChange={setSubject}
              htmlBody={htmlBody}
              onHtmlBodyChange={setHtmlBody}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleSave}>{editingId ? 'تحديث' : 'إنشاء'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
