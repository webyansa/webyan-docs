import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Ticket,
  Calendar,
  CreditCard,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  Building2,
  Bell,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  HelpCircle,
  X,
} from 'lucide-react';
import { ChatNotificationDropdown } from '@/components/layout/ChatNotificationDropdown';
import { PortalChatWidget } from '@/components/chat/PortalChatWidget';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import webyanLogo from '@/assets/webyan-logo.svg';

interface ClientInfo {
  full_name: string;
  email: string;
  job_title: string | null;
  organization_id: string;
  organization: {
    name: string;
    logo_url: string | null;
    subscription_status: string;
    subscription_plan: string | null;
  };
}

const menuItems = [
  { path: '/portal', label: 'لوحة التحكم', icon: LayoutDashboard, exact: true },
  { path: '/portal/tickets', label: 'تذاكر الدعم', icon: Ticket },
  { path: '/portal/chat', label: 'المحادثات', icon: MessageSquare },
  { path: '/portal/meetings', label: 'الاجتماعات', icon: Calendar },
  { path: '/portal/subscription', label: 'الاشتراك', icon: CreditCard },
  { path: '/portal/settings', label: 'الإعدادات', icon: Settings },
];

const subscriptionStatusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  trial: { label: 'تجريبي', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  active: { label: 'نشط', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  pending_renewal: { label: 'في انتظار التجديد', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  expired: { label: 'منتهي', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  cancelled: { label: 'ملغي', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/30' },
};

const PORTAL_GUARD_TIMEOUT_MS = 5000;

const PortalLayout = () => {
  const { user, signOut, authStatus, authError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [clientResolvedForUserId, setClientResolvedForUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadNotifications] = useState(0);

  // Route guard: unauthenticated -> portal login (with returnUrl)
  useEffect(() => {
    if (authStatus !== 'unauthenticated') return;
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    navigate(`/portal/login?returnUrl=${returnUrl}`, { replace: true });
  }, [authStatus, location.pathname, location.search, navigate]);

  useEffect(() => {
    const uid = user?.id;
    if (authStatus === 'authenticated' && uid) {
      if (clientResolvedForUserId !== uid) {
        fetchClientInfo();
      }
    }
  }, [authStatus, user?.id, clientResolvedForUserId]);

  const redirectNonClient = async () => {
    try {
      if (!user) {
        navigate('/portal/login', { replace: true });
        return;
      }

      const { data, error } = await supabase.rpc('get_user_type', { _user_id: user.id });
      if (error) throw error;

      const userType = (data?.[0]?.user_type || null) as string | null;
      if (userType === 'staff') {
        navigate('/unauthorized?portal=client&returnUrl=/support', { replace: true });
      } else if (userType === 'admin' || userType === 'editor') {
        navigate('/unauthorized?portal=client&returnUrl=/admin', { replace: true });
      } else {
        navigate('/unauthorized?portal=client&returnUrl=/', { replace: true });
      }
    } catch {
      navigate('/portal/login', { replace: true });
    }
  };

  const fetchClientInfo = async (opts?: { silent?: boolean }) => {
    if (!user) return;

    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);

    const withTimeout = async <T,>(thenable: PromiseLike<T>, ms: number): Promise<T> => {
      return (await Promise.race([
        Promise.resolve(thenable),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('timeout')), ms)),
      ])) as T;
    };

    try {
      const query = supabase
        .from('client_accounts')
        .select(`
          full_name,
          email,
          job_title,
          organization_id,
          organization:client_organizations (
            name,
            logo_url,
            subscription_status,
            subscription_plan
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      const { data, error } = (await withTimeout(query, PORTAL_GUARD_TIMEOUT_MS)) as any;
      if (error) throw error;

      if (data && data.organization) {
        const org = Array.isArray(data.organization) ? data.organization[0] : data.organization;
        setClientInfo({
          full_name: data.full_name,
          email: data.email,
          job_title: data.job_title,
          organization_id: data.organization_id,
          organization: org,
        });
        setClientResolvedForUserId(user.id);
      } else {
        if (!silent) {
          toast.error('ليس لديك صلاحية الوصول لبوابة العملاء');
          await redirectNonClient();
        }
      }
    } catch (error: any) {
      if (silent) {
        console.warn('Silent client info refresh failed:', error);
        return;
      }

      if (error?.message === 'timeout') {
        toast.error('تعذر التحقق من الحساب، أعد المحاولة');
        navigate('/portal/login?reason=timeout', { replace: true });
      } else {
        console.error('Error fetching client info:', error);
        toast.error('ليس لديك صلاحية الوصول لبوابة العملاء');
        await redirectNonClient();
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/portal/login', { replace: true });
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const getCurrentPageTitle = () => {
    const currentItem = menuItems.find(item => isActive(item.path, item.exact));
    return currentItem?.label || 'بوابة العملاء';
  };

  if (authStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <Loader2 className="h-10 w-10 text-destructive" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">تعذر التحقق من الجلسة</p>
            <p className="text-sm text-muted-foreground">
              {authError === 'timeout'
                ? 'انتهت مهلة التحقق. أعد المحاولة مرة أخرى.'
                : 'حدث خطأ أثناء التحقق. أعد تحميل الصفحة أو سجّل الدخول من جديد.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">
              إعادة المحاولة
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (authStatus === 'unknown') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري التحقق من الحساب...</p>
        </div>
      </div>
    );
  }

  if (authStatus !== 'authenticated') return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
            <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">جاري تحميل البوابة...</p>
        </div>
      </div>
    );
  }

  if (!clientInfo) return null;

  const subscriptionStatus = subscriptionStatusConfig[clientInfo.organization.subscription_status] || subscriptionStatusConfig.active;

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo & Organization */}
      <div className={cn(
        "p-4 border-b border-border/50",
        sidebarCollapsed && !mobile ? "px-2" : ""
      )}>
        <div className={cn(
          "flex items-center gap-3",
          sidebarCollapsed && !mobile ? "justify-center" : ""
        )}>
          {clientInfo.organization.logo_url ? (
            <img
              src={clientInfo.organization.logo_url}
              alt={clientInfo.organization.name}
              className={cn(
                "rounded-xl object-cover shadow-sm",
                sidebarCollapsed && !mobile ? "w-10 h-10" : "w-11 h-11"
              )}
              loading="lazy"
            />
          ) : (
            <div className={cn(
              "rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm",
              sidebarCollapsed && !mobile ? "w-10 h-10" : "w-11 h-11"
            )}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
          )}
          {(!sidebarCollapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-foreground text-sm truncate">{clientInfo.organization.name}</h2>
              <span className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mt-1",
                subscriptionStatus.bg,
                subscriptionStatus.color
              )}>
                {subscriptionStatus.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-4 space-y-1 overflow-y-auto",
        sidebarCollapsed && !mobile ? "px-2" : "px-3"
      )}>
        <TooltipProvider delayDuration={0}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            
            const NavItem = (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl transition-all duration-200 group relative",
                  sidebarCollapsed && !mobile ? "p-3 justify-center" : "px-4 py-3",
                  active
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 flex-shrink-0 transition-transform",
                  active ? "" : "group-hover:scale-110"
                )} />
                {(!sidebarCollapsed || mobile) && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
                {active && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-l-full" />
                )}
              </Link>
            );

            if (sidebarCollapsed && !mobile) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    {NavItem}
                  </TooltipTrigger>
                  <TooltipContent side="left" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return NavItem;
          })}
        </TooltipProvider>
      </nav>

      {/* User Section */}
      <div className={cn(
        "border-t border-border/50",
        sidebarCollapsed && !mobile ? "p-2" : "p-4"
      )}>
        {sidebarCollapsed && !mobile ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSignOut}
                  className="w-full p-3 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                تسجيل الخروج
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-muted/50">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-semibold">
                  {clientInfo.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{clientInfo.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {clientInfo.job_title || 'عميل'}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </Button>
          </>
        )}
      </div>

      {/* Collapse Button (Desktop Only) */}
      {!mobile && (
        <div className="p-3 border-t border-border/50">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            {sidebarCollapsed ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Top Header Bar */}
      <header className={cn(
        "fixed top-0 right-0 left-0 h-16 bg-background/95 backdrop-blur-md border-b border-border/50 z-40 transition-all duration-300",
        sidebarCollapsed ? "lg:pr-[72px]" : "lg:pr-72"
      )}>
        <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="فتح القائمة">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <SidebarContent mobile />
              </SheetContent>
            </Sheet>

            {/* Page Title */}
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground">{getCurrentPageTitle()}</h1>
            </div>
          </div>

          {/* Logo for Mobile */}
          <div className="lg:hidden flex items-center gap-2">
            <img src={webyanLogo} alt="ويبيان" className="h-8 w-auto" />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Help Button */}
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <HelpCircle className="w-5 h-5" />
            </Button>

            {/* Chat Notifications */}
            {clientInfo?.organization_id && (
              <ChatNotificationDropdown
                userType="client"
                organizationId={clientInfo.organization_id}
                linkTo="/portal/chat"
              />
            )}

            {/* General Notifications */}
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted transition-colors">
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary text-sm font-semibold">
                      {clientInfo.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-foreground leading-none mb-0.5">{clientInfo.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{clientInfo.organization.name}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2">
                  <p className="font-medium text-foreground">{clientInfo.full_name}</p>
                  <p className="text-xs text-muted-foreground">{clientInfo.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/portal/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 ml-2" />
                    الإعدادات
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 ml-2" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:right-0 lg:flex lg:flex-col bg-background border-l border-border/50 shadow-sm z-50 transition-all duration-300",
        sidebarCollapsed ? "lg:w-[72px]" : "lg:w-72"
      )}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className={cn(
        "pt-16 min-h-screen transition-all duration-300",
        sidebarCollapsed ? "lg:pr-[72px]" : "lg:pr-72"
      )}>
        <div className="min-h-[calc(100vh-4rem)]">
          <Outlet context={{ clientInfo }} />
        </div>
      </main>

      {/* Floating Chat Widget */}
      <PortalChatWidget
        clientName={clientInfo.full_name}
        clientEmail={clientInfo.email}
        organizationId={clientInfo.organization_id}
      />
    </div>
  );
};

export default PortalLayout;
