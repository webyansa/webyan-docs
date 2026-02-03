import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Plus, Trash2, Loader2, MessageSquare, User, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export type NoteType = 'general' | 'subscription' | 'sales' | 'invoices' | 'hosting' | 'delivery' | 'tickets' | 'meetings';

export const noteTypeConfig: Record<NoteType, { label: string; color: string; bgColor: string }> = {
  general: { label: 'عامة', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  subscription: { label: 'الاشتراك', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  sales: { label: 'المبيعات', color: 'text-green-700', bgColor: 'bg-green-100' },
  invoices: { label: 'الفواتير', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  hosting: { label: 'الاستضافة', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  delivery: { label: 'التنفيذ', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  tickets: { label: 'التذاكر', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  meetings: { label: 'الاجتماعات', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
};

interface CustomerNote {
  id: string;
  note: string;
  note_type: NoteType;
  created_at: string;
  created_by: {
    id: string;
    full_name: string;
  } | null;
}

interface CustomerNotesSectionProps {
  organizationId: string;
  noteType?: NoteType;
  showAll?: boolean;
  title?: string;
  compact?: boolean;
}

export function CustomerNotesSection({ 
  organizationId, 
  noteType, 
  showAll = false,
  title = 'الملاحظات',
  compact = false
}: CustomerNotesSectionProps) {
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newNoteType, setNewNoteType] = useState<NoteType>(noteType || 'general');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<NoteType | 'all'>(showAll ? 'all' : (noteType || 'all'));

  useEffect(() => {
    fetchNotes();
  }, [organizationId]);

  const fetchNotes = async () => {
    try {
      let query = supabase
        .from('customer_notes')
        .select(`
          id,
          note,
          note_type,
          created_at,
          created_by:staff_members!subscription_notes_created_by_fkey(id, full_name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      // If specific noteType is provided and not showing all, filter by type
      if (noteType && !showAll) {
        query = query.eq('note_type', noteType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotes((data as any) || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('يرجى إدخال الملاحظة');
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('يجب تسجيل الدخول');

      const { data: staffData } = await supabase
        .from('staff_members')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      const { error } = await supabase
        .from('customer_notes')
        .insert({
          organization_id: organizationId,
          note: newNote.trim(),
          note_type: newNoteType,
          created_by: staffData?.id || null,
        });

      if (error) throw error;

      toast.success('تمت إضافة الملاحظة بنجاح');
      setNewNote('');
      setNewNoteType(noteType || 'general');
      setAddDialogOpen(false);
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('حدث خطأ أثناء إضافة الملاحظة');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;

    setDeletingId(noteId);
    try {
      const { error } = await supabase
        .from('customer_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast.success('تم حذف الملاحظة');
      setNotes(notes.filter((n) => n.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('حدث خطأ أثناء حذف الملاحظة');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter notes by type if showing all
  const filteredNotes = showAll && filterType !== 'all' 
    ? notes.filter(n => n.note_type === filterType)
    : notes;

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {title}
            {notes.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {filteredNotes.length}
              </Badge>
            )}
          </span>
          <div className="flex items-center gap-2">
            {showAll && (
              <Select value={filterType} onValueChange={(v) => setFilterType(v as NoteType | 'all')}>
                <SelectTrigger className="w-[140px] h-8">
                  <Filter className="w-3 h-3 ml-2" />
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {Object.entries(noteTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة ملاحظة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة ملاحظة جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {(showAll || !noteType) && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">نوع الملاحظة</label>
                      <Select value={newNoteType} onValueChange={(v) => setNewNoteType(v as NoteType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(noteTypeConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>{config.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="اكتب ملاحظتك هنا..."
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddNote} disabled={saving} className="flex-1">
                      {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                      حفظ الملاحظة
                    </Button>
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد ملاحظات مسجلة</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {filteredNotes.map((note) => {
              const typeConfig = noteTypeConfig[note.note_type] || noteTypeConfig.general;
              return (
                <div
                  key={note.id}
                  className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${typeConfig.bgColor} ${typeConfig.color} border-0`}>
                          {typeConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {note.created_by?.full_name || 'غير معروف'}
                        </span>
                        <span>
                          {format(new Date(note.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteNote(note.id)}
                      disabled={deletingId === note.id}
                    >
                      {deletingId === note.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
