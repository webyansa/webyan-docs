import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Building2, Laptop, Wrench } from 'lucide-react';

export type CustomerType = 'subscription' | 'custom_platform' | 'services';

const customerTypeConfig: Record<CustomerType, { label: string; className: string; Icon: typeof Building2 }> = {
  subscription: {
    label: 'اشتراكات ويبيان',
    className: 'bg-primary/10 text-primary border-primary/20',
    Icon: Building2,
  },
  custom_platform: {
    label: 'منصات مخصصة',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    Icon: Laptop,
  },
  services: {
    label: 'خدمات/مشاريع',
    className: 'bg-teal-100 text-teal-700 border-teal-200',
    Icon: Wrench,
  },
};

interface CustomerTypeBadgeProps {
  type: CustomerType;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CustomerTypeBadge({ type, showIcon = true, size = 'md' }: CustomerTypeBadgeProps) {
  const config = customerTypeConfig[type] || customerTypeConfig.subscription;
  const { Icon } = config;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.className,
        sizeClasses[size],
        'font-medium border flex items-center gap-1'
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

export { customerTypeConfig };
