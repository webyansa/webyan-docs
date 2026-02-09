import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  DollarSign,
  Calendar,
  Building2,
  Loader2,
  MoreVertical,
  MessageSquare,
  FileText,
  XCircle,
  Eye,
  CheckCircle2,
  Target
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { dealStages, DealStage, formatCurrency } from '@/lib/crm/pipelineConfig';

// Import modals
import AddNoteModal from '@/components/crm/modals/AddNoteModal';
import ScheduleMeetingModal from '@/components/crm/modals/ScheduleMeetingModal';
import MeetingReportModal from '@/components/crm/modals/MeetingReportModal';
import AdvancedQuoteModal from '@/components/crm/modals/AdvancedQuoteModal';
import RejectionModal from '@/components/crm/modals/RejectionModal';
import StageNoteModal from '@/components/crm/modals/StageNoteModal';

interface Deal {
  id: string;
  name: string;
  expected_value: number;
  probability: number;
  stage: string;
  status: string;
  opportunity_type: string | null;
  expected_close_date: string | null;
  next_step: string | null;
  created_at: string;
  updated_at: string;
  account_id: string | null;
  account?: { id: string; name: string } | null;
  owner?: { full_name: string } | null;
}

type ModalType = 'note' | 'schedule_meeting' | 'meeting_report' | 'create_quote' | 'rejection' | 'stage_note' | 'approval' | null;

