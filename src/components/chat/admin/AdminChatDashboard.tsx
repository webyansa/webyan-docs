import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChat, Conversation, Message } from '@/hooks/useChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, Users, Clock, AlertTriangle, Send,
  TrendingUp, ArrowUpRight, Loader2, Settings, Search,
  Inbox, UserPlus, X, RotateCcw, Ticket, Circle, Eye,
  Phone, Mail, ExternalLink, Plus, ChevronLeft, Building2,
  MoreHorizontal, StickyNote, CheckCheck, Check, UserCheck,
  Filter, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChatStats {
  totalConversations: number;
  activeConversations: number;
  unassignedConversations: number;
  closedToday: number;
  avgResponseTime: string;
  totalMessages: number;
  customersUnread: number;
  internalUnread: number;
}

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  agent_status: 'available' | 'busy' | 'offline';
  active_conversations_count: number;
}

const statusColors = {
  available: 'bg-green-500',
  busy: 'bg-yellow-500',
  offline: 'bg-gray-400'
};

const statusLabels = {
  available: 'متاح',
  busy: 'مشغول',
  offline: 'غير متصل'
};

const conversationStatusConfig = {
  unassigned: { label: 'غير مسندة', color: 'bg-amber-500', textColor: 'text-amber-600', bgLight: 'bg-amber-50', icon: AlertTriangle },
  assigned: { label: 'مسندة', color: 'bg-green-500', textColor: 'text-green-600', bgLight: 'bg-green-50', icon: UserCheck },
  closed: { label: 'مغلقة', color: 'bg-gray-400', textColor: 'text-gray-500', bgLight: 'bg-gray-50', icon: X }
};

type ConversationFilter = 'all' | 'unassigned' | 'assigned' | 'closed';
type ConversationTab = 'customers' | 'internal';

