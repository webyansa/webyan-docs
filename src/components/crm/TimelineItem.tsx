import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  UserPlus,
  ArrowRightLeft,
  MessageSquare,
  CheckCircle2,
  Calendar,
  FileText,
  CreditCard,
  Edit,
  Settings,
  Bell,
  Receipt,
  Banknote,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  reference_type: string | null;
  reference_id: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  created_at: string;
}

const eventIcons: Record<string, typeof UserPlus> = {
  created: UserPlus,
  stage_changed: ArrowRightLeft,
  ticket_opened: MessageSquare,
  ticket_closed: CheckCircle2,
  meeting_scheduled: Calendar,
  meeting_completed: Calendar,
  invoice_sent: Receipt,
  payment_received: Banknote,
  note_added: Edit,
  system_accessed: Settings,
  default: Bell,
};

const eventColors: Record<string, string> = {
  created: 'bg-green-100 text-green-600',
  stage_changed: 'bg-blue-100 text-blue-600',
  ticket_opened: 'bg-orange-100 text-orange-600',
  ticket_closed: 'bg-green-100 text-green-600',
  meeting_scheduled: 'bg-purple-100 text-purple-600',
  meeting_completed: 'bg-emerald-100 text-emerald-600',
  invoice_sent: 'bg-amber-100 text-amber-700',
  payment_received: 'bg-teal-100 text-teal-700',
  note_added: 'bg-gray-100 text-gray-600',
  system_accessed: 'bg-indigo-100 text-indigo-600',
  default: 'bg-muted text-muted-foreground',
};

interface TimelineItemProps {
  event: TimelineEvent;
  isLast?: boolean;
}

export function TimelineItem({ event, isLast = false }: TimelineItemProps) {
  const Icon = eventIcons[event.event_type] || eventIcons.default;
  const colorClass = eventColors[event.event_type] || eventColors.default;

  return (
    <div className="relative flex gap-4 pr-8">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute right-[15px] top-8 bottom-0 w-0.5 bg-border" />
      )}
      
      {/* Icon */}
      <div className={cn(
        'absolute right-0 w-8 h-8 rounded-full flex items-center justify-center z-10',
        colorClass
      )}>
        <Icon className="h-4 w-4" />
      </div>
      
      {/* Content */}
      <div className="flex-1 bg-muted/50 rounded-lg p-3 mb-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-foreground">{event.title}</p>
        </div>
        
        {event.description && (
          <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
        )}
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {event.performed_by_name && (
            <>
              <span>{event.performed_by_name}</span>
              <span>•</span>
            </>
          )}
          <span title={format(new Date(event.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}>
            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ar })}
          </span>
        </div>
      </div>
    </div>
  );
}
