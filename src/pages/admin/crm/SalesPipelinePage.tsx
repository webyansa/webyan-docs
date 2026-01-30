import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  User,
  Building2,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { OpportunityForm } from '@/components/crm/forms/OpportunityForm';
import { StageChangeModal } from '@/components/crm/pipeline/StageChangeModal';
import { opportunityStages, OpportunityStage } from '@/lib/crm/pipelineConfig';

interface Opportunity {
  id: string;
  name: string;
  expected_value: number;
  probability: number;
  stage: string;
  status: string;
  expected_close_date: string | null;
  next_step: string | null;
  created_at: string;
  updated_at: string;
  account: { id: string; name: string } | null;
  owner: { full_name: string } | null;
}

export default function SalesPipelinePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [targetStage, setTargetStage] = useState<OpportunityStage | null>(null);
  const [staff, setStaff] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    fetchOpportunities();
    fetchStaff();
  }, []);

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_opportunities')
        .select(`
          *,
          account:client_organizations!crm_opportunities_account_id_fkey(id, name),
          owner:staff_members!crm_opportunities_owner_id_fkey(full_name)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      toast.error('حدث خطأ في تحميل الفرص');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('staff_members')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name');
    setStaff(data || []);
  };

  const handleStageChange = (opportunity: Opportunity, newStage: OpportunityStage) => {
    setSelectedOpportunity(opportunity);
    setTargetStage(newStage);
    setShowStageModal(true);
  };

  const handleStageConfirm = async (reason: string, nextStep: string) => {
    if (!selectedOpportunity || !targetStage) return;

    try {
      // Determine new status
      let newStatus = 'open';
      if (targetStage === 'closed_won') newStatus = 'won';
      if (targetStage === 'closed_lost') newStatus = 'lost';

      // Update opportunity
      const { error: updateError } = await supabase
        .from('crm_opportunities')
        .update({
          stage: targetStage,
          status: newStatus,
          stage_changed_at: new Date().toISOString(),
          stage_change_reason: reason,
          next_step: nextStep || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOpportunity.id);

      if (updateError) throw updateError;

      // Log stage transition
      await supabase.from('crm_stage_transitions').insert({
        entity_type: 'opportunity',
        entity_id: selectedOpportunity.id,
        pipeline_type: 'sales',
        from_stage: selectedOpportunity.stage,
        to_stage: targetStage,
        reason,
        notes: nextStep,
      });

      toast.success('تم تغيير المرحلة بنجاح');
      fetchOpportunities();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('حدث خطأ أثناء تغيير المرحلة');
    } finally {
      setShowStageModal(false);
      setSelectedOpportunity(null);
      setTargetStage(null);
    }
  };

  // Filter opportunities
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch = 
      opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.account?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOwner = filterOwner === 'all' || opp.owner?.full_name === filterOwner;
    return matchesSearch && matchesOwner;
  });

  // Group by stage
  const stages = Object.entries(opportunityStages).filter(
    ([key]) => key !== 'closed_lost'
  );

  const getOpportunitiesForStage = (stage: string) => {
    return filteredOpportunities.filter((opp) => opp.stage === stage);
  };

  const calculateStageTotal = (stage: string) => {
    return getOpportunitiesForStage(stage).reduce(
      (sum, opp) => sum + Number(opp.expected_value),
      0
    );
  };

  // Calculate totals
  const totalPipelineValue = filteredOpportunities.reduce(
    (sum, opp) => sum + Number(opp.expected_value),
    0
  );
  const weightedValue = filteredOpportunities.reduce(
    (sum, opp) => sum + (Number(opp.expected_value) * opp.probability) / 100,
    0
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Pipeline المبيعات
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة فرص البيع ومتابعة التقدم
          </p>
        </div>
        <Button onClick={() => setShowOpportunityForm(true)}>
          <Plus className="h-4 w-4 ml-2" />
          فرصة جديدة
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الفرص</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredOpportunities.length}</div>
            <p className="text-xs text-muted-foreground">فرصة مفتوحة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيمة Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPipelineValue.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">إجمالي القيمة المتوقعة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القيمة المرجحة</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(weightedValue).toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">حسب الاحتمالية</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط حجم الصفقة</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredOpportunities.length > 0
                ? Math.round(totalPipelineValue / filteredOpportunities.length).toLocaleString()
                : 0} ر.س
            </div>
            <p className="text-xs text-muted-foreground">لكل فرصة</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في الفرص..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={filterOwner} onValueChange={setFilterOwner}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 ml-2" />
            <SelectValue placeholder="المسؤول" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المسؤولين</SelectItem>
            {staff.map((member) => (
              <SelectItem key={member.id} value={member.full_name}>
                {member.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.map(([stageKey, stageConfig]) => {
            const stageOpportunities = getOpportunitiesForStage(stageKey);
            const stageTotal = calculateStageTotal(stageKey);
            const StageIcon = stageConfig.icon;

            return (
              <div
                key={stageKey}
                className="w-80 flex-shrink-0 bg-muted/30 rounded-lg p-3"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <StageIcon className={`h-5 w-5 ${stageConfig.color}`} />
                    <span className="font-medium">{stageConfig.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {stageOpportunities.length}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {stageTotal.toLocaleString()} ر.س
                </p>

                {/* Opportunities */}
                <div className="space-y-3">
                  {stageOpportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className="bg-background rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Link
                          to={`/admin/clients/${opp.account?.id}`}
                          className="font-medium hover:text-primary transition-colors line-clamp-1"
                        >
                          {opp.name}
                        </Link>
                      </div>

                      {opp.account && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{opp.account.name}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="flex items-center gap-1 font-medium">
                          <DollarSign className="h-3 w-3" />
                          {Number(opp.expected_value).toLocaleString()} ر.س
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {opp.probability}%
                        </Badge>
                      </div>

                      {opp.expected_close_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(opp.expected_close_date), 'dd MMM yyyy', { locale: ar })}
                        </div>
                      )}

                      {opp.next_step && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 mb-2">
                          ⏭ {opp.next_step}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {opp.owner && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {opp.owner.full_name}
                          </span>
                        )}
                        <span>
                          {formatDistanceToNow(parseISO(opp.updated_at), { locale: ar, addSuffix: true })}
                        </span>
                      </div>

                      {/* Stage Change Buttons */}
                      <div className="flex gap-1 mt-3 pt-2 border-t">
                        {stageKey !== 'closed_won' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 text-xs h-7"
                            onClick={() => {
                              const stageKeys = Object.keys(opportunityStages);
                              const currentIndex = stageKeys.indexOf(stageKey);
                              const nextStage = stageKeys[currentIndex + 1] as OpportunityStage;
                              if (nextStage) handleStageChange(opp, nextStage);
                            }}
                          >
                            <ArrowLeft className="h-3 w-3 ml-1" />
                            تقدم
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {stageOpportunities.length === 0 && (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      لا توجد فرص في هذه المرحلة
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forms */}
      <OpportunityForm
        open={showOpportunityForm}
        onClose={() => setShowOpportunityForm(false)}
        onSuccess={() => {
          setShowOpportunityForm(false);
          fetchOpportunities();
        }}
      />

      {showStageModal && selectedOpportunity && targetStage && (
        <StageChangeModal
          open={showStageModal}
          onClose={() => {
            setShowStageModal(false);
            setSelectedOpportunity(null);
            setTargetStage(null);
          }}
          itemName={selectedOpportunity.name}
          fromStage={opportunityStages[selectedOpportunity.stage as OpportunityStage]?.label || selectedOpportunity.stage}
          toStage={opportunityStages[targetStage]?.label || targetStage}
          onConfirm={handleStageConfirm}
        />
      )}
          toStage={opportunityStages[targetStage]?.label || targetStage}
          onConfirm={handleStageConfirm}
        />
      )}
    </div>
  );
}
