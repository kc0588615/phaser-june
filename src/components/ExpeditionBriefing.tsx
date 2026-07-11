import React from 'react';
import { SignInButton, useUser } from '@clerk/nextjs';
import type { ExpeditionData } from '@/types/expedition';
import { Badge } from '@/components/ui/badge';

interface Props {
  expedition: ExpeditionData;
  onStart: () => void;
  onClose?: () => void;
}

function formatArea(expedition: ExpeditionData) {
  return expedition.bioregion?.bioregion
    || expedition.bioregion?.realm
    || 'Selected habitat';
}

export const ExpeditionBriefing: React.FC<Props> = ({ expedition, onStart, onClose }) => {
  const { isLoaded, isSignedIn } = useUser();
  const biome = expedition.bioregion?.biome || 'Local species field notes';
  const area = formatArea(expedition);
  const threatenedCount = Number(expedition.signals.threatened_species_count ?? 0);
  const protectedAreas = expedition.protectedAreas
    .filter(area => area.name || area.designation)
    .slice(0, 3);
  const riverKm = expedition.nearestRiverDistM != null
    ? expedition.nearestRiverDistM / 1000
    : null;

  return (
    <div className="h-full min-h-0 flex-1 w-full overflow-y-auto p-ds-lg box-border flex flex-col gap-ds-md text-ds-text-primary">
      <div className="flex items-start justify-between gap-ds-md">
        <div>
          <div className="text-ds-caption uppercase tracking-wide text-ds-text-secondary">Globe field site</div>
          <h2 className="m-0 mt-1 text-xl font-semibold text-ds-text-primary">Mystery Critter from {area}</h2>
          <div className="text-ds-body text-ds-text-secondary mt-1">{biome}</div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent border border-ds-subtle rounded-md text-ds-text-secondary text-base leading-none px-ds-sm py-ds-xs cursor-pointer"
            aria-label="Back to map"
            title="Back to map"
          >
            x
          </button>
        )}
      </div>

      <div className="rounded-lg border border-ds-subtle bg-ds-surface-elevated p-ds-md">
        <div className="text-ds-body text-ds-text-primary font-medium">
          Match clue gems to reveal field notes, then identify the hidden species.
        </div>
        <div className="text-ds-caption text-ds-text-secondary mt-2">
          You have 12 moves. Guess when the taxonomy and habitat clues point to one animal.
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {protectedAreas.map(area => (
          <Badge key={`${area.name ?? 'unnamed'}:${area.designation ?? 'unknown'}`} variant="secondary" className="text-ds-caption bg-ds-surface-elevated text-[var(--ds-gem-scan)]">
            {area.name || area.designation}
          </Badge>
        ))}
        {riverKm != null && riverKm < 10 && (
          <Badge variant="secondary" className="text-ds-caption bg-ds-surface-elevated text-[var(--ds-gem-scan)]">
            River {riverKm.toFixed(1)} km
          </Badge>
        )}
        {expedition.waypointRadiusKm != null && (
          <Badge variant="secondary" className="text-ds-caption bg-ds-surface-elevated text-ds-text-secondary">
            {expedition.waypointRadiusKm} km field area
          </Badge>
        )}
        {threatenedCount > 0 && (
          <Badge variant="secondary" className="text-ds-caption bg-ds-surface-elevated text-[var(--ds-accent-rose)]">
            {threatenedCount} threatened nearby
          </Badge>
        )}
      </div>

      <div className="mt-auto pt-ds-xs shrink-0">
        {isSignedIn ? (
          <button
            type="button"
            onClick={onStart}
            className="w-full py-3.5 px-5 text-base font-bold text-ds-bg border-none rounded-full cursor-pointer text-center shadow-glow-cyan"
            style={{ background: 'var(--ds-gradient-cta)' }}
          >
            Investigate
          </button>
        ) : (
          <SignInButton mode="redirect">
            <button
              type="button"
              disabled={!isLoaded}
              className="w-full py-3.5 px-5 text-base font-bold text-ds-bg border-none rounded-full cursor-pointer text-center shadow-glow-cyan disabled:cursor-wait disabled:opacity-60"
              style={{ background: 'var(--ds-gradient-cta)' }}
            >
              Sign in to investigate
            </button>
          </SignInButton>
        )}
      </div>
    </div>
  );
};
