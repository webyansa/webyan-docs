import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { KPI_METRICS, KPI_CATEGORIES, type KpiMetrics } from '@/lib/marketing/kpiConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BarChart3, TrendingUp, Save, Loader2 } from 'lucide-react';

interface PostMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postTitle: string;
  currentMetrics: KpiMetrics;
  onSaved: () => void;
}

export function PostMetricsDialog({ open, onOpenChange, postId, postTitle, currentMetrics, onSaved }: PostMetricsDialogProps) {
  const [metrics, setMetrics] = useState<KpiMetrics>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMetrics({ ...currentMetrics });
    }
  }, [open, currentMetrics]);

  const updateValue = (key: string, val: string) => {
    const num = parseInt(val) || 0;
    if (num === 0) {
      const updated = { ...metrics };
      delete updated[key];
      setMetrics(updated);
    } else {
      setMetrics({ ...metrics, [key]: num });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await (supabase.from('content_calendar').update({ metrics }).eq('id', postId) as any);
    if (error) {
      toast.error('فشل حفظ النتائج');
    } else {
      toast.success('تم حفظ نتائج المؤشرات ✅');
      onSaved();
      onOpenChange(false);
    }
    setSaving(false);
  };

  const totalMetrics = Object.values(metrics).reduce((s, v) => s + (v || 0), 0);
  const filledCount = Object.values(metrics).filter(v => v && v > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            نتائج أداء المنشور
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{postTitle}</p>
        </DialogHeader>

        {/* Summary strip */}
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">مؤشرات مُدخلة:</span>
            <Badge variant="secondary">{filledCount} / {KPI_METRICS.length}</Badge>
          </div>
          <Progress value={(filledCount / KPI_METRICS.length) * 100} className="h-2 flex-1" />
        </div>

        <div className="space-y-5">
          {KPI_CATEGORIES.map(cat => {
            const catMetrics = KPI_METRICS.filter(m => m.category === cat.key);
            return (
              <div key={cat.key}>
                <div className="flex items-center gap-2 mb-3">
                  <Separator className="flex-1" />
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap px-2">{cat.label}</span>
                  <Separator className="flex-1" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {catMetrics.map(m => {
                    const Icon = m.icon;
                    const hasValue = metrics[m.key] && metrics[m.key] > 0;
                    return (
                      <div
                        key={m.key}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                          hasValue 
                            ? 'border-primary/30 bg-primary/5 shadow-sm' 
                            : 'border-border bg-background hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className={`flex items-center justify-center h-10 w-10 rounded-lg bg-${m.color}-100 dark:bg-${m.color}-900/30`}>
                          <Icon className={`h-5 w-5 text-${m.color}-600 dark:text-${m.color}-400`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{m.label}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{m.description}</div>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 w-24 text-center font-semibold text-sm"
                          value={metrics[m.key] || ''}
                          onChange={e => updateValue(m.key, e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ النتائج
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
