import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from './useStaffAuth';
import { toast } from 'sonner';

type NotificationType = 
  | 'ticket_new' 
  | 'ticket_assigned' 
  | 'ticket_reply'
  | 'meeting_new' 
  | 'meeting_assigned'
  | 'chat_new' 
  | 'chat_assigned'
  | 'chat_message'
  | 'task_completed'
  | 'project_update'
  | 'demo_request';

interface NotificationConfig {
  icon: string;
  title: string;
  soundType: 'chime' | 'alert' | 'success' | 'message';
}

const notificationConfigs: Record<NotificationType, NotificationConfig> = {
  ticket_new: {
    icon: '🎫',
    title: 'تذكرة دعم جديدة',
    soundType: 'alert',
  },
  ticket_assigned: {
    icon: '🎫',
    title: 'تذكرة موجهة إليك',
    soundType: 'chime',
  },
  ticket_reply: {
    icon: '💬',
    title: 'رد جديد على تذكرة',
    soundType: 'message',
  },
  meeting_new: {
    icon: '📅',
    title: 'طلب اجتماع جديد',
    soundType: 'alert',
  },
  meeting_assigned: {
    icon: '📅',
    title: 'اجتماع موجه إليك',
    soundType: 'chime',
  },
  chat_new: {
    icon: '💬',
    title: 'محادثة جديدة',
    soundType: 'alert',
  },
  chat_assigned: {
    icon: '💬',
    title: 'محادثة موجهة إليك',
    soundType: 'chime',
  },
  chat_message: {
    icon: '✉️',
    title: 'رسالة جديدة',
    soundType: 'message',
  },
  task_completed: {
    icon: '✅',
    title: 'تم إكمال مهمة',
    soundType: 'success',
  },
  project_update: {
    icon: '📋',
    title: 'تحديث على مشروع',
    soundType: 'chime',
  },
  demo_request: {
    icon: '🌐',
    title: 'طلب عرض توضيحي من الموقع',
    soundType: 'alert',
  },
};

