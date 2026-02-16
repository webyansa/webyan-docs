import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DocsLayout } from '@/components/layout/DocsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PlanData {
  id: string;
  name: string;
  yearly_price: number;
  monthly_price: number;
  yearly_discount: number;
  description: string | null;
  features: string[];
  comparison_features: { name: string; included: boolean }[];
  optional_addons: { id: string; name: string; price: number; description?: string }[];
  display_badge: string | null;
  sort_order: number;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [vatRate, setVatRate] = useState(15);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-public-plans');
      if (error) throw error;
      setPlans(data.plans || []);
      setVatRate(data.vat_rate || 15);
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  // Collect all unique comparison feature names
  const allFeatureNames = Array.from(
    new Set(plans.flatMap(p => (p.comparison_features || []).map(f => f.name)))
  );

  const planColors = [
    'border-muted-foreground/20',
    'border-secondary/50',
    'border-primary/50',
    'border-primary',
  ];

  if (loading) {
    return (
      <DocsLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DocsLayout>
    );
  }

  return (
    <DocsLayout>
      {/* Hero */}
      <section className="text-center mb-12">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
          باقات الاشتراك
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          اختر الباقة المناسبة لمنظمتك وابدأ رحلتك الرقمية مع ويبيان
        </p>
      </section>

      {/* Plans Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {plans.map((plan, index) => (
          <Card
            key={plan.id}
            className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${planColors[index] || 'border-border'} ${plan.display_badge ? 'ring-2 ring-primary/30' : ''}`}
          >
            {plan.display_badge && (
              <div className="absolute top-0 left-0 right-0">
                <Badge className="w-full rounded-none rounded-t-lg justify-center py-1.5 bg-primary text-primary-foreground">
                  <Crown className="h-3 w-3 ml-1" />
                  {plan.display_badge}
                </Badge>
              </div>
            )}
            <CardHeader className={`text-center ${plan.display_badge ? 'pt-10' : ''}`}>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              )}
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div>
                <div className="text-3xl font-bold text-primary">
                  {plan.yearly_price.toLocaleString('ar-SA')}
                  <span className="text-base font-normal text-muted-foreground mr-1">ر.س / سنوياً</span>
                </div>
                {plan.yearly_discount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    خصم {plan.yearly_discount}% على الاشتراك السنوي
                  </p>
                )}
              </div>

              <ul className="space-y-2 text-sm text-right">
                {(plan.features || []).slice(0, 6).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link to={`/subscribe?planId=${plan.id}`}>
                <Button className="w-full" variant={plan.display_badge ? 'default' : 'outline'}>
                  اشترك الآن
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Comparison Table */}
      {allFeatureNames.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">مقارنة المزايا</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-primary/20">
                  <th className="text-right py-4 px-4 text-sm font-semibold text-foreground w-1/3">
                    الميزة
                  </th>
                  {plans.map(plan => (
                    <th key={plan.id} className="text-center py-4 px-3 text-sm font-semibold text-foreground">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allFeatureNames.map((featureName, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                    <td className="py-3 px-4 text-sm">{featureName}</td>
                    {plans.map(plan => {
                      const f = (plan.comparison_features || []).find(cf => cf.name === featureName);
                      return (
                        <td key={plan.id} className="text-center py-3 px-3">
                          {f?.included ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* VAT Notice */}
      <div className="text-center text-sm text-muted-foreground mb-8">
        جميع الأسعار لا تشمل ضريبة القيمة المضافة ({vatRate}%)
      </div>
    </DocsLayout>
  );
}
