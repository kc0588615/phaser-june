import { cn } from '@/lib/utils';
import type { Species } from '@/types/database';
import type { SpeciesCardSummary } from './types';

export function SpeciesTCGCardMini({
  species,
  isDiscovered,
  card,
  onClick,
}: {
  species: Species;
  isDiscovered: boolean;
  card?: SpeciesCardSummary;
  onClick?: () => void;
}) {
  const iucnColor: Record<string, string> = {
    CR: 'border-destructive/60 bg-destructive/10',
    EN: 'border-ds-amber/60 bg-ds-amber/10',
    VU: 'border-primary/60 bg-primary/10',
    NT: 'border-ds-emerald/40 bg-ds-emerald/5',
    LC: 'border-border bg-card/50',
  };
  const frameClass = iucnColor[species.conservation_code || ''] || 'border-border bg-card/50';
  const completionPct = typeof card?.completionPct === 'number'
    ? Math.max(0, Math.min(100, Math.round(card.completionPct)))
    : null;
  const variantLabel = card?.cardVariant === 'foil' ? 'Foil' : null;

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-3 transition-all hover:scale-[1.02] cursor-pointer',
        frameClass,
        variantLabel && 'ring-1 ring-primary/50'
      )}
      onClick={onClick}
    >
      {species.conservation_code && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {species.conservation_code}
          </span>
          {variantLabel && (
            <span className="text-[9px] font-semibold uppercase text-primary/80 bg-primary/15 border border-primary/30 rounded px-1">
              {variantLabel}
            </span>
          )}
          {species.biome && (
            <span className="text-[9px] text-muted-foreground truncate max-w-[60%] text-right">
              {species.biome}
            </span>
          )}
        </div>
      )}

      <div className="aspect-[4/3] rounded bg-background/60 flex items-center justify-center mb-2">
        {isDiscovered ? (
          <span className="text-3xl">
            {species.class === 'AVES' ? '🐦' : species.class === 'MAMMALIA' ? '🦁' : species.class === 'REPTILIA' ? '🦎' : species.class === 'AMPHIBIA' ? '🐸' : '🐾'}
          </span>
        ) : (
          <span className="text-3xl opacity-20">?</span>
        )}
      </div>

      <div className="min-h-[2.5rem]">
        {isDiscovered ? (
          <>
            <p className="text-xs font-semibold text-foreground leading-tight truncate">
              {species.common_name || species.scientific_name}
            </p>
            <p className="text-[10px] italic text-muted-foreground truncate">
              {species.scientific_name}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold text-muted-foreground leading-tight">???</p>
            <p className="text-[10px] italic text-muted-foreground/60">Unknown Species</p>
          </>
        )}
      </div>

      <div className="flex gap-1 mt-1 flex-wrap">
        {species.marine && <span className="text-[8px] px-1.5 py-0.5 rounded bg-gem-scan/20 text-gem-scan">Marine</span>}
        {species.terrestrial && <span className="text-[8px] px-1.5 py-0.5 rounded bg-ds-emerald/20 text-ds-emerald">Land</span>}
        {species.freshwater && <span className="text-[8px] px-1.5 py-0.5 rounded bg-gem-burst/20 text-gem-burst">Fresh</span>}
      </div>

      {isDiscovered && completionPct != null && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
            <span className="capitalize">{card?.rarityTier ?? 'common'}</span>
            <span>{completionPct}%</span>
          </div>
          <div className="h-1 rounded-full bg-background/80 overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${completionPct}%` }} />
          </div>
          {card?.bestRunScore != null && (
            <p className="text-[9px] text-ds-amber mt-1 truncate">Best {card.bestRunScore} pts</p>
          )}
        </div>
      )}
    </div>
  );
}
