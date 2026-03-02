import { History } from 'lucide-react';
import { useSidePanel } from '@/hooks/useSidePanel';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { SessionMeta, InitPhase } from '@/lib/types';

interface StatusBadgePassthroughProps {
  meta: SessionMeta | null;
  isDetecting: boolean;
  phase: InitPhase;
  onShowChange: (show: { id: number; name: string }) => void;
  onEpisodeChange: (season: string, episode: string) => void;
  onContextChange: (context: string) => void;
  onClearChat: () => void;
  onRedetect: () => void;
}

interface HeaderProps {
  statusBadgeProps?: StatusBadgePassthroughProps;
  onOpenHistory?: () => void;
  sessionCount?: number;
  onRefresh?: () => void;
}

/** Inline SVG shield logo with a breathing sparkle in the centre. */
function ShieldLogo({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C6FF7" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>

      {/* Rounded modern shield body */}
      <path
        d="M12 2.5C10.5 2.5 5 4.5 5 4.5V11.5C5 16.5 8.2 20.4 12 22C15.8 20.4 19 16.5 19 11.5V4.5C19 4.5 13.5 2.5 12 2.5Z"
        fill="url(#shieldGrad)"
      />

      {/* 4-point sparkle — slow breathing pulse */}
      <path
        d="M12 8.5L12.65 10.85L15 11.5L12.65 12.15L12 14.5L11.35 12.15L9 11.5L11.35 10.85L12 8.5Z"
        fill="white"
        fillOpacity="0.9"
        className="animate-breathe"
        style={{ transformOrigin: '12px 11.5px' }}
      />
    </svg>
  );
}

export function Header({
  statusBadgeProps,
  onOpenHistory,
  sessionCount,
}: HeaderProps) {
  const isSidePanel = useSidePanel();

  if (isSidePanel) {
    return (
      <header className="relative py-2.5 px-3 border-b border-white/5 bg-card/70 backdrop-blur-md z-20 shrink-0">
        {/* Subtle top-to-bottom depth gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

        <div className="relative flex items-center justify-between gap-2">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <ShieldLogo size={22} />
            <span className="font-brand text-sm font-semibold tracking-tight text-foreground select-none">
              spoilershield
            </span>
          </div>

          {/* Status badge + history button */}
          <div className="flex items-center gap-1.5">
            {statusBadgeProps && <StatusBadge {...statusBadgeProps} />}

            {onOpenHistory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenHistory}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground relative"
                aria-label="Chat history"
              >
                <History className="w-4 h-4" />
                {sessionCount !== undefined && sessionCount > 1 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-medium">
                    {sessionCount > 9 ? '9+' : sessionCount}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Web-app header
  return (
    <header className="py-4 px-6 border-b border-white/5 bg-card/70 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <ShieldLogo size={32} />
        <div>
          <h1 className="font-brand text-xl font-semibold text-foreground tracking-tight">
            spoilershield
          </h1>
          <p className="text-xs text-muted-foreground">
            Ask questions without spoilers
          </p>
        </div>
      </div>
    </header>
  );
}
