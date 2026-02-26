import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { 
  ListChecks, Plus, Trash2, MessageSquare, CheckCircle2, 
  Clock, User, Loader2 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface TicketTask {
  id: string;
  ticket_id: string;
  title: string;
  is_completed: boolean;
  completed_by: string | null;
  completed_by_name: string | null;
  completed_at: string | null;
  note: string | null;
  sort_order: number;
  created_at: string;
}

interface TicketTasksManagerProps {
  ticketId: string;
  mode: 'admin' | 'staff' | 'client';
  taskMode: string; // 'none' | 'single' | 'multiple'
  onTaskModeChange?: (mode: string) => void;
  staffUser?: { id: string; email?: string } | null;
}

export function TicketTasksManager({ ticketId, mode, taskMode, onTaskModeChange, staffUser }: TicketTasksManagerProps) {
  const { user } = useAuth();
  const effectiveUser = user || staffUser;
  const [tasks, setTasks] = useState<TicketTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [adding, setAdding] = useState(false);
  
  // Note dialog for completing a task
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<TicketTask | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [completing, setCompleting] = useState(false);

  const canAdd = mode === 'admin' || mode === 'staff';
  const canComplete = mode === 'admin' || mode === 'staff';
  const canDelete = mode === 'admin';

  useEffect(() => {
    fetchTasks();
    const channel = supabase
      .channel(`ticket-tasks-${ticketId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_tasks', filter: `ticket_id=eq.${ticketId}` }, () => {
        fetchTasks();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, taskMode]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_tasks')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTasks((data as any[]) || []);
    } catch (e) {
      console.error('Error fetching tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStaffInfo = async () => {
    if (!effectiveUser?.id) return { staffId: null, staffName: 'مستخدم' };
    const { data } = await supabase.from('staff_members').select('id, full_name').eq('user_id', effectiveUser.id).single();
    return { staffId: data?.id || null, staffName: data?.full_name || effectiveUser.email || 'مستخدم' };
  };

  const logActivity = async (actionType: string, note?: string) => {
    try {
      const { staffId, staffName } = await getStaffInfo();
      await supabase.from('ticket_activity_log').insert({
        ticket_id: ticketId,
        action_type: actionType,
        note: note || null,
        performed_by: staffId,
        performed_by_name: staffName,
        is_staff_action: true,
      });
    } catch (e) { console.error('Activity log error:', e); }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setAdding(true);
    try {
      const { staffId } = await getStaffInfo();
      const { error } = await supabase.from('ticket_tasks').insert({
        ticket_id: ticketId,
        title: newTaskTitle.trim(),
        sort_order: tasks.length,
        created_by: staffId,
      } as any);
      if (error) throw error;
      await logActivity('task_added', `إضافة مهمة: ${newTaskTitle.trim()}`);
      setNewTaskTitle('');
      fetchTasks();
    } catch (e) {
      console.error('Error adding task:', e);
    } finally {
      setAdding(false);
    }
  };

  const handleToggleTask = async (task: TicketTask) => {
    if (!canComplete) return;

    if (!task.is_completed) {
      // Opening note dialog before completing
      setTaskToComplete(task);
      setCompletionNote('');
      setNoteDialogOpen(true);
    } else {
      // Uncomplete the task
      try {
        const { error } = await supabase.from('ticket_tasks').update({
          is_completed: false,
          completed_by: null,
          completed_by_name: null,
          completed_at: null,
          note: null,
        } as any).eq('id', task.id);
        if (error) throw error;
        await logActivity('task_uncompleted', `إلغاء إنجاز مهمة: ${task.title}`);
        fetchTasks();
      } catch (e) {
        console.error('Error uncompleting task:', e);
      }
    }
  };

  const handleConfirmComplete = async () => {
    if (!taskToComplete) return;
    setCompleting(true);
    try {
      const { staffId, staffName } = await getStaffInfo();
      const { error } = await supabase.from('ticket_tasks').update({
        is_completed: true,
        completed_by: staffId,
        completed_by_name: staffName,
        completed_at: new Date().toISOString(),
        note: completionNote.trim() || null,
      } as any).eq('id', taskToComplete.id);
      if (error) throw error;
      await logActivity('task_completed', `إنجاز مهمة: ${taskToComplete.title}${completionNote.trim() ? ` — ${completionNote.trim()}` : ''}`);
      setNoteDialogOpen(false);
      setTaskToComplete(null);
      fetchTasks();
    } catch (e) {
      console.error('Error completing task:', e);
    } finally {
      setCompleting(false);
    }
  };

  const handleDeleteTask = async (task: TicketTask) => {
    try {
      const { error } = await supabase.from('ticket_tasks').delete().eq('id', task.id);
      if (error) throw error;
      await logActivity('task_deleted', `حذف مهمة: ${task.title}`);
      fetchTasks();
    } catch (e) {
      console.error('Error deleting task:', e);
    }
  };

  if (mode === 'client' && taskMode === 'none') return null;

  const completedCount = tasks.filter(t => t.is_completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">المهام</span>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {completedCount}/{totalCount} منجز
        </Badge>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-left">{progressPercent}%</p>
        </div>
      )}

      {/* Tasks List */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          لا توجد مهام بعد
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className={cn(
                "rounded-lg border p-3 transition-all",
                task.is_completed 
                  ? "bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-900/10 dark:border-emerald-800/30" 
                  : "bg-background border-border hover:border-primary/20"
              )}
            >
              <div className="flex items-start gap-3">
                {canComplete ? (
                  <Checkbox
                    checked={task.is_completed}
                    onCheckedChange={() => handleToggleTask(task)}
                    className="mt-0.5"
                  />
                ) : (
                  <div className={cn(
                    "w-4 h-4 rounded-sm border mt-0.5 flex items-center justify-center shrink-0",
                    task.is_completed ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30"
                  )}>
                    {task.is_completed && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    task.is_completed && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </p>
                  
                  {task.is_completed && (
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{task.completed_by_name}</span>
                      <span>·</span>
                      <Clock className="h-3 w-3" />
                      <span>
                        {task.completed_at 
                          ? formatDistanceToNow(new Date(task.completed_at), { addSuffix: true, locale: ar })
                          : ''
                        }
                      </span>
                    </div>
                  )}
                  
                  {task.note && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                      <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>"{task.note}"</span>
                    </div>
                  )}
                </div>
                
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDeleteTask(task)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Input */}
      {canAdd && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="أضف مهمة جديدة..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); }}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={handleAddTask}
            disabled={adding || !newTaskTitle.trim()}
            className="gap-1 shrink-0"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            إضافة
          </Button>
        </div>
      )}

      {/* Completion Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              إنجاز المهمة
            </DialogTitle>
            <DialogDescription>
              {taskToComplete?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="أضف ملاحظة (اختياري)..."
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>إلغاء</Button>
            <Button 
              onClick={handleConfirmComplete} 
              disabled={completing}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {completing && <Loader2 className="h-4 w-4 animate-spin" />}
              تأكيد الإنجاز
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
