import { Trash2, MessageSquare } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SessionMeta } from '@/lib/types';

interface HistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: SessionMeta[];
  activeSessionId: string | null;
  onSwitch: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function HistorySheet({
  open,
  onOpenChange,
  sessions,
  activeSessionId,
  onSwitch,
  onDelete,
}: HistorySheetProps) {
  const sorted = [...sessions].sort((a, b) => b.lastMessageAt - a.lastMessageAt);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0 bg-card border-r border-border">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="font-brand text-sm font-semibold text-foreground">
            History
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-52px)]">
          {sorted.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <MessageSquare className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No sessions yet</p>
            </div>
          ) : (
            <ul className="py-1">
              {sorted.map((session) => {
                const isActive = session.sessionId === activeSessionId;
                const episodeLabel =
                  session.season && session.episode
                    ? `S${session.season} E${session.episode}`
                    : session.season
                    ? `S${session.season}`
                    : null;

                return (
                  <li key={session.sessionId}>
                    <div
                      className={cn(
                        'group flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors',
                        isActive
                          ? 'bg-primary/10 border-l-2 border-primary'
                          : 'hover:bg-secondary border-l-2 border-transparent'
                      )}
                      onClick={() => {
                        onSwitch(session.sessionId);
                        onOpenChange(false);
                      }}
                    >
                      {/* Dot instead of icon — cleaner */}
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                          isActive ? 'bg-primary' : 'bg-muted-foreground/40'
                        )}
                      />

                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'text-xs font-medium truncate',
                          isActive ? 'text-foreground' : 'text-foreground/80'
                        )}>
                          {session.showTitle}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {episodeLabel && (
                            <span className="text-[11px] text-muted-foreground">
                              {episodeLabel}
                            </span>
                          )}
                          {episodeLabel && (
                            <span className="text-[11px] text-muted-foreground/40">·</span>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-[11px] text-muted-foreground/40">·</span>
                          <span className="text-[11px] text-muted-foreground">
                            {relativeTime(session.lastMessageAt)}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground/50 hover:text-destructive shrink-0 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(session.sessionId);
                        }}
                        aria-label="Delete session"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