export default function AdminChatDashboard() {
  const { toast } = useToast();
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    sending,
    fetchConversations,
    sendMessage,
    assignConversation,
    closeConversation,
    reopenConversation,
    convertToTicket,
    selectConversation,
    setCurrentConversation
  } = useChat({ autoFetch: true });

  const [stats, setStats] = useState<ChatStats>({
    totalConversations: 0,
    activeConversations: 0,
    unassignedConversations: 0,
    closedToday: 0,
    avgResponseTime: '—',
    totalMessages: 0,
    customersUnread: 0,
    internalUnread: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ConversationTab>('customers');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showNewInternalChat, setShowNewInternalChat] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('technical');
  const [ticketPriority, setTicketPriority] = useState('medium');
  const [internalMessage, setInternalMessage] = useState('');
  const [adminName, setAdminName] = useState('الإدارة');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetchStats();
    fetchStaffMembers();
    fetchAdminName();
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      calculateStats();
    }
  }, [conversations]);

  const fetchAdminName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (data?.full_name) {
        setAdminName(data.full_name);
      }
    }
  };

  const fetchStats = async () => {
    try {
      const { count: totalMessages } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true });

      setStats(prev => ({
        ...prev,
        totalMessages: totalMessages || 0
      }));
    } catch (error) {
      console.error('Error fetching chat stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const calculateStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalConversations = conversations.length;
    const activeConversations = conversations.filter(c => c.status !== 'closed').length;
    const unassignedConversations = conversations.filter(c => c.status === 'unassigned' && c.source !== 'internal').length;
    const closedToday = conversations.filter(c => 
      c.closed_at && new Date(c.closed_at) >= today
    ).length;
    const customersUnread = conversations.filter(c => 
      c.source !== 'internal' && (c.unread_count || 0) > 0
    ).length;
    const internalUnread = conversations.filter(c => 
      c.source === 'internal' && (c.unread_count || 0) > 0
    ).length;

    setStats(prev => ({
      ...prev,
      totalConversations,
      activeConversations,
      unassignedConversations,
      closedToday,
      customersUnread,
      internalUnread,
      avgResponseTime: '< 5 دقائق'
    }));
  };

  const fetchStaffMembers = async () => {
    const { data } = await supabase
      .from('staff_members')
      .select('id, full_name, email, agent_status, active_conversations_count')
      .eq('is_active', true)
      .eq('can_reply_tickets', true)
      .order('agent_status');
    
    if (data) {
      setStaffMembers(data as StaffMember[]);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    // Tab filter
    if (activeTab === 'customers' && conv.source === 'internal') return false;
    if (activeTab === 'internal' && conv.source !== 'internal') return false;
    
    // Status filter
    if (filter === 'unassigned' && conv.status !== 'unassigned') return false;
    if (filter === 'assigned' && conv.status !== 'assigned') return false;
    if (filter === 'closed' && conv.status !== 'closed') return false;
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        conv.subject?.toLowerCase().includes(query) ||
        conv.organization?.name?.toLowerCase().includes(query) ||
        conv.last_message_preview?.toLowerCase().includes(query) ||
        (conv.metadata as any)?.sender_name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Count badges
  const unassignedCount = conversations.filter(c => c.status === 'unassigned' && c.source !== 'internal').length;
  const assignedCount = conversations.filter(c => c.status === 'assigned' && c.source !== 'internal').length;
  const closedCount = conversations.filter(c => c.status === 'closed' && c.source !== 'internal').length;

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentConversation) return;
    const text = messageText;
    setMessageText('');
    await sendMessage(currentConversation.id, text, undefined, `${adminName} (الإدارة)`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAssignToStaff = async () => {
    if (!currentConversation || !selectedStaff) return;
    await assignConversation(currentConversation.id, selectedStaff);
    setShowAssignDialog(false);
    setSelectedStaff('');
  };

  const handleConvertToTicket = async () => {
    if (!currentConversation || !ticketSubject) return;
    await convertToTicket(currentConversation.id, {
      subject: ticketSubject,
      category: ticketCategory,
      priority: ticketPriority
    });
    setShowConvertDialog(false);
    setTicketSubject('');
  };

  const handleStartInternalChat = async () => {
    if (!selectedStaff || !internalMessage.trim()) return;
    
    const selectedStaffMember = staffMembers.find(s => s.id === selectedStaff);
    if (!selectedStaffMember) return;

    try {
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({
          subject: `رسالة من الإدارة إلى ${selectedStaffMember.full_name}`,
          source: 'internal',
          status: 'assigned',
          assigned_agent_id: selectedStaff,
          metadata: { sender_name: adminName, sender_type: 'admin' }
        })
        .select()
        .single();

      if (convError) throw convError;

      await supabase.from('conversation_messages').insert({
        conversation_id: convData.id,
        body: internalMessage,
        sender_type: 'agent',
        sender_name: `${adminName} (الإدارة)`
      });

      setShowNewInternalChat(false);
      setSelectedStaff('');
      setInternalMessage('');
      
      toast({
        title: 'تم',
        description: 'تم إرسال الرسالة للموظف بنجاح'
      });
      
      await fetchConversations();
    } catch (error) {
      console.error('Error starting internal chat:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء المحادثة',
        variant: 'destructive'
      });
    }
  };

  const getAvailableStaffForAutoAssign = () => {
    // Sort by status (available first) then by active conversations count
    return staffMembers
      .filter(s => s.agent_status === 'available')
      .sort((a, b) => (a.active_conversations_count || 0) - (b.active_conversations_count || 0))[0];
  };

  const handleAutoAssign = async () => {
    if (!currentConversation) return;
    
    const availableStaff = getAvailableStaffForAutoAssign();
    if (!availableStaff) {
      toast({
        title: 'لا يوجد موظف متاح',
        description: 'جميع الموظفين مشغولين أو غير متصلين',
        variant: 'destructive'
      });
      return;
    }

    await assignConversation(currentConversation.id, availableStaff.id);
    toast({
      title: 'تم الإسناد التلقائي',
      description: `تم إسناد المحادثة إلى ${availableStaff.full_name}`
    });
  };

  if (statsLoading && loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            إدارة المحادثات
          </h1>
          <p className="text-muted-foreground">مراقبة وإدارة جميع المحادثات</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchConversations()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowNewInternalChat(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            رسالة للموظفين
          </Button>
          <Link to="/admin/chat-settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              الإعدادات
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المحادثات النشطة</CardTitle>
            <MessageCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.activeConversations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              من إجمالي {stats.totalConversations} محادثة
            </p>
            {stats.customersUnread > 0 && (
              <Badge variant="destructive" className="mt-2">
                {stats.customersUnread} غير مقروءة
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className={cn(
          "hover:shadow-md transition-shadow",
          stats.unassignedConversations > 0 && 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20'
        )}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">تنتظر الإسناد</CardTitle>
            <AlertTriangle className={cn(
              "h-4 w-4",
              stats.unassignedConversations > 0 ? 'text-amber-500' : 'text-muted-foreground'
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              stats.unassignedConversations > 0 ? 'text-amber-600' : ''
            )}>
              {stats.unassignedConversations}
            </div>
            <p className="text-xs text-muted-foreground mt-1">تحتاج توجيه للموظفين</p>
            {stats.unassignedConversations > 0 && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                تتطلب اهتمام فوري
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الموظفين المتاحين</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {staffMembers.filter(s => s.agent_status === 'available').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              من إجمالي {staffMembers.length} موظف
            </p>
            <div className="flex gap-1 mt-2">
              {staffMembers.slice(0, 3).map(staff => (
                <Avatar key={staff.id} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-[10px] bg-primary/10">
                    {staff.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {staffMembers.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px]">
                  +{staffMembers.length - 3}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">أُغلقت اليوم</CardTitle>
            <CheckCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.closedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">محادثة تم إنهاؤها</p>
            <p className="text-xs text-muted-foreground mt-2">
              إجمالي الرسائل: {stats.totalMessages.toLocaleString('ar-EG')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Internal Messages Alert */}
      {stats.internalUnread > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-blue-500">{stats.internalUnread}</Badge>
                <span className="text-sm font-medium">رسائل داخلية جديدة من الموظفين</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-blue-600"
                onClick={() => setActiveTab('internal')}
              >
                عرض الرسائل
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Chat Interface */}
      <div className="h-[calc(100vh-420px)] min-h-[500px] flex border rounded-xl overflow-hidden bg-background shadow-sm">
        {/* Column 1: Conversations List */}
        <div className="w-80 border-l flex flex-col bg-card">
          {/* Header */}
          <div className="p-3 border-b space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Inbox className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-bold text-sm">صندوق الوارد</h2>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ConversationTab)}>
              <TabsList className="w-full grid grid-cols-2 h-9">
                <TabsTrigger value="customers" className="text-xs gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  العملاء
                  {stats.customersUnread > 0 && (
                    <Badge variant="destructive" className="h-4 min-w-4 text-[10px] p-0 px-1">
                      {stats.customersUnread}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="internal" className="text-xs gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" />
                  الموظفين
                  {stats.internalUnread > 0 && (
                    <Badge variant="destructive" className="h-4 min-w-4 text-[10px] p-0 px-1">
                      {stats.internalUnread}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في المحادثات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 h-9 text-sm bg-muted/30 border-0"
              />
            </div>

            {/* Filter chips */}
            {activeTab === 'customers' && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { key: 'all', label: 'الكل', count: stats.totalConversations },
                  { key: 'unassigned', label: 'تنتظر', count: unassignedCount, highlight: true },
                  { key: 'assigned', label: 'جارية', count: assignedCount },
                  { key: 'closed', label: 'مغلقة', count: closedCount }
                ].map(({ key, label, count, highlight }) => (
                  <Button
                    key={key}
                    variant={filter === key ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      "h-7 text-[11px] whitespace-nowrap rounded-full px-3",
                      highlight && filter !== key && count > 0 && "text-amber-600 bg-amber-50"
                    )}
                    onClick={() => setFilter(key as ConversationFilter)}
                  >
                    {label}
                    {count > 0 && (
                      <Badge 
                        variant={filter === key ? 'secondary' : (highlight ? 'destructive' : 'outline')} 
                        className="mr-1 h-4 min-w-4 text-[10px] p-0 px-1"
                      >
                        {count}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Conversations list */}
          <ScrollArea className="flex-1">
            {loading && conversations.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">لا توجد محادثات</p>
                {filter !== 'all' && (
                  <Button variant="link" size="sm" onClick={() => setFilter('all')}>
                    عرض الكل
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv) => {
                  const statusConfig = conversationStatusConfig[conv.status];
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={cn(
                        "px-3 py-3 cursor-pointer transition-all hover:bg-muted/50",
                        currentConversation?.id === conv.id && "bg-primary/5 border-r-2 border-r-primary"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-10 w-10">
                            {conv.organization?.logo_url ? (
                              <AvatarImage src={conv.organization.logo_url} />
                            ) : null}
                            <AvatarFallback className={cn(
                              "text-sm",
                              conv.source === 'internal' ? 'bg-blue-100 text-blue-600' : 'bg-primary/10'
                            )}>
                              {conv.source === 'internal' 
                                ? <MessageCircle className="h-4 w-4" />
                                : (conv.organization?.name?.charAt(0) || (conv.metadata as any)?.sender_name?.charAt(0) || 'ع')
                              }
                            </AvatarFallback>
                          </Avatar>
                          {conv.status === 'unassigned' && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                              <AlertTriangle className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm truncate">
                              {conv.source === 'internal' 
                                ? conv.subject
                                : (conv.organization?.name || (conv.metadata as any)?.sender_name || 'عميل')
                              }
                            </span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {conv.last_message_at 
                                ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ar })
                                : ''
                              }
                            </span>
                          </div>
                          
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {conv.subject || conv.last_message_preview || 'محادثة جديدة'}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className={cn(
                              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]",
                              statusConfig.bgLight,
                              statusConfig.textColor
                            )}>
                              <StatusIcon className="h-2.5 w-2.5" />
                              {statusConfig.label}
                            </div>
                            
                            {conv.assigned_agent && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Circle className={cn("h-1.5 w-1.5 fill-current", statusColors[conv.assigned_agent.agent_status])} />
                                {conv.assigned_agent.full_name}
                              </div>
                            )}
                            
                            {conv.unread_count > 0 && (
                              <Badge variant="destructive" className="h-4 min-w-4 text-[10px] p-0 px-1 mr-auto">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Column 2: Chat Area */}
        <div className="flex-1 flex flex-col">
          {currentConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b flex items-center justify-between bg-card">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-8 w-8"
                    onClick={() => setCurrentConversation(null)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10">
                      {currentConversation.organization?.name?.charAt(0) || 
                       (currentConversation.metadata as any)?.sender_name?.charAt(0) || 'ع'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h3 className="font-medium text-sm">
                      {currentConversation.organization?.name || 
                       (currentConversation.metadata as any)?.sender_name || 'محادثة'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {currentConversation.subject || 'محادثة دعم'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {currentConversation.status === 'unassigned' && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={handleAutoAssign}
                        className="gap-1.5 bg-green-600 hover:bg-green-700"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        إسناد تلقائي
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowAssignDialog(true)}
                        className="gap-1.5"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        اختيار موظف
                      </Button>
                    </>
                  )}
                  
                  {currentConversation.status === 'assigned' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAssignDialog(true)}
                        className="gap-1.5"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        تحويل
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => closeConversation(currentConversation.id)}
                        className="gap-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                        إغلاق
                      </Button>
                    </>
                  )}
                  
                  {currentConversation.status === 'closed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reopenConversation(currentConversation.id)}
                      className="gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      إعادة فتح
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTicketSubject(currentConversation.subject || '');
                      setShowConvertDialog(true);
                    }}
                    className="gap-1.5"
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    تذكرة
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isStaff = msg.sender_type === 'agent' || msg.sender_type === 'system';
                    const isSystem = msg.sender_type === 'system';
                    
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="bg-muted px-3 py-1.5 rounded-full text-xs text-muted-foreground">
                            {msg.body}
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-2",
                          isStaff ? "flex-row-reverse" : ""
                        )}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className={cn(
                            "text-xs",
                            isStaff ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            {msg.sender_name?.charAt(0) || (isStaff ? 'م' : 'ع')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className={cn(
                          "max-w-[70%] space-y-1",
                          isStaff ? "items-end" : ""
                        )}>
                          <div className={cn(
                            "px-3 py-2 rounded-2xl text-sm",
                            isStaff 
                              ? "bg-primary text-primary-foreground rounded-br-sm" 
                              : "bg-muted rounded-bl-sm"
                          )}>
                            {msg.body}
                          </div>
                          <div className={cn(
                            "flex items-center gap-1 text-[10px] text-muted-foreground px-1",
                            isStaff ? "justify-end" : ""
                          )}>
                            <span>{msg.sender_name}</span>
                            <span>•</span>
                            <span>{format(new Date(msg.created_at), 'HH:mm', { locale: ar })}</span>
                            {isStaff && (
                              msg.is_read ? (
                                <CheckCheck className="h-3 w-3 text-blue-500" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              {currentConversation.status !== 'closed' && (
                <div className="p-4 border-t bg-card">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="اكتب رسالة كإدارة..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="min-h-[44px] max-h-[120px] resize-none"
                      rows={1}
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sending}
                      className="h-11 w-11 p-0"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    سيتم إرسال الرسالة باسم: {adminName} (الإدارة)
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
              <h3 className="font-medium text-lg mb-2">إدارة المحادثات</h3>
              <p className="text-sm text-center max-w-md">
                اختر محادثة من القائمة لعرض تفاصيلها، أو قم بتوجيه المحادثات الجديدة للموظفين
              </p>
              {stats.unassignedConversations > 0 && (
                <Button 
                  className="mt-4 gap-2"
                  onClick={() => setFilter('unassigned')}
                >
                  <AlertTriangle className="h-4 w-4" />
                  عرض المحادثات المنتظرة ({stats.unassignedConversations})
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Column 3: Customer Info Panel */}
        {currentConversation && currentConversation.source !== 'internal' && (
          <div className="w-72 border-r bg-card p-4 hidden xl:block">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              معلومات العميل
            </h3>
            
            <div className="space-y-4">
              <div className="text-center">
                <Avatar className="h-16 w-16 mx-auto mb-2">
                  {currentConversation.organization?.logo_url ? (
                    <AvatarImage src={currentConversation.organization.logo_url} />
                  ) : null}
                  <AvatarFallback className="text-lg bg-primary/10">
                    {currentConversation.organization?.name?.charAt(0) || 
                     (currentConversation.metadata as any)?.sender_name?.charAt(0) || 'ع'}
                  </AvatarFallback>
                </Avatar>
                <h4 className="font-medium">
                  {currentConversation.organization?.name || (currentConversation.metadata as any)?.sender_name || 'عميل'}
                </h4>
                {currentConversation.organization?.contact_email && (
                  <p className="text-xs text-muted-foreground">
                    {currentConversation.organization.contact_email}
                  </p>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الحالة</span>
                  <Badge className={cn(
                    conversationStatusConfig[currentConversation.status].bgLight,
                    conversationStatusConfig[currentConversation.status].textColor,
                    "font-normal"
                  )}>
                    {conversationStatusConfig[currentConversation.status].label}
                  </Badge>
                </div>
                
                {currentConversation.assigned_agent && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">الموظف</span>
                    <div className="flex items-center gap-1.5">
                      <Circle className={cn("h-2 w-2 fill-current", statusColors[currentConversation.assigned_agent.agent_status])} />
                      <span>{currentConversation.assigned_agent.full_name}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">المصدر</span>
                  <span>{currentConversation.source === 'embed' ? 'الموقع' : 'البوابة'}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">تاريخ البدء</span>
                  <span>{format(new Date(currentConversation.created_at), 'dd/MM/yyyy', { locale: ar })}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground">إجراءات سريعة</h5>
                {currentConversation.organization?.contact_email && (
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    إرسال بريد
                  </Button>
                )}
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  عرض ملف العميل
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إسناد المحادثة لموظف</DialogTitle>
            <DialogDescription>
              اختر الموظف الذي سيتولى الرد على هذه المحادثة
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اختر الموظف</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center gap-2">
                        <Circle className={cn("h-2 w-2 fill-current", statusColors[staff.agent_status])} />
                        <span>{staff.full_name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({staff.active_conversations_count || 0} محادثة)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAssignToStaff} disabled={!selectedStaff}>
              إسناد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Ticket Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحويل إلى تذكرة</DialogTitle>
            <DialogDescription>
              سيتم إنشاء تذكرة جديدة تحتوي على ملخص المحادثة
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>عنوان التذكرة</Label>
              <Input
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="أدخل عنوان التذكرة"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select value={ticketCategory} onValueChange={setTicketCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">تقني</SelectItem>
                    <SelectItem value="billing">مالي</SelectItem>
                    <SelectItem value="general">عام</SelectItem>
                    <SelectItem value="training">تدريب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>الأولوية</Label>
                <Select value={ticketPriority} onValueChange={setTicketPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="urgent">عاجلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleConvertToTicket} disabled={!ticketSubject}>
              تحويل لتذكرة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Internal Chat Dialog */}
      <Dialog open={showNewInternalChat} onOpenChange={setShowNewInternalChat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رسالة للموظفين</DialogTitle>
            <DialogDescription>
              أرسل رسالة مباشرة لأحد الموظفين
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اختر الموظف</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center gap-2">
                        <Circle className={cn("h-2 w-2 fill-current", statusColors[staff.agent_status])} />
                        <span>{staff.full_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>الرسالة</Label>
              <Textarea
                value={internalMessage}
                onChange={(e) => setInternalMessage(e.target.value)}
                placeholder="اكتب رسالتك..."
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewInternalChat(false)}>
              إلغاء
            </Button>
            <Button onClick={handleStartInternalChat} disabled={!selectedStaff || !internalMessage.trim()}>
              إرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
