import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from './useStaffAuth';
import { toast } from 'sonner';

export function useStaffNotifications() {
  const { permissions, isStaff } = useStaffAuth();
  const hasPermission = useRef(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    
    // Listen for first user interaction to initialize audio
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

  // Play enhanced notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioContextRef.current) audioContextRef.current = audioContext;
      
      // Resume context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Create a more pleasant notification melody
      const playTone = (freq: number, startTime: number, duration: number, volume: number = 0.3) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = audioContext.currentTime;
      
      // Pleasant ascending notification chime
      playTone(523.25, now, 0.15, 0.25);        // C5
      playTone(659.25, now + 0.1, 0.15, 0.3);   // E5
      playTone(783.99, now + 0.2, 0.25, 0.35);  // G5
      
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
        silent: true, // We play our own sound
      });
      
      if (onClick) {
        notification.onclick = () => {
          window.focus();
          onClick();
          notification.close();
        };
      }
      
      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    }
  }, []);

  // Handle new assignment notification with enhanced visuals
  const handleNewAssignment = useCallback((
    type: 'ticket' | 'meeting' | 'chat', 
    title: string, 
    note?: string,
    onClick?: () => void
  ) => {
    const config = {
      ticket: {
        icon: '🎫',
        title: 'تذكرة جديدة موجهة إليك',
        color: 'text-blue-600',
      },
      meeting: {
        icon: '📅',
        title: 'اجتماع جديد موجه إليك',
        color: 'text-emerald-600',
      },
      chat: {
        icon: '💬',
        title: 'محادثة جديدة موجهة إليك',
        color: 'text-violet-600',
      },
    };
    
    const { icon, title: notificationTitle } = config[type];
    const notificationBody = note ? `${title}\n\nملاحظة: ${note}` : title;

    // Play sound
    playNotificationSound();

    // Show enhanced toast with action
    toast.info(`${icon} ${notificationTitle}`, {
      description: notificationBody,
      duration: 15000,
      action: onClick ? {
        label: 'عرض',
        onClick: onClick,
      } : undefined,
      className: 'rtl',
    });

    // Show browser notification
    showBrowserNotification(`${icon} ${notificationTitle}`, notificationBody, onClick);
  }, [playNotificationSound, showBrowserNotification]);

  // Subscribe to ticket assignments with enhanced handling
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
          
          // Check if this is a new assignment (assigned_to_staff changed to current staff)
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
          
          // Check if this is a new assignment
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
          
          // Check if this is a new assignment
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

  return {
    soundEnabled,
    setSoundEnabled,
    playNotificationSound,
    showBrowserNotification,
    handleNewAssignment,
  };
}
