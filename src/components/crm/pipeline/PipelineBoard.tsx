import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Filter, Search, User, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  opportunityStages, 
  OpportunityStage,
  formatCurrency 
} from '@/lib/crm/pipelineConfig';
import { StageChangeModal } from './StageChangeModal';
import { OpportunityForm } from '../forms/OpportunityForm';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Opportunity {
  id: string;
  name: string;
  account_id: string;
  expected_value: number;
  currency: string;
  probability: number;
  stage: string;
  status: string;
  expected_close_date: string | null;
  next_step: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  account?: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  owner?: {
    id: string;
    full_name: string;
  } | null;
}

interface PipelineBoardProps {
  onOpportunityClick?: (opportunity: Opportunity) => void;
}

export function PipelineBoard({ onOpportunityClick }: PipelineBoardProps) {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [stageChangeModal, setStageChangeModal] = useState<{
    open: boolean;
    opportunity: Opportunity | null;
    targetStage: OpportunityStage | null;
  }>({ open: false, opportunity: null, targetStage: null });
  const [draggedOpportunity, setDraggedOpportunity] = useState<Opportunity | null>(null);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_opportunities')
        .select(`
          *,
          account:client_organizations(id, name, logo_url),
          owner:staff_members(id, full_name)
        `)
        .neq('status', 'lost')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      toast.error('حدث خطأ أثناء تحميل الفرص');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleDragStart = (e: React.DragEvent, opportunity: Opportunity) => {
    setDraggedOpportunity(opportunity);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStage: OpportunityStage) => {
    e.preventDefault();
    if (!draggedOpportunity || draggedOpportunity.stage === targetStage) {
      setDraggedOpportunity(null);
      return;
    }

    // Open stage change modal
    setStageChangeModal({
      open: true,
      opportunity: draggedOpportunity,
      targetStage,
    });
    setDraggedOpportunity(null);
  };

  const handleStageChange = async (reason: string, nextStep: string) => {
    if (!stageChangeModal.opportunity || !stageChangeModal.targetStage) return;

    try {
      const { error } = await supabase
        .from('crm_opportunities')
        .update({
          stage: stageChangeModal.targetStage,
          stage_change_reason: reason,
          next_step: nextStep,
          stage_changed_at: new Date().toISOString(),
          status: stageChangeModal.targetStage === 'closed_won' ? 'won' : 
                  stageChangeModal.targetStage === 'closed_lost' ? 'lost' : 'open',
        })
        .eq('id', stageChangeModal.opportunity.id);

      if (error) throw error;

      toast.success('تم تحديث مرحلة الفرصة بنجاح');
      fetchOpportunities();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('حدث خطأ أثناء تحديث المرحلة');
    } finally {
      setStageChangeModal({ open: false, opportunity: null, targetStage: null });
    }
  };

  const filteredOpportunities = opportunities.filter(opp => 
    opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.account?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStageOpportunities = (stage: OpportunityStage) => {
    return filteredOpportunities.filter(opp => opp.stage === stage);
  };

  const getStageTotal = (stage: OpportunityStage) => {
    return getStageOpportunities(stage).reduce((sum, opp) => sum + (opp.expected_value || 0), 0);
  };

  const activeStages: OpportunityStage[] = ['qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث في الفرص..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 ml-2" />
          فرصة جديدة
        </Button>
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {activeStages.map((stage) => {
          const config = opportunityStages[stage];
          const stageOpps = getStageOpportunities(stage);
          const stageTotal = getStageTotal(stage);
          const Icon = config.icon;

          return (
            <div
              key={stage}
              className="flex-shrink-0 w-72"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <Card className="h-full">
                <CardHeader className={`py-3 px-4 ${config.bgColor} rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <CardTitle className={`text-sm font-medium ${config.color}`}>
                        {config.label}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stageOpps.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(stageTotal)}
                  </p>
                </CardHeader>
                <CardContent className="p-2 space-y-2 min-h-[200px] max-h-[60vh] overflow-y-auto">
                  {stageOpps.map((opp) => (
                    <div
                      key={opp.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, opp)}
                      onClick={() => onOpportunityClick ? onOpportunityClick(opp) : navigate(`/admin/clients/${opp.account_id}`)}
                      className="p-3 bg-card border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm line-clamp-1">
                          {opp.account?.name || 'غير محدد'}
                        </h4>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {opp.probability}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                        {opp.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        <span>{formatCurrency(opp.expected_value, opp.currency)}</span>
                      </div>
                      {opp.owner && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <User className="w-3 h-3" />
                          <span>{opp.owner.full_name}</span>
                        </div>
                      )}
                      {opp.next_step && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <ArrowRight className="w-3 h-3" />
                          <span className="line-clamp-1">{opp.next_step}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(opp.updated_at), { addSuffix: true, locale: ar })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {stageOpps.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      لا توجد فرص
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Lost Opportunities Summary */}
      <div className="text-sm text-muted-foreground">
        الفرص الخاسرة: {opportunities.filter(o => o.status === 'lost').length} (
        {formatCurrency(opportunities.filter(o => o.status === 'lost').reduce((s, o) => s + o.expected_value, 0))}
        )
      </div>

      {/* Stage Change Modal */}
      <StageChangeModal
        open={stageChangeModal.open}
        onClose={() => setStageChangeModal({ open: false, opportunity: null, targetStage: null })}
        onConfirm={handleStageChange}
        opportunityName={stageChangeModal.opportunity?.name || ''}
        fromStage={stageChangeModal.opportunity?.stage || 'qualification'}
        toStage={stageChangeModal.targetStage || 'qualification'}
      />

      {/* Opportunity Form */}
      <OpportunityForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false);
          fetchOpportunities();
        }}
      />
    </div>
  );
}
