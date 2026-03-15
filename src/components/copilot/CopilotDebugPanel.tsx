import { ChevronDown, ChevronUp, Bug } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface DebugInfo {
  model?: string;
  chunks_count?: number;
  confidence?: number;
  prompt_size?: number;
  latency_ms?: number;
  grounded?: boolean;
}

export default function CopilotDebugPanel({ debug }: { debug: DebugInfo | null }) {
  const [open, setOpen] = useState(false);

  if (!debug) return null;

  return (
    <div className="border-t border-border bg-muted/30">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50"
      >
        <Bug className="h-3 w-3" />
        <span>Debug Panel</span>
        {open ? <ChevronUp className="h-3 w-3 mr-auto" /> : <ChevronDown className="h-3 w-3 mr-auto" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Model:</span>
            <span>{debug.model || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Chunks:</span>
            <span>{debug.chunks_count ?? '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Confidence:</span>
            <span>{debug.confidence != null ? `${debug.confidence}%` : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Prompt Size:</span>
            <span>{debug.prompt_size ? `~${debug.prompt_size} tokens` : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Latency:</span>
            <span>{debug.latency_ms ? `${debug.latency_ms}ms` : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Grounded:</span>
            <Badge variant={debug.grounded ? "default" : "destructive"} className="text-[10px] h-4">
              {debug.grounded ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
