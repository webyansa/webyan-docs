import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from './useStaffAuth';
import { toast } from 'sonner';

type NotificationType = 
  | 'ticket_new' 
  | 'ticket_assigned' 
  | 'ticket_reply'
  | 'ticket_closed'
  | 'meeting_new' 
  | 'meeting_assigned'
  | 'meeting_completed'
  | 'chat_new' 
  | 'chat_assigned'
  | 'chat_message'
  | 'task_completed'
  | 'project_update'
  | 'phase_completed'
  | 'demo_request'
  | 'invoice_confirmed';

interface NotificationConfig {
  icon: string;
  title: string;
  soundType: 'chime' | 'alert' | 'success' | 'message';
  dbType: string; // type stored in admin_notifications
}

const notificationConfigs: Record<NotificationType, NotificationConfig> = {
  ticket_new: { icon: '🎫', title: 'تذكرة دعم جديدة', soundType: 'alert', dbType: 'ticket_new' },
  ticket_assigned: { icon: '🎫', title: 'تذكرة موجهة إليك', soundType: 'chime', dbType: 'ticket_new' },
  ticket_reply: { icon: '💬', title: 'رد جديد على تذكرة', soundType: 'message', dbType: 'ticket_reply' },
  ticket_closed: { icon: '✅', title: 'تم إنجاز تذكرة', soundType: 'success', dbType: 'ticket_closed' },
  meeting_new: { icon: '📅', title: 'طلب اجتماع جديد', soundType: 'alert', dbType: 'meeting_new' },
  meeting_assigned: { icon: '📅', title: 'اجتماع موجه إليك', soundType: 'chime', dbType: 'meeting_new' },
  meeting_completed: { icon: '✅', title: 'تم إتمام اجتماع', soundType: 'success', dbType: 'meeting_completed' },
  chat_new: { icon: '💬', title: 'محادثة جديدة', soundType: 'alert', dbType: 'chat_new' },
  chat_assigned: { icon: '💬', title: 'محادثة موجهة إليك', soundType: 'chime', dbType: 'chat_new' },
  chat_message: { icon: '✉️', title: 'رسالة جديدة', soundType: 'message', dbType: 'chat_new' },
  task_completed: { icon: '✅', title: 'تم إكمال مهمة', soundType: 'success', dbType: 'phase_completed' },
  project_update: { icon: '📋', title: 'تحديث على مشروع', soundType: 'chime', dbType: 'project_update' },
  phase_completed: { icon: '🏁', title: 'مرحلة مكتملة', soundType: 'success', dbType: 'phase_completed' },
  demo_request: { icon: '🌐', title: 'طلب عرض توضيحي من الموقع', soundType: 'alert', dbType: 'demo_request' },
  invoice_confirmed: { icon: '💰', title: 'تأكيد إصدار فاتورة', soundType: 'success', dbType: 'invoice_confirmed' },
};

