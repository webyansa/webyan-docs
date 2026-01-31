import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealName: string;
  onSuccess: () => void;
}

export default function AddNoteModal({
  open,
  onOpenChange,
  dealId,
  dealName,
  onSuccess,
}: AddNoteModalProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!note.trim()) {
      toast.error('يرجى إدخال الملاحظة');
      return;
    }

    setSaving(true);
    try {
      // Get current staff info
      const { data: { user } } = await supabase.auth.getUser();
      let staffName = 'مستخدم';
      let staffId = null;
      
      if (user) {
        const { data: staff } = await supabase
          .from('staff_members')
          .select('id, full_name')
          .eq('user_id', user.id)
          .single();
        
        if (staff) {
          staffName = staff.full_name;
          staffId = staff.id;
        }
      }

      // Insert activity
      const { error } = await supabase
        .from('crm_opportunity_activities')
        .insert({
          opportunity_id: dealId,
          activity_type: 'note',
          title: 'ملاحظة جديدة',
          description: note,
          performed_by: staffId,
          performed_by_name: staffName,
        });

      if (error) throw error;

      toast.success('تم حفظ الملاحظة بنجاح');
      setNote('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('حدث خطأ أثناء حفظ الملاحظة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            إضافة ملاحظة
          </DialogTitle>
          <DialogDescription>
            {dealName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="note">الملاحظة *</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="اكتب ملاحظتك هنا..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={saving || !note.trim()}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              'حفظ الملاحظة'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
