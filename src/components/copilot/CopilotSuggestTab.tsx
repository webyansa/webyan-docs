import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lightbulb } from 'lucide-react';

interface Props {
  onSubmit: (data: { context_description: string }) => void;
  isLoading: boolean;
}

export default function CopilotSuggestTab({ onSubmit, isLoading }: Props) {
  const [context, setContext] = useState('');

  const handleSubmit = () => {
    if (!context.trim()) return;
    onSubmit({ context_description: context });
  };

  return (
    <div className="space-y-3 p-3">
      <div>
        <Label className="text-xs font-medium">وصف الحالة الحالية</Label>
        <Textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="اشرح الحالة الحالية أو المهمة التي تحتاج مساعدة فيها..."
          className="mt-1 text-sm min-h-[120px] resize-none"
          dir="rtl"
        />
      </div>
      <Button onClick={handleSubmit} disabled={isLoading || !context.trim()} size="sm" className="w-full gap-2">
        <Lightbulb className="h-3.5 w-3.5" />
        اقترح الإجراءات
      </Button>
    </div>
  );
}
