import { useState, useEffect } from 'react';
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useStaffNotifications } from '@/hooks/useStaffNotifications';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertTriangle, Menu, LogOut, BookOpen, Home, Loader2,
} from 'lucide-react';
import { ChatNotificationDropdown } from '@/components/layout/ChatNotificationDropdown';
import { AdminNotificationDropdown } from '@/components/layout/AdminNotificationDropdown';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import webyanLogo from '@/assets/webyan-logo.svg';
import { rolePermissions, rolesInfo, type AppRole } from '@/lib/permissions';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminCommandPalette from '@/components/admin/AdminCommandPalette';
import { CopilotProvider } from '@/components/copilot/CopilotContext';
import CopilotLauncher from '@/components/copilot/CopilotLauncher';
import AICopilotPanel from '@/components/copilot/AICopilotPanel';

const STORAGE_KEY_COLLAPSED = 'admin-sidebar-collapsed';

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, role, loading, authStatus, authError, signOut, isAdminOrEditor } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY_COLLAPSED) === 'true'; } catch { return false; }
  });

  useStaffNotifications();
  const { requestPermission } = useBrowserNotification();
  useEffect(() => { requestPermission(); }, [requestPermission]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      navigate('/admin/login', { replace: true });
      return;
    }
    if (authStatus === 'authenticated' && !loading && user && !isAdminOrEditor) {
      navigate('/unauthorized?portal=admin&returnUrl=/admin', { replace: true });
    }
  }, [authStatus, loading, user, isAdminOrEditor, navigate]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLLAPSED, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const currentRole = role as AppRole | null;
  const permissions = currentRole ? rolePermissions[currentRole] : null;

  if (authStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">تعذر التحقق من الجلسة أو الصلاحيات</p>
            <p className="text-sm text-muted-foreground">
              {authError === 'timeout'
                ? 'انتهت مهلة التحقق. أعد المحاولة مرة أخرى.'
                : 'حدث خطأ أثناء التحقق. أعد تحميل الصفحة أو سجّل الدخول من جديد.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">إعادة المحاولة</Button>
            <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">تسجيل الخروج</Button>
          </div>
        </div>
      </div>
    );
  }

  if (authStatus === 'unknown' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authStatus !== 'authenticated' || !user || !isAdminOrEditor) return null;

  const getRoleLabel = () => currentRole && rolesInfo[currentRole] ? rolesInfo[currentRole].name : 'زائر';
  const getRoleBadgeColor = () => currentRole && rolesInfo[currentRole] ? rolesInfo[currentRole].badgeColor : 'bg-gray-100 text-gray-700';

  const sidebarWidth = sidebarCollapsed ? 'lg:pr-16' : 'lg:pr-64';

  return (
    <CopilotProvider>
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <AdminCommandPalette permissions={permissions} />

      {/* Top Header */}
      <header className="fixed top-0 right-0 left-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/admin" className="flex items-center gap-2">
              <img src={webyanLogo} alt="ويبيان" className="h-8 w-auto" />
              <span className="font-bold text-lg hidden sm:inline">لوحة التحكم</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <AdminNotificationDropdown />
            {permissions?.canViewAllChats && (
              <ChatNotificationDropdown userType="admin" linkTo="/admin/chat" />
            )}
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">عرض الدليل</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium">{user?.email}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", getRoleBadgeColor())}>
                      {getRoleLabel()}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    الصفحة الرئيسية
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="h-4 w-4 ml-2" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <AdminSidebar
          permissions={permissions}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        />
      </div>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="lg:hidden">
            <AdminSidebar
              permissions={permissions}
              collapsed={false}
              onToggleCollapse={() => setSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <main className={cn("min-h-screen pt-16 transition-all duration-300", sidebarWidth)}>
        <div className="p-6">
          <Outlet />
        </div>
      </main>

      {/* AI Copilot */}
      <CopilotLauncher />
      <AICopilotPanel />
    </div>
    </CopilotProvider>
  );
}
