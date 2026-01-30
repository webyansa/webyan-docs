import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface StaffPermissions {
  staffId: string | null;
  canReplyTickets: boolean;
  canManageContent: boolean;
  canAttendMeetings: boolean;
}

interface StaffAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isStaff: boolean;
  permissions: StaffPermissions;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const defaultPermissions: StaffPermissions = {
  staffId: null,
  canReplyTickets: false,
  canManageContent: false,
  canAttendMeetings: false,
};

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

const BOOTSTRAP_TIMEOUT_MS = 8000;

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [permissions, setPermissions] = useState<StaffPermissions>(defaultPermissions);
  const [loading, setLoading] = useState(true);
  
  // Track if initial bootstrap is complete
  const bootstrapCompleteRef = useRef(false);
  const mountedRef = useRef(true);
  const permissionsFetchedForUserRef = useRef<string | null>(null);

  const checkStaffPermissions = useCallback(async (userId: string): Promise<boolean> => {
    // Skip if already fetched for this user
    if (permissionsFetchedForUserRef.current === userId) {
      return isStaff;
    }

    try {
      console.log('[StaffAuth] Fetching permissions for user:', userId);
      
      const { data, error } = await supabase
        .rpc('get_staff_permissions', { _user_id: userId });

      if (!mountedRef.current) return false;

      if (error) {
        console.error('[StaffAuth] Error fetching staff permissions:', error);
        setIsStaff(false);
        setPermissions(defaultPermissions);
        permissionsFetchedForUserRef.current = userId;
        return false;
      }
      
      if (data && data.length > 0) {
        const staffData = data[0];
        console.log('[StaffAuth] Staff permissions found:', staffData);
        setIsStaff(true);
        setPermissions({
          staffId: staffData.staff_id,
          canReplyTickets: staffData.can_reply_tickets,
          canManageContent: staffData.can_manage_content,
          canAttendMeetings: staffData.can_attend_meetings,
        });
        permissionsFetchedForUserRef.current = userId;
        return true;
      } else {
        console.log('[StaffAuth] No staff permissions found');
        setIsStaff(false);
        setPermissions(defaultPermissions);
        permissionsFetchedForUserRef.current = userId;
        return false;
      }
    } catch (error) {
      console.error('[StaffAuth] Error checking staff permissions:', error);
      if (mountedRef.current) {
        setIsStaff(false);
        setPermissions(defaultPermissions);
        permissionsFetchedForUserRef.current = userId;
      }
      return false;
    }
  }, [isStaff]);

  useEffect(() => {
    mountedRef.current = true;
    let timeoutId: NodeJS.Timeout;

    // Safety timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (!mountedRef.current) return;
      if (!bootstrapCompleteRef.current) {
        console.warn('[StaffAuth] Bootstrap timeout reached, forcing load complete');
        bootstrapCompleteRef.current = true;
        setLoading(false);
      }
    }, BOOTSTRAP_TIMEOUT_MS);

    // Initial session check
    const initializeAuth = async () => {
      try {
        console.log('[StaffAuth] Starting initialization...');
        
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (!mountedRef.current) return;

        if (error) {
          console.error('[StaffAuth] Error getting session:', error);
          bootstrapCompleteRef.current = true;
          setLoading(false);
          return;
        }

        if (existingSession?.user) {
          console.log('[StaffAuth] Existing session found for:', existingSession.user.email);
          setSession(existingSession);
          setUser(existingSession.user);
          
          // Wait for permissions before completing bootstrap
          await checkStaffPermissions(existingSession.user.id);
        } else {
          console.log('[StaffAuth] No existing session');
        }
        
        bootstrapCompleteRef.current = true;
        if (mountedRef.current) {
          setLoading(false);
        }
      } catch (error) {
        console.error('[StaffAuth] Error during initialization:', error);
        if (mountedRef.current) {
          bootstrapCompleteRef.current = true;
          setLoading(false);
        }
      }
    };

    // Set up auth state listener for ONGOING changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession) => {
        if (!mountedRef.current) return;
        
        console.log('[StaffAuth] Auth state change:', event, newSession?.user?.email);

        // Update session and user immediately
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Handle different auth events
        if (event === 'SIGNED_IN' && newSession?.user) {
          // On sign in, fetch permissions and ensure loading is shown during this
          if (!bootstrapCompleteRef.current) {
            // Still in bootstrap, handled by initializeAuth
            return;
          }
          
          // Post-bootstrap sign in (e.g., user logged in via form)
          console.log('[StaffAuth] User signed in, fetching permissions...');
          setLoading(true);
          
          // Clear previous user's permissions cache
          permissionsFetchedForUserRef.current = null;
          
          await checkStaffPermissions(newSession.user.id);
          
          if (mountedRef.current) {
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear all state on sign out
          console.log('[StaffAuth] User signed out, clearing state');
          setIsStaff(false);
          setPermissions(defaultPermissions);
          permissionsFetchedForUserRef.current = null;
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          // Token refresh - silently update session without showing loading
          console.log('[StaffAuth] Token refreshed');
          // Only fetch permissions if we haven't for this user
          if (permissionsFetchedForUserRef.current !== newSession.user.id) {
            await checkStaffPermissions(newSession.user.id);
          }
        }
      }
    );

    // Start initialization
    initializeAuth();

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [checkStaffPermissions]);

  const signIn = async (email: string, password: string) => {
    console.log('[StaffAuth] Attempting sign in for:', email);
    
    // Clear previous state
    permissionsFetchedForUserRef.current = null;
    setIsStaff(false);
    setPermissions(defaultPermissions);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('[StaffAuth] Sign in error:', error.message);
    } else {
      console.log('[StaffAuth] Sign in successful');
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    console.log('[StaffAuth] Signing out...');
    
    // Clear state immediately for responsive UI
    setIsStaff(false);
    setPermissions(defaultPermissions);
    permissionsFetchedForUserRef.current = null;
    setSession(null);
    setUser(null);
    setLoading(false);

    try {
      await supabase.auth.signOut();
      console.log('[StaffAuth] Sign out successful');
    } catch (error) {
      console.error('[StaffAuth] Sign out error:', error);
    }
  };

  return (
    <StaffAuthContext.Provider
      value={{
        user,
        session,
        loading,
        isStaff,
        permissions,
        signIn,
        signOut,
      }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (context === undefined) {
    throw new Error('useStaffAuth must be used within a StaffAuthProvider');
  }
  return context;
}
