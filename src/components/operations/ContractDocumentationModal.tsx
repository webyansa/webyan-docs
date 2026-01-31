import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarIcon, FileCheck, Loader2, CheckCircle2, 
  AlertTriangle, Users, UserCog, ExternalLink,
  Building2, FileText, Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { contractStatuses, contractTypes, teamRoles } from '@/lib/operations/projectConfig';
import { formatCurrency } from '@/lib/crm/pipelineConfig';

interface ContractDocumentationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNumber?: string;
  quoteTotal?: number;
  opportunityId?: string;
  accountId: string;
  accountName: string;
  staffId?: string;
}

interface StaffMember {
  id: string;
  full_name: string;
}

export function ContractDocumentationModal({
  open,
  onOpenChange,
  quoteId,
  quoteNumber,
  quoteTotal,
  opportunityId,
  accountId,
  accountName,
  staffId,
}: ContractDocumentationModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Form state
  const [status, setStatus] = useState<'preparing' | 'signed'>('signed');
  const [signedDate, setSignedDate] = useState<Date>(new Date());
  const [contractType, setContractType] = useState<string>('service');
  const [notes, setNotes] = useState('');
  
  // Mandatory date fields
  const [receivedDate, setReceivedDate] = useState<Date>(new Date());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | undefined>(undefined);
  
  // Team assignment state
  const [implementerId, setImplementerId] = useState<string>('');
  const [csmId, setCsmId] = useState<string>('');
  
  // Success state
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [createdProjectName, setCreatedProjectName] = useState<string>('');

  // Check existing contract/project status
  const { data: existingData, isLoading: isCheckingExisting } = useQuery({
    queryKey: ['quote-contract-status', quoteId],
    queryFn: async () => {
      // Check for existing contract documentation
      const { data: contractDoc } = await supabase
        .from('contract_documentation')
        .select('id, status, signed_date')
        .eq('quote_id', quoteId)
        .maybeSingle();

      // Check for existing project
      const { data: project } = await supabase
        .from('crm_implementations')
        .select('id, project_name')
        .eq('quote_id', quoteId)
        .maybeSingle();

      return { contractDoc, project };
    },
    enabled: open && !!quoteId,
  });

  // Fetch staff members for assignment
  const { data: staffMembers } = useQuery({
    queryKey: ['staff-members-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data as StaffMember[];
    },
    enabled: open,
  });

  // Validation helpers
  const hasExistingContract = !!existingData?.contractDoc;
  const hasExistingProject = !!existingData?.project;
  const isTeamComplete = status !== 'signed' || (!!implementerId && !!csmId);
  const areDatesComplete = status !== 'signed' || (!!receivedDate && !!expectedDeliveryDate);
  const canSubmit = !hasExistingContract && !hasExistingProject && isTeamComplete && areDatesComplete && (status !== 'signed' || !!signedDate);

  const getValidationMessage = () => {
    if (hasExistingContract) {
      return {
        type: 'error' as const,
        message: 'لا يمكن توثيق العقد مرة أخرى. العقد موثق مسبقًا.',
        action: hasExistingProject ? 'project' : null,
      };
    }
    if (hasExistingProject) {
      return {
        type: 'error' as const,
        message: 'يوجد مشروع قائم مرتبط بهذا العرض. انتقل إلى المشاريع لإدارته.',
        action: 'project',
      };
    }
    if (status === 'signed' && !isTeamComplete) {
      return {
        type: 'warning' as const,
        message: 'يرجى تعيين مسؤول التنفيذ ومسؤول نجاح العميل قبل إنشاء المشروع.',
        action: null,
      };
    }
    if (status === 'signed' && !areDatesComplete) {
      return {
        type: 'warning' as const,
        message: 'يرجى تحديد تاريخ الاستلام وتاريخ التسليم المتوقع.',
        action: null,
      };
    }
    return null;
  };

  const validationInfo = getValidationMessage();

  // Create contract and project mutation
  const createContractAndProjectMutation = useMutation({
    mutationFn: async () => {
      // Double-check for existing records (race condition protection)
      const { data: checkContract } = await supabase
        .from('contract_documentation')
        .select('id')
        .eq('quote_id', quoteId)
        .maybeSingle();
      
      if (checkContract) {
        throw new Error('CONTRACT_ALREADY_DOCUMENTED');
      }

      const { data: checkProject } = await supabase
        .from('crm_implementations')
        .select('id')
        .eq('quote_id', quoteId)
        .maybeSingle();
      
      if (checkProject) {
        throw new Error('PROJECT_ALREADY_EXISTS');
      }

      // Simple project name: مشروع - اسم العميل
      const projectName = `مشروع - ${accountName}`;

      // 1. Create contract documentation
      const { data: contractDoc, error: contractError } = await supabase
        .from('contract_documentation')
        .insert({
          quote_id: quoteId,
          opportunity_id: opportunityId || null,
          account_id: accountId,
          status,
          signed_date: status === 'signed' ? format(signedDate, 'yyyy-MM-dd') : null,
          contract_type: contractType || null,
          notes: notes || null,
          created_by: staffId || null,
        })
        .select()
        .single();

      if (contractError) throw contractError;

      let project = null;

      // 2. If signed, create project
      if (status === 'signed') {
        const { data: projectData, error: projectError } = await supabase
          .from('crm_implementations')
          .insert({
            account_id: accountId,
            opportunity_id: opportunityId || null,
            quote_id: quoteId,
            contract_doc_id: contractDoc.id,
            project_name: projectName,
            status: 'active',
            stage: 'kickoff',
            received_date: format(receivedDate, 'yyyy-MM-dd'),
            expected_delivery_date: expectedDeliveryDate ? format(expectedDeliveryDate, 'yyyy-MM-dd') : null,
            priority: 'medium',
            implementer_id: implementerId,
            csm_id: csmId,
          })
          .select()
          .single();

        if (projectError) throw projectError;
        project = projectData;

        // 3. Update quote with project_id
        await supabase
          .from('crm_quotes')
          .update({ project_id: project.id })
          .eq('id', quoteId);

        // 4. Add team members
        const teamMembers = [
          { project_id: project.id, staff_id: implementerId, role: 'implementer', assigned_by: staffId },
          { project_id: project.id, staff_id: csmId, role: 'csm', assigned_by: staffId },
        ];

        await supabase
          .from('project_team_members')
          .insert(teamMembers);

        // 5. Send notifications to team members
        const implementerStaff = staffMembers?.find(s => s.id === implementerId);
        const csmStaff = staffMembers?.find(s => s.id === csmId);

        // Get user_ids for notifications
        const { data: implementerData } = await supabase
          .from('staff_members')
          .select('user_id')
          .eq('id', implementerId)
          .single();

        const { data: csmData } = await supabase
          .from('staff_members')
          .select('user_id')
          .eq('id', csmId)
          .single();

        // Send notifications if user_ids exist
        const notificationsToInsert: Array<{
          user_id: string;
          title: string;
          message: string;
          type: string;
        }> = [];
        
        if (implementerData?.user_id) {
          notificationsToInsert.push({
            user_id: implementerData.user_id,
            title: 'مشروع جديد',
            message: `لديك مشروع جديد تم إسناده إليك: ${projectName}`,
            type: 'project_assignment',
          });
        }
        
        if (csmData?.user_id) {
          notificationsToInsert.push({
            user_id: csmData.user_id,
            title: 'عميل جديد',
            message: `تم إسناد عميل جديد إليك لمتابعة نجاح العميل: ${accountName}`,
            type: 'project_assignment',
          });
        }

        if (notificationsToInsert.length > 0) {
          await supabase.from('user_notifications').insert(notificationsToInsert);
        }

        // 6. Log activity
        if (opportunityId) {
          await supabase.from('crm_opportunity_activities').insert({
            opportunity_id: opportunityId,
            activity_type: 'contract_signed',
            title: 'تم توثيق العقد وإنشاء المشروع',
            description: `تم توثيق العقد بتاريخ ${format(signedDate, 'dd/MM/yyyy')} وإنشاء مشروع جديد`,
            performed_by: staffId,
            performed_by_name: null,
            metadata: {
              quote_id: quoteId,
              project_id: project.id,
              contract_doc_id: contractDoc.id,
              implementer_id: implementerId,
              implementer_name: implementerStaff?.full_name,
              csm_id: csmId,
              csm_name: csmStaff?.full_name,
              signed_date: format(signedDate, 'yyyy-MM-dd'),
              contract_type: contractType,
            },
          });
        }

        // 7. Add to client timeline
        await supabase.from('client_timeline').insert({
          organization_id: accountId,
          event_type: 'contract_signed',
          title: 'تم توقيع العقد',
          description: `تم توثيق العقد وإنشاء مشروع: ${projectName}`,
          performed_by: staffId,
          reference_type: 'project',
          reference_id: project.id,
          metadata: {
            quote_id: quoteId,
            contract_type: contractType,
          },
        });
      }

      return { contractDoc, project, projectName };
    },
    onSuccess: async (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['quote-contract-status', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['crm-quote-details', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quote'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['implementations'] });
      queryClient.invalidateQueries({ queryKey: ['crm-quotes'] });
      
      if (data.project) {
        // Pre-cache the project data immediately for instant navigation
        queryClient.setQueryData(['project', data.project.id], data.project);
        
        // Also prefetch the full project data to ensure it's ready
        await queryClient.prefetchQuery({
          queryKey: ['project', data.project.id],
          queryFn: async () => {
            const { data: projectData } = await supabase
              .from('crm_implementations')
              .select(`
                *,
                account:client_organizations!crm_implementations_account_id_fkey(id, name, contact_email, contact_phone),
                quote:crm_quotes!crm_implementations_quote_id_fkey(id, quote_number, title, total_amount),
                opportunity:crm_opportunities!crm_implementations_opportunity_id_fkey(id, name),
                implementer:staff_members!crm_implementations_implementer_id_fkey(id, full_name, email),
                csm:staff_members!crm_implementations_csm_id_fkey(id, full_name, email),
                project_manager:staff_members!crm_implementations_project_manager_id_fkey(id, full_name, email)
              `)
              .eq('id', data.project.id)
              .single();
            return projectData;
          },
        });
        
        setCreatedProjectId(data.project.id);
        setCreatedProjectName(data.projectName);
        setShowSuccess(true);
      } else {
        toast.success('تم توثيق حالة العقد بنجاح');
        handleClose();
      }
    },
    onError: (error: any) => {
      if (error.message === 'CONTRACT_ALREADY_DOCUMENTED') {
        toast.error('لا يمكن توثيق العقد مرة أخرى. العقد موثق مسبقًا.');
      } else if (error.message === 'PROJECT_ALREADY_EXISTS') {
        toast.error('يوجد مشروع قائم مرتبط بهذا العرض');
      } else {
        toast.error('حدث خطأ: ' + error.message);
      }
      queryClient.invalidateQueries({ queryKey: ['quote-contract-status', quoteId] });
    },
  });

  const handleClose = async () => {
    // Refetch contract status before closing to update parent page
    await queryClient.refetchQueries({ queryKey: ['quote-contract-status', quoteId] });
    
    setStatus('signed');
    setSignedDate(new Date());
    setReceivedDate(new Date());
    setExpectedDeliveryDate(undefined);
    setContractType('service');
    setNotes('');
    setImplementerId('');
    setCsmId('');
    setShowSuccess(false);
    setCreatedProjectId(null);
    setCreatedProjectName('');
    onOpenChange(false);
  };

  const handleGoToProject = async () => {
    if (createdProjectId) {
      // Refetch contract status before navigating
      await queryClient.refetchQueries({ queryKey: ['quote-contract-status', quoteId] });
      navigate(`/admin/projects/${createdProjectId}`);
      handleClose();
    }
  };

  // Success view
  if (showSuccess && createdProjectId) {
    const implementerName = staffMembers?.find(s => s.id === implementerId)?.full_name;
    const csmName = staffMembers?.find(s => s.id === csmId)?.full_name;

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <div className="text-center py-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">تم بنجاح</h2>
            <p className="text-muted-foreground">
              تم توثيق العقد بنجاح وتم إنشاء مشروع جديد مرتبط بهذا العرض
            </p>
          </div>

          <Separator />

          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">المشروع:</span>
              <span className="font-medium">{createdProjectName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <UserCog className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">مسؤول التنفيذ:</span>
              <span className="font-medium">{implementerName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">مسؤول نجاح العميل:</span>
              <span className="font-medium">{csmName}</span>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={handleGoToProject} className="w-full">
              <ExternalLink className="h-4 w-4 ml-2" />
              الذهاب إلى المشروع
            </Button>
            <Button variant="outline" onClick={handleClose} className="w-full">
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            توثيق العقد وإنشاء المشروع
          </DialogTitle>
        </DialogHeader>

        {isCheckingExisting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Quote Info Header */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">العميل:</span>
                <span className="font-medium">{accountName}</span>
              </div>
              {quoteNumber && (
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">رقم العرض:</span>
                  <span className="font-medium font-mono">{quoteNumber}</span>
                </div>
              )}
              {quoteTotal && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">قيمة العرض:</span>
                  <span className="font-medium">{formatCurrency(quoteTotal)}</span>
                </div>
              )}
            </div>

            {/* Validation Alert */}
            {validationInfo && (
              <Alert variant={validationInfo.type === 'error' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{validationInfo.message}</span>
                  {validationInfo.action === 'project' && existingData?.project && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => {
                        navigate(`/admin/projects/${existingData.project!.id}`);
                        handleClose();
                      }}
                    >
                      فتح المشروع
                      <ExternalLink className="h-3 w-3 mr-1" />
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Only show form if no existing contract/project */}
            {!hasExistingContract && !hasExistingProject && (
              <>
                {/* Section 1: Contract Documentation */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                    توثيق العقد
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>حالة العقد</Label>
                      <Select value={status} onValueChange={(v: 'preparing' | 'signed') => setStatus(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(contractStatuses).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              <span className={value.color}>{value.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>نوع العقد</Label>
                      <Select value={contractType} onValueChange={setContractType}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع العقد" />
                        </SelectTrigger>
                        <SelectContent>
                          {contractTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {status === 'signed' && (
                    <div className="space-y-2">
                      <Label>تاريخ التوقيع *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-right font-normal',
                              !signedDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {signedDate ? format(signedDate, 'PPP', { locale: ar }) : 'اختر التاريخ'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={signedDate}
                            onSelect={(date) => date && setSignedDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {/* Mandatory Project Dates */}
                  {status === 'signed' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>تاريخ الاستلام *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-right font-normal',
                                !receivedDate && 'text-muted-foreground border-destructive'
                              )}
                            >
                              <CalendarIcon className="ml-2 h-4 w-4" />
                              {receivedDate ? format(receivedDate, 'PPP', { locale: ar }) : 'اختر التاريخ'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={receivedDate}
                              onSelect={(date) => date && setReceivedDate(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>تاريخ التسليم المتوقع *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-right font-normal',
                                !expectedDeliveryDate && 'text-muted-foreground border-destructive'
                              )}
                            >
                              <CalendarIcon className="ml-2 h-4 w-4" />
                              {expectedDeliveryDate ? format(expectedDeliveryDate, 'PPP', { locale: ar }) : 'اختر التاريخ'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={expectedDeliveryDate}
                              onSelect={(date) => date && setExpectedDeliveryDate(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أي ملاحظات متعلقة بالعقد..."
                      rows={2}
                    />
                  </div>
                </div>

                <Separator />

                {/* Section 2: Team Assignment (only if signed) */}
                {status === 'signed' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                      تعيين فريق التنفيذ
                      <span className="text-destructive text-xs">(إجباري)</span>
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <UserCog className="h-4 w-4" />
                          مسؤول التنفيذ *
                        </Label>
                        <Select value={implementerId} onValueChange={setImplementerId}>
                          <SelectTrigger className={!implementerId && status === 'signed' ? 'border-destructive' : ''}>
                            <SelectValue placeholder="اختر مسؤول التنفيذ" />
                          </SelectTrigger>
                          <SelectContent>
                            {staffMembers?.map((staff) => (
                              <SelectItem key={staff.id} value={staff.id}>
                                {staff.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {teamRoles.implementer.description}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          مسؤول نجاح العميل *
                        </Label>
                        <Select value={csmId} onValueChange={setCsmId}>
                          <SelectTrigger className={!csmId && status === 'signed' ? 'border-destructive' : ''}>
                            <SelectValue placeholder="اختر مسؤول نجاح العميل" />
                          </SelectTrigger>
                          <SelectContent>
                            {staffMembers?.map((staff) => (
                              <SelectItem key={staff.id} value={staff.id}>
                                {staff.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {teamRoles.csm.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Section */}
                {status === 'signed' && isTeamComplete && areDatesComplete && (
                  <>
                    <Separator />
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">ماذا سيحدث عند التأكيد:</h4>
                      <ul className="space-y-1 text-sm text-green-700">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          سيتم توثيق حالة العقد
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          سيتم إنشاء مشروع جديد
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          سيتم إرسال إشعار لمسؤول التنفيذ ومسؤول نجاح العميل
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          سيتم تسجيل العملية في سجل النشاط
                        </li>
                      </ul>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            إلغاء
          </Button>
          {!hasExistingContract && !hasExistingProject && (
            <Button 
              onClick={() => createContractAndProjectMutation.mutate()}
              disabled={!canSubmit || createContractAndProjectMutation.isPending}
            >
              {createContractAndProjectMutation.isPending && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              )}
              {status === 'signed' ? 'توثيق العقد وإنشاء المشروع' : 'حفظ التوثيق'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
