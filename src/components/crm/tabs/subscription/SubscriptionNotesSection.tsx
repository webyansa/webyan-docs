import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Plus, Trash2, Loader2, MessageSquare, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SubscriptionNote {
  id: string;
  note: string;
  created_at: string;
  created_by: {
    id: string;
    full_name: string;
  } | null;
}

interface SubscriptionNotesSectionProps {
  organizationId: string;
}

export function SubscriptionNotesSection({ organizationId }: SubscriptionNotesSectionProps) {
  const [notes, setNotes] = useState<SubscriptionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, [organizationId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_notes')
        .select(`
          id,
          note,
          created_at,
          created_by:staff_members!subscription_notes_created_by_fkey(id, full_name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
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
      // Get current staff member
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('يجب تسجيل الدخول');

      const { data: staffData } = await supabase
        .from('staff_members')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      const { error } = await supabase
        .from('subscription_notes')
        .insert({
          organization_id: organizationId,
          note: newNote.trim(),
          created_by: staffData?.id || null,
        });

      if (error) throw error;

      toast.success('تمت إضافة الملاحظة بنجاح');
      setNewNote('');
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
        .from('subscription_notes')
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            ملاحظات الاشتراك
          </span>
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
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد ملاحظات مسجلة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
