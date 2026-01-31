import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCog, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ProjectPhaseType } from '@/lib/operations/projectConfig';
import { getPhaseConfig } from '@/lib/operations/phaseUtils';

interface Phase {
  id: string;
  phase_type: ProjectPhaseType | string;
  phase_order: number;
  assigned_to: string | null;
  status: string;
}

interface PhaseAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  phases: Phase[];
  implementerId?: string | null;
  csmId?: string | null;
  projectManagerId?: string | null;
}

export function PhaseAssignmentModal({
  open,
  onOpenChange,
  projectId,
  phases,
  implementerId,
  csmId,
  projectManagerId,
}: PhaseAssignmentModalProps) {
  const queryClient = useQueryClient();
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  // Check if we have any team members assigned
  const teamIds = [implementerId, csmId, projectManagerId].filter(Boolean) as string[];
  const hasTeamAssigned = teamIds.length > 0;

  // Fetch only the project team members (Implementer, CSM, Project Manager)
  const {
    data: teamMembers = [],
    isLoading: isLoadingTeam,
    isError: isTeamError,
    error: teamError,
  } = useQuery({
    queryKey: ['project-team-members', implementerId, csmId, projectManagerId],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('staff_members')
        .select('id, full_name')
        .in('id', teamIds)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: open && hasTeamAssigned,
    retry: 0,
  });

  // Initialize assignments from phases
  useEffect(() => {
    const initial: Record<string, string> = {};
    phases.forEach(phase => {
      if (phase.assigned_to) {
        initial[phase.id] = phase.assigned_to;
      }
    });
    setAssignments(initial);
  }, [phases]);

  // Suggested assignments based on role (supports both 8-phase and 10-phase workflows)
  const getSuggestedStaff = (phaseType: string) => {
    // Technical phases → Implementer
    const techPhases = [
      'setup', 'development', 'launch', 
      'trial_setup', 'initial_content', 'trial_inspection', 
      'production_setup', 'production_upload', 'final_review'
    ];
    // Client-facing phases → CSM
    const clientPhases = [
      'requirements', 'content', 'client_review', 'closure',
      'client_approval'
    ];
    // Internal review → Project Manager or Implementer
    const reviewPhases = ['internal_review'];
    
    if (techPhases.includes(phaseType) && implementerId) {
      return implementerId;
    }
    if (clientPhases.includes(phaseType) && csmId) {
      return csmId;
    }
    if (reviewPhases.includes(phaseType)) {
      return projectManagerId || implementerId || null;
    }
    return null;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = phases.map(phase => ({
        id: phase.id,
        assigned_to: assignments[phase.id] || null,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('project_phases')
          .update({ assigned_to: update.assigned_to })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['staff-assigned-phases'] });
      toast.success('تم حفظ توزيع المراحل بنجاح');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + error.message);
    },
  });

  // Auto-assign based on roles
  const autoAssign = () => {
    const newAssignments: Record<string, string> = {};
    phases.forEach(phase => {
      const suggested = getSuggestedStaff(phase.phase_type as string);
      if (suggested) {
        newAssignments[phase.id] = suggested;
      }
    });
    setAssignments(newAssignments);
    toast.info('تم التوزيع التلقائي حسب الأدوار');
  };

  const sortedPhases = [...phases].sort((a, b) => a.phase_order - b.phase_order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            توزيع المراحل على الموظفين
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Auto-assign button */}
          <div className="flex justify-end mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={autoAssign}
              disabled={!implementerId && !csmId}
            >
              <UserCog className="h-4 w-4 ml-2" />
              توزيع تلقائي حسب الأدوار
            </Button>
          </div>

          {/* Phases list */}
          <div className="space-y-3">
            {sortedPhases.map((phase) => {
              const phaseConfig = getPhaseConfig(phase.phase_type);
              const PhaseIcon = phaseConfig?.icon;
              const isCompleted = phase.status === 'completed';

              return (
                <div 
                  key={phase.id}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border",
                    isCompleted && "bg-green-50 border-green-200"
                  )}
                >
                  {/* Phase Info */}
                  <div className="flex items-center gap-3 flex-1">
                    {PhaseIcon && (
                      <div className={cn("p-2 rounded", phaseConfig?.bgColor)}>
                        <PhaseIcon className={cn("h-4 w-4", phaseConfig?.color)} />
                      </div>
                    )}
                    <div>
                      <span className="font-medium">
                        {phaseConfig?.label ?? String(phase.phase_type)}
                      </span>
                      {isCompleted && (
                        <Badge variant="outline" className="mr-2 text-green-600">
                          مكتمل
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Staff Select */}
                  <div className="w-48">
                    <Select
                      value={assignments[phase.id] || '__none__'}
                      onValueChange={(value) => 
                        setAssignments(prev => ({
                          ...prev,
                          [phase.id]: value === '__none__' ? '' : value
                        }))
                      }
                      disabled={isCompleted}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر موظف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="text-muted-foreground">بدون تعيين</span>
                        </SelectItem>
                        {!hasTeamAssigned && (
                          <SelectItem value="__no_team__" disabled>
                            <span className="text-amber-600">⚠️ لم يتم تعيين فريق للمشروع بعد</span>
                          </SelectItem>
                        )}
                        {hasTeamAssigned && isLoadingTeam && (
                          <SelectItem value="__loading__" disabled>
                            <span className="text-muted-foreground">جاري تحميل الفريق...</span>
                          </SelectItem>
                        )}
                        {hasTeamAssigned && isTeamError && (
                          <SelectItem value="__error__" disabled>
                            <span className="text-destructive">
                              تعذر تحميل الفريق{(teamError as any)?.message ? `: ${(teamError as any).message}` : ''}
                            </span>
                          </SelectItem>
                        )}
                        {teamMembers.map((staff: any) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            <div className="flex items-center gap-2">
                              <span>{staff.full_name}</span>
                              {staff.id === implementerId && (
                                <Badge variant="secondary" className="text-xs">منفذ</Badge>
                              )}
                              {staff.id === csmId && (
                                <Badge variant="secondary" className="text-xs">CSM</Badge>
                              )}
                              {staff.id === projectManagerId && (
                                <Badge variant="secondary" className="text-xs">مدير</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            حفظ التوزيع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
