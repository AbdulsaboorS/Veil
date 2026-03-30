import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const BETA_TOOLTIP =
  'Veil is in beta. You may hit bugs or rough edges — your patience helps us improve. Report issues from the extension if something looks off.';

/** Small beta chip for the Chrome side panel; hover or focus shows details. */
export function BetaBadge() {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-500/35 bg-amber-500/[0.12] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100/95 outline-none hover:bg-amber-500/20 focus-visible:ring-2 focus-visible:ring-amber-400/50"
          aria-label="Beta — what's this?"
        >
          Beta
          <Info className="size-3 opacity-85" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-[240px] text-left text-xs leading-snug">
        {BETA_TOOLTIP}
      </TooltipContent>
    </Tooltip>
  );
}