export function useStaffNotifications() {
  const { permissions, isStaff } = useStaffAuth();
  const hasPermission = useRef(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastNotificationRef = useRef<number>(0);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    
    const events = ['click', 'touchstart', 'keydown'];
    const handleInteraction = () => {
      initAudioContext();
      events.forEach(e => document.removeEventListener(e, handleInteraction));
    };
    events.forEach(e => document.addEventListener(e, handleInteraction, { once: true }));
    
    return () => {
      events.forEach(e => document.removeEventListener(e, handleInteraction));
    };
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        hasPermission.current = permission === 'granted';
      });
    } else if ('Notification' in window) {
      hasPermission.current = Notification.permission === 'granted';
    }
  }, []);

  // Play different notification sounds based on type
  const playNotificationSound = useCallback((soundType: 'chime' | 'alert' | 'success' | 'message' = 'chime') => {
    if (!soundEnabled) return;
    
    // Throttle sounds to prevent spam (minimum 1 second between sounds)
    const now = Date.now();
    if (now - lastNotificationRef.current < 1000) return;
    lastNotificationRef.current = now;
    
    try {
      const audioContext = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioContextRef.current) audioContextRef.current = audioContext;
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const playTone = (freq: number, startTime: number, duration: number, volume: number = 0.3, type: OscillatorType = 'sine') => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = audioContext.currentTime;
      
      switch (soundType) {
        case 'chime':
          // Pleasant ascending chime (C-E-G)
          playTone(523.25, now, 0.15, 0.25);        // C5
          playTone(659.25, now + 0.1, 0.15, 0.3);   // E5
          playTone(783.99, now + 0.2, 0.25, 0.35);  // G5
          break;
          
        case 'alert':
          // Attention-grabbing two-tone alert
          playTone(880, now, 0.15, 0.35);           // A5
          playTone(1046.50, now + 0.15, 0.15, 0.4); // C6
          playTone(880, now + 0.3, 0.15, 0.35);     // A5
          playTone(1046.50, now + 0.45, 0.2, 0.4);  // C6
          break;
          
        case 'success':
          // Triumphant ascending melody
          playTone(523.25, now, 0.12, 0.25);        // C5
          playTone(659.25, now + 0.1, 0.12, 0.3);   // E5
          playTone(783.99, now + 0.2, 0.12, 0.35);  // G5
          playTone(1046.50, now + 0.3, 0.3, 0.4);   // C6 (held longer)
          break;
          
        case 'message':
          // Soft double-tap notification
          playTone(698.46, now, 0.1, 0.2);          // F5
          playTone(880, now + 0.12, 0.15, 0.25);    // A5
          break;
      }
      
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, [soundEnabled]);

  // Show browser notification with click handler
  const showBrowserNotification = useCallback((title: string, body: string, onClick?: () => void) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'staff-notification-' + Date.now(),
        requireInteraction: true,
        silent: true,
      });
      
      if (onClick) {
        notification.onclick = () => {
          window.focus();
          onClick();
          notification.close();
        };
      }
      
      setTimeout(() => notification.close(), 10000);
    }
  }, []);

  // Unified notification handler
  const showNotification = useCallback((
    type: NotificationType,
    content: string,
    description?: string,
    onClick?: () => void
  ) => {
    const config = notificationConfigs[type];
    const fullTitle = `${config.icon} ${config.title}`;
    const notificationBody = description ? `${content}\n\n${description}` : content;

    // Play appropriate sound
    playNotificationSound(config.soundType);

    // Show toast notification
    toast.info(fullTitle, {
      description: notificationBody,
      duration: 15000,
      action: onClick ? {
        label: 'عرض',
        onClick: onClick,
      } : undefined,
      className: 'rtl',
    });

    // Show browser notification
    showBrowserNotification(fullTitle, notificationBody, onClick);
  }, [playNotificationSound, showBrowserNotification]);

  // Legacy handler for backward compatibility
  const handleNewAssignment = useCallback((
    type: 'ticket' | 'meeting' | 'chat', 
    title: string, 
    note?: string,
    onClick?: () => void
  ) => {
    const typeMap: Record<string, NotificationType> = {
      ticket: 'ticket_assigned',
      meeting: 'meeting_assigned',
      chat: 'chat_assigned',
    };
    showNotification(typeMap[type], title, note ? `ملاحظة: ${note}` : undefined, onClick);
  }, [showNotification]);

  // Subscribe to new tickets (for staff with content management permission - typically admins)
  useEffect(() => {
    if (!isStaff || !permissions.canManageContent) return;

    const channel = supabase
      .channel('admin-new-tickets')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload) => {
          const newData = payload.new as any;
          showNotification(
            'ticket_new',
            newData.subject,
            `من: ${newData.client_name || 'عميل'}`,
            () => window.location.href = `/admin/tickets`
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, permissions.canManageContent, showNotification]);

  // Subscribe to new meeting requests (for staff with content management permission)
  useEffect(() => {
    if (!isStaff || !permissions.canManageContent) return;

    const channel = supabase
      .channel('admin-new-meetings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_requests',
        },
        (payload) => {
          const newData = payload.new as any;
          showNotification(
            'meeting_new',
            newData.subject,
            `من: ${newData.client_name || 'عميل'}`,
            () => window.location.href = `/admin/meetings`
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, permissions.canManageContent, showNotification]);

  // Subscribe to new conversations (for staff with content management permission)
  useEffect(() => {
    if (!isStaff || !permissions.canManageContent) return;

    const channel = supabase
      .channel('admin-new-conversations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          const newData = payload.new as any;
          showNotification(
            'chat_new',
            newData.subject || 'محادثة جديدة',
            undefined,
            () => window.location.href = `/admin/chat`
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, permissions.canManageContent, showNotification]);

  // Subscribe to ticket assignments for staff
  useEffect(() => {
    if (!isStaff || !permissions.staffId || !permissions.canReplyTickets) return;

    const channel = supabase
      .channel('staff-ticket-assignments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `assigned_to_staff=eq.${permissions.staffId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          if (oldData.assigned_to_staff !== permissions.staffId && 
              newData.assigned_to_staff === permissions.staffId) {
            handleNewAssignment(
              'ticket', 
              newData.subject, 
              newData.admin_note,
              () => window.location.href = `/support/tickets/${newData.id}`
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
          filter: `assigned_to_staff=eq.${permissions.staffId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          handleNewAssignment(
            'ticket', 
            newData.subject, 
            newData.admin_note,
            () => window.location.href = `/support/tickets/${newData.id}`
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, permissions.staffId, permissions.canReplyTickets, handleNewAssignment]);

  // Subscribe to ticket replies
  useEffect(() => {
    if (!isStaff || !permissions.staffId) return;

    const channel = supabase
      .channel('staff-ticket-replies')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_replies',
        },
        async (payload) => {
          const newData = payload.new as any;
          
          // Only notify if reply is from client (not staff)
          if (newData.is_staff_reply) return;
          
          // Check if this ticket is assigned to current staff
          const { data: ticket } = await supabase
            .from('support_tickets')
            .select('id, subject, assigned_to_staff')
            .eq('id', newData.ticket_id)
            .single();
            
          if (ticket?.assigned_to_staff === permissions.staffId) {
            showNotification(
              'ticket_reply',
              ticket.subject,
              'رد جديد من العميل',
              () => window.location.href = `/support/tickets/${ticket.id}`
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, permissions.staffId, showNotification]);

  // Subscribe to meeting assignments
  useEffect(() => {
    if (!isStaff || !permissions.staffId || !permissions.canAttendMeetings) return;

    const channel = supabase
      .channel('staff-meeting-assignments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meeting_requests',
          filter: `assigned_staff=eq.${permissions.staffId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          if (oldData.assigned_staff !== permissions.staffId && 
              newData.assigned_staff === permissions.staffId) {
            handleNewAssignment(
              'meeting', 
              newData.subject, 
              newData.admin_notes,
              () => window.location.href = `/support/meetings/${newData.id}`
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_requests',
          filter: `assigned_staff=eq.${permissions.staffId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          handleNewAssignment(
            'meeting', 
            newData.subject, 
            newData.admin_notes,
            () => window.location.href = `/support/meetings/${newData.id}`
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, permissions.staffId, permissions.canAttendMeetings, handleNewAssignment]);

  // Subscribe to chat assignments
  useEffect(() => {
    if (!isStaff || !permissions.staffId || !permissions.canReplyTickets) return;

    const channel = supabase
      .channel('staff-chat-assignments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `assigned_agent_id=eq.${permissions.staffId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          if (oldData.assigned_agent_id !== permissions.staffId && 
              newData.assigned_agent_id === permissions.staffId) {
            handleNewAssignment(
              'chat', 
              newData.subject || 'محادثة جديدة',
              undefined,
              () => window.location.href = `/support/chat`
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, permissions.staffId, permissions.canReplyTickets, handleNewAssignment]);

  // Subscribe to new chat messages for assigned conversations
  useEffect(() => {
    if (!isStaff || !permissions.staffId) return;

    const channel = supabase
      .channel('staff-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
        },
        async (payload) => {
          const newData = payload.new as any;
          
          // Only notify if message is from client
          if (newData.sender_type !== 'client') return;
          
          // Check if conversation is assigned to current staff
          const { data: conversation } = await supabase
            .from('conversations')
            .select('id, subject, assigned_agent_id')
            .eq('id', newData.conversation_id)
            .single();
            
          if (conversation?.assigned_agent_id === permissions.staffId) {
            showNotification(
              'chat_message',
              conversation.subject || 'محادثة',
              newData.body?.substring(0, 50) + (newData.body?.length > 50 ? '...' : ''),
              () => window.location.href = `/support/chat`
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, permissions.staffId, showNotification]);

  // Subscribe to project phase completions
  useEffect(() => {
    if (!isStaff || !permissions.staffId) return;

    const channel = supabase
      .channel('staff-project-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_activity_log',
        },
        async (payload) => {
          const newData = payload.new as any;
          
          // Only notify for phase completions
          if (newData.activity_type !== 'phase_completed') return;
          
          // Check if staff is assigned to this project
          const { data: project } = await supabase
            .from('crm_implementations')
            .select('id, project_name, implementer_id, project_manager_id')
            .eq('id', newData.project_id)
            .single();
            
          if (project?.implementer_id === permissions.staffId || 
              project?.project_manager_id === permissions.staffId) {
            showNotification(
              'task_completed',
              project.project_name,
              newData.details || 'تم إكمال مرحلة',
              () => window.location.href = `/support/projects/${project.id}`
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, permissions.staffId, showNotification]);

  // Subscribe to new demo requests from website
  useEffect(() => {
    if (!isStaff || !permissions.canManageContent) return;

    const channel = supabase
      .channel('admin-demo-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'website_form_submissions',
          filter: 'form_type=eq.demo_request',
        },
        (payload) => {
          const newData = payload.new as any;
          showNotification(
            'demo_request',
            `${newData.organization_name || 'جهة جديدة'}`,
            `${newData.contact_name || ''} • ${newData.phone || ''} • رقم الطلب: ${newData.submission_number || ''}`,
            () => window.location.href = `/admin/website-requests`
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, permissions.canManageContent, showNotification]);

  return {
    soundEnabled,
    setSoundEnabled,
    playNotificationSound,
    showBrowserNotification,
    showNotification,
    handleNewAssignment,
  };
}
