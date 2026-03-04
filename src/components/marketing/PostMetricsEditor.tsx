import { Input } from '@/components/ui/input';
import { KPI_METRICS, type KpiMetrics } from '@/lib/marketing/kpiConfig';

interface PostMetricsEditorProps {
  value: KpiMetrics;
  onChange: (metrics: KpiMetrics) => void;
}

export function PostMetricsEditor({ value, onChange }: PostMetricsEditorProps) {
  const updateValue = (key: string, val: string) => {
    const num = parseInt(val) || 0;
    if (num === 0) {
      const updated = { ...value };
      delete updated[key];
      onChange(updated);
    } else {
      onChange({ ...value, [key]: num });
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold block">نتائج الأداء (Metrics)</label>
      <p className="text-xs text-muted-foreground">أدخل النتائج الفعلية بعد نشر المحتوى</p>
      <div className="grid grid-cols-2 gap-2">
        {KPI_METRICS.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.key} className="flex items-center gap-2 rounded-lg border p-2">
              <Icon className={`h-4 w-4 shrink-0 text-${m.color}-500`} />
              <span className="text-xs font-medium flex-1 min-w-0 truncate">{m.label}</span>
              <Input
                type="number"
                min={0}
                className="h-7 w-20 text-xs"
                value={value[m.key] || ''}
                onChange={e => updateValue(m.key, e.target.value)}
                placeholder="0"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
