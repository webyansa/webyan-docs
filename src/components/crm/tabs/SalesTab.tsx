import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  TrendingUp, 
  FileText, 
  FileSignature,
  ExternalLink,
  Calendar,
  DollarSign,
  ChevronLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { OpportunityForm } from '@/components/crm/forms/OpportunityForm';
import { opportunityStages } from '@/lib/crm/pipelineConfig';

interface SalesTabProps {
  organizationId: string;
  organizationName: string;
}

interface Opportunity {
  id: string;
  name: string;
  expected_value: number;
  probability: number;
  stage: string;
  status: string;
  expected_close_date: string | null;
  created_at: string;
  owner?: { full_name: string } | null;
}

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  total_amount: number;
  status: string;
  valid_until: string | null;
  created_at: string;
}

interface Contract {
  id: string;
  contract_number: string;
  title: string;
  contract_value: number;
  status: string;
  start_date: string;
  end_date: string;
}

export function SalesTab({ organizationId, organizationName }: SalesTabProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  useEffect(() => {
    fetchSalesData();
  }, [organizationId]);

  const fetchSalesData = async () => {
    try {
      const [opportunitiesRes, quotesRes, contractsRes] = await Promise.all([
        supabase
          .from('crm_opportunities')
          .select('*, owner:staff_members!crm_opportunities_owner_id_fkey(full_name)')
          .eq('account_id', organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('crm_quotes')
          .select('*')
          .eq('account_id', organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('crm_contracts')
          .select('*')
          .eq('account_id', organizationId)
          .order('created_at', { ascending: false }),
      ]);

      setOpportunities(opportunitiesRes.data || []);
      setQuotes(quotesRes.data || []);
      setContracts(contractsRes.data || []);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageInfo = (stage: string) => {
    const stageData = opportunityStages[stage as keyof typeof opportunityStages];
    return stageData ? { id: stage, label: stageData.label, color: stageData.color.replace('text-', '') } : { id: stage, label: stage, color: '#6b7280' };
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      open: { label: 'مفتوحة', variant: 'default' },
      won: { label: 'فوز', variant: 'secondary' },
      lost: { label: 'خسارة', variant: 'destructive' },
      draft: { label: 'مسودة', variant: 'outline' },
      sent: { label: 'مرسل', variant: 'default' },
      accepted: { label: 'مقبول', variant: 'secondary' },
      rejected: { label: 'مرفوض', variant: 'destructive' },
      expired: { label: 'منتهي', variant: 'outline' },
      active: { label: 'نشط', variant: 'secondary' },
      signed: { label: 'موقّع', variant: 'secondary' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleEditOpportunity = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setShowOpportunityForm(true);
  };

  const handleFormClose = () => {
    setShowOpportunityForm(false);
    setSelectedOpportunity(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    fetchSalesData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Opportunities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            فرص البيع ({opportunities.length})
          </CardTitle>
          <Button size="sm" onClick={() => setShowOpportunityForm(true)}>
            <Plus className="h-4 w-4 ml-2" />
            فرصة جديدة
          </Button>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">لا توجد فرص بيع بعد</p>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => {
                const stageInfo = getStageInfo(opp.stage);
                return (
                  <div 
                    key={opp.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleEditOpportunity(opp)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{opp.name}</span>
                        {getStatusBadge(opp.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {Number(opp.expected_value).toLocaleString()} ر.س
                        </span>
                        <Badge variant="outline" style={{ borderColor: stageInfo.color, color: stageInfo.color }}>
                          {stageInfo.label}
                        </Badge>
                        <span>{opp.probability}% احتمالية</span>
                        {opp.expected_close_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(opp.expected_close_date), 'dd MMM yyyy', { locale: ar })}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quotes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            عروض الأسعار ({quotes.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => toast.info('سيتم إضافة هذه الميزة قريباً')}>
            <Plus className="h-4 w-4 ml-2" />
            عرض جديد
          </Button>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">لا توجد عروض أسعار بعد</p>
          ) : (
            <div className="space-y-3">
              {quotes.map((quote) => (
                <div 
                  key={quote.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{quote.title}</span>
                      <Badge variant="outline">{quote.quote_number}</Badge>
                      {getStatusBadge(quote.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {Number(quote.total_amount).toLocaleString()} ر.س
                      </span>
                      {quote.valid_until && (
                        <span>صالح حتى: {format(parseISO(quote.valid_until), 'dd MMM yyyy', { locale: ar })}</span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contracts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            العقود ({contracts.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => toast.info('سيتم إضافة هذه الميزة قريباً')}>
            <Plus className="h-4 w-4 ml-2" />
            عقد جديد
          </Button>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">لا توجد عقود بعد</p>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => (
                <div 
                  key={contract.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{contract.title}</span>
                      <Badge variant="outline">{contract.contract_number}</Badge>
                      {getStatusBadge(contract.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {Number(contract.contract_value).toLocaleString()} ر.س
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(contract.start_date), 'dd MMM yyyy', { locale: ar })} - {format(parseISO(contract.end_date), 'dd MMM yyyy', { locale: ar })}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Opportunity Form Dialog */}
      <OpportunityForm
        open={showOpportunityForm}
        onClose={handleFormClose}
        accountId={organizationId}
        opportunity={selectedOpportunity ? {
          id: selectedOpportunity.id,
          name: selectedOpportunity.name,
          description: null,
          account_id: organizationId,
          opportunity_type: 'new_business',
          expected_value: selectedOpportunity.expected_value,
          currency: 'SAR',
          probability: selectedOpportunity.probability,
          stage: selectedOpportunity.stage as any,
          expected_close_date: selectedOpportunity.expected_close_date,
          next_step: null,
          owner_id: null,
        } : undefined}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
