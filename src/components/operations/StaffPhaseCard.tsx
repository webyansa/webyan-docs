import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  CheckCircle2, PlayCircle, Loader2, Clock, User, 
  AlertCircle, Lock 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  phaseStatuses,
  type ProjectPhaseType,
  type PhaseStatus 
} from '@/lib/operations/projectConfig';
import { getPhaseConfig, normalizePhaseType } from '@/lib/operations/phaseUtils';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Phase {
  id: string;
  project_id: string;
  phase_type: ProjectPhaseType | string;
  status: PhaseStatus | string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  phase_order: number;
  assigned_to: string | null;
  assigned_staff?: {
    id: string;
    full_name: string;
  } | null;
}

interface StaffPhaseCardProps {
  phases: Phase[];
  projectId: string;
  currentStaffId: string;
  currentStaffName?: string;
}

export function StaffPhaseCard({ 
  phases, 
  projectId, 
  currentStaffId,
  currentStaffName 
}: StaffPhaseCardProps) {
  const queryClient = useQueryClient();
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Sort phases by order
  const sortedPhases = [...phases].sort((a, b) => a.phase_order - b.phase_order);

  // Calculate progress
  const completedCount = phases.filter(p => p.status === 'completed').length;
  const progressPercent = phases.length > 0 ? Math.round((completedCount / phases.length) * 100) : 0;

  // Check if phase is assigned to current staff
  const isMyPhase = (phase: Phase) => {
    return phase.assigned_to === currentStaffId;
  };

  // Check if can start phase
  const canStartPhase = (phase: Phase, index: number) => {
    if (phase.status !== 'pending') return false;
    if (!isMyPhase(phase)) return false;
    if (index === 0) return true;
    const previousPhase = sortedPhases[index - 1];
    return previousPhase?.status === 'completed';
  };

  // Check if can complete phase
  const canCompletePhase = (phase: Phase) => {
    return phase.status === 'in_progress' && isMyPhase(phase);
  };

  const startPhaseMutation = useMutation({
    mutationFn: async (phaseId: string) => {
      const { error } = await supabase
        .from('project_phases')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', phaseId);

      if (error) throw error;

      // Log activity
      await supabase.from('project_activity_log').insert({
        project_id: projectId,
        activity_type: 'phase_started',
        title: 'بدء مرحلة جديدة',
        description: `تم بدء مرحلة بواسطة ${currentStaffName || 'موظف'}`,
        performed_by: currentStaffId,
        performed_by_name: currentStaffName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      toast.success('تم بدء المرحلة بنجاح');
    },
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + error.message);
    },
  });

  const completePhaseMutation = useMutation({
    mutationFn: async ({ phaseId, notes }: { phaseId: string; notes: string }) => {
      const { error } = await supabase
        .from('project_phases')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: currentStaffId,
          notes: notes || null,
        })
        .eq('id', phaseId);

      if (error) throw error;

      // Log activity
      await supabase.from('project_activity_log').insert({
        project_id: projectId,
        activity_type: 'phase_completed',
        title: 'إكمال مرحلة',
        description: notes || `تم إكمال مرحلة بواسطة ${currentStaffName || 'موظف'}`,
        performed_by: currentStaffId,
        performed_by_name: currentStaffName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      toast.success('تم إنهاء المرحلة بنجاح');
      setCompleteModalOpen(false);
      setSelectedPhase(null);
      setCompletionNotes('');
    },
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + error.message);
    },
  });

  const handleCompleteClick = (phase: Phase) => {
    setSelectedPhase(phase);
    setCompleteModalOpen(true);
  };

  // Calculate duration for a phase
  const calculateDuration = (phase: Phase) => {
    if (!phase.started_at) return null;
    if (phase.completed_at) {
      const start = new Date(phase.started_at);
      const end = new Date(phase.completed_at);
      const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      if (hours < 24) return `${hours} ساعة`;
      const days = Math.round(hours / 24);
      return `${days} يوم`;
    }
    return formatDistanceToNow(new Date(phase.started_at), { locale: ar, addSuffix: false });
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          {/* Progress Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">مراحل المشروع</h3>
            <Badge variant="outline" className="text-sm">
              {progressPercent}% مكتمل
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Phases Timeline */}
          <div className="space-y-3">
            {sortedPhases.map((phase, index) => {
              const phaseConfig = getPhaseConfig(phase.phase_type);
              const statusConfig = phaseStatuses[phase.status] ?? phaseStatuses.pending;
              const PhaseIcon = phaseConfig?.icon ?? CheckCircle2;
              const isActive = phase.status === 'in_progress';
              const isMine = isMyPhase(phase);
              const canStart = canStartPhase(phase, index);
              const canComplete = canCompletePhase(phase);
              const duration = calculateDuration(phase);

              return (
                <div 
                  key={phase.id}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    isActive && isMine && "border-primary bg-primary/5",
                    isActive && !isMine && "border-blue-200 bg-blue-50/50",
                    phase.status === 'completed' && "border-green-200 bg-green-50",
                    phase.status === 'pending' && isMine && "border-muted hover:border-primary/30",
                    phase.status === 'pending' && !isMine && "border-muted bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Phase Icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      phase.status === 'completed' && "bg-green-100",
                      phase.status === 'in_progress' && "bg-blue-100",
                      phase.status === 'pending' && "bg-gray-100"
                    )}>
                      {phase.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : !isMine ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <PhaseIcon
                          className={cn(
                            "h-5 w-5",
                            phaseConfig?.color ?? "text-muted-foreground"
                          )}
                        />
                      )}
                    </div>

                    {/* Phase Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {phaseConfig?.label ?? String(phase.phase_type)}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", statusConfig.color)}
                        >
                          {statusConfig.label}
                        </Badge>
                        {isMine && (
                          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                            مهمتي
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {phaseConfig?.description ?? ""}
                      </p>

                      {/* Assignment Info */}
                      {!isMine && phase.assigned_staff && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-amber-600 bg-amber-50 rounded-md px-2 py-1">
                          <User className="h-3.5 w-3.5" />
                          <span>مسندة إلى: {phase.assigned_staff.full_name}</span>
                        </div>
                      )}

                      {!isMine && !phase.assigned_staff && phase.status !== 'completed' && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground bg-muted rounded-md px-2 py-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>لم يتم تعيين موظف لهذه المرحلة</span>
                        </div>
                      )}

                      {/* Time Tracking Info */}
                      {(phase.started_at || phase.completed_at) && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {phase.started_at && (
                            <div className="flex items-center gap-1">
                              <PlayCircle className="h-3.5 w-3.5" />
                              <span>بدأ: {format(new Date(phase.started_at), 'dd/MM HH:mm', { locale: ar })}</span>
                            </div>
                          )}
                          {phase.completed_at && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              <span>انتهى: {format(new Date(phase.completed_at), 'dd/MM HH:mm', { locale: ar })}</span>
                            </div>
                          )}
                          {duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>المدة: {duration}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      {canStart && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startPhaseMutation.mutate(phase.id)}
                          disabled={startPhaseMutation.isPending}
                        >
                          {startPhaseMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <PlayCircle className="h-4 w-4" />
                          )}
                          <span className="mr-1">بدء</span>
                        </Button>
                      )}
                      {canComplete && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteClick(phase)}
                        >
                          <CheckCircle2 className="h-4 w-4 ml-1" />
                          إنهاء
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Complete Phase Modal */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنهاء المرحلة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedPhase && (
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <p className="text-sm">
                  المرحلة: <span className="font-medium">
                    {getPhaseConfig(selectedPhase.phase_type)?.label ?? String(selectedPhase.phase_type)}
                  </span>
                </p>
                {selectedPhase.started_at && (
                  <p className="text-xs text-muted-foreground">
                    وقت البدء: {format(new Date(selectedPhase.started_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات الإنجاز (إلزامية)</label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="أضف ملاحظات حول ما تم إنجازه في هذه المرحلة..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => selectedPhase && completePhaseMutation.mutate({
                phaseId: selectedPhase.id,
                notes: completionNotes,
              })}
              disabled={completePhaseMutation.isPending || !completionNotes.trim()}
            >
              {completePhaseMutation.isPending && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              )}
              تأكيد الإنهاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
