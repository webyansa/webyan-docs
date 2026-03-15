import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCopilot } from './CopilotContext';
import { cn } from '@/lib/utils';

export default function CopilotLauncher() {
  const { isOpen, setIsOpen } = useCopilot();

  return (
    <Button
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        "fixed bottom-6 left-6 z-[60] h-14 w-14 rounded-full shadow-lg",
        "bg-gradient-to-br from-primary to-secondary text-white",
        "hover:shadow-xl hover:scale-105 transition-all duration-200",
        isOpen && "ring-2 ring-primary/50 ring-offset-2"
      )}
      size="icon"
    >
      <Sparkles className="h-6 w-6" />
    </Button>
  );
}
