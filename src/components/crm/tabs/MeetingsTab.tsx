import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Calendar,
  Plus,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Video,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MeetingsTabProps {
  organizationId: string;
  onScheduleMeeting?: () => void;
}

interface MeetingItem {
  id: string;
  subject: string;
  meeting_type: string;
  status: string;
  preferred_date: string;
  confirmed_date?: string | null;
  duration_minutes: number;
  meeting_link?: string | null;
  assigned_staff?: {
    full_name: string;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; Icon: typeof Clock }> = {
  pending: { label: 'في الانتظار', color: 'bg-amber-100 text-amber-700', Icon: Clock },
  confirmed: { label: 'مؤكد', color: 'bg-blue-100 text-blue-700', Icon: Calendar },
  completed: { label: 'منتهي', color: 'bg-green-100 text-green-700', Icon: CheckCircle },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700', Icon: XCircle },
  rescheduled: { label: 'معاد جدولته', color: 'bg-purple-100 text-purple-700', Icon: Calendar },
};

const meetingTypeLabels: Record<string, string> = {
  general: 'اجتماع عام',
  training: 'تدريب',
  consultation: 'استشارة',
  demo: 'عرض توضيحي',
  support: 'دعم فني',
};

export function MeetingsTab({ organizationId, onScheduleMeeting }: MeetingsTabProps) {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();
  }, [organizationId]);

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_requests')
        .select(`
          id, subject, meeting_type, status, preferred_date, 
          confirmed_date, duration_minutes, meeting_link,
          assigned_staff:staff_members(full_name)
        `)
        .eq('organization_id', organizationId)
        .order('preferred_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingMeetings = meetings.filter(m => 
    ['pending', 'confirmed'].includes(m.status) && 
    new Date(m.confirmed_date || m.preferred_date) >= new Date()
  );
  
  const pastMeetings = meetings.filter(m => 
    m.status === 'completed' || 
    (m.status !== 'cancelled' && new Date(m.confirmed_date || m.preferred_date) < new Date())
  );

  const stats = {
    total: meetings.length,
    upcoming: upcomingMeetings.length,
    completed: meetings.filter(m => m.status === 'completed').length,
    cancelled: meetings.filter(m => m.status === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const MeetingCard = ({ meeting }: { meeting: MeetingItem }) => {
    const status = statusConfig[meeting.status] || statusConfig.pending;
    const StatusIcon = status.Icon;
    const meetingDate = meeting.confirmed_date || meeting.preferred_date;

    return (
      <div 
        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => navigate(`/admin/meetings`)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${status.color}`}>
              <StatusIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium">{meeting.subject}</p>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Badge variant="outline">{meetingTypeLabels[meeting.meeting_type] || meeting.meeting_type}</Badge>
                <span>•</span>
                <span>{meeting.duration_minutes} دقيقة</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {format(new Date(meetingDate), 'EEEE dd MMMM yyyy - HH:mm', { locale: ar })}
              </p>
              {meeting.assigned_staff && (
                <p className="text-xs text-muted-foreground mt-1">
                  مع: {meeting.assigned_staff.full_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {meeting.meeting_link && meeting.status === 'confirmed' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(meeting.meeting_link!, '_blank');
                }}
              >
                <Video className="w-4 h-4 ml-1" />
                انضمام
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">إجمالي الاجتماعات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
            <p className="text-sm text-muted-foreground">القادمة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">منتهية</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
            <p className="text-sm text-muted-foreground">ملغاة</p>
          </CardContent>
        </Card>
      </div>

      {/* Meetings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              الاجتماعات
            </span>
            <Button size="sm" onClick={onScheduleMeeting}>
              <Plus className="w-4 h-4 ml-2" />
              جدولة اجتماع
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming">
            <TabsList className="mb-4">
              <TabsTrigger value="upcoming">القادمة ({upcomingMeetings.length})</TabsTrigger>
              <TabsTrigger value="past">السابقة ({pastMeetings.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming">
              {upcomingMeetings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingMeetings.map(meeting => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد اجتماعات قادمة</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="past">
              {pastMeetings.length > 0 ? (
                <div className="space-y-3">
                  {pastMeetings.map(meeting => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد اجتماعات سابقة</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
