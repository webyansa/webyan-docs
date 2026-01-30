import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type LifecycleStage = 'prospect' | 'negotiating' | 'onboarding' | 'active' | 'suspended' | 'churned';

const lifecycleConfig: Record<LifecycleStage, { label: string; className: string; icon: string }> = {
  prospect: {
    label: 'عميل محتمل',
    className: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: '🎯',
  },
  negotiating: {
    label: 'قيد التعاقد',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: '📝',
  },
  onboarding: {
    label: 'قيد التنفيذ',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '⚙️',
  },
  active: {
    label: 'نشط',
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: '✅',
  },
  suspended: {
    label: 'موقوف',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: '⏸️',
  },
  churned: {
    label: 'منتهي',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: '❌',
  },
};

interface LifecycleBadgeProps {
  stage: LifecycleStage;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function LifecycleBadge({ stage, showIcon = true, size = 'md' }: LifecycleBadgeProps) {
  const config = lifecycleConfig[stage] || lifecycleConfig.active;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.className,
        sizeClasses[size],
        'font-medium border'
      )}
    >
      {showIcon && <span className="ml-1">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}

export { lifecycleConfig };
