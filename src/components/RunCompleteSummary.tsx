import { useEffect, useMemo, useState } from 'react';
import SpeciesTCGCard, {
  type SpeciesCardRunMemory,
  type SpeciesTCGCardProps,
} from '@/components/album/SpeciesTCGCard';
import { ExpeditionRouteMap } from '@/components/ExpeditionRouteMap';
import { GlassPanel } from '@/components/ui/glass-panel';
import { useGameBridge } from '@/contexts/GameBridgeContext';
import { EVIDENCE_FAMILY_LABELS } from '@/expedition/evidenceFamilies';
import type { RunState } from '@/types/expedition';
import type { Species } from '@/types/database';
import type { FeatureClass } from '@/types/gis';

type CardProgress = Pick<
  SpeciesTCGCardProps,
  | 'gisStamps'
  | 'factsUnlocked'
  | 'clueCategoriesUnlocked'
  | 'completionPct'
  | 'rarityTier'
  | 'bestRunScore'
  | 'affinityTags'
  | 'timesEncountered'
  | 'cardVariant'
>;

export function RunCompleteSummary({ runState, onReset }: {
  runState: RunState;
  onReset: () => void;
}) {
  const { hud } = useGameBridge();
  const caseState = runState.caseState;
  const captured = runState.completionReason === 'captured' || caseState?.guessResult === 'correct';
  const resolvedProfile = runState.resolvedSpeciesId !== null
    ? caseState?.profiles.find(profile => profile.speciesId === runState.resolvedSpeciesId) ?? null
    : null;
  const [species, setSpecies] = useState<Species | null>(null);
  const [cardProgress, setCardProgress] = useState<CardProgress>({});

  useEffect(() => {
    const speciesId = resolvedProfile?.speciesId;
    if (!speciesId) {
      setSpecies(null);
      setCardProgress({});
      return;
    }

    const controller = new AbortController();
    let ignore = false;
    async function loadCaptureCard() {
      try {
        const [speciesResponse, cardResponse] = await Promise.all([
          fetch(`/api/species/by-ids?ids=${speciesId}`, { signal: controller.signal }),
          fetch(`/api/species/cards/${speciesId}`, { signal: controller.signal }),
        ]);
        const [speciesData, cardData] = await Promise.all([
          speciesResponse.ok ? speciesResponse.json() : null,
          cardResponse.ok ? cardResponse.json() : null,
        ]);
        if (ignore) return;
        setSpecies(Array.isArray(speciesData?.species) ? speciesData.species[0] ?? null : null);
        setCardProgress(toCardProgress(cardData?.card));
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') {
          console.error('Failed to load captured species card:', error);
        }
      }
    }
    void loadCaptureCard();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [resolvedProfile?.speciesId]);

  const runMemory = useMemo<SpeciesCardRunMemory>(() => ({
    routePolyline: runState.expedition?.routePolyline ?? [],
    waypoints: runState.expedition?.waypoints ?? [],
    visitedWaypointSlot: runState.visitedWaypointSlot,
    captured,
    finalScore: runState.finalScore ?? hud.score,
    realm: runState.expedition?.bioregion?.realm ?? null,
    biome: runState.expedition?.bioregion?.biome ?? null,
    bioregion: runState.expedition?.bioregion?.bioregion ?? null,
    nodes: (runState.expedition?.nodes ?? []).map((node, index) => ({
      nodeOrder: index,
      nodeType: node.node_type,
      nodeStatus: (node.waypoint?.slot ?? index) <= runState.visitedWaypointSlot ? 'completed' : 'locked',
      obstacleFamily: node.obstacleFamily,
      waypoint: node.waypoint,
    })),
  }), [captured, hud.score, runState]);

  const stats = [
    { label: 'Final Score', value: String(runState.finalScore ?? hud.score), color: 'var(--ds-accent-cyan)' },
    { label: 'Result', value: captured ? 'Captured' : 'Slipped', color: captured ? 'var(--ds-accent-emerald)' : 'var(--ds-accent-amber)' },
    { label: 'Observations', value: String(caseState?.observations.length ?? 0), color: 'var(--ds-accent-amber)' },
    { label: 'Evidence Families', value: String(caseState?.selectedFamilies.length ?? 0), color: 'var(--ds-gem-focus)' },
  ];

  return (
    <div className="absolute inset-0 z-panel flex justify-center overflow-y-auto bg-[rgba(10,14,26,0.86)] backdrop-blur-md">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center gap-4 px-5 py-8">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.28em] text-ds-cyan">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-ds-cyan/70" />
          {captured ? 'Species Captured' : 'Species Slipped Away'}
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-ds-cyan/70" />
        </div>

        {species ? (
          <>
            <div className="relative w-full">
              <div className="pointer-events-none absolute inset-12 rounded-full bg-ds-cyan/20 blur-3xl" />
              <div className="relative">
                <SpeciesTCGCard
                  species={species}
                  isDiscovered={captured}
                  runMemory={runMemory}
                  {...cardProgress}
                  affinityTags={cardProgress.affinityTags ?? runState.expedition?.activeAffinities}
                />
              </div>
            </div>
            <p className="m-0 font-mono text-[9px] uppercase tracking-[0.15em] text-ds-text-muted">
              Tap card to flip for route memory
            </p>
          </>
        ) : (
          <GlassPanel className="w-full max-w-[360px] overflow-hidden rounded-xl p-2">
            <ExpeditionRouteMap
              routePolyline={runState.expedition?.routePolyline}
              waypoints={runState.expedition?.waypoints}
              visitedWaypointSlot={runState.visitedWaypointSlot}
              captured={captured}
              ariaLabel="Completed expedition route"
            />
          </GlassPanel>
        )}

        {captured && runState.fieldFacts.length > 0 && (
          <GlassPanel className="w-full max-w-[360px] rounded-xl border-amber-100/15 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-200/35" />
              <h2 className="m-0 font-mono text-[9px] font-bold uppercase tracking-[.2em] text-amber-100/80">
                Verdict field notes
              </h2>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-200/35" />
            </div>
            <ol className="m-0 grid list-none gap-2 p-0">
              {runState.fieldFacts.map(fact => (
                <li key={`${fact.nodeIndex}-${fact.family}`} className="rounded-lg border border-white/[.06] bg-black/15 px-2.5 py-2">
                  <p className="m-0 font-mono text-[7px] font-semibold uppercase tracking-[.16em] text-cyan-100/55">
                    Site {fact.nodeIndex + 1} · {EVIDENCE_FAMILY_LABELS[fact.family]}
                  </p>
                  <p className="m-0 mt-1 text-[11px] leading-snug text-ds-text-secondary">{fact.text}</p>
                </li>
              ))}
            </ol>
          </GlassPanel>
        )}

        <div className="grid w-full max-w-[320px] grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(({ label, value, color }) => (
            <GlassPanel key={label} className="rounded-lg p-2 text-center">
              <div className="truncate font-serif text-lg leading-none" style={{ color }}>{value}</div>
              <div className="mt-1 font-mono text-[7px] font-medium uppercase tracking-wider text-ds-text-muted">{label}</div>
            </GlassPanel>
          ))}
        </div>

        <button
          type="button"
          onClick={onReset}
          className="mt-1 rounded-full border-none px-8 py-3 text-ds-body font-bold text-ds-bg shadow-glow-cyan"
          style={{ background: 'var(--ds-gradient-cta)' }}
        >
          Return to Globe
        </button>
      </div>
    </div>
  );
}

function toCardProgress(value: unknown): CardProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const card = value as Record<string, unknown>;
  return {
    gisStamps: Array.isArray(card.gisStamps) ? card.gisStamps as FeatureClass[] : undefined,
    factsUnlocked: Array.isArray(card.factsUnlocked) ? card.factsUnlocked as string[] : undefined,
    clueCategoriesUnlocked: Array.isArray(card.clueCategoriesUnlocked) ? card.clueCategoriesUnlocked as string[] : undefined,
    completionPct: typeof card.completionPct === 'number' ? card.completionPct : undefined,
    rarityTier: typeof card.rarityTier === 'string' ? card.rarityTier : undefined,
    bestRunScore: typeof card.bestRunScore === 'number' ? card.bestRunScore : null,
    affinityTags: Array.isArray(card.affinityTags) ? card.affinityTags as string[] : undefined,
    timesEncountered: typeof card.timesEncountered === 'number' ? card.timesEncountered : undefined,
    cardVariant: typeof card.cardVariant === 'string' ? card.cardVariant : null,
  };
}
