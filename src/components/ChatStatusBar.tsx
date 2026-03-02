import { Loader2, AlertCircle } from 'lucide-react';
import { SessionMeta, InitPhase } from '@/lib/types';

interface ChatStatusBarProps {
  meta: SessionMeta | null;
  isLoadingRecap: boolean;
  phase: InitPhase;
}

export function ChatStatusBar({ meta, isLoadingRecap, phase }: ChatStatusBarProps) {
  // Error — keep the box, this needs to stand out
  if (phase === 'error') {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
        <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
        <span className="text-xs text-destructive">
          Something went wrong. Try re-detecting via the badge.
        </span>
      </div>
    );
  }

  // Loading recap — amber communicates "in progress", keep the box
  if (isLoadingRecap) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <Loader2 className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
        <span className="text-xs text-amber-300/80 font-medium">
          Fetching episode recap…
        </span>
      </div>
    );
  }

  // No context — borderless, whisper-quiet
  if (meta && !meta.context) {
    return (
      <div className="flex items-center gap-1.5 px-1 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
        <span className="text-xs text-muted-foreground/70">
          No recap — answering from general knowledge
        </span>
      </div>
    );
  }

  // Shielding ready — borderless, just a violet dot + quiet text
  if (meta?.season && meta?.episode) {
    return (
      <div className="flex items-center gap-1.5 px-1 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
        <span className="text-xs text-muted-foreground/70">
          Shielding up to S{meta.season} E{meta.episode}
        </span>
      </div>
    );
  }

  return null;
}
