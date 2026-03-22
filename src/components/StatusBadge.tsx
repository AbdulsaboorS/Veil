import { useState } from 'react';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { ShowSearch } from '@/components/ShowSearch';
import { EpisodeSelector } from '@/components/EpisodeSelector';
import { SessionMeta, InitPhase } from '@/lib/types';

interface StatusBadgeProps {
  meta: SessionMeta | null;
  isDetecting: boolean;
  phase: InitPhase;
  onShowChange: (show: { id: number; name: string }) => void;
  onEpisodeChange: (season: string, episode: string) => void;
  onContextChange: (context: string) => void;
  onClearChat: () => void;
  onRedetect: () => void;
}

export function StatusBadge({
  meta,
  isDetecting,
  phase,
  onShowChange,
  onEpisodeChange,
  onContextChange,
  onClearChat,
  onRedetect,
}: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState<{ id: number; name: string } | null>(
    meta?.showId ? { id: meta.showId, name: meta.showTitle } : null
  );
  const [season, setSeason] = useState(meta?.season || '');
  const [episode, setEpisode] = useState(meta?.episode || '');
  const [context, setContext] = useState(meta?.context || '');

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && meta) {
      setSelectedShow(meta.showId ? { id: meta.showId, name: meta.showTitle } : null);
      setSeason(meta.season);
      setEpisode(meta.episode);
      setContext(meta.context);
    }
    setOpen(nextOpen);
  };

  const handleShowSelect = (show: { id: number; name: string }) => {
    setSelectedShow(show);
    setSeason('');
    setEpisode('');
    onShowChange(show);
  };

  const handleSeasonChange = (s: string) => {
    setSeason(s);
    setEpisode('');
  };

  const handleEpisodeChange = (e: string) => {
    setEpisode(e);
    if (season && e) onEpisodeChange(season, e);
  };

  const handleContextSave = () => {
    onContextChange(context);
    setOpen(false);
  };

  const handleClearChat = () => {
    onClearChat();
    setOpen(false);
  };

  // ── Trigger pill ──────────────────────────────────────────────────
  let triggerContent: React.ReactNode;

  if (phase === 'detecting' || phase === 'resolving' || isDetecting) {
    triggerContent = (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Detecting…
      </span>
    );
  } else if (phase === 'no-show') {
    triggerContent = (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-muted-foreground bg-secondary border border-border cursor-pointer hover:text-foreground hover:border-primary/30 transition-colors">
        + Setup
      </span>
    );
  } else if (meta) {
    const title = meta.showTitle.length > 22
      ? meta.showTitle.slice(0, 20) + '…'
      : meta.showTitle;
    // Prefer rawEpisode ("Ep 1093") over S/E notation for absolute episode numbers
    const ep = meta.season && meta.episode
      ? (meta.rawEpisode ? `Ep ${meta.rawEpisode}` : `S${meta.season}E${meta.episode}`)
      : null;
    const label = ep ? `${title} · ${ep}` : title;

    // Dot colour: violet when episode known, amber when episode missing
    const dotClass = meta.season && meta.episode
      ? 'bg-primary'
      : 'bg-amber-400';

    triggerContent = (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary border border-border text-foreground cursor-pointer hover:border-primary/40 transition-colors max-w-[190px] truncate">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
        {label}
      </span>
    );
  } else {
    triggerContent = (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-muted-foreground bg-secondary border border-border cursor-pointer hover:text-foreground hover:border-primary/30 transition-colors">
        + Setup
      </span>
    );
  }

  const isDisabledPhase = phase === 'detecting' || phase === 'resolving';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild disabled={isDisabledPhase}>
        <button className="focus:outline-none" aria-label="Configure show and episode">
          {triggerContent}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        collisionPadding={8}
        className="w-80 max-h-[70vh] overflow-y-auto p-3 space-y-3"
      >
        {/* Show search */}
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Show</div>
          <ShowSearch
            onSelect={handleShowSelect}
            selectedShow={selectedShow}
            initialValue={meta?.showTitle}
          />
        </div>

        {/* Episode selector */}
        {selectedShow && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">Episode</div>
            <EpisodeSelector
              showId={selectedShow.id}
              showName={selectedShow.name}
              selectedSeason={season}
              selectedEpisode={episode}
              selectedTimestamp=""
              onSeasonChange={handleSeasonChange}
              onEpisodeChange={handleEpisodeChange}
              onTimestampChange={() => {}}
            />
          </div>
        )}

        {/* TVMaze episode link (shown when resolved for absolute episode numbers) */}
        {meta?.tvmazeEpisodeUrl && (
          <a
            href={meta.tvmazeEpisodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View episode on TVMaze →
          </a>
        )}

        {/* Context */}
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Context (episode recap)</div>
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Paste episode recap or summary here..."
            className="min-h-[80px] bg-input border-border resize-none text-xs"
          />
          <Button size="sm" onClick={handleContextSave} className="w-full h-8 text-xs">
            Save context
          </Button>
        </div>

        <div className="border-t border-border pt-2 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground justify-start gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear chat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { onRedetect(); setOpen(false); }}
            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground justify-start gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-detect show
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
