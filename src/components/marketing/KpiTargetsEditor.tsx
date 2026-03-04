import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { KPI_METRICS, KPI_CATEGORIES, type KpiTargets } from '@/lib/marketing/kpiConfig';

interface KpiTargetsEditorProps {
  value: KpiTargets;
  onChange: (targets: KpiTargets) => void;
  compact?: boolean;
}

export function KpiTargetsEditor({ value, onChange, compact = false }: KpiTargetsEditorProps) {
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(() => {
    return new Set(Object.keys(value).filter(k => value[k] > 0));
  });

  const toggleMetric = (key: string) => {
    const next = new Set(enabledKeys);
    if (next.has(key)) {
      next.delete(key);
      const updated = { ...value };
      delete updated[key];
      onChange(updated);
    } else {
      next.add(key);
      onChange({ ...value, [key]: 0 });
    }
    setEnabledKeys(next);
  };

  const updateValue = (key: string, val: string) => {
    const num = parseInt(val) || 0;
    onChange({ ...value, [key]: num });
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold block">المؤشرات المستهدفة (KPIs)</label>
      {KPI_CATEGORIES.map(cat => {
        const metrics = KPI_METRICS.filter(m => m.category === cat.key);
        return (
          <div key={cat.key} className="space-y-2">
            {!compact && <p className="text-xs font-medium text-muted-foreground">{cat.label}</p>}
            <div className={compact ? "grid grid-cols-2 gap-2" : "space-y-2"}>
              {metrics.map(m => {
                const Icon = m.icon;
                const enabled = enabledKeys.has(m.key);
                return (
                  <div key={m.key} className="flex items-center gap-2 rounded-lg border p-2">
                    <Switch checked={enabled} onCheckedChange={() => toggleMetric(m.key)} className="shrink-0" />
                    <Icon className={`h-4 w-4 shrink-0 text-${m.color}-500`} />
                    <span className="text-xs font-medium flex-1 min-w-0 truncate">{m.label}</span>
                    {enabled && (
                      <Input
                        type="number"
                        min={0}
                        className="h-7 w-24 text-xs"
                        value={value[m.key] || ''}
                        onChange={e => updateValue(m.key, e.target.value)}
                        placeholder="الهدف"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
