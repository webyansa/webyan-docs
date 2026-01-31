import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/crm/pipelineConfig';

interface PricingService {
  id: string;
  name: string;
  description: string | null;
  service_type: string;
  price: number;
  unit: string;
  category: string | null;
  is_active: boolean;
}

interface ServicesSelectorProps {
  selectedServiceIds: string[];
  onSelectionChange: (serviceIds: string[]) => void;
}

export default function ServicesSelector({
  selectedServiceIds,
  onSelectionChange,
}: ServicesSelectorProps) {
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['pricing-services-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as PricingService[];
    },
  });

  const toggleService = (serviceId: string) => {
    if (selectedServiceIds.includes(serviceId)) {
      onSelectionChange(selectedServiceIds.filter(id => id !== serviceId));
    } else {
      onSelectionChange([...selectedServiceIds, serviceId]);
    }
  };

  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
  const totalOneTime = selectedServices
    .filter(s => s.service_type === 'one_time')
    .reduce((sum, s) => sum + s.price, 0);
  const totalRecurring = selectedServices
    .filter(s => s.service_type === 'recurring')
    .reduce((sum, s) => sum + s.price, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'أخرى';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, PricingService[]>);

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        اختر الخدمات الإضافية التي تريد إضافتها لعرض السعر (اختياري)
      </div>

      {Object.entries(groupedServices).map(([category, categoryServices]) => (
        <div key={category} className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">{category}</h4>
          <div className="space-y-2">
            {categoryServices.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleService(service.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedServiceIds.includes(service.id)}
                    onCheckedChange={() => toggleService(service.id)}
                  />
                  <div>
                    <p className="font-medium">{service.name}</p>
                    {service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {service.service_type === 'one_time' ? 'مرة واحدة' : 'متكرر'}
                  </Badge>
                  <span className="font-medium">
                    {formatCurrency(service.price)}
                    <span className="text-sm text-muted-foreground mr-1">/ {service.unit}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {selectedServiceIds.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">الخدمات المختارة: {selectedServiceIds.length}</p>
          {totalOneTime > 0 && (
            <p className="text-sm">
              رسوم لمرة واحدة: <span className="font-medium">{formatCurrency(totalOneTime)}</span>
            </p>
          )}
          {totalRecurring > 0 && (
            <p className="text-sm">
              رسوم متكررة: <span className="font-medium">{formatCurrency(totalRecurring)}</span> / شهر
            </p>
          )}
        </div>
      )}
    </div>
  );
}
