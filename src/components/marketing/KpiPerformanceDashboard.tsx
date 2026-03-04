import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  KPI_METRICS,
  type KpiTargets,
  type KpiMetrics,
  calculatePerformance,
  getPerformanceColor,
  getPerformanceBgColor,
  getMetricConfig,
} from '@/lib/marketing/kpiConfig';

interface KpiPerformanceDashboardProps {
  targets: KpiTargets;
  actuals: KpiMetrics;
  title?: string;
  compact?: boolean;
}

export function KpiPerformanceDashboard({ targets, actuals, title = 'أداء المؤشرات', compact = false }: KpiPerformanceDashboardProps) {
  const activeKeys = Object.keys(targets).filter(k => targets[k] > 0);

  if (activeKeys.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          لم يتم تعيين مؤشرات مستهدفة بعد
        </CardContent>
      </Card>
    );
  }

  // Overall performance
  const overallPct = activeKeys.length > 0
    ? Math.round(activeKeys.reduce((sum, k) => sum + calculatePerformance(actuals[k] || 0, targets[k]), 0) / activeKeys.length)
    : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className={`h-2.5 w-2.5 rounded-full ${getPerformanceBgColor(overallPct)}`} />
          <span className={`text-sm font-bold ${getPerformanceColor(overallPct)}`}>{overallPct}%</span>
        </div>
        <Progress value={Math.min(overallPct, 100)} className="h-2 flex-1" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge className={`${getPerformanceBgColor(overallPct)} text-white`}>
            الأداء الكلي: {overallPct}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeKeys.map(key => {
          const config = getMetricConfig(key);
          if (!config) return null;
          const target = targets[key];
          const actual = actuals[key] || 0;
          const pct = calculatePerformance(actual, target);
          const Icon = config.icon;

          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 text-${config.color}-500`} />
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {actual.toLocaleString()} / {target.toLocaleString()}
                  </span>
                  <span className={`font-bold ${getPerformanceColor(pct)}`}>
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all ${getPerformanceBgColor(pct)}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
