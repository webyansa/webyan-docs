import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Calendar, 
  ClipboardList, 
  FileText, 
  ArrowRight,
  XCircle,
  CheckCircle2,
  Plus,
  History,
  ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/crm/pipelineConfig';

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: any;
  performed_by_name: string | null;
  created_at: string;
}

interface OpportunityTimelineProps {
  opportunityId: string;
  maxHeight?: string;
}

const activityIcons: Record<string, { icon: any; color: string; bgColor: string }> = {
  note: { icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  meeting_scheduled: { icon: Calendar, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  meeting_report: { icon: ClipboardList, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  quote_sent: { icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  stage_change: { icon: ArrowRight, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  rejection: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  created: { icon: Plus, color: 'text-green-600', bgColor: 'bg-green-100' },
  approval: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100' },
};

export default function OpportunityTimeline({ opportunityId, maxHeight = '400px' }: OpportunityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (opportunityId) {
      fetchActivities();
    }
  }, [opportunityId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_opportunity_activities')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupActivitiesByDate = (activities: Activity[]) => {
    const groups: Record<string, Activity[]> = {};
    
    activities.forEach((activity) => {
      const date = new Date(activity.created_at);
      let dateKey: string;
      
      if (isToday(date)) {
        dateKey = 'اليوم';
      } else if (isYesterday(date)) {
        dateKey = 'أمس';
      } else {
        dateKey = format(date, 'd MMMM yyyy', { locale: ar });
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });
    
    return groups;
  };

  const renderActivityContent = (activity: Activity) => {
    const metadata = activity.metadata || {};
    
    switch (activity.activity_type) {
      case 'meeting_scheduled':
        return (
          <div className="text-xs text-muted-foreground space-y-1">
            {metadata.meeting_date && (
              <p>📅 {format(new Date(metadata.meeting_date), 'PPP p', { locale: ar })}</p>
            )}
            {metadata.meeting_type && (
              <p>نوع: {metadata.meeting_type === 'remote' ? 'عن بُعد' : metadata.meeting_type === 'in_person' ? 'حضوري' : 'مكالمة'}</p>
            )}
          </div>
        );
      
      case 'meeting_report':
        return (
          <div className="text-xs text-muted-foreground space-y-1">
            {metadata.attendees && <p>الحاضرون: {metadata.attendees}</p>}
            {metadata.result_label && (
              <Badge variant="outline" className="text-xs">
                {metadata.result_label}
              </Badge>
            )}
            {metadata.next_step && <p>الخطوة التالية: {metadata.next_step}</p>}
          </div>
        );
      
      case 'quote_sent':
        return (
          <div className="text-xs text-muted-foreground space-y-1">
            {metadata.value && <p>القيمة: {formatCurrency(metadata.value)}</p>}
            {metadata.quote_number && <p>رقم العرض: {metadata.quote_number}</p>}
            {metadata.document_url && (
              <a 
                href={metadata.document_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                عرض الملف
              </a>
            )}
          </div>
        );
      
      case 'rejection':
        return (
          <div className="text-xs text-muted-foreground space-y-1">
            {metadata.reason_label && (
              <Badge variant="destructive" className="text-xs">
                {metadata.reason_label}
              </Badge>
            )}
            {metadata.value_lost && <p>القيمة المفقودة: {formatCurrency(metadata.value_lost)}</p>}
          </div>
        );
      
      case 'stage_change':
        return (
          <div className="text-xs text-muted-foreground">
            {metadata.from_stage && metadata.to_stage && (
              <p>من {metadata.from_stage} → إلى {metadata.to_stage}</p>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4" />
            سجل النشاط
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="w-4 h-4" />
          سجل النشاط
          {activities.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activities.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            لا يوجد نشاط مسجل بعد
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }} className="pr-4">
            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([dateGroup, groupActivities]) => (
                <div key={dateGroup}>
                  <div className="text-xs font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                    {dateGroup}
                  </div>
                  <div className="space-y-3">
                    {groupActivities.map((activity) => {
                      const iconConfig = activityIcons[activity.activity_type] || activityIcons.note;
                      const Icon = iconConfig.icon;
                      
                      return (
                        <div key={activity.id} className="flex gap-3">
                          <div className={`w-8 h-8 rounded-full ${iconConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${iconConfig.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium">{activity.title}</p>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(activity.created_at), 'p', { locale: ar })}
                              </span>
                            </div>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {activity.description}
                              </p>
                            )}
                            {renderActivityContent(activity)}
                            {activity.performed_by_name && (
                              <p className="text-xs text-muted-foreground mt-2">
                                بواسطة: {activity.performed_by_name}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
