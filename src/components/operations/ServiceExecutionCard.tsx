import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  PlayCircle, CheckCircle2, Loader2, Clock, MessageSquare, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ServiceExecutionCardProps {
  projectId: string;
  projectName: string;
  serviceStatus: string;
  serviceStartedAt: string | null;
  serviceCompletedAt: string | null;
  staffId?: string;
  staffName?: string;
  canEdit?: boolean;
}

export function ServiceExecutionCard({
  projectId,
  projectName,
  serviceStatus,
  serviceStartedAt,
  serviceCompletedAt,
  staffId,
  staffName,
  canEdit = true,
}: ServiceExecutionCardProps) {
  const queryClient = useQueryClient();
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [newNote, setNewNote] = useState('');

  // Fetch service notes
  const { data: notes = [] } = useQuery({
    queryKey: ['project-service-notes', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_service_notes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const startServiceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('crm_implementations')
        .update({
          service_status: 'in_progress',
          service_started_at: new Date().toISOString(),
          service_started_by: staffId,
          status: 'active',
        })
        .eq('id', projectId);
      if (error) throw error;

      // Log activity
      await supabase.from('project_activity_log').insert({
        project_id: projectId,
        activity_type: 'service_started',
        title: 'بدء تنفيذ الخدمة',
        performed_by: staffId,
        performed_by_name: staffName,
      });

      // Save admin notification
      await supabase.from('admin_notifications').insert({
        type: 'project_update',
        title: `بدء تنفيذ خدمة: ${projectName}`,
        message: `${staffName || 'موظف'} بدأ تنفيذ الخدمة`,
        link: `/admin/projects/${projectId}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['staff-project', projectId] });
      toast.success('تم بدء تنفيذ الخدمة');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const completeServiceMutation = useMutation({
    mutationFn: async (note: string) => {
      if (!note.trim()) throw new Error('يجب إدخال ملاحظة عند إنهاء التنفيذ');

      const { error } = await supabase
        .from('crm_implementations')
        .update({
          service_status: 'completed',
          service_completed_at: new Date().toISOString(),
          service_completed_by: staffId,
          status: 'completed',
          progress_percentage: 100,
        })
        .eq('id', projectId);
      if (error) throw error;

      // Save completion note
      await supabase.from('project_service_notes').insert({
        project_id: projectId,
        note: `[إنهاء التنفيذ] ${note}`,
        created_by: staffId,
        created_by_name: staffName,
      });

      // Log activity
      await supabase.from('project_activity_log').insert({
        project_id: projectId,
        activity_type: 'service_completed',
        title: 'اكتمال تنفيذ الخدمة',
        description: note,
        performed_by: staffId,
        performed_by_name: staffName,
      });

      // Save admin notification
      await supabase.from('admin_notifications').insert({
        type: 'phase_completed',
        title: `اكتمال تنفيذ خدمة: ${projectName}`,
        message: `${staffName || 'موظف'} أنهى تنفيذ الخدمة`,
        link: `/admin/projects/${projectId}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['staff-project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-service-notes', projectId] });
      toast.success('تم إنهاء تنفيذ الخدمة');
      setCompleteDialogOpen(false);
      setCompletionNote('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!newNote.trim()) throw new Error('الملاحظة فارغة');
      const { error } = await supabase.from('project_service_notes').insert({
        project_id: projectId,
        note: newNote,
        created_by: staffId,
        created_by_name: staffName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-service-notes', projectId] });
      toast.success('تم إضافة الملاحظة');
      setNewNote('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusConfig = {
    pending: { label: 'في الانتظار', color: 'text-gray-600 bg-gray-100', icon: Clock },
    in_progress: { label: 'قيد التنفيذ', color: 'text-blue-600 bg-blue-100', icon: Wrench },
    completed: { label: 'مكتمل', color: 'text-green-600 bg-green-100', icon: CheckCircle2 },
  };

  const current = statusConfig[serviceStatus as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = current.icon;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              تنفيذ الخدمة
            </span>
            <Badge variant="outline" className={cn(current.color)}>
              <StatusIcon className="h-3 w-3 ml-1" />
              {current.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status info */}
          {serviceStartedAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">تاريخ البدء</span>
              <span>{format(new Date(serviceStartedAt), 'dd/MM/yyyy HH:mm', { locale: ar })}</span>
            </div>
          )}
          {serviceCompletedAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">تاريخ الإنهاء</span>
              <span>{format(new Date(serviceCompletedAt), 'dd/MM/yyyy HH:mm', { locale: ar })}</span>
            </div>
          )}

          {/* Action buttons */}
          {canEdit && (
            <div className="flex gap-2">
              {serviceStatus === 'pending' && (
                <Button
                  className="flex-1"
                  onClick={() => startServiceMutation.mutate()}
                  disabled={startServiceMutation.isPending}
                >
                  {startServiceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <PlayCircle className="h-4 w-4 ml-2" />
                  )}
                  بدء تنفيذ الخدمة
                </Button>
              )}
              {serviceStatus === 'in_progress' && (
                <Button
                  className="flex-1"
                  variant="default"
                  onClick={() => setCompleteDialogOpen(true)}
                >
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                  إنهاء تنفيذ الخدمة
                </Button>
              )}
            </div>
          )}

          {/* Add note */}
          {serviceStatus !== 'pending' && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="أضف ملاحظة..."
                  rows={2}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNoteMutation.mutate()}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                  className="self-end"
                >
                  {addNoteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Notes list */}
          {notes.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground">سجل الملاحظات</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {notes.map((note: any) => (
                  <div key={note.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-sm">{note.note}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-[8px]">
                          {note.created_by_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{note.created_by_name || 'غير معروف'}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: ar })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنهاء تنفيذ الخدمة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظة التنفيذ (إلزامي) *</label>
              <Textarea
                value={completionNote}
                onChange={e => setCompletionNote(e.target.value)}
                placeholder="أضف ملاحظة حول نتائج التنفيذ..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => completeServiceMutation.mutate(completionNote)}
              disabled={!completionNote.trim() || completeServiceMutation.isPending}
            >
              {completeServiceMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              تأكيد الإنهاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
