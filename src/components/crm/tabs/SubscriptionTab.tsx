import { format, differenceInDays, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  CreditCard,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface SubscriptionTabProps {
  organization: {
    id: string;
    subscription_status: string;
    subscription_plan?: string | null;
    subscription_start_date?: string | null;
    subscription_end_date?: string | null;
    auto_renewal?: boolean;
  };
  onUpgrade?: () => void;
  onRenew?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; Icon: typeof CheckCircle }> = {
  trial: { label: 'تجريبي', color: 'text-blue-600', Icon: Clock },
  active: { label: 'نشط', color: 'text-green-600', Icon: CheckCircle },
  pending_renewal: { label: 'في انتظار التجديد', color: 'text-amber-600', Icon: RefreshCw },
  expired: { label: 'منتهي', color: 'text-red-600', Icon: AlertTriangle },
  cancelled: { label: 'ملغي', color: 'text-gray-600', Icon: AlertTriangle },
};

const planConfig: Record<string, { label: string; features: string[] }> = {
  basic: {
    label: 'الباقة الأساسية',
    features: ['دعم فني عبر التذاكر', 'حتى 3 مستخدمين', 'تقارير أساسية'],
  },
  professional: {
    label: 'الباقة الاحترافية',
    features: ['دعم فني أولوية', 'حتى 10 مستخدمين', 'تقارير متقدمة', 'اجتماعات شهرية'],
  },
  enterprise: {
    label: 'الباقة المؤسسية',
    features: ['دعم فني VIP', 'مستخدمين غير محدود', 'تقارير مخصصة', 'مدير حساب مخصص'],
  },
};

export function SubscriptionTab({ organization, onUpgrade, onRenew }: SubscriptionTabProps) {
  const status = statusConfig[organization.subscription_status] || statusConfig.active;
  const plan = planConfig[organization.subscription_plan || 'basic'] || planConfig.basic;
  const StatusIcon = status.Icon;

  // Calculate subscription progress
  const startDate = organization.subscription_start_date 
    ? new Date(organization.subscription_start_date) 
    : null;
  const endDate = organization.subscription_end_date 
    ? new Date(organization.subscription_end_date) 
    : null;
  
  let progress = 0;
  let daysRemaining = 0;
  let totalDays = 0;

  if (startDate && endDate) {
    totalDays = differenceInDays(endDate, startDate);
    const daysElapsed = differenceInDays(new Date(), startDate);
    daysRemaining = Math.max(0, differenceInDays(endDate, new Date()));
    progress = totalDays > 0 ? Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100)) : 0;
  }

  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;
  const isExpired = endDate && new Date() > endDate;

  return (
    <div className="space-y-6">
      {/* Subscription Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg bg-muted ${status.color}`}>
                <StatusIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">حالة الاشتراك</p>
                <p className={`text-lg font-semibold ${status.color}`}>{status.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-muted text-primary">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الباقة الحالية</p>
                <p className="text-lg font-semibold">{plan.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg bg-muted ${isExpiringSoon ? 'text-amber-600' : isExpired ? 'text-red-600' : 'text-green-600'}`}>
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الأيام المتبقية</p>
                <p className={`text-lg font-semibold ${isExpiringSoon ? 'text-amber-600' : isExpired ? 'text-red-600' : ''}`}>
                  {isExpired ? 'منتهي' : `${daysRemaining} يوم`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>تفاصيل الاشتراك</span>
            <div className="flex gap-2">
              {organization.subscription_status !== 'active' && (
                <Button size="sm" onClick={onRenew}>
                  <RefreshCw className="w-4 h-4 ml-2" />
                  تجديد
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onUpgrade}>
                <ArrowUpCircle className="w-4 h-4 ml-2" />
                ترقية الباقة
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress bar */}
          {startDate && endDate && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  البداية: {format(startDate, 'dd MMM yyyy', { locale: ar })}
                </span>
                <span className="text-muted-foreground">
                  الانتهاء: {format(endDate, 'dd MMM yyyy', { locale: ar })}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                {daysRemaining} يوم متبقي من {totalDays} يوم
              </p>
            </div>
          )}

          {/* Plan features */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">مميزات الباقة</h4>
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Auto renewal */}
          <div className="border-t pt-4 flex items-center justify-between">
            <div>
              <p className="font-medium">التجديد التلقائي</p>
              <p className="text-sm text-muted-foreground">
                {organization.auto_renewal 
                  ? 'سيتم تجديد الاشتراك تلقائياً عند انتهائه' 
                  : 'التجديد التلقائي معطّل'
                }
              </p>
            </div>
            <Badge variant={organization.auto_renewal ? 'default' : 'secondary'}>
              {organization.auto_renewal ? 'مفعّل' : 'معطّل'}
            </Badge>
          </div>

          {/* Warning for expiring soon */}
          {isExpiringSoon && !isExpired && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">الاشتراك على وشك الانتهاء</p>
                <p className="text-sm text-amber-700">
                  متبقي {daysRemaining} يوم فقط على انتهاء الاشتراك. يرجى التجديد لتجنب انقطاع الخدمة.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
