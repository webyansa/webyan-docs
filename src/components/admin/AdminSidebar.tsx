import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  LayoutDashboard, BarChart3, Globe, UserPlus, Target, FileText, Building2, Tag,
  FolderKanban, Rocket, Layers, CalendarDays, Mail, Ticket, AlertTriangle, Code2,
  MessageSquare, Archive, Zap, Settings, Calendar, Image, FolderTree, Tags, History,
  UserCog, Users, Shield, Search, Sparkles, ThumbsUp, ChevronDown, PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type RolePermissions } from '@/lib/permissions';
import webyanLogo from '@/assets/webyan-logo.svg';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: keyof RolePermissions;
}

interface NavModule {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: NavItem[];
  sectionPermission?: keyof RolePermissions;
}

const SIDEBAR_MODULES: NavModule[] = [
  {
    id: 'dashboard',
    title: 'لوحة التحكم',
    icon: LayoutDashboard,
    color: 'text-primary',
    items: [
      { title: 'الرئيسية', href: '/admin', icon: LayoutDashboard, permission: 'canAccessAdminDashboard' },
      { title: 'التقارير', href: '/admin/reports', icon: BarChart3, permission: 'canViewReports' },
    ],
  },
  {
    id: 'crm',
    title: 'إدارة العملاء',
    icon: Building2,
    color: 'text-blue-600',
    sectionPermission: 'canManageClients',
    items: [
      { title: 'طلبات الموقع', href: '/admin/website-requests', icon: Globe, permission: 'canManageClients' },
      { title: 'العملاء المحتملون', href: '/admin/crm/leads', icon: UserPlus, permission: 'canManageClients' },
      { title: 'الفرص', href: '/admin/crm/deals', icon: Target, permission: 'canManageClients' },
      { title: 'عروض الأسعار', href: '/admin/crm/quotes', icon: FileText, permission: 'canManageClients' },
      { title: 'العملاء', href: '/admin/clients', icon: Building2, permission: 'canManageClients' },
      { title: 'طلبات الاشتراك', href: '/admin/subscription-requests', icon: FileText, permission: 'canManageClients' },
      { title: 'الخصومات', href: '/admin/discounts', icon: Tag, permission: 'canManageClients' },
    ],
  },
  {
    id: 'operations',
    title: 'العمليات والمشاريع',
    icon: FolderKanban,
    color: 'text-purple-600',
    sectionPermission: 'canManageClients',
    items: [
      { title: 'لوحة العمليات', href: '/admin/operations', icon: FolderKanban, permission: 'canManageClients' },
      { title: 'المشاريع', href: '/admin/projects', icon: Rocket, permission: 'canManageClients' },
      { title: 'مراحل المشاريع', href: '/admin/project-stages', icon: Layers, permission: 'canManageClients' },
      { title: 'خط التسليم', href: '/admin/crm/delivery', icon: FolderKanban, permission: 'canManageClients' },
    ],
  },
  {
    id: 'marketing',
    title: 'التسويق',
    icon: Target,
    color: 'text-orange-600',
    sectionPermission: 'canManageClients',
    items: [
      { title: 'الخطط التسويقية', href: '/admin/marketing/plans', icon: Target, permission: 'canManageClients' },
      { title: 'تقويم المحتوى', href: '/admin/marketing/content', icon: CalendarDays, permission: 'canManageClients' },
      { title: 'الحملات البريدية', href: '/admin/marketing/email', icon: Mail, permission: 'canManageClients' },
      { title: 'القوالب البريدية', href: '/admin/marketing/templates', icon: FileText, permission: 'canManageClients' },
    ],
  },
  {
    id: 'support',
    title: 'الدعم الفني',
    icon: Ticket,
    color: 'text-red-600',
    sectionPermission: 'canViewAllTickets',
    items: [
      { title: 'التذاكر', href: '/admin/tickets', icon: Ticket, permission: 'canViewAllTickets' },
      { title: 'البلاغات', href: '/admin/issues', icon: AlertTriangle, permission: 'canViewAllTickets' },
      { title: 'إعدادات التصعيد', href: '/admin/escalation-settings', icon: AlertTriangle, permission: 'canManageEscalation' },
      { title: 'تضمين التذاكر', href: '/admin/embed-settings', icon: Code2, permission: 'canManageEmbedSettings' },
    ],
  },
  {
    id: 'chat',
    title: 'المحادثات',
    icon: MessageSquare,
    color: 'text-green-600',
    sectionPermission: 'canViewAllChats',
    items: [
      { title: 'صندوق الوارد', href: '/admin/chat', icon: MessageSquare, permission: 'canViewAllChats' },
      { title: 'المؤرشفة', href: '/admin/archived-chats', icon: Archive, permission: 'canViewAllChats' },
      { title: 'الردود السريعة', href: '/admin/quick-replies', icon: Zap, permission: 'canManageQuickReplies' },
      { title: 'إعدادات الشات', href: '/admin/chat-settings', icon: Settings, permission: 'canManageSystemSettings' },
      { title: 'تضمين الدردشة', href: '/admin/chat-embed', icon: Code2, permission: 'canManageEmbedSettings' },
    ],
  },
  {
    id: 'meetings',
    title: 'الاجتماعات',
    icon: Calendar,
    color: 'text-cyan-600',
    sectionPermission: 'canViewAllMeetings',
    items: [
      { title: 'طلبات الاجتماعات', href: '/admin/meetings', icon: CalendarDays, permission: 'canViewAllMeetings' },
      { title: 'إعدادات المواعيد', href: '/admin/meeting-settings', icon: Calendar, permission: 'canManageMeetingSettings' },
    ],
  },
  {
    id: 'content',
    title: 'المحتوى',
    icon: FileText,
    color: 'text-indigo-600',
    items: [
      { title: 'المقالات', href: '/admin/articles', icon: FileText, permission: 'canManageArticles' },
      { title: 'شجرة المحتوى', href: '/admin/content-tree', icon: FolderTree, permission: 'canManageContentTree' },
      { title: 'الوسائط', href: '/admin/media', icon: Image, permission: 'canManageMedia' },
      { title: 'الوسوم', href: '/admin/tags', icon: Tags, permission: 'canManageTags' },
      { title: 'سجل التحديثات', href: '/admin/changelog', icon: History, permission: 'canManageChangelog' },
      { title: 'التقييمات', href: '/admin/feedback', icon: ThumbsUp, permission: 'canManageClients' },
    ],
  },
  {
    id: 'staff',
    title: 'فريق العمل',
    icon: UserCog,
    color: 'text-amber-600',
    sectionPermission: 'canManageStaff',
    items: [
      { title: 'الموظفين', href: '/admin/staff', icon: UserCog, permission: 'canManageStaff' },
      { title: 'أداء الموظفين', href: '/admin/staff-performance', icon: BarChart3, permission: 'canViewStaffPerformance' },
    ],
  },
  {
    id: 'system',
    title: 'النظام',
    icon: Settings,
    color: 'text-slate-600',
    sectionPermission: 'canManageSystemSettings',
    items: [
      { title: 'إعدادات التسعير', href: '/admin/pricing-settings', icon: Settings, permission: 'canManageSystemSettings' },
      { title: 'إعدادات عروض الأسعار', href: '/admin/quote-settings', icon: FileText, permission: 'canManageSystemSettings' },
      { title: 'المستخدمين', href: '/admin/users', icon: Users, permission: 'canManageUsers' },
      { title: 'الأدوار والصلاحيات', href: '/admin/roles', icon: Shield, permission: 'canManageRoles' },
      { title: 'سجل النشاط', href: '/admin/activity-log', icon: History, permission: 'canViewActivityLogs' },
      { title: 'سجل البحث', href: '/admin/search-logs', icon: Search, permission: 'canViewSearchLogs' },
      { title: 'سجل البريد', href: '/admin/email-logs', icon: Mail, permission: 'canManageSystemSettings' },
      { title: 'سجل توليد AI', href: '/admin/ai-logs', icon: Sparkles, permission: 'canManageSystemSettings' },
      { title: 'إعدادات SMTP', href: '/admin/smtp-settings', icon: Mail, permission: 'canManageSystemSettings' },
      { title: 'الإعدادات العامة', href: '/admin/settings', icon: Settings, permission: 'canManageSystemSettings' },
      { title: 'اختبار نماذج AI', href: '/admin/ai-chat-tester', icon: Sparkles, permission: 'canManageSystemSettings' },
    ],
  },
];