export default function DealsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  
  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [targetStage, setTargetStage] = useState<DealStage | null>(null);

  const fetchDeals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crm_opportunities')
        .select(`
          id,
          name,
          expected_value,
          probability,
          stage,
          status,
          opportunity_type,
          expected_close_date,
          next_step,
          created_at,
          updated_at,
          account_id,
          account:client_organizations(id, name),
          owner:staff_members!crm_opportunities_owner_id_fkey(full_name)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast.error('حدث خطأ أثناء جلب الفرص');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);


  const openModal = (modal: ModalType, deal: Deal, stage?: DealStage) => {
    setSelectedDeal(deal);
    setTargetStage(stage || null);
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedDeal(null);
    setTargetStage(null);
  };

  const handleStageClick = (deal: Deal, newStage: DealStage) => {
    if (deal.stage === newStage) return;
    
    // Determine which modal to show based on target stage
    switch (newStage) {
      case 'meeting_scheduled':
        openModal('schedule_meeting', deal, newStage);
        break;
      case 'meeting_done':
        openModal('meeting_report', deal, newStage);
        break;
      case 'proposal_sent':
        openModal('create_quote', deal, newStage);
        break;
      case 'rejected':
        openModal('rejection', deal, newStage);
        break;
      case 'approved':
        openModal('approval', deal, newStage);
        break;
      case 'pending_approval':
      case 'new_opportunity':
      default:
        openModal('stage_note', deal, newStage);
        break;
    }
  };

  const handleApproval = async () => {
    if (!selectedDeal) return;

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

      // Update deal to approved
      const { error: dealError } = await supabase
        .from('crm_opportunities')
        .update({
          stage: 'approved',
          status: 'won',
          probability: 100,
          stage_changed_at: new Date().toISOString(),
          stage_change_reason: 'تم اعتماد الفرصة',
          actual_close_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedDeal.id);

      if (dealError) throw dealError;

      // Create new client organization from deal if not exists
      let newOrgId = selectedDeal.account_id;
      
      if (!newOrgId) {
        const { data: newOrg, error: orgError } = await supabase
          .from('client_organizations')
          .insert({
            name: selectedDeal.name.replace('فرصة - ', ''),
            contact_email: 'pending@update.com',
            customer_type: selectedDeal.opportunity_type === 'custom_platform' ? 'custom_project' : 'subscription',
            subscription_status: 'active',
            lifecycle_stage: 'onboarding',
            total_contract_value: selectedDeal.expected_value,
          } as any)
          .select()
          .single();

        if (!orgError && newOrg) {
          newOrgId = newOrg.id;
          
          // Link deal to the new organization
          await supabase
            .from('crm_opportunities')
            .update({ account_id: newOrg.id })
            .eq('id', selectedDeal.id);

          // Add timeline event
          await supabase.from('client_timeline').insert({
            organization_id: newOrg.id,
            event_type: 'account_created',
            title: 'تم إنشاء ملف العميل',
            description: `تم إنشاء ملف العميل من الفرصة: ${selectedDeal.name}`,
          });
        }
      } else {
        // Update existing organization lifecycle
        await supabase
          .from('client_organizations')
          .update({ 
            lifecycle_stage: 'onboarding',
            subscription_status: 'active'
          })
          .eq('id', newOrgId);
      }

      // Log activity
      await supabase.from('crm_opportunity_activities').insert({
        opportunity_id: selectedDeal.id,
        activity_type: 'approval',
        title: 'اعتماد الفرصة',
        description: 'تم اعتماد الفرصة وإنشاء ملف العميل',
        metadata: { account_id: newOrgId },
        performed_by: staffId,
        performed_by_name: staffName,
      });

      // Log stage transition
      await supabase.from('crm_stage_transitions').insert({
        entity_type: 'opportunity',
        entity_id: selectedDeal.id,
        pipeline_type: 'deals',
        from_stage: selectedDeal.stage,
        to_stage: 'approved',
        reason: 'تم اعتماد الفرصة',
        performed_by: staffId,
        performed_by_name: staffName,
      });

      toast.success(
        <div className="flex flex-col gap-1">
          <span>تم اعتماد الفرصة بنجاح</span>
          {newOrgId && (
            <Button 
              size="sm" 
              variant="link" 
              className="p-0 h-auto text-primary-foreground underline"
              onClick={() => navigate(`/admin/clients/${newOrgId}`)}
            >
              فتح ملف العميل
            </Button>
          )}
        </div>
      );

      closeModal();
      fetchDeals();
    } catch (error) {
      console.error('Error approving deal:', error);
      toast.error('حدث خطأ أثناء اعتماد الفرصة');
    }
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = deal.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesService = serviceFilter === 'all' || deal.opportunity_type === serviceFilter;
    return matchesSearch && matchesService;
  });

  const getStageDeals = (stage: DealStage) => {
    return filteredDeals.filter(deal => deal.stage === stage);
  };

  const getStageTotal = (stage: DealStage) => {
    return getStageDeals(stage).reduce((sum, deal) => sum + (deal.expected_value || 0), 0);
  };

  // Show all stages except rejected in main board
  const activeStages = Object.entries(dealStages).filter(([key]) => key !== 'rejected');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الفرص</h1>
          <p className="text-muted-foreground">إدارة فرص البيع بنظام Workflow احترافي</p>
        </div>
        <Button onClick={() => navigate('/admin/crm/leads')}>
          <Plus className="w-4 h-4 ml-2" />
          عميل محتمل جديد
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="بحث في الفرص..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="نوع الخدمة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="subscription">اشتراك ويبيان</SelectItem>
                <SelectItem value="custom_platform">منصة مخصصة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {activeStages.map(([stageKey, stageConfig]) => {
          const stageDeals = getStageDeals(stageKey as DealStage);
          const stageTotal = getStageTotal(stageKey as DealStage);
          const Icon = stageConfig.icon;

          return (
            <div
              key={stageKey}
              className="flex-shrink-0 w-[300px] bg-muted/30 rounded-lg"
            >
              {/* Stage Header */}
              <div className={`p-3 rounded-t-lg ${stageConfig.bgColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${stageConfig.color}`} />
                    <span className={`font-medium ${stageConfig.color}`}>
                      {stageConfig.label}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {stageDeals.length}
                  </Badge>
                </div>
                <div className={`text-sm mt-1 ${stageConfig.color} opacity-80`}>
                  {formatCurrency(stageTotal)}
                </div>
              </div>

              {/* Stage Cards */}
              <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-400px)] overflow-y-auto">
                {stageDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    className="cursor-pointer hover:shadow-md transition-shadow group"
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        {/* Header with Actions */}
                        <div className="flex items-start justify-between">
                          <div 
                            className="font-medium text-sm truncate flex-1 cursor-pointer hover:text-primary"
                            onClick={() => navigate(`/admin/crm/deals/${deal.id}`)}
                          >
                            {deal.name}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => navigate(`/admin/crm/deals/${deal.id}`)}>
                                <Eye className="w-4 h-4 ml-2" />
                                عرض التفاصيل
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openModal('note', deal)}>
                                <MessageSquare className="w-4 h-4 ml-2" />
                                إضافة ملاحظة
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStageClick(deal, 'meeting_scheduled' as DealStage)}>
                                <Calendar className="w-4 h-4 ml-2" />
                                جدولة اجتماع
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStageClick(deal, 'proposal_sent' as DealStage)}>
                                <FileText className="w-4 h-4 ml-2" />
                                إنشاء عرض سعر
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleStageClick(deal, 'rejected' as DealStage)}
                                className="text-red-600"
                              >
                                <XCircle className="w-4 h-4 ml-2" />
                                رفض الفرصة
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {deal.account && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="w-3 h-3" />
                            {deal.account.name}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(deal.expected_value)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {deal.probability}%
                          </Badge>
                        </div>

                        {deal.next_step && (
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            الخطوة التالية: {deal.next_step}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(deal.updated_at), { 
                            addSuffix: true, 
                            locale: ar 
                          })}
                        </div>

                        {/* Quick Stage Actions */}
                        <div className="flex gap-1 pt-2 border-t">
                          {Object.entries(dealStages)
                            .filter(([key]) => {
                              // Show next logical stages
                              const currentOrder = dealStages[deal.stage as DealStage]?.order || 0;
                              const targetOrder = dealStages[key as DealStage]?.order || 0;
                              return key !== deal.stage && key !== 'rejected' && targetOrder > currentOrder && targetOrder <= currentOrder + 2;
                            })
                            .slice(0, 2)
                            .map(([key, config]) => (
                              <Button
                                key={key}
                                size="sm"
                                variant="ghost"
                                className={`flex-1 text-xs h-7 ${config.color}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStageClick(deal, key as DealStage);
                                }}
                                title={config.label}
                              >
                                <config.icon className="w-3 h-3" />
                              </Button>
                            ))}
                          {deal.stage !== 'approved' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 text-xs h-7 text-green-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStageClick(deal, 'approved' as DealStage);
                              }}
                              title="اعتماد"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {stageDeals.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    لا توجد فرص
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rejected Deals Summary */}
      {deals.filter(d => d.stage === 'rejected').length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="w-4 h-4" />
              <span>الفرص المرفوضة:</span>
              <Badge variant="destructive">
                {deals.filter(d => d.stage === 'rejected').length}
              </Badge>
              <span className="text-sm">
                ({formatCurrency(deals.filter(d => d.stage === 'rejected').reduce((s, d) => s + d.expected_value, 0))})
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {selectedDeal && (
        <>
          <AddNoteModal
            open={activeModal === 'note'}
            onOpenChange={(open) => !open && closeModal()}
            dealId={selectedDeal.id}
            dealName={selectedDeal.name}
            onSuccess={fetchDeals}
          />

          <ScheduleMeetingModal
            open={activeModal === 'schedule_meeting'}
            onOpenChange={(open) => !open && closeModal()}
            dealId={selectedDeal.id}
            dealName={selectedDeal.name}
            currentStage={selectedDeal.stage}
            onSuccess={fetchDeals}
          />

          <MeetingReportModal
            open={activeModal === 'meeting_report'}
            onOpenChange={(open) => !open && closeModal()}
            dealId={selectedDeal.id}
            dealName={selectedDeal.name}
            currentStage={selectedDeal.stage}
            onSuccess={fetchDeals}
          />

          <AdvancedQuoteModal
            open={activeModal === 'create_quote'}
            onOpenChange={(open) => !open && closeModal()}
            accountId={selectedDeal.account_id || ''}
            accountName={selectedDeal.account?.name || selectedDeal.name}
            dealId={selectedDeal.id}
            dealName={selectedDeal.name}
            currentStage={selectedDeal.stage}
            currentValue={selectedDeal.expected_value}
            onSuccess={fetchDeals}
          />

          <RejectionModal
            open={activeModal === 'rejection'}
            onOpenChange={(open) => !open && closeModal()}
            dealId={selectedDeal.id}
            dealName={selectedDeal.name}
            dealValue={selectedDeal.expected_value}
            currentStage={selectedDeal.stage}
            onSuccess={fetchDeals}
          />

          {targetStage && activeModal === 'stage_note' && (
            <StageNoteModal
              open={true}
              onOpenChange={(open) => !open && closeModal()}
              dealId={selectedDeal.id}
              dealName={selectedDeal.name}
              currentStage={selectedDeal.stage}
              targetStage={targetStage}
              onSuccess={fetchDeals}
            />
          )}

          {/* Approval Confirmation */}
          {activeModal === 'approval' && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold">اعتماد الفرصة</h3>
                    <p className="text-muted-foreground">
                      سيتم اعتماد "{selectedDeal.name}" وإنشاء ملف عميل رسمي
                    </p>
                    <div className="flex gap-2 justify-center pt-4">
                      <Button variant="outline" onClick={closeModal}>
                        إلغاء
                      </Button>
                      <Button onClick={handleApproval} className="bg-green-600 hover:bg-green-700">
                        تأكيد الاعتماد
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
