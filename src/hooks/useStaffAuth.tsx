import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { TimeoutError, withTimeout } from '@/hooks/staffAuth/withTimeout';

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
  authStatus: StaffAuthStatus;
  authError: StaffAuthError;
  isStaff: boolean;
  permissions: StaffPermissions;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  retryPermissions: () => Promise<void>;
}

type StaffAuthStatus = 'unknown' | 'authenticated' | 'unauthenticated' | 'error';
type StaffAuthError = 'timeout' | 'session' | 'permissions' | null;

const defaultPermissions: StaffPermissions = {
  staffId: null,
  canReplyTickets: false,
  canManageContent: false,
  canAttendMeetings: false,
};

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

const BOOTSTRAP_TIMEOUT_MS = 8000;
const PERMISSIONS_TIMEOUT_MS = 5000;

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [permissions, setPermissions] = useState<StaffPermissions>(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<StaffAuthStatus>('unknown');
  const [authError, setAuthError] = useState<StaffAuthError>(null);
  
  // Track if initial bootstrap is complete
  const bootstrapCompleteRef = useRef(false);
  const mountedRef = useRef(true);
  const permissionsResolvedForUserIdRef = useRef<string | null>(null);
  const permissionsResolvedStatusRef = useRef<'staff' | 'not_staff' | null>(null);
  const permissionsInFlightForUserIdRef = useRef<string | null>(null);
  const permissionsInFlightPromiseRef = useRef<Promise<boolean> | null>(null);
  const explicitSignInRef = useRef(false);
  const isStaffRef = useRef(isStaff);

  useEffect(() => {
    isStaffRef.current = isStaff;
  }, [isStaff]);

  const checkStaffPermissions = useCallback(
    async (userId: string, mode: 'strict' | 'soft' = 'strict'): Promise<boolean> => {
      // If we already resolved staff/not_staff for this user, reuse it.
      if (
        permissionsResolvedForUserIdRef.current === userId &&
        permissionsResolvedStatusRef.current
      ) {
        return permissionsResolvedStatusRef.current === 'staff';
      }

      // Deduplicate in-flight requests.
      if (
        permissionsInFlightPromiseRef.current &&
        permissionsInFlightForUserIdRef.current === userId
      ) {
        return permissionsInFlightPromiseRef.current;
      }

      const promise = (async () => {
        try {
          console.log(`[StaffAuth] Fetching permissions (${mode}) for user:`, userId);

          type StaffPermissionsRpcRow = {
            can_attend_meetings: boolean;
            can_manage_content: boolean;
            can_reply_tickets: boolean;
            staff_id: string;
          };

          const rpcResult = await withTimeout(
            supabase.rpc('get_staff_permissions', { _user_id: userId }) as unknown as PromiseLike<{
              data: StaffPermissionsRpcRow[] | null;
              error: unknown;
            }>,
            PERMISSIONS_TIMEOUT_MS,
            'get_staff_permissions'
          );

          const { data, error } = rpcResult;

          if (!mountedRef.current) return false;

          if (error) {
            console.error('[StaffAuth] Error fetching staff permissions:', error);

            // Soft refresh: keep the last known permissions to avoid blocking UI on tab return.
            if (mode === 'soft') {
              return isStaffRef.current;
            }

            // Strict: fail closed but surface an error state instead of infinite loading.
            setIsStaff(false);
            setPermissions(defaultPermissions);
            setAuthStatus('error');
            setAuthError('permissions');
            return false;
          }

          if (data && data.length > 0) {
            const staffData = data[0];
            console.log('[StaffAuth] Staff permissions found:', staffData);
            setAuthError(null);
            setIsStaff(true);
            setPermissions({
              staffId: staffData.staff_id,
              canReplyTickets: staffData.can_reply_tickets,
              canManageContent: staffData.can_manage_content,
              canAttendMeetings: staffData.can_attend_meetings,
            });
            permissionsResolvedForUserIdRef.current = userId;
            permissionsResolvedStatusRef.current = 'staff';
            return true;
          }

          console.log('[StaffAuth] No staff permissions found');
          setAuthError(null);
          setIsStaff(false);
          setPermissions(defaultPermissions);
          permissionsResolvedForUserIdRef.current = userId;
          permissionsResolvedStatusRef.current = 'not_staff';
          return false;
        } catch (error) {
          const isTimeout = error instanceof TimeoutError;
          console.error('[StaffAuth] Error checking staff permissions:', error);
          if (!mountedRef.current) return false;

          if (mode === 'soft') {
            // Keep last known permissions (do not block the UI on tab return)
            return isStaffRef.current;
          }

          setIsStaff(false);
          setPermissions(defaultPermissions);
          setAuthStatus('error');
          setAuthError(isTimeout ? 'timeout' : 'permissions');
          return false;
        } finally {
          if (permissionsInFlightForUserIdRef.current === userId) {
            permissionsInFlightForUserIdRef.current = null;
            permissionsInFlightPromiseRef.current = null;
          }
        }
      })();

      permissionsInFlightForUserIdRef.current = userId;
      permissionsInFlightPromiseRef.current = promise;
      return promise;
    },
    []
  );

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
        setAuthStatus('unknown');
        setAuthError(null);
        
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (!mountedRef.current) return;

        if (error) {
          console.error('[StaffAuth] Error getting session:', error);
          setAuthStatus('error');
          setAuthError('session');
          bootstrapCompleteRef.current = true;
          setLoading(false);
          return;
        }

        if (existingSession?.user) {
          console.log('[StaffAuth] Existing session found for:', existingSession.user.email);
          setSession(existingSession);
          setUser(existingSession.user);
          setAuthStatus('authenticated');
          
          // Wait for permissions before completing bootstrap
          await checkStaffPermissions(existingSession.user.id, 'strict');
        } else {
          console.log('[StaffAuth] No existing session');
          setAuthStatus('unauthenticated');
        }
        
        bootstrapCompleteRef.current = true;
        if (mountedRef.current) {
          setLoading(false);
        }
      } catch (error) {
        console.error('[StaffAuth] Error during initialization:', error);
        if (mountedRef.current) {
          setAuthStatus('error');
          setAuthError('session');
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

        if (!newSession?.user) {
          setAuthStatus('unauthenticated');
          setAuthError(null);
        } else {
          setAuthStatus('authenticated');
        }

        // Handle different auth events
        if (event === 'SIGNED_IN' && newSession?.user) {
          if (!bootstrapCompleteRef.current) {
            // Still in bootstrap, handled by initializeAuth
            return;
          }

          const isExplicitSignIn = explicitSignInRef.current;
          explicitSignInRef.current = false;

          // If this SIGNED_IN came from an explicit login form submission, block until permissions resolve.
          // Otherwise (tab return / rehydrate), refresh permissions silently to avoid a full-screen overlay.
          console.log('[StaffAuth] User signed in, refreshing permissions...', { isExplicitSignIn });

          if (isExplicitSignIn) {
            setLoading(true);
            setAuthError(null);
            setAuthStatus('authenticated');
            permissionsResolvedForUserIdRef.current = null;
            permissionsResolvedStatusRef.current = null;
            await checkStaffPermissions(newSession.user.id, 'strict');
            if (mountedRef.current) setLoading(false);
          } else {
            // Soft, non-blocking refresh
            void checkStaffPermissions(newSession.user.id, 'soft');
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear all state on sign out
          console.log('[StaffAuth] User signed out, clearing state');
          setAuthStatus('unauthenticated');
          setAuthError(null);
          setIsStaff(false);
          setPermissions(defaultPermissions);
          permissionsResolvedForUserIdRef.current = null;
          permissionsResolvedStatusRef.current = null;
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          // Token refresh - silently update session without showing loading
          console.log('[StaffAuth] Token refreshed');
          void checkStaffPermissions(newSession.user.id, 'soft');
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
    explicitSignInRef.current = true;
    
    // Clear previous state
    permissionsResolvedForUserIdRef.current = null;
    permissionsResolvedStatusRef.current = null;
    setIsStaff(false);
    setPermissions(defaultPermissions);
    setAuthError(null);
    
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
    setAuthStatus('unauthenticated');
    setAuthError(null);
    setIsStaff(false);
    setPermissions(defaultPermissions);
    permissionsResolvedForUserIdRef.current = null;
    permissionsResolvedStatusRef.current = null;
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

  const retryPermissions = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;

    setAuthStatus('authenticated');
    setAuthError(null);
    setLoading(true);

    permissionsResolvedForUserIdRef.current = null;
    permissionsResolvedStatusRef.current = null;

    await checkStaffPermissions(userId, 'strict');

    if (mountedRef.current) setLoading(false);
  }, [user?.id, checkStaffPermissions]);

  return (
    <StaffAuthContext.Provider
      value={{
        user,
        session,
        loading,
        authStatus,
        authError,
        isStaff,
        permissions,
        signIn,
        signOut,
        retryPermissions,
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