// Save notification to admin_notifications table
async function saveAdminNotification(
  type: string,
  title: string,
  message?: string,
  link?: string,
  metadata?: Record<string, any>
) {
  try {
    await supabase.from('admin_notifications').insert({
      type,
      title,
      message: message || null,
      link: link || null,
      metadata: metadata || {},
    });
  } catch (err) {
    console.error('Failed to save admin notification:', err);
  }
}

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
          playTone(523.25, now, 0.15, 0.25);
          playTone(659.25, now + 0.1, 0.15, 0.3);
          playTone(783.99, now + 0.2, 0.25, 0.35);
          break;
        case 'alert':
          playTone(880, now, 0.15, 0.35);
          playTone(1046.50, now + 0.15, 0.15, 0.4);
          playTone(880, now + 0.3, 0.15, 0.35);
          playTone(1046.50, now + 0.45, 0.2, 0.4);
          break;
        case 'success':
          playTone(523.25, now, 0.12, 0.25);
          playTone(659.25, now + 0.1, 0.12, 0.3);
          playTone(783.99, now + 0.2, 0.12, 0.35);
          playTone(1046.50, now + 0.3, 0.3, 0.4);
          break;
        case 'message':
          playTone(698.46, now, 0.1, 0.2);
          playTone(880, now + 0.12, 0.15, 0.25);
          break;
      }
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, [soundEnabled]);

  // Show browser notification
  const showBrowserNotification = useCallback((title: string, body: string, onClick?: () => void) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body, icon: '/favicon.svg', badge: '/favicon.svg',
        tag: 'staff-notification-' + Date.now(), requireInteraction: true, silent: true,
      });
      if (onClick) {
        notification.onclick = () => { window.focus(); onClick(); notification.close(); };
      }
      setTimeout(() => notification.close(), 10000);
    }
  }, []);

  // Unified notification handler - now also saves to DB
  const showNotification = useCallback((
    type: NotificationType,
    content: string,
    description?: string,
    onClick?: () => void,
    link?: string,
    metadata?: Record<string, any>
  ) => {
    const config = notificationConfigs[type];
    const fullTitle = `${config.icon} ${config.title}`;
    const notificationBody = description ? `${content}\n\n${description}` : content;

    playNotificationSound(config.soundType);

    toast.info(fullTitle, {
      description: notificationBody,
      duration: 15000,
      action: onClick ? { label: 'عرض', onClick } : undefined,
      className: 'rtl',
    });

    showBrowserNotification(fullTitle, notificationBody, onClick);

    // Save to admin_notifications table
    saveAdminNotification(
      config.dbType,
      `${config.title}: ${content}`,
      description,
      link,
      metadata
    );
  }, [playNotificationSound, showBrowserNotification]);

  // Legacy handler
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

  // Subscribe to new tickets
  useEffect(() => {
    if (!isStaff || !permissions.canManageContent) return;
    const channel = supabase
      .channel('admin-new-tickets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        (payload) => {
          const d = payload.new as any;
          showNotification('ticket_new', d.subject, `من: ${d.client_name || 'عميل'}`, 
            () => window.location.href = `/admin/tickets`, '/admin/tickets');
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaff, permissions.canManageContent, showNotification]);

  // Subscribe to ticket closures (NEW)
  useEffect(() => {
    if (!isStaff || !permissions.canManageContent) return;
    const channel = supabase
      .channel('admin-ticket-closures')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets' },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (newData.status === 'closed' && oldData.status !== 'closed') {
            showNotification('ticket_closed', newData.subject, `تم إغلاق التذكرة`,
              () => window.location.href = `/admin/tickets`, '/admin/tickets');
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaff, permissions.canManageContent, showNotification]);

  // Subscribe to new meeting requests
  useEffect(() => {
    if (!isStaff || !permissions.canManageContent) return;
    const channel = supabase
      .channel('admin-new-meetings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meeting_requests' },
        (payload) => {
          const d = payload.new as any;
          showNotification('meeting_new', d.subject, `من: ${d.client_name || 'عميل'}`,
            () => window.location.href = `/admin/meetings`, '/admin/meetings');
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaff, permissions.canManageContent, showNotification]);

  // Subscribe to meeting completions (NEW)
  useEffect(() => {
    if (!isStaff || !permissions.canManageContent) return;
    const channel = supabase
      .channel('admin-meeting-completions')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meeting_requests' },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (newData.status === 'completed' && oldData.status !== 'completed') {
            showNotification('meeting_completed', newData.subject || 'اجتماع', 'تم إتمام الاجتماع',
              () => window.location.href = `/admin/meetings`, '/admin/meetings');
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaff, permissions.canManageContent, showNotification]);

  // Subscribe to new conversations
  useEffect(() => {
    if (!isStaff || !permissions.canManageContent) return;
    const channel = supabase
      .channel('admin-new-conversations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          const d = payload.new as any;
          showNotification('chat_new', d.subject || 'محادثة جديدة', undefined,
            () => window.location.href = `/admin/chat`, '/admin/chat');
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaff, permissions.canManageContent, showNotification]);

  // Subscribe to invoice confirmations (NEW)
  useEffect(() => {
    if (!isStaff || !permissions.canManageContent) return;
    const channel = supabase
      .channel('admin-invoice-confirmations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'invoice_requests' },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (newData.status === 'issued' && oldData.status !== 'issued') {
            showNotification('invoice_confirmed', `طلب فاتورة رقم ${newData.request_number || ''}`,
              'تم تأكيد إصدار الفاتورة',
              () => window.location.href = `/admin/crm/quotes`, '/admin/crm/quotes');
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaff, permissions.canManageContent, showNotification]);

  // Subscribe to ticket assignments for staff
  useEffect(() => {
    if (!isStaff || !permissions.staffId || !permissions.canReplyTickets) return;
    const channel = supabase
      .channel('staff-ticket-assignments')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `assigned_to_staff=eq.${permissions.staffId}` },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (oldData.assigned_to_staff !== permissions.staffId && newData.assigned_to_staff === permissions.staffId) {
            handleNewAssignment('ticket', newData.subject, newData.admin_note, () => window.location.href = `/support/tickets/${newData.id}`);
          }
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets', filter: `assigned_to_staff=eq.${permissions.staffId}` },
        (payload) => {
          const d = payload.new as any;
          handleNewAssignment('ticket', d.subject, d.admin_note, () => window.location.href = `/support/tickets/${d.id}`);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaff, permissions.staffId, permissions.canReplyTickets, handleNewAssignment]);

  // Subscribe to ticket replies
  useEffect(() => {
    if (!isStaff || !permissions.staffId) return;
    const channel = supabase
      .channel('staff-ticket-replies')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_replies' },
        async (payload) => {
          const d = payload.new as any;
          if (d.is_staff_reply) return;
          const { data: ticket } = await supabase.from('support_tickets').select('id, subject, assigned_to_staff').eq('id', d.ticket_id).single();
          if (ticket?.assigned_to_staff === permissions.staffId) {
            showNotification('ticket_reply', ticket.subject, 'رد جديد من العميل',
              () => window.location.href = `/support/tickets/${ticket.id}`, `/admin/tickets`);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaff, permissions.staffId, showNotification]);

  // Subscribe to meeting assignments
  useEffect(() => {
    if (!isStaff || !permissions.staffId || !permissions.canAttendMeetings) return;
    const channel = supabase
      .channel('staff-meeting-assignments')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meeting_requests', filter: `assigned_staff=eq.${permissions.staffId}` },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (oldData.assigned_staff !== permissions.staffId && newData.assigned_staff === permissions.staffId) {
            handleNewAssignment('meeting', newData.subject, newData.admin_notes, () => window.location.href = `/support/meetings/${newData.id}`);
          }
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meeting_requests', filter: `assigned_staff=eq.${permissions.staffId}` },
        (payload) => {
          const d = payload.new as any;
          handleNewAssignment('meeting', d.subject, d.admin_notes, () => window.location.href = `/support/meetings/${d.id}`);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaff, permissions.staffId, permissions.canAttendMeetings, handleNewAssignment]);

  // Subscribe to chat assignments
  useEffect(() => {
    if (!isStaff || !permissions.staffId || !permissions.canReplyTickets) return;
    const channel = supabase
      .channel('staff-chat-assignments')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `assigned_agent_id=eq.${permissions.staffId}` },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (oldData.assigned_agent_id !== permissions.staffId && newData.assigned_agent_id === permissions.staffId) {
            handleNewAssignment('chat', newData.subject || 'محادثة جديدة', undefined, () => window.location.href = `/support/chat`);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaff, permissions.staffId, permissions.canReplyTickets, handleNewAssignment]);

  // Subscribe to new chat messages
  useEffect(() => {
    if (!isStaff || !permissions.staffId) return;
    const channel = supabase
      .channel('staff-chat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' },
        async (payload) => {
          const d = payload.new as any;
          if (d.sender_type !== 'client') return;
          const { data: conv } = await supabase.from('conversations').select('id, subject, assigned_agent_id').eq('id', d.conversation_id).single();
          if (conv?.assigned_agent_id === permissions.staffId) {
            showNotification('chat_message', conv.subject || 'محادثة',
              d.body?.substring(0, 50) + (d.body?.length > 50 ? '...' : ''),
              () => window.location.href = `/support/chat`, '/admin/chat');
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaff, permissions.staffId, showNotification]);

  // Subscribe to project phase completions
  useEffect(() => {
    if (!isStaff || !permissions.canManageContent) return;
    const channel = supabase
      .channel('admin-project-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_activity_log' },
        async (payload) => {
          const d = payload.new as any;
          const { data: project } = await supabase.from('crm_implementations').select('id, project_name').eq('id', d.project_id).single();
          if (!project) return;
          
          if (d.activity_type === 'phase_completed') {
            showNotification('phase_completed', project.project_name, d.details || 'تم إكمال مرحلة',
              () => window.location.href = `/admin/projects/${project.id}`, `/admin/projects/${project.id}`,
              { project_id: project.id });
          } else {
            showNotification('project_update', project.project_name, d.details || 'تحديث جديد',
              () => window.location.href = `/admin/projects/${project.id}`, `/admin/projects/${project.id}`,
              { project_id: project.id });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaff, permissions.canManageContent, showNotification]);

  // Subscribe to demo requests
  useEffect(() => {
    if (!isStaff || !permissions.canManageContent) return;
    const channel = supabase
      .channel('admin-demo-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'website_form_submissions', filter: 'form_type=eq.demo_request' },
        (payload) => {
          const d = payload.new as any;
          showNotification('demo_request', `${d.organization_name || 'جهة جديدة'}`,
            `${d.contact_name || ''} • ${d.phone || ''} • رقم الطلب: ${d.submission_number || ''}`,
            () => window.location.href = `/admin/website-requests`, '/admin/website-requests');
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
