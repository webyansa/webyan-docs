import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Rocket, 
  Calendar, 
  User, 
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { implementationStages } from '@/lib/crm/pipelineConfig';
import { CustomerNotesSection } from '../CustomerNotesSection';

interface DeliveryTabProps {
  organizationId: string;
}

interface Implementation {
  id: string;
  project_name: string;
  description: string | null;
  project_type: string;
  stage: string;
  progress_percentage: number;
  status: string;
  planned_start_date: string | null;
  actual_start_date: string | null;
  planned_end_date: string | null;
  actual_end_date: string | null;
  go_live_date: string | null;
  notes: string | null;
  implementer?: { full_name: string } | null;
  project_manager?: { full_name: string } | null;
  csm?: { full_name: string } | null;
}

export function DeliveryTab({ organizationId }: DeliveryTabProps) {
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImplementations();
  }, [organizationId]);

  const fetchImplementations = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_implementations')
        .select(`
          *,
          implementer:staff_members!crm_implementations_implementer_id_fkey(full_name),
          project_manager:staff_members!crm_implementations_project_manager_id_fkey(full_name),
          csm:staff_members!crm_implementations_csm_id_fkey(full_name)
        `)
        .eq('account_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImplementations(data || []);
    } catch (error) {
      console.error('Error fetching implementations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageInfo = (stage: string) => {
    const stageData = implementationStages[stage as keyof typeof implementationStages];
    return stageData ? { ...stageData, id: stage } : { id: stage, label: stage, color: '#6b7280', icon: Clock };
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'قيد التنفيذ', variant: 'default' },
      on_hold: { label: 'متوقف', variant: 'outline' },
      completed: { label: 'مكتمل', variant: 'secondary' },
      cancelled: { label: 'ملغي', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDeliveryStatus = (implementation: Implementation) => {
    if (!implementation.planned_end_date) return null;
    
    const today = new Date();
    const endDate = parseISO(implementation.planned_end_date);
    const daysRemaining = differenceInDays(endDate, today);

    if (implementation.status === 'completed') {
      return { color: 'text-green-500', label: 'مكتمل', icon: CheckCircle };
    }
    if (daysRemaining < 0) {
      return { color: 'text-red-500', label: `متأخر ${Math.abs(daysRemaining)} يوم`, icon: AlertCircle };
    }
    if (daysRemaining <= 7) {
      return { color: 'text-yellow-500', label: `${daysRemaining} يوم متبقي`, icon: Clock };
    }
    return { color: 'text-green-500', label: `${daysRemaining} يوم متبقي`, icon: Clock };
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            مشاريع التنفيذ ({implementations.length})
          </CardTitle>
          <Button size="sm" onClick={() => toast.info('سيتم إضافة هذه الميزة قريباً')}>
            <Plus className="h-4 w-4 ml-2" />
            مشروع جديد
          </Button>
        </CardHeader>
        <CardContent>
          {implementations.length === 0 ? (
            <div className="text-center py-8">
              <Rocket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد مشاريع تنفيذ بعد</p>
              <p className="text-sm text-muted-foreground mt-1">
                ستظهر مشاريع التنفيذ هنا عند إنشائها من فرص البيع
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {implementations.map((impl) => {
                const stageInfo = getStageInfo(impl.stage);
                const StageIcon = stageInfo.icon;
                const deliveryStatus = getDeliveryStatus(impl);

                return (
                  <div key={impl.id} className="border rounded-lg p-4 space-y-4 hover:bg-muted/50 transition-colors">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{impl.project_name}</h4>
                          {getStatusBadge(impl.status)}
                        </div>
                        {impl.description && (
                          <p className="text-sm text-muted-foreground">{impl.description}</p>
                        )}
                      </div>
                      <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <StageIcon className="h-4 w-4" style={{ color: stageInfo.color }} />
                          <span>{stageInfo.label}</span>
                        </div>
                        <span className="font-medium">{impl.progress_percentage}%</span>
                      </div>
                      <Progress value={impl.progress_percentage} className="h-2" />
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {impl.implementer && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{impl.implementer.full_name}</span>
                        </div>
                      )}

                      {impl.planned_end_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{format(parseISO(impl.planned_end_date), 'dd MMM yyyy', { locale: ar })}</span>
                        </div>
                      )}

                      {deliveryStatus && (
                        <div className={`flex items-center gap-2 ${deliveryStatus.color}`}>
                          <deliveryStatus.icon className="h-4 w-4" />
                          <span>{deliveryStatus.label}</span>
                        </div>
                      )}

                      {impl.go_live_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Rocket className="h-4 w-4" />
                          <span>الإطلاق: {format(parseISO(impl.go_live_date), 'dd MMM', { locale: ar })}</span>
                        </div>
                      )}
                    </div>

                    {/* Team */}
                    {(impl.project_manager || impl.csm) && (
                      <div className="flex items-center gap-4 pt-2 border-t text-sm text-muted-foreground">
                        {impl.project_manager && (
                          <span>مدير المشروع: {impl.project_manager.full_name}</span>
                        )}
                        {impl.csm && (
                          <span>مدير نجاح العميل: {impl.csm.full_name}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Notes */}
      <CustomerNotesSection 
        organizationId={organizationId} 
        noteType="delivery"
        title="ملاحظات التنفيذ"
      />
    </div>
  );
}
