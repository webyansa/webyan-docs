import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Loader2, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimelineItem, TimelineEvent } from '../TimelineItem';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimelineTabProps {
  organizationId: string;
}

const eventTypeLabels: Record<string, string> = {
  all: 'الكل',
  created: 'الإنشاء',
  stage_changed: 'تغيير المرحلة',
  ticket_opened: 'فتح تذكرة',
  ticket_closed: 'إغلاق تذكرة',
  meeting_scheduled: 'جدولة اجتماع',
  meeting_completed: 'انتهاء اجتماع',
  invoice_sent: 'إرسال فاتورة',
  payment_received: 'استلام دفعة',
  note_added: 'إضافة ملاحظة',
};

export function TimelineTab({ organizationId }: TimelineTabProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchTimeline();
  }, [organizationId]);

  const fetchTimeline = async () => {
    try {
      const { data, error } = await supabase
        .from('client_timeline')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEvents((data || []) as TimelineEvent[]);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.event_type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            سجل النشاط
          </span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="تصفية حسب النوع" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(eventTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredEvents.length > 0 ? (
          <ScrollArea className="h-[500px] pr-4">
            <div className="relative">
              {filteredEvents.map((event, index) => (
                <TimelineItem 
                  key={event.id} 
                  event={event} 
                  isLast={index === filteredEvents.length - 1}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد أحداث مسجلة</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
