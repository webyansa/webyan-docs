import { Link } from 'react-router-dom';
import { MessageCircle, Check, CheckCheck, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ChatNotificationDropdownProps {
  userType: 'admin' | 'staff' | 'client';
  staffId?: string;
  organizationId?: string;
  linkTo?: string;
}

export function ChatNotificationDropdown({ 
  userType, 
  staffId, 
  organizationId,
  linkTo = '/admin/chat'
}: ChatNotificationDropdownProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const {
    unreadCount,
    recentMessages,
    markAsRead,
    markAllAsRead,
  } = useChatNotifications({
    enabled: true,
    soundEnabled,
    userType,
    staffId,
    organizationId,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageCircle className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -left-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            رسائل المحادثات
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
            >
              {soundEnabled ? (
                <Volume2 className="h-3 w-3 text-green-500" />
              ) : (
                <VolumeX className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 h-7"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3 w-3" />
                قراءة الكل
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-72">
          {recentMessages.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
              لا توجد رسائل جديدة
            </div>
          ) : (
            recentMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'p-3 border-b last:border-0 hover:bg-muted/50 transition-colors',
                  !msg.is_read && 'bg-primary/5'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1.5 rounded-full bg-primary/10 text-primary">
                    <MessageCircle className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{msg.sender_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {msg.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(msg.created_at), {
                        addSuffix: true,
                        locale: ar,
                      })}
                    </p>
                  </div>
                  {!msg.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => markAsRead(msg.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Link to={linkTo}>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <MessageCircle className="h-4 w-4" />
              عرض جميع المحادثات
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
