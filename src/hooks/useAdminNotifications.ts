import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from './useNotificationSound';
import { useBrowserNotification } from './useBrowserNotification';

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  metadata: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

const NOTIFICATION_ICONS: Record<string, string> = {
  ticket_new: '🎫',
  ticket_reply: '💬',
  ticket_closed: '✅',
  meeting_new: '📅',
  meeting_completed: '✅',
  demo_request: '🌐',
  chat_new: '💬',
  project_update: '📋',
  phase_completed: '🏁',
  invoice_confirmed: '💰',
};

export function getNotificationIcon(type: string): string {
  return NOTIFICATION_ICONS[type] || '🔔';
}

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { playNotificationSound } = useNotificationSound();
  const { showBrowserNotification } = useBrowserNotification();

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as AdminNotification[]);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
    setLoading(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          const newNotification = payload.new as AdminNotification;
          setNotifications(prev => [newNotification, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);
          playNotificationSound();
          
          // Browser push notification
          const icon = getNotificationIcon(newNotification.type);
          showBrowserNotification(
            `${icon} ${newNotification.title}`,
            newNotification.message || '',
            {
              tag: `admin-${newNotification.id}`,
              onClick: () => {
                if (newNotification.link) {
                  window.location.href = newNotification.link;
                }
              }
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          const updated = payload.new as AdminNotification;
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          );
          // Recalculate unread
          setNotifications(prev => {
            setUnreadCount(prev.filter(n => !n.is_read).length);
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setNotifications(prev => {
            const filtered = prev.filter(n => n.id !== deleted.id);
            setUnreadCount(filtered.filter(n => !n.is_read).length);
            return filtered;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playNotificationSound]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    await supabase
      .from('admin_notifications')
      .delete()
      .eq('id', id);

    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notif && !notif.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
}
