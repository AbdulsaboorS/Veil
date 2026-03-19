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

  // Loading recap — episode is already known, show the boundary immediately
  // with a spinner to signal we're still enriching context in the background.
  if (isLoadingRecap) {
    if (meta?.season && meta?.episode) {
      return (
        <div className="flex items-center gap-1.5 px-1 py-0.5">
          <Loader2 className="w-2.5 h-2.5 text-primary/50 animate-spin shrink-0" />
          <span className="text-xs text-muted-foreground/70">
            Shielding up to S{meta.season} E{meta.episode}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-1 py-0.5">
        <Loader2 className="w-2.5 h-2.5 text-primary/50 animate-spin shrink-0" />
        <span className="text-xs text-muted-foreground/70">
          Setting up shield…
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
