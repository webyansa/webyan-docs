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
import { CheckCircle2, PlayCircle, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  phaseStatuses,
  type ProjectPhaseType,
  type PhaseStatus 
} from '@/lib/operations/projectConfig';
import { getPhaseConfig, normalizePhaseType } from '@/lib/operations/phaseUtils';

interface Phase {
  id: string;
  project_id: string;
  // Backward compatibility: existing data may contain legacy values (kickoff/review/delivery).
  phase_type: ProjectPhaseType | string;
  status: PhaseStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  phase_order: number;
  instructions?: string | null;
}

interface PhaseProgressCardProps {
  phases: Phase[];
  projectId: string;
  staffId?: string;
  canEdit?: boolean;
}

export function PhaseProgressCard({ 
  phases, 
  projectId, 
  staffId,
  canEdit = true 
}: PhaseProgressCardProps) {
  const queryClient = useQueryClient();
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Sort phases by order
  const sortedPhases = [...phases].sort((a, b) => a.phase_order - b.phase_order);

  // Calculate progress
  const completedCount = phases.filter(p => p.status === 'completed').length;
  const progressPercent = phases.length > 0 ? Math.round((completedCount / phases.length) * 100) : 0;

  // Get current active phase
  const currentPhase = sortedPhases.find(p => p.status === 'in_progress') || 
    sortedPhases.find(p => p.status === 'pending');

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
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
          completed_by: staffId || null,
          notes: notes || null,
        })
        .eq('id', phaseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
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

  const deletePhaseMutation = useMutation({
    mutationFn: async (phaseId: string) => {
      const { error } = await supabase
        .from('project_phases')
        .delete()
        .eq('id', phaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      toast.success('تم حذف المرحلة');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleCompleteClick = (phase: Phase) => {
    setSelectedPhase(phase);
    setCompleteModalOpen(true);
  };

  const canStartPhase = (phase: Phase, index: number) => {
    if (phase.status !== 'pending') return false;
    if (index === 0) return true;
    // Previous phase must be completed
    const previousPhase = sortedPhases[index - 1];
    return previousPhase?.status === 'completed';
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
              const canStart = canStartPhase(phase, index);
              const normalizedPhaseType = normalizePhaseType(phase.phase_type) ?? null;

              return (
                <div 
                  key={phase.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    isActive && "border-primary bg-primary/5",
                    phase.status === 'completed' && "border-green-200 bg-green-50",
                    phase.status === 'pending' && "border-muted"
                  )}
                >
                  {/* Phase Icon */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    phase.status === 'completed' && "bg-green-100",
                    phase.status === 'in_progress' && "bg-blue-100",
                    phase.status === 'pending' && "bg-gray-100"
                  )}>
                    {phase.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
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
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {phaseConfig?.label ?? normalizedPhaseType ?? String(phase.phase_type)}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", statusConfig.color)}
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {/* Show instructions from database if available, otherwise fallback to config */}
                      {phase.instructions || phaseConfig?.description || ""}
                    </p>
                  </div>

                  {/* Actions */}
                  {canEdit && (
                    <div className="flex gap-2">
                      {phase.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('هل تريد حذف هذه المرحلة؟')) {
                              deletePhaseMutation.mutate(phase.id);
                            }
                          }}
                          disabled={deletePhaseMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
                      {isActive && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteClick(phase)}
                        >
                          <CheckCircle2 className="h-4 w-4 ml-1" />
                          إنهاء
                        </Button>
                      )}
                    </div>
                  )}
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
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm">
                  المرحلة: <span className="font-medium">
                    {getPhaseConfig(selectedPhase.phase_type)?.label ?? String(selectedPhase.phase_type)}
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات الإنجاز (اختياري)</label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="أضف ملاحظات حول هذه المرحلة..."
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
              disabled={completePhaseMutation.isPending}
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
