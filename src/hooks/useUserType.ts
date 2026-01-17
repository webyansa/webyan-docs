import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserType = 'admin' | 'editor' | 'staff' | 'client' | 'visitor' | null;
export type AppRole = 'admin' | 'editor' | 'support_agent' | 'viewer';

export interface UserTypeInfo {
  userType: UserType;
  roleName: string | null;
  staffId: string | null;
  clientId: string | null;
  organizationId: string | null;
  displayName: string;
  canReplyTickets: boolean;
  canManageContent: boolean;
  canAttendMeetings: boolean;
}

const defaultUserTypeInfo: UserTypeInfo = {
  userType: null,
  roleName: null,
  staffId: null,
  clientId: null,
  organizationId: null,
  displayName: '',
  canReplyTickets: false,
  canManageContent: false,
  canAttendMeetings: false,
};

export function useUserType() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userTypeLoading, setUserTypeLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserTypeInfo>(defaultUserTypeInfo);

  const fetchUserType = useCallback(async (userId: string) => {
    try {
      setUserTypeLoading(true);
      const { data, error } = await supabase.rpc('get_user_type', { _user_id: userId });

      if (error) {
        console.error('Error fetching user type:', error);
        setUserInfo(defaultUserTypeInfo);
        return;
      }

      if (data && data.length > 0) {
        const info = data[0];
        setUserInfo({
          userType: info.user_type as UserType,
          roleName: info.role_name,
          staffId: info.staff_id,
          clientId: info.client_id,
          organizationId: info.organization_id,
          displayName: info.display_name || '',
          canReplyTickets: info.can_reply_tickets || false,
          canManageContent: info.can_manage_content || false,
          canAttendMeetings: info.can_attend_meetings || false,
        });
      } else {
        setUserInfo({ ...defaultUserTypeInfo, userType: 'visitor' });
      }
    } catch (error) {
      console.error('Error fetching user type:', error);
      setUserInfo(defaultUserTypeInfo);
    } finally {
      setUserTypeLoading(false);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // Defer user type fetching to avoid deadlock
          setTimeout(() => {
            fetchUserType(newSession.user.id);
          }, 0);
        } else {
          setUserInfo(defaultUserTypeInfo);
          setUserTypeLoading(false);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        fetchUserType(existingSession.user.id);
      } else {
        setUserTypeLoading(false);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserType]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (!error && data.user) {
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { email, name: fullName },
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserInfo(defaultUserTypeInfo);
  };

  // Combined loading state - true until both auth and user type are loaded
  const isFullyLoaded = !loading && !userTypeLoading;

  return {
    user,
    session,
    loading: !isFullyLoaded,
    userInfo,
    signIn,
    signUp,
    signOut,
    // Convenience flags
    isAdmin: userInfo.userType === 'admin',
    isEditor: userInfo.userType === 'editor',
    isStaff: userInfo.userType === 'staff',
    isClient: userInfo.userType === 'client',
    isAdminOrEditor: userInfo.userType === 'admin' || userInfo.userType === 'editor',
  };
}
