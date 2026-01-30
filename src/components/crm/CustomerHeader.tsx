import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  ArrowRight,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Edit,
  MoreHorizontal,
  Ticket,
  Calendar,
  MessageSquare,
  Power,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LifecycleBadge, LifecycleStage } from './LifecycleBadge';
import { CustomerTypeBadge, CustomerType } from './CustomerTypeBadge';

interface CustomerHeaderProps {
  organization: {
    id: string;
    name: string;
    logo_url?: string | null;
    customer_type: CustomerType;
    lifecycle_stage: LifecycleStage;
    subscription_status: string;
    subscription_plan?: string | null;
    contact_email: string;
    contact_phone?: string | null;
    website_url?: string | null;
    city?: string | null;
    is_active: boolean;
    last_interaction_at?: string | null;
    assigned_account_manager?: {
      id: string;
      full_name: string;
    } | null;
  };
  onEdit?: () => void;
  onToggleStatus?: () => void;
  onDelete?: () => void;
  onCreateTicket?: () => void;
  onScheduleMeeting?: () => void;
}

export function CustomerHeader({
  organization,
  onEdit,
  onToggleStatus,
  onDelete,
  onCreateTicket,
  onScheduleMeeting,
}: CustomerHeaderProps) {
  const navigate = useNavigate();
  const initials = organization.name.slice(0, 2);

  return (
    <div className="bg-card border rounded-lg p-6">
      {/* Back button & Actions */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/clients')}
          className="gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          العودة
        </Button>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
            <Edit className="w-4 h-4" />
            تعديل
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCreateTicket} className="gap-2">
                <Ticket className="w-4 h-4" />
                فتح تذكرة جديدة
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onScheduleMeeting} className="gap-2">
                <Calendar className="w-4 h-4" />
                جدولة اجتماع
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleStatus} className="gap-2">
                <Power className="w-4 h-4" />
                {organization.is_active ? 'تعطيل' : 'تفعيل'} الحساب
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive">
                <Trash2 className="w-4 h-4" />
                حذف المؤسسة
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Organization Info */}
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Logo */}
        <Avatar className="w-20 h-20 rounded-lg">
          <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
          <AvatarFallback className="rounded-lg text-2xl font-bold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Details */}
        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{organization.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <CustomerTypeBadge type={organization.customer_type} />
              <LifecycleBadge stage={organization.lifecycle_stage} />
              {!organization.is_active && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                  معطّل
                </span>
              )}
            </div>
          </div>

          {/* Contact Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <a href={`mailto:${organization.contact_email}`} className="hover:text-primary truncate">
                {organization.contact_email}
              </a>
            </div>
            
            {organization.contact_phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a href={`tel:${organization.contact_phone}`} className="hover:text-primary">
                  {organization.contact_phone}
                </a>
              </div>
            )}
            
            {organization.website_url && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-4 h-4 flex-shrink-0" />
                <a 
                  href={organization.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary truncate"
                >
                  {organization.website_url.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            
            {organization.city && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{organization.city}</span>
              </div>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            {organization.assigned_account_manager && (
              <span>
                المسؤول: <span className="text-foreground">{organization.assigned_account_manager.full_name}</span>
              </span>
            )}
            {organization.last_interaction_at && (
              <span>
                آخر تفاعل: {formatDistanceToNow(new Date(organization.last_interaction_at), { addSuffix: true, locale: ar })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
