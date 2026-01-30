import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
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

const BOOTSTRAP_TIMEOUT_MS = 5000;

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [permissions, setPermissions] = useState<StaffPermissions>(defaultPermissions);

  // Separate loading states for proper sequencing
  const [authBootstrapLoading, setAuthBootstrapLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsResolvedForUserId, setPermissionsResolvedForUserId] = useState<string | null>(null);
  
  const permissionsResolvedRef = useRef<string | null>(null);
  const fetchInFlightRef = useRef<Promise<void> | null>(null);
  const fetchUserIdRef = useRef<string | null>(null);
  const lastUserRef = useRef<User | null>(null);

  const checkStaffPermissions = useCallback(async (userId: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;

    // Deduplicate concurrent requests for the same user
    if (fetchInFlightRef.current && fetchUserIdRef.current === userId) {
      return fetchInFlightRef.current;
    }

    fetchUserIdRef.current = userId;

    const promise = (async () => {
      const isFirstResolve = permissionsResolvedRef.current !== userId;
      const shouldShowLoading = !silent && isFirstResolve;
      
      if (shouldShowLoading) {
        setPermissionsLoading(true);
      }

      try {
        const { data, error } = await supabase
          .rpc('get_staff_permissions', { _user_id: userId });

        if (error) {
          console.error('Error fetching staff permissions:', error);
          setIsStaff(false);
          setPermissions(defaultPermissions);
        } else if (data && data.length > 0) {
          const staffData = data[0];
          setIsStaff(true);
          setPermissions({
            staffId: staffData.staff_id,
            canReplyTickets: staffData.can_reply_tickets,
            canManageContent: staffData.can_manage_content,
            canAttendMeetings: staffData.can_attend_meetings,
          });
        } else {
          setIsStaff(false);
          setPermissions(defaultPermissions);
        }

        // Mark as resolved for this user
        setPermissionsResolvedForUserId(userId);
        permissionsResolvedRef.current = userId;
      } catch (error) {
        console.error('Error checking staff permissions:', error);
        setIsStaff(false);
        setPermissions(defaultPermissions);
      } finally {
        setPermissionsLoading(false);
      }
    })();

    fetchInFlightRef.current = promise;
    promise.finally(() => {
      if (fetchInFlightRef.current === promise) {
        fetchInFlightRef.current = null;
      }
    });

    return promise;
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrapTimeoutId = window.setTimeout(() => {
      if (!mounted) return;
      // Timeout: force loading to complete to avoid infinite spinner
      console.warn('Staff auth bootstrap timeout');
      setAuthBootstrapLoading(false);
      setPermissionsLoading(false);
    }, BOOTSTRAP_TIMEOUT_MS);

    // Set up auth state listener FIRST (for ONGOING auth changes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        
        lastUserRef.current = newSession?.user ?? null;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // Defer permission check to avoid auth deadlock - use silent mode
          setTimeout(() => {
            if (mounted) {
              checkStaffPermissions(newSession.user.id, { silent: true });
            }
          }, 0);
        } else {
          // Clear staff state immediately on sign out
          setIsStaff(false);
          setPermissions(defaultPermissions);
          setPermissionsResolvedForUserId(null);
          permissionsResolvedRef.current = null;
          setPermissionsLoading(false);
        }
        
        // Mark auth bootstrap as complete after first state change
        setAuthBootstrapLoading(false);
        window.clearTimeout(bootstrapTimeoutId);
      }
    );

    // THEN check for existing session (INITIAL load - controls loading state)
    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        window.clearTimeout(bootstrapTimeoutId);

        if (error) {
          console.error('Error getting session:', error);
          setAuthBootstrapLoading(false);
          return;
        }

        lastUserRef.current = existingSession?.user ?? null;
        setSession(existingSession);
        setUser(existingSession?.user ?? null);

        // Fetch permissions BEFORE setting loading to false
        if (existingSession?.user) {
          await checkStaffPermissions(existingSession.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setAuthBootstrapLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      window.clearTimeout(bootstrapTimeoutId);
      subscription.unsubscribe();
    };
  }, [checkStaffPermissions]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Optimistic local reset to avoid redirect loops
    setIsStaff(false);
    setPermissions(defaultPermissions);
    setPermissionsResolvedForUserId(null);
    permissionsResolvedRef.current = null;
    setSession(null);
    setUser(null);
    lastUserRef.current = null;
    setAuthBootstrapLoading(false);
    setPermissionsLoading(false);

    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
    } catch {
      // Even if signOut times out, keep UI logged out
    }
  };

  // Permissions are ready when:
  // - User is not logged in, OR
  // - Permissions have been resolved for the current user
  const permissionsReady = !user?.id || permissionsResolvedForUserId === user.id;

  // Combined loading: wait for bootstrap + permissions resolution
  const isFullyLoaded = !authBootstrapLoading && !permissionsLoading && permissionsReady;

  return (
    <StaffAuthContext.Provider
      value={{
        user,
        session,
        loading: !isFullyLoaded,
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
