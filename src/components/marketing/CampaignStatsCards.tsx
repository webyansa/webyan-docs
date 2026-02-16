import { Card, CardContent } from '@/components/ui/card';
import { Mail, CheckCircle, Eye, MousePointer } from 'lucide-react';

interface StatsProps {
  totalCampaigns: number;
  avgDeliveryRate: number;
  avgOpenRate: number;
  avgClickRate: number;
}

export default function CampaignStatsCards({ totalCampaigns, avgDeliveryRate, avgOpenRate, avgClickRate }: StatsProps) {
  const stats = [
    { label: 'إجمالي الحملات', value: totalCampaigns, icon: Mail, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'معدل التسليم', value: `${avgDeliveryRate.toFixed(1)}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'معدل الفتح', value: `${avgOpenRate.toFixed(1)}%`, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'معدل النقر', value: `${avgClickRate.toFixed(1)}%`, icon: MousePointer, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>
              <s.icon className={`h-6 w-6 ${s.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
