import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface AnalyticsProps {
  campaign: {
    total_recipients: number;
    success_count: number;
    failed_count: number;
    sent_count: number;
  };
  openCount: number;
  clickCount: number;
  unsubCount: number;
}

export default function CampaignAnalytics({ campaign, openCount, clickCount, unsubCount }: AnalyticsProps) {
  const deliveryRate = campaign.total_recipients > 0 ? (campaign.success_count / campaign.total_recipients * 100) : 0;
  const openRate = campaign.success_count > 0 ? (openCount / campaign.success_count * 100) : 0;
  const clickRate = campaign.success_count > 0 ? (clickCount / campaign.success_count * 100) : 0;

  const pieData = [
    { name: 'ناجحة', value: campaign.success_count, color: '#22c55e' },
    { name: 'فاشلة', value: campaign.failed_count, color: '#ef4444' },
    { name: 'معلقة', value: campaign.total_recipients - campaign.sent_count, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const barData = [
    { name: 'التسليم', value: deliveryRate },
    { name: 'الفتح', value: openRate },
    { name: 'النقر', value: clickRate },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">توزيع الإرسال</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">معدلات الأداء</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{campaign.total_recipients}</p>
              <p className="text-sm text-muted-foreground">المستهدفون</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{campaign.success_count}</p>
              <p className="text-sm text-muted-foreground">تم التسليم</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{openCount}</p>
              <p className="text-sm text-muted-foreground">الفتح</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{clickCount}</p>
              <p className="text-sm text-muted-foreground">النقر</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{unsubCount}</p>
              <p className="text-sm text-muted-foreground">إلغاء الاشتراك</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
