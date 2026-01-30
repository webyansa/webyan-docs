import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LifecycleStage, lifecycleConfig } from './LifecycleBadge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface LifecycleStageSelectorProps {
  organizationId: string;
  currentStage: LifecycleStage;
  onStageChange: () => void;
}

export function LifecycleStageSelector({
  organizationId,
  currentStage,
  onStageChange,
}: LifecycleStageSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStageChange = async (newStage: LifecycleStage) => {
    if (newStage === currentStage) return;

    const oldConfig = lifecycleConfig[currentStage];
    const newConfig = lifecycleConfig[newStage];

    if (!confirm(`هل تريد تغيير مرحلة العميل من "${oldConfig.label}" إلى "${newConfig.label}"؟`)) {
      return;
    }

    setIsUpdating(true);

    try {
      // Update lifecycle_stage - the database trigger will log to timeline automatically
      const { error: updateError } = await supabase
        .from('client_organizations')
        .update({ lifecycle_stage: newStage })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      toast.success('تم تغيير مرحلة العميل بنجاح');
      onStageChange();
    } catch (error) {
      console.error('Error changing lifecycle stage:', error);
      toast.error('حدث خطأ أثناء تغيير المرحلة');
    } finally {
      setIsUpdating(false);
    }
  };

  const currentConfig = lifecycleConfig[currentStage] || lifecycleConfig.active;

  return (
    <Select
      value={currentStage}
      onValueChange={(value) => handleStageChange(value as LifecycleStage)}
      disabled={isUpdating}
    >
      <SelectTrigger className="w-[180px] h-8 text-sm">
        {isUpdating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span>{currentConfig.icon}</span>
              <span>{currentConfig.label}</span>
            </span>
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        {Object.entries(lifecycleConfig).map(([stage, config]) => (
          <SelectItem key={stage} value={stage}>
            <span className="flex items-center gap-2">
              <span>{config.icon}</span>
              <span>{config.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
