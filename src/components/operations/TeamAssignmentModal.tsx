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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Loader2, UserPlus } from 'lucide-react';
import { teamRoles, type TeamRole } from '@/lib/operations/projectConfig';
import { cn } from '@/lib/utils';

interface TeamAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  currentTeam?: {
    implementer_id?: string;
    csm_id?: string;
    project_manager_id?: string;
  };
  assignedById?: string;
}

export function TeamAssignmentModal({
  open,
  onOpenChange,
  projectId,
  projectName,
  currentTeam,
  assignedById,
}: TeamAssignmentModalProps) {
  const queryClient = useQueryClient();
  const [implementerId, setImplementerId] = useState<string>('');
  const [csmId, setCsmId] = useState<string>('');
  const [projectManagerId, setProjectManagerId] = useState<string>('');

  // Fetch available staff members
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['staff-members-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data;
    },
  });

  // Fetch current team members
  const { data: currentTeamMembers = [] } = useQuery({
    queryKey: ['project-team', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team_members')
        .select('staff_id, role')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Set initial values from current team
  useEffect(() => {
    if (currentTeamMembers.length > 0) {
      const implementer = currentTeamMembers.find(m => m.role === 'implementer');
      const csm = currentTeamMembers.find(m => m.role === 'csm');
      const pm = currentTeamMembers.find(m => m.role === 'project_manager');

      if (implementer) setImplementerId(implementer.staff_id);
      if (csm) setCsmId(csm.staff_id);
      if (pm) setProjectManagerId(pm.staff_id);
    } else if (currentTeam) {
      if (currentTeam.implementer_id) setImplementerId(currentTeam.implementer_id);
      if (currentTeam.csm_id) setCsmId(currentTeam.csm_id);
      if (currentTeam.project_manager_id) setProjectManagerId(currentTeam.project_manager_id);
    }
  }, [currentTeamMembers, currentTeam]);

  const assignTeamMutation = useMutation({
    mutationFn: async () => {
      const assignments: { role: TeamRole; staffId: string }[] = [];
      
      if (implementerId) assignments.push({ role: 'implementer', staffId: implementerId });
      if (csmId) assignments.push({ role: 'csm', staffId: csmId });
      if (projectManagerId) assignments.push({ role: 'project_manager', staffId: projectManagerId });

      // Deactivate old assignments
      await supabase
        .from('project_team_members')
        .update({ is_active: false })
        .eq('project_id', projectId);

      // Insert new assignments
      for (const assignment of assignments) {
        const { error } = await supabase
          .from('project_team_members')
          .upsert({
            project_id: projectId,
            staff_id: assignment.staffId,
            role: assignment.role,
            assigned_by: assignedById || null,
            is_active: true,
          }, {
            onConflict: 'project_id,staff_id,role',
          });

        if (error) throw error;
      }

      // Update crm_implementations with IDs
      const { error: updateError } = await supabase
        .from('crm_implementations')
        .update({
          implementer_id: implementerId || null,
          csm_id: csmId || null,
          project_manager_id: projectManagerId || null,
        })
        .eq('id', projectId);

      if (updateError) throw updateError;

      return assignments;
    },
    onSuccess: async () => {
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-team', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('تم تعيين فريق المشروع بنجاح');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + error.message);
    },
  });

  const getStaffName = (id: string) => {
    const staff = staffMembers.find(s => s.id === id);
    return staff?.full_name || '';
  };

  const renderStaffSelect = (
    label: string,
    role: TeamRole,
    value: string,
    onChange: (val: string) => void,
    required?: boolean
  ) => {
    const roleConfig = teamRoles[role];
    const RoleIcon = roleConfig.icon;

    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <RoleIcon className={cn("h-4 w-4", roleConfig.color)} />
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="اختر الموظف" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              <span className="text-muted-foreground">بدون تعيين</span>
            </SelectItem>
            {staffMembers.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {staff.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{staff.full_name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{roleConfig.description}</p>
      </div>
    );
  };

  const handleChange = (setter: (val: string) => void) => (val: string) => {
    setter(val === '__none__' ? '' : val);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            تعيين فريق المشروع
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              المشروع: <span className="font-medium text-foreground">{projectName}</span>
            </p>
          </div>

          {renderStaffSelect('موظف التنفيذ', 'implementer', implementerId, handleChange(setImplementerId), true)}
          {renderStaffSelect('مدير نجاح العميل', 'csm', csmId, handleChange(setCsmId), true)}
          {renderStaffSelect('مدير المشروع', 'project_manager', projectManagerId, handleChange(setProjectManagerId))}

          {(implementerId || csmId || projectManagerId) && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-sm text-blue-800 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                سيتم إرسال إشعار للموظفين المعينين
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button 
            onClick={() => assignTeamMutation.mutate()}
            disabled={assignTeamMutation.isPending || (!implementerId && !csmId && !projectManagerId)}
          >
            {assignTeamMutation.isPending && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            )}
            حفظ التعيينات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