const STORAGE_KEY_COLLAPSED = 'admin-sidebar-collapsed';
const STORAGE_KEY_OPEN_MODULES = 'admin-sidebar-open-modules';

interface AdminSidebarProps {
  permissions: RolePermissions | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function AdminSidebar({ permissions, collapsed, onToggleCollapse }: AdminSidebarProps) {
  const location = useLocation();

  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPEN_MODULES);
      return saved ? JSON.parse(saved) : { dashboard: true };
    } catch { return { dashboard: true }; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_OPEN_MODULES, JSON.stringify(openModules));
  }, [openModules]);

  const filteredModules = useMemo(() => {
    if (!permissions) return [];
    return SIDEBAR_MODULES
      .filter(mod => {
        if (mod.sectionPermission) return permissions[mod.sectionPermission];
        return true;
      })
      .map(mod => ({
        ...mod,
        items: mod.items.filter(item => !item.permission || permissions[item.permission]),
      }))
      .filter(mod => mod.items.length > 0);
  }, [permissions]);

  const isActive = (href: string) => {
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  const activeModuleId = useMemo(() => {
    for (const mod of filteredModules) {
      if (mod.items.some(item => isActive(item.href))) return mod.id;
    }
    return null;
  }, [location.pathname, filteredModules]);

  // Auto-open active module
  useEffect(() => {
    if (activeModuleId && !openModules[activeModuleId]) {
      setOpenModules(prev => ({ ...prev, [activeModuleId]: true }));
    }
  }, [activeModuleId]);

  const toggleModule = (id: string) => {
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "fixed top-16 right-0 z-40 h-[calc(100vh-4rem)] border-l bg-sidebar-background transition-all duration-300 flex flex-col",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Search trigger */}
        {!collapsed && (
          <div className="p-3 border-b border-sidebar-border">
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
                document.dispatchEvent(event);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>بحث سريع...</span>
              <kbd className="mr-auto text-[10px] bg-background border rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
            </button>
          </div>
        )}

        <ScrollArea className="flex-1 py-2">
          <nav className="px-2 space-y-1">
            {filteredModules.map((mod) => {
              const isModuleActive = activeModuleId === mod.id;
              const isOpen = openModules[mod.id] ?? false;

              if (collapsed) {
                return (
                  <Tooltip key={mod.id}>
                    <TooltipTrigger asChild>
                      <Link
                        to={mod.items[0]?.href || '/admin'}
                        className={cn(
                          "flex items-center justify-center w-full h-10 rounded-lg transition-colors",
                          isModuleActive
                            ? "bg-sidebar-accent"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <mod.icon className={cn("h-5 w-5", isModuleActive ? mod.color : "text-muted-foreground")} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="font-medium">
                      {mod.title}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Collapsible key={mod.id} open={isOpen} onOpenChange={() => toggleModule(mod.id)}>
                  <CollapsibleTrigger className="w-full">
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full",
                        isModuleActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-muted/50"
                      )}
                    >
                      <mod.icon className={cn("h-4.5 w-4.5 shrink-0", mod.color)} />
                      <span className="flex-1 text-right">{mod.title}</span>
                      <ChevronDown className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180"
                      )} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1 mr-6 border-r-2 border-sidebar-border pr-3 space-y-0.5">
                      {mod.items.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors flex-row-reverse",
                            isActive(item.href)
                              ? "bg-primary text-primary-foreground font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1 text-right">{item.title}</span>
                        </Link>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="w-full justify-center"
          >
            {collapsed ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export { SIDEBAR_MODULES };
