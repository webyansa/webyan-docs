import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatNotification {
  id: string;
  conversation_id: string;
  sender_name: string;
  body: string;
  created_at: string;
  is_read: boolean;
}

interface UseChatNotificationsOptions {
  enabled?: boolean;
  soundEnabled?: boolean;
  userType: 'admin' | 'staff' | 'client';
  staffId?: string;
  organizationId?: string;
}

export function useChatNotifications(options: UseChatNotificationsOptions) {
  const { 
    enabled = true, 
    soundEnabled = true, 
    userType, 
    staffId,
    organizationId 
  } = options;
  
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentMessages, setRecentMessages] = useState<ChatNotification[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Create audio element for notification sound (using a simple notification beep)
  useEffect(() => {
    // Create a simple notification sound using Web Audio API
    const createNotificationSound = () => {
      const audio = new Audio();
      // Using a base64 encoded short notification sound
      audio.src = 'data:audio/mp3;base64,//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uQxBUAAADSAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      audio.volume = 0.6;
      return audio;
    };
    
    audioRef.current = createNotificationSound();
    
    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, [soundEnabled]);

  const showToastNotification = useCallback((senderName: string, message: string, conversationId: string) => {
    const truncatedMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
    
    toast({
      title: `💬 رسالة جديدة من ${senderName}`,
      description: truncatedMessage,
      duration: 5000,
    });
  }, [toast]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!enabled) return;

    try {
      let query = supabase
        .from('conversation_messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);

      // Admin sees all unread messages (except their own)
      if (userType === 'admin') {
        query = query.neq('sender_type', 'agent');
      }
      // Staff sees messages assigned to them
      else if (userType === 'staff' && staffId) {
        const { data: assignedConvs } = await supabase
          .from('conversations')
          .select('id')
          .eq('assigned_agent_id', staffId);
        
        if (assignedConvs && assignedConvs.length > 0) {
          const convIds = assignedConvs.map(c => c.id);
          query = query.in('conversation_id', convIds).neq('sender_type', 'agent');
        } else {
          setUnreadCount(0);
          return;
        }
      }
      // Client sees messages in their organization's conversations
      else if (userType === 'client' && organizationId) {
        const { data: orgConvs } = await supabase
          .from('conversations')
          .select('id')
          .eq('organization_id', organizationId);
        
        if (orgConvs && orgConvs.length > 0) {
          const convIds = orgConvs.map(c => c.id);
          query = query.in('conversation_id', convIds).neq('sender_type', 'client');
        } else {
          setUnreadCount(0);
          return;
        }
      }

      const { count, error } = await query;
      
      if (!error) {
        setUnreadCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [enabled, userType, staffId, organizationId]);

  // Fetch recent unread messages
  const fetchRecentMessages = useCallback(async () => {
    if (!enabled) return;

    try {
      let query = supabase
        .from('conversation_messages')
        .select('id, conversation_id, sender_name, body, created_at, is_read')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (userType === 'admin') {
        query = query.neq('sender_type', 'agent');
      } else if (userType === 'staff' && staffId) {
        const { data: assignedConvs } = await supabase
          .from('conversations')
          .select('id')
          .eq('assigned_agent_id', staffId);
        
        if (assignedConvs && assignedConvs.length > 0) {
          const convIds = assignedConvs.map(c => c.id);
          query = query.in('conversation_id', convIds).neq('sender_type', 'agent');
        } else {
          setRecentMessages([]);
          return;
        }
      } else if (userType === 'client' && organizationId) {
        const { data: orgConvs } = await supabase
          .from('conversations')
          .select('id')
          .eq('organization_id', organizationId);
        
        if (orgConvs && orgConvs.length > 0) {
          const convIds = orgConvs.map(c => c.id);
          query = query.in('conversation_id', convIds).neq('sender_type', 'client');
        } else {
          setRecentMessages([]);
          return;
        }
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setRecentMessages(data as ChatNotification[]);
      }
    } catch (error) {
      console.error('Error fetching recent messages:', error);
    }
  }, [enabled, userType, staffId, organizationId]);

  // Handle new message
  const handleNewMessage = useCallback((payload: any) => {
    const newMessage = payload.new;
    
    // Don't notify for own messages
    if (userType === 'admin' && newMessage.sender_type === 'agent') return;
    if (userType === 'staff' && newMessage.sender_type === 'agent') return;
    if (userType === 'client' && newMessage.sender_type === 'client') return;
    
    // Avoid duplicate notifications
    if (lastMessageIdRef.current === newMessage.id) return;
    lastMessageIdRef.current = newMessage.id;

    // Play sound and show toast
    playNotificationSound();
    showToastNotification(
      newMessage.sender_name || 'مستخدم',
      newMessage.body,
      newMessage.conversation_id
    );

    // Update counts
    setUnreadCount(prev => prev + 1);
    setRecentMessages(prev => [{
      id: newMessage.id,
      conversation_id: newMessage.conversation_id,
      sender_name: newMessage.sender_name || 'مستخدم',
      body: newMessage.body,
      created_at: newMessage.created_at,
      is_read: false
    }, ...prev.slice(0, 9)]);
  }, [userType, playNotificationSound, showToastNotification]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!enabled) return;

    fetchUnreadCount();
    fetchRecentMessages();

    const channel = supabase
      .channel('chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages'
        },
        handleNewMessage
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, handleNewMessage, fetchUnreadCount, fetchRecentMessages]);

  // Polling fallback every 30 seconds
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [enabled, fetchUnreadCount]);

  const markAsRead = useCallback(async (messageId: string) => {
    await supabase
      .from('conversation_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId);

    setRecentMessages(prev => prev.filter(m => m.id !== messageId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    const messageIds = recentMessages.map(m => m.id);
    if (messageIds.length === 0) return;

    await supabase
      .from('conversation_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', messageIds);

    setRecentMessages([]);
    setUnreadCount(0);
  }, [recentMessages]);

  return {
    unreadCount,
    recentMessages,
    markAsRead,
    markAllAsRead,
    refetch: fetchUnreadCount
  };
}
