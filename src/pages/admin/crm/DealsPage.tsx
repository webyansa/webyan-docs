import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  DollarSign,
  Calendar,
  Building2,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Target
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { dealStages, DealStage, serviceTypes, formatCurrency } from '@/lib/crm/pipelineConfig';

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
  account?: { id: string; name: string } | null;
  owner?: { full_name: string } | null;
}

export default function DealsPage() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  
  // Stage change modal
  const [showStageModal, setShowStageModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [targetStage, setTargetStage] = useState<DealStage | null>(null);
  const [stageReason, setStageReason] = useState('');
  const [changingStage, setChangingStage] = useState(false);
  
  // Approval modal - shown when moving to "approved"
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
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
  };

  const handleStageClick = (deal: Deal, newStage: DealStage) => {
    if (deal.stage === newStage) return;
    
    setSelectedDeal(deal);
    setTargetStage(newStage);
    setStageReason('');
    
    // If moving to approved, show approval modal instead
    if (newStage === 'approved') {
      setShowApprovalModal(true);
    } else {
      setShowStageModal(true);
    }
  };

  const handleStageChange = async () => {
    if (!selectedDeal || !targetStage || !stageReason.trim()) {
      toast.error('يرجى إدخال سبب التغيير');
      return;
    }

    setChangingStage(true);
    try {
      // Determine new status
      let newStatus = 'open';
      let newProbability = dealStages[targetStage]?.probability || 50;
      
      if (targetStage === 'approved') {
        newStatus = 'won';
        newProbability = 100;
      } else if (targetStage === 'rejected') {
        newStatus = 'lost';
        newProbability = 0;
      }

      // Update deal
      const { error } = await supabase
        .from('crm_opportunities')
        .update({
          stage: targetStage,
          status: newStatus,
          probability: newProbability,
          stage_changed_at: new Date().toISOString(),
          stage_change_reason: stageReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedDeal.id);

      if (error) throw error;

      // Log stage transition
      await supabase.from('crm_stage_transitions').insert({
        entity_type: 'opportunity',
        entity_id: selectedDeal.id,
        pipeline_type: 'deals',
        from_stage: selectedDeal.stage,
        to_stage: targetStage,
        reason: stageReason,
      });

      toast.success('تم تحديث مرحلة الفرصة بنجاح');
      setShowStageModal(false);
      setSelectedDeal(null);
      setTargetStage(null);
      setStageReason('');
      fetchDeals();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('حدث خطأ أثناء تحديث المرحلة');
    } finally {
      setChangingStage(false);
    }
  };

  const handleApproval = async () => {
    if (!selectedDeal || !stageReason.trim()) {
      toast.error('يرجى إدخال سبب الاعتماد');
      return;
    }

    setApproving(true);
    try {
      // Update deal to approved
      const { error: dealError } = await supabase
        .from('crm_opportunities')
        .update({
          stage: 'approved',
          status: 'won',
          probability: 100,
          stage_changed_at: new Date().toISOString(),
          stage_change_reason: stageReason,
          actual_close_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedDeal.id);

      if (dealError) throw dealError;

      // Create new client organization from deal
      const { data: newOrg, error: orgError } = await supabase
        .from('client_organizations')
        .insert({
          name: selectedDeal.name.replace('فرصة - ', ''),
          contact_email: 'pending@update.com', // Will be updated
          customer_type: selectedDeal.opportunity_type === 'custom_platform' ? 'custom_project' : 'subscription',
          subscription_status: 'active',
          lifecycle_stage: 'new',
          total_contract_value: selectedDeal.expected_value,
        } as any) // Type assertion for flexibility
        .select()
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        // Don't fail the whole operation if org creation fails
      } else if (newOrg) {
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

      // Log stage transition
      await supabase.from('crm_stage_transitions').insert({
        entity_type: 'opportunity',
        entity_id: selectedDeal.id,
        pipeline_type: 'deals',
        from_stage: selectedDeal.stage,
        to_stage: 'approved',
        reason: stageReason,
      });

      toast.success(
        <div className="flex flex-col gap-1">
          <span>تم اعتماد الفرصة وإنشاء ملف العميل بنجاح</span>
          {newOrg && (
            <Button 
              size="sm" 
              variant="link" 
              className="p-0 h-auto text-primary-foreground underline"
              onClick={() => navigate(`/admin/clients/${newOrg.id}`)}
            >
              فتح ملف العميل
            </Button>
          )}
        </div>
      );

      setShowApprovalModal(false);
      setSelectedDeal(null);
      setTargetStage(null);
      setStageReason('');
      fetchDeals();
    } catch (error) {
      console.error('Error approving deal:', error);
      toast.error('حدث خطأ أثناء اعتماد الفرصة');
    } finally {
      setApproving(false);
    }
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = deal.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesService = serviceFilter === 'all' || deal.opportunity_type === serviceFilter;
    return matchesSearch && matchesService;
  });

  const getStageDeals = (stage: DealStage) => {
    return filteredDeals.filter(deal => deal.stage === stage && deal.status !== 'lost');
  };

  const getStageTotal = (stage: DealStage) => {
    return getStageDeals(stage).reduce((sum, deal) => sum + (deal.expected_value || 0), 0);
  };

  // Only show active stages in Kanban (not rejected)
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
          <p className="text-muted-foreground">إدارة فرص البيع ومتابعتها حتى الاعتماد</p>
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
                <SelectItem value="new_business">عميل جديد</SelectItem>
                <SelectItem value="upsell">ترقية</SelectItem>
                <SelectItem value="renewal">تجديد</SelectItem>
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
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/admin/clients/${deal.account?.id}`)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="font-medium text-sm truncate">
                          {deal.name}
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

                        {deal.expected_close_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(deal.expected_close_date), 'dd MMM', { locale: ar })}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(deal.updated_at), { 
                            addSuffix: true, 
                            locale: ar 
                          })}
                        </div>

                        {/* Stage Actions */}
                        <div className="flex gap-1 pt-2 border-t">
                          {Object.entries(dealStages)
                            .filter(([key]) => key !== stageKey && key !== 'rejected')
                            .slice(0, 3)
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
                              >
                                <config.icon className="w-3 h-3" />
                              </Button>
                            ))}
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

      {/* Lost Deals Summary */}
      {deals.filter(d => d.status === 'lost').length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-red-700">
              <span>الفرص المرفوضة:</span>
              <Badge variant="destructive">
                {deals.filter(d => d.status === 'lost').length}
              </Badge>
              <span className="text-sm">
                ({formatCurrency(deals.filter(d => d.status === 'lost').reduce((s, d) => s + d.expected_value, 0))})
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage Change Modal */}
      <Dialog open={showStageModal} onOpenChange={setShowStageModal}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              تغيير مرحلة الفرصة
            </DialogTitle>
            <DialogDescription>
              {selectedDeal?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Stage Transition Visual */}
            <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className={`px-3 py-2 rounded-md ${dealStages[selectedDeal?.stage as DealStage]?.bgColor || 'bg-gray-100'}`}>
                <span className={`text-sm font-medium ${dealStages[selectedDeal?.stage as DealStage]?.color || ''}`}>
                  {dealStages[selectedDeal?.stage as DealStage]?.label || selectedDeal?.stage}
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              <div className={`px-3 py-2 rounded-md ${targetStage ? dealStages[targetStage]?.bgColor : 'bg-gray-100'}`}>
                <span className={`text-sm font-medium ${targetStage ? dealStages[targetStage]?.color : ''}`}>
                  {targetStage ? dealStages[targetStage]?.label : ''}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">سبب التغيير *</Label>
              <Textarea
                id="reason"
                value={stageReason}
                onChange={(e) => setStageReason(e.target.value)}
                placeholder="اكتب سبب نقل الفرصة إلى هذه المرحلة..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowStageModal(false)} disabled={changingStage}>
              إلغاء
            </Button>
            <Button onClick={handleStageChange} disabled={changingStage || !stageReason.trim()}>
              {changingStage ? 'جاري الحفظ...' : 'تأكيد التغيير'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              اعتماد الفرصة وإنشاء ملف العميل
            </DialogTitle>
            <DialogDescription>
              سيتم اعتماد "{selectedDeal?.name}" وإنشاء ملف عميل رسمي جديد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                <Target className="w-4 h-4" />
                ما سيحدث عند الاعتماد:
              </div>
              <ul className="text-sm text-green-600 space-y-1 mr-6 list-disc">
                <li>تحديث حالة الفرصة إلى "معتمد"</li>
                <li>إنشاء ملف عميل رسمي جديد</li>
                <li>ربط الفرصة بملف العميل</li>
                <li>تسجيل الحدث في سجل النشاط</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approval_reason">سبب الاعتماد *</Label>
              <Textarea
                id="approval_reason"
                value={stageReason}
                onChange={(e) => setStageReason(e.target.value)}
                placeholder="مثال: العميل وافق على العرض ووقع العقد"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowApprovalModal(false)} disabled={approving}>
              إلغاء
            </Button>
            <Button 
              onClick={handleApproval} 
              disabled={approving || !stageReason.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {approving ? 'جاري الاعتماد...' : 'اعتماد وإنشاء العميل'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
