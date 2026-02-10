import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/crm/pipelineConfig';
import { cn } from '@/lib/utils';

interface PricingPlan {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  yearly_discount: number;
  features: string[];
  is_active: boolean;
}

interface PlanSelectorProps {
  selectedPlanId: string | null;
  billingCycle: 'monthly' | 'yearly';
  onPlanSelect: (planId: string) => void;
  onBillingCycleChange: (cycle: 'monthly' | 'yearly') => void;
}

export default function PlanSelector({
  selectedPlanId,
  billingCycle,
  onPlanSelect,
  onBillingCycleChange,
}: PlanSelectorProps) {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['pricing-plans-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as PricingPlan[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const anyMonthlyAvailable = plans.some(p => p.monthly_price > 0);

  const getPrice = (plan: PricingPlan) => 
    billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;

  const getOriginalPrice = (plan: PricingPlan) => {
    if (plan.yearly_discount > 0 && plan.yearly_discount < 100) {
      return +(plan.yearly_price / (1 - plan.yearly_discount / 100)).toFixed(2);
    }
    return plan.yearly_price;
  };

  // Auto-switch to yearly if selected plan doesn't support monthly
  const selectedPlanSupportsMonthly = selectedPlan ? selectedPlan.monthly_price > 0 : true;
  if (billingCycle === 'monthly' && selectedPlan && !selectedPlanSupportsMonthly) {
    onBillingCycleChange('yearly');
  }

  return (
    <div className="space-y-6">
      {/* Billing Cycle Toggle - only show if any plan supports monthly */}
      {anyMonthlyAvailable && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border p-1 bg-muted/50">
            <button
              type="button"
              onClick={() => {
                if (selectedPlan && selectedPlan.monthly_price <= 0) return;
                onBillingCycleChange('monthly');
              }}
              disabled={selectedPlan ? selectedPlan.monthly_price <= 0 : false}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                billingCycle === 'monthly'
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50",
                selectedPlan && selectedPlan.monthly_price <= 0 && "opacity-50 cursor-not-allowed"
              )}
            >
              شهري
            </button>
            <button
              type="button"
              onClick={() => onBillingCycleChange('yearly')}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                billingCycle === 'yearly'
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50"
              )}
            >
              سنوي
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const supportsMonthly = plan.monthly_price > 0;
          const origPrice = getOriginalPrice(plan);
          return (
            <Card
              key={plan.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedPlanId === plan.id
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50"
              )}
              onClick={() => onPlanSelect(plan.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    )}
                  </div>
                  {selectedPlanId === plan.id && (
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  {billingCycle === 'yearly' && plan.yearly_discount > 0 && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground line-through">{formatCurrency(origPrice)}</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                        وفر {plan.yearly_discount}%
                      </Badge>
                    </div>
                  )}
                  <span className="text-2xl font-bold">{formatCurrency(getPrice(plan))}</span>
                  <span className="text-muted-foreground text-sm mr-1">
                    / {billingCycle === 'monthly' ? 'شهر' : 'سنة'}
                  </span>
                </div>

                {!supportsMonthly && (
                  <Badge variant="outline" className="mb-3 text-xs">سنوي فقط</Badge>
                )}

                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <ul className="space-y-2">
                    {plan.features.slice(0, 4).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedPlan && (
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            الخطة المختارة: <span className="font-medium text-foreground">{selectedPlan.name}</span>
            {' - '}
            <span className="font-bold text-primary">{formatCurrency(getPrice(selectedPlan))}</span>
            <span className="text-muted-foreground"> / {billingCycle === 'monthly' ? 'شهر' : 'سنة'}</span>
          </p>
        </div>
      )}
    </div>
  );
}
