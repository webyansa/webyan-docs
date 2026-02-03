import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  CreditCard,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Globe,
  Banknote,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SubscriptionEditDialog } from './subscription/SubscriptionEditDialog';
import { SubscriptionNotesSection } from './subscription/SubscriptionNotesSection';

interface SubscriptionTabProps {
  organization: {
    id: string;
    subscription_status: string;
    subscription_plan?: string | null;
    subscription_start_date?: string | null;
    subscription_end_date?: string | null;
    subscription_value?: number | null;
    domain_expiration_date?: string | null;
    auto_renewal?: boolean;
  };
  onUpdate?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; Icon: typeof CheckCircle }> = {
  trial: { label: 'تجريبي', color: 'text-blue-600', bgColor: 'bg-blue-100', Icon: Clock },
  active: { label: 'نشط', color: 'text-green-600', bgColor: 'bg-green-100', Icon: CheckCircle },
  pending_renewal: { label: 'في انتظار التجديد', color: 'text-amber-600', bgColor: 'bg-amber-100', Icon: RefreshCw },
  expired: { label: 'منتهي', color: 'text-red-600', bgColor: 'bg-red-100', Icon: AlertTriangle },
  cancelled: { label: 'ملغي', color: 'text-gray-600', bgColor: 'bg-gray-100', Icon: AlertTriangle },
};

interface PlanData {
  id: string;
  name: string;
}

export function SubscriptionTab({ organization, onUpdate }: SubscriptionTabProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);
  const [orgData, setOrgData] = useState(organization);

  const status = statusConfig[orgData.subscription_status] || statusConfig.active;
  const StatusIcon = status.Icon;

  useEffect(() => {
    fetchPlanName();
    fetchLatestOrgData();
  }, [organization.id]);

  const fetchPlanName = async () => {
    if (orgData.subscription_plan) {
      const { data } = await supabase
        .from('pricing_plans')
        .select('name')
        .eq('id', orgData.subscription_plan)
        .single();
      if (data) setPlanName(data.name);
    }
  };

  const fetchLatestOrgData = async () => {
    const { data } = await supabase
      .from('client_organizations')
      .select('subscription_status, subscription_plan, subscription_start_date, subscription_end_date, subscription_value, domain_expiration_date, auto_renewal')
      .eq('id', organization.id)
      .single();
    
    if (data) {
      setOrgData({ ...organization, ...data });
    }
  };

  const handleUpdateSuccess = () => {
    fetchLatestOrgData();
    fetchPlanName();
    onUpdate?.();
  };

  // Calculate subscription progress
  const startDate = orgData.subscription_start_date 
    ? new Date(orgData.subscription_start_date) 
    : null;
  const endDate = orgData.subscription_end_date 
    ? new Date(orgData.subscription_end_date) 
    : null;
  const domainExpDate = orgData.domain_expiration_date
    ? new Date(orgData.domain_expiration_date)
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

  // Domain expiration check
  const domainDaysRemaining = domainExpDate 
    ? Math.max(0, differenceInDays(domainExpDate, new Date()))
    : null;
  const isDomainExpiringSoon = domainDaysRemaining !== null && domainDaysRemaining <= 30 && domainDaysRemaining > 0;
  const isDomainExpired = domainExpDate && new Date() > domainExpDate;

  return (
    <div className="space-y-6">
      {/* Subscription Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${status.bgColor} ${status.color}`}>
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
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الباقة الحالية</p>
                <p className="text-lg font-semibold">{planName || 'غير محددة'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${isExpiringSoon ? 'bg-amber-100 text-amber-600' : isExpired ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الأيام المتبقية</p>
                <p className={`text-lg font-semibold ${isExpiringSoon ? 'text-amber-600' : isExpired ? 'text-red-600' : ''}`}>
                  {isExpired ? 'منتهي' : endDate ? `${daysRemaining} يوم` : 'غير محدد'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-100 text-emerald-600">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">قيمة الاشتراك</p>
                <p className="text-lg font-semibold">
                  {orgData.subscription_value 
                    ? `${orgData.subscription_value.toLocaleString()} ر.س`
                    : 'غير محددة'}
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
            <Button size="sm" onClick={() => setEditDialogOpen(true)}>
              <Edit className="w-4 h-4 ml-2" />
              تعديل
            </Button>
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

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">تاريخ بدء الاشتراك</p>
              <p className="font-medium">
                {startDate ? format(startDate, 'dd MMM yyyy', { locale: ar }) : 'غير محدد'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">تاريخ انتهاء الاشتراك</p>
              <p className="font-medium">
                {endDate ? format(endDate, 'dd MMM yyyy', { locale: ar }) : 'غير محدد'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">قيمة الاشتراك</p>
              <p className="font-medium">
                {orgData.subscription_value 
                  ? `${orgData.subscription_value.toLocaleString()} ريال سعودي`
                  : 'غير محددة'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Globe className="w-4 h-4" />
                تاريخ انتهاء الدومين
              </p>
              <p className={`font-medium ${isDomainExpired ? 'text-red-600' : isDomainExpiringSoon ? 'text-amber-600' : ''}`}>
                {domainExpDate ? format(domainExpDate, 'dd MMM yyyy', { locale: ar }) : 'غير محدد'}
                {isDomainExpiringSoon && (
                  <Badge variant="outline" className="mr-2 text-amber-600 border-amber-300">
                    متبقي {domainDaysRemaining} يوم
                  </Badge>
                )}
                {isDomainExpired && (
                  <Badge variant="destructive" className="mr-2">منتهي</Badge>
                )}
              </p>
            </div>
          </div>

          {/* Auto renewal */}
          <div className="border-t pt-4 flex items-center justify-between">
            <div>
              <p className="font-medium">التجديد التلقائي</p>
              <p className="text-sm text-muted-foreground">
                {orgData.auto_renewal 
                  ? 'سيتم تجديد الاشتراك تلقائياً عند انتهائه' 
                  : 'التجديد التلقائي معطّل'
                }
              </p>
            </div>
            <Badge variant={orgData.auto_renewal ? 'default' : 'secondary'}>
              {orgData.auto_renewal ? 'مفعّل' : 'معطّل'}
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

          {/* Warning for domain expiring */}
          {isDomainExpiringSoon && !isDomainExpired && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
              <Globe className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">الدومين على وشك الانتهاء</p>
                <p className="text-sm text-orange-700">
                  متبقي {domainDaysRemaining} يوم على انتهاء الدومين. يرجى التجديد لتجنب فقدان النطاق.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Section */}
      <SubscriptionNotesSection organizationId={organization.id} />

      {/* Edit Dialog */}
      <SubscriptionEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        organizationId={organization.id}
        currentData={orgData}
        onSuccess={handleUpdateSuccess}
      />
    </div>
  );
}
