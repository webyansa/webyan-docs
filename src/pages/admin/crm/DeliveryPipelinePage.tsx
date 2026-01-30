import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Rocket, 
  Search, 
  Calendar,
  User,
  Building2,
  ArrowLeft,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { StageChangeModal } from '@/components/crm/pipeline/StageChangeModal';
import { implementationStages, ImplementationStage } from '@/lib/crm/pipelineConfig';

interface Implementation {
  id: string;
  project_name: string;
  description: string | null;
  project_type: string;
  stage: string;
  status: string;
  progress_percentage: number;
  planned_start_date: string | null;
  actual_start_date: string | null;
  planned_end_date: string | null;
  actual_end_date: string | null;
  go_live_date: string | null;
  created_at: string;
  updated_at: string;
  account: { id: string; name: string } | null;
  implementer: { full_name: string } | null;
  project_manager: { full_name: string } | null;
}

export default function DeliveryPipelinePage() {
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterImplementer, setFilterImplementer] = useState<string>('all');
  const [showStageModal, setShowStageModal] = useState(false);
  const [selectedImplementation, setSelectedImplementation] = useState<Implementation | null>(null);
  const [targetStage, setTargetStage] = useState<ImplementationStage | null>(null);
  const [staff, setStaff] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    fetchImplementations();
    fetchStaff();
  }, []);

  const fetchImplementations = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_implementations')
        .select(`
          *,
          account:client_organizations!crm_implementations_account_id_fkey(id, name),
          implementer:staff_members!crm_implementations_implementer_id_fkey(full_name),
          project_manager:staff_members!crm_implementations_project_manager_id_fkey(full_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImplementations(data || []);
    } catch (error) {
      console.error('Error fetching implementations:', error);
      toast.error('حدث خطأ في تحميل المشاريع');
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

  const handleStageChange = (impl: Implementation, newStage: ImplementationStage) => {
    setSelectedImplementation(impl);
    setTargetStage(newStage);
    setShowStageModal(true);
  };

  const handleStageConfirm = async (reason: string, notes: string) => {
    if (!selectedImplementation || !targetStage) return;

    try {
      const stageConfig = implementationStages[targetStage];
      let newStatus = 'active';
      if (targetStage === 'completed') newStatus = 'completed';

      // Update implementation
      const { error: updateError } = await supabase
        .from('crm_implementations')
        .update({
          stage: targetStage,
          status: newStatus,
          stage_changed_at: new Date().toISOString(),
          stage_change_reason: reason,
          progress_percentage: stageConfig.defaultProgress,
          updated_at: new Date().toISOString(),
          ...(targetStage === 'go_live' && { go_live_date: new Date().toISOString().split('T')[0] }),
          ...(targetStage === 'completed' && { actual_end_date: new Date().toISOString().split('T')[0] }),
        })
        .eq('id', selectedImplementation.id);

      if (updateError) throw updateError;

      // Log stage transition
      await supabase.from('crm_stage_transitions').insert({
        entity_type: 'implementation',
        entity_id: selectedImplementation.id,
        pipeline_type: 'delivery',
        from_stage: selectedImplementation.stage,
        to_stage: targetStage,
        reason,
        notes,
      });

      toast.success('تم تغيير المرحلة بنجاح');
      fetchImplementations();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('حدث خطأ أثناء تغيير المرحلة');
    } finally {
      setShowStageModal(false);
      setSelectedImplementation(null);
      setTargetStage(null);
    }
  };

  const getDeliveryStatus = (impl: Implementation) => {
    if (!impl.planned_end_date) return null;
    
    const today = new Date();
    const endDate = parseISO(impl.planned_end_date);
    const daysRemaining = differenceInDays(endDate, today);

    if (impl.status === 'completed') {
      return { color: 'text-green-500', bgColor: 'bg-green-500/10', label: 'مكتمل', icon: CheckCircle };
    }
    if (daysRemaining < 0) {
      return { color: 'text-red-500', bgColor: 'bg-red-500/10', label: `متأخر ${Math.abs(daysRemaining)} يوم`, icon: AlertCircle };
    }
    if (daysRemaining <= 7) {
      return { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', label: `${daysRemaining} يوم متبقي`, icon: Clock };
    }
    return { color: 'text-green-500', bgColor: 'bg-green-500/10', label: `${daysRemaining} يوم متبقي`, icon: Clock };
  };

  // Filter implementations
  const filteredImplementations = implementations.filter((impl) => {
    const matchesSearch = 
      impl.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      impl.account?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesImplementer = filterImplementer === 'all' || impl.implementer?.full_name === filterImplementer;
    return matchesSearch && matchesImplementer;
  });

  // Group by stage (only show active stages)
  const stages = Object.entries(implementationStages).filter(
    ([key]) => key !== 'completed'
  );

  const getImplementationsForStage = (stage: string) => {
    return filteredImplementations.filter((impl) => impl.stage === stage);
  };

  // Calculate stats
  const totalProjects = filteredImplementations.length;
  const overdueProjects = filteredImplementations.filter((impl) => {
    if (!impl.planned_end_date) return false;
    return differenceInDays(parseISO(impl.planned_end_date), new Date()) < 0;
  }).length;
  const avgProgress = totalProjects > 0
    ? Math.round(filteredImplementations.reduce((sum, impl) => sum + impl.progress_percentage, 0) / totalProjects)
    : 0;

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
            <Rocket className="h-6 w-6 text-primary" />
            Pipeline التنفيذ
          </h1>
          <p className="text-muted-foreground mt-1">
            متابعة مشاريع التنفيذ والتسليم
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المشاريع النشطة</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">مشروع قيد التنفيذ</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط التقدم</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProgress}%</div>
            <Progress value={avgProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المشاريع المتأخرة</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{overdueProjects}</div>
            <p className="text-xs text-muted-foreground">تجاوزت الموعد المحدد</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في مرحلة الإطلاق</CardTitle>
            <Rocket className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {getImplementationsForStage('go_live').length + getImplementationsForStage('handover').length}
            </div>
            <p className="text-xs text-muted-foreground">جاهزة للتسليم</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في المشاريع..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={filterImplementer} onValueChange={setFilterImplementer}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 ml-2" />
            <SelectValue placeholder="المنفذ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المنفذين</SelectItem>
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
            const stageImplementations = getImplementationsForStage(stageKey);
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
                      {stageImplementations.length}
                    </Badge>
                  </div>
                </div>

                {/* Implementations */}
                <div className="space-y-3">
                  {stageImplementations.map((impl) => {
                    const deliveryStatus = getDeliveryStatus(impl);

                    return (
                      <div
                        key={impl.id}
                        className="bg-background rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Link
                            to={`/admin/clients/${impl.account?.id}`}
                            className="font-medium hover:text-primary transition-colors line-clamp-1"
                          >
                            {impl.project_name}
                          </Link>
                        </div>

                        {impl.account && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{impl.account.name}</span>
                          </div>
                        )}

                        {/* Progress */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>التقدم</span>
                            <span className="font-medium">{impl.progress_percentage}%</span>
                          </div>
                          <Progress value={impl.progress_percentage} className="h-2" />
                        </div>

                        {/* Delivery Status */}
                        {deliveryStatus && (
                          <div className={`flex items-center gap-1 text-xs ${deliveryStatus.color} ${deliveryStatus.bgColor} rounded px-2 py-1 mb-2`}>
                            <deliveryStatus.icon className="h-3 w-3" />
                            {deliveryStatus.label}
                          </div>
                        )}

                        {impl.planned_end_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <Calendar className="h-3 w-3" />
                            التسليم: {format(parseISO(impl.planned_end_date), 'dd MMM yyyy', { locale: ar })}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          {impl.implementer && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {impl.implementer.full_name}
                            </span>
                          )}
                          <span>
                            {formatDistanceToNow(parseISO(impl.updated_at), { locale: ar, addSuffix: true })}
                          </span>
                        </div>

                        {/* Stage Change Buttons */}
                        <div className="flex gap-1 mt-3 pt-2 border-t">
                          {stageKey !== 'handover' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 text-xs h-7"
                              onClick={() => {
                                const stageKeys = Object.keys(implementationStages);
                                const currentIndex = stageKeys.indexOf(stageKey);
                                const nextStage = stageKeys[currentIndex + 1] as ImplementationStage;
                                if (nextStage) handleStageChange(impl, nextStage);
                              }}
                            >
                              <ArrowLeft className="h-3 w-3 ml-1" />
                              تقدم
                            </Button>
                          )}
                          {stageKey === 'handover' && (
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 text-xs h-7"
                              onClick={() => handleStageChange(impl, 'completed')}
                            >
                              <CheckCircle className="h-3 w-3 ml-1" />
                              إكمال
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {stageImplementations.length === 0 && (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      لا توجد مشاريع في هذه المرحلة
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Change Modal */}
      {showStageModal && selectedImplementation && targetStage && (
        <StageChangeModal
          open={showStageModal}
          onClose={() => {
            setShowStageModal(false);
            setSelectedImplementation(null);
            setTargetStage(null);
          }}
          itemName={selectedImplementation.project_name}
          fromStage={implementationStages[selectedImplementation.stage as ImplementationStage]?.label || selectedImplementation.stage}
          toStage={implementationStages[targetStage]?.label || targetStage}
          onConfirm={handleStageConfirm}
        />
      )}
    </div>
  );
}
