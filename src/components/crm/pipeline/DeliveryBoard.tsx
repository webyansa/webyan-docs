import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, Filter, Search, User, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  implementationStages, 
  ImplementationStage,
  getImplementationStageLabel 
} from '@/lib/crm/pipelineConfig';
import { StageChangeModal } from './StageChangeModal';
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Implementation {
  id: string;
  project_name: string;
  account_id: string;
  stage: string;
  status: string;
  progress_percentage: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  implementer_id: string | null;
  project_manager_id: string | null;
  created_at: string;
  updated_at: string;
  account?: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  implementer?: {
    id: string;
    full_name: string;
  } | null;
}

interface DeliveryBoardProps {
  onProjectClick?: (project: Implementation) => void;
}

export function DeliveryBoard({ onProjectClick }: DeliveryBoardProps) {
  const navigate = useNavigate();
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageChangeModal, setStageChangeModal] = useState<{
    open: boolean;
    implementation: Implementation | null;
    targetStage: ImplementationStage | null;
  }>({ open: false, implementation: null, targetStage: null });
  const [draggedImplementation, setDraggedImplementation] = useState<Implementation | null>(null);

  const fetchImplementations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_implementations')
        .select(`
          *,
          account:client_organizations(id, name, logo_url),
          implementer:staff_members!crm_implementations_implementer_id_fkey(id, full_name)
        `)
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setImplementations(data || []);
    } catch (error) {
      console.error('Error fetching implementations:', error);
      toast.error('حدث خطأ أثناء تحميل المشاريع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImplementations();
  }, []);

  const handleDragStart = (e: React.DragEvent, implementation: Implementation) => {
    setDraggedImplementation(implementation);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStage: ImplementationStage) => {
    e.preventDefault();
    if (!draggedImplementation || draggedImplementation.stage === targetStage) {
      setDraggedImplementation(null);
      return;
    }

    setStageChangeModal({
      open: true,
      implementation: draggedImplementation,
      targetStage,
    });
    setDraggedImplementation(null);
  };

  const handleStageChange = async (reason: string, nextStep: string) => {
    if (!stageChangeModal.implementation || !stageChangeModal.targetStage) return;

    const targetConfig = implementationStages[stageChangeModal.targetStage];

    try {
      const { error } = await supabase
        .from('crm_implementations')
        .update({
          stage: stageChangeModal.targetStage,
          stage_change_reason: reason,
          stage_changed_at: new Date().toISOString(),
          progress_percentage: targetConfig.defaultProgress,
          status: stageChangeModal.targetStage === 'completed' ? 'completed' : 'active',
        })
        .eq('id', stageChangeModal.implementation.id);

      if (error) throw error;

      toast.success('تم تحديث مرحلة المشروع بنجاح');
      fetchImplementations();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('حدث خطأ أثناء تحديث المرحلة');
    } finally {
      setStageChangeModal({ open: false, implementation: null, targetStage: null });
    }
  };

  const filteredImplementations = implementations.filter(impl => 
    impl.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    impl.account?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStageImplementations = (stage: ImplementationStage) => {
    return filteredImplementations.filter(impl => impl.stage === stage);
  };

  const getDeadlineStatus = (endDate: string | null): 'on_time' | 'near' | 'overdue' => {
    if (!endDate) return 'on_time';
    const days = differenceInDays(new Date(endDate), new Date());
    if (days < 0) return 'overdue';
    if (days <= 7) return 'near';
    return 'on_time';
  };

  const activeStages: ImplementationStage[] = ['pending', 'kickoff', 'build', 'review', 'go_live', 'handover'];

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
              placeholder="بحث في المشاريع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          مشروع جديد
        </Button>
      </div>

      {/* Delivery Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {activeStages.map((stage) => {
          const config = implementationStages[stage];
          const stageProjects = getStageImplementations(stage);
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
                      {stageProjects.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-2 space-y-2 min-h-[200px] max-h-[60vh] overflow-y-auto">
                  {stageProjects.map((impl) => {
                    const deadlineStatus = getDeadlineStatus(impl.planned_end_date);
                    
                    return (
                      <div
                        key={impl.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, impl)}
                        onClick={() => onProjectClick ? onProjectClick(impl) : navigate(`/admin/clients/${impl.account_id}`)}
                        className="p-3 bg-card border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-sm line-clamp-1">
                            {impl.account?.name || 'غير محدد'}
                          </h4>
                          {deadlineStatus === 'overdue' && (
                            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                          )}
                          {deadlineStatus === 'near' && (
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                          {impl.project_name}
                        </p>
                        
                        {/* Progress */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">التقدم</span>
                            <span className="font-medium">{impl.progress_percentage}%</span>
                          </div>
                          <Progress value={impl.progress_percentage} className="h-1.5" />
                        </div>

                        {impl.implementer && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{impl.implementer.full_name}</span>
                          </div>
                        )}
                        
                        {impl.planned_end_date && (
                          <div className={`flex items-center gap-2 text-xs mt-1 ${
                            deadlineStatus === 'overdue' ? 'text-destructive' :
                            deadlineStatus === 'near' ? 'text-amber-600' :
                            'text-muted-foreground'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(impl.planned_end_date), 'dd/MM/yyyy')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {stageProjects.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      لا توجد مشاريع
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Stage Change Modal */}
      <StageChangeModal
        open={stageChangeModal.open}
        onClose={() => setStageChangeModal({ open: false, implementation: null, targetStage: null })}
        onConfirm={handleStageChange}
        itemName={stageChangeModal.implementation?.project_name || ''}
        fromStage={stageChangeModal.implementation?.stage || 'pending'}
        toStage={stageChangeModal.targetStage || 'pending'}
        pipelineType="implementation"
      />
    </div>
  );
}
