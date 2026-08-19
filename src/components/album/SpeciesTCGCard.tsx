import { useState } from 'react';
import Image from 'next/image';
import { RotateCw } from 'lucide-react';
import { ExpeditionRouteMap } from '@/components/ExpeditionRouteMap';
import { AFFINITY_TYPES, getAffinityDefinition, type AffinityType } from '@/expedition/affinities';
import { getRunNodeLabel } from '@/expedition/domain';
import type { RoutePoint } from '@/lib/expeditionRoute';
import { iucnLabel } from '@/lib/iucn';
import { cn } from '@/lib/utils';
import type { PublicRunMemory } from '@/lib/runProjection';
import type { Species } from '@/types/database';
import type { FeatureClass } from '@/types/gis';
import type { ExpeditionWaypointMemory } from '@/types/waypoints';

const CARD_TONES: Record<string, { accent: string; dim: string }> = {
  CR: { accent: '#f87171', dim: '#7f1d1d' },
  EN: { accent: '#fbbf24', dim: '#78350f' },
  VU: { accent: '#22d3ee', dim: '#164e63' },
  NT: { accent: '#34d399', dim: '#064e3b' },
  LC: { accent: '#94a3b8', dim: '#334155' },
};

const CLASS_META: Record<string, { emoji: string; label: string }> = {
  AVES: { emoji: '🐦', label: 'Bird' },
  MAMMALIA: { emoji: '🦁', label: 'Mammal' },
  REPTILIA: { emoji: '🦎', label: 'Reptile' },
  AMPHIBIA: { emoji: '🐸', label: 'Amphibian' },
  ACTINOPTERYGII: { emoji: '🐟', label: 'Fish' },
  CHONDRICHTHYES: { emoji: '🦈', label: 'Shark' },
  INSECTA: { emoji: '🦋', label: 'Insect' },
};

const FEATURE_CLASS_BADGES: Record<FeatureClass, { icon: string; label: string }> = {
  river: { icon: '🌊', label: 'River' },
  lake: { icon: '💧', label: 'Lake' },
  protected_area: { icon: '🛡', label: 'Protected' },
  bioregion: { icon: '🌍', label: 'Bioregion' },
  ramsar_site: { icon: '🏞', label: 'Ramsar' },
};

const CLUE_LABELS: Record<string, string> = {
  classification: 'Class',
  habitat: 'Habitat',
  geographic: 'Range',
  morphology: 'Form',
  behavior: 'Behavior',
  life_cycle: 'Life',
  conservation: 'Status',
  key_facts: 'Facts',
};

export type SpeciesCardRunMemory = Partial<Omit<PublicRunMemory, 'nodes' | 'routePolyline'>> & {
  nodes?: PublicRunMemory['nodes'];
  routePolyline?: RoutePoint[];
  waypoints?: ExpeditionWaypointMemory[];
  visitedWaypointSlot?: number;
  captured?: boolean;
  startedAt?: string;
};

export interface SpeciesTCGCardProps {
  species: Species;
  isDiscovered: boolean;
  discoveredAt?: string;
  runMemory?: SpeciesCardRunMemory | null;
  gisStamps?: FeatureClass[];
  factsUnlocked?: string[];
  clueCategoriesUnlocked?: string[];
  completionPct?: number;
  rarityTier?: string;
  bestRunScore?: number | null;
  affinityTags?: string[];
  timesEncountered?: number;
  cardVariant?: string | null;
  initialFlipped?: boolean;
  onFlip?: () => void;
}

export default function SpeciesTCGCard({
  species,
  isDiscovered,
  discoveredAt,
  runMemory,
  gisStamps = [],
  factsUnlocked = [],
  clueCategoriesUnlocked = [],
  completionPct,
  rarityTier,
  bestRunScore,
  affinityTags = [],
  timesEncountered,
  cardVariant,
  initialFlipped = false,
  onFlip,
}: SpeciesTCGCardProps) {
  const [flipped, setFlipped] = useState(initialFlipped);
  const code = species.conservation_code || 'LC';
  const tone = CARD_TONES[code] ?? CARD_TONES.LC;
  const classMeta = CLASS_META[species.class || ''] ?? { emoji: '🐾', label: 'Animal' };
  const completion = clampPercent(completionPct);
  const facts = [
    { key: 'key_fact_1', text: species.key_fact_1 },
    { key: 'key_fact_2', text: species.key_fact_2 },
    { key: 'key_fact_3', text: species.key_fact_3 },
  ];
  const unlockedFacts = new Set(factsUnlocked);
  const coreFactValues = new Set(facts.flatMap(fact => [fact.key, fact.text].filter((value): value is string => Boolean(value))));
  const expeditionFacts = factsUnlocked.filter(value => !coreFactValues.has(value) && value.includes(' ')).slice(-3);
  const unlockedClueCategories = new Set(clueCategoriesUnlocked);
  const knownAffinities = getKnownAffinityTags(affinityTags).slice(0, 3);
  const memoryWaypoints = getMemoryWaypoints(runMemory);
  const visitedSlot = getVisitedWaypointSlot(runMemory, memoryWaypoints);
  const memoryDate = runMemory?.startedAt ?? runMemory?.createdAt ?? discoveredAt;
  const variantLabel = cardVariant === 'foil' ? 'Foil' : null;

  const handleFlip = () => {
    setFlipped(value => !value);
    onFlip?.();
  };

  return (
    <div className="aspect-[2/3] w-full max-w-[320px]" style={{ marginInline: 'auto', perspective: '1400px' }}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Flip ${isDiscovered ? species.common_name || species.scientific_name || 'species' : 'mystery'} card`}
        aria-pressed={flipped}
        className={cn(
          'relative size-full cursor-pointer rounded-2xl outline-none transition-transform duration-700 [transform-style:preserve-3d] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          flipped && '[transform:rotateY(180deg)]',
        )}
        onClick={handleFlip}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleFlip();
          }
        }}
      >
        <CardFace
          side="front"
          accent={tone.accent}
          visible={!flipped}
          foil={Boolean(variantLabel)}
        >
          <div className="relative z-[2] flex items-start justify-between">
            <div className="flex flex-col items-start gap-1">
              <div
                className="flex size-12 -rotate-3 items-center justify-center rounded-xl text-base font-black tracking-wide text-slate-950"
                style={{ background: `linear-gradient(135deg, ${tone.accent}, ${tone.dim})`, boxShadow: `0 0 18px ${tone.accent}88` }}
              >
                {code}
              </div>
              <span className="max-w-24 truncate font-mono text-[7px] uppercase tracking-[0.16em] text-slate-500">
                {iucnLabel(code)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-slate-600/40 bg-slate-950/60 px-2.5 py-1">
              <span aria-hidden="true">{classMeta.emoji}</span>
              <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-slate-400">{classMeta.label}</span>
            </div>
          </div>

          <div
            className="relative z-[2] mt-2 h-[142px] overflow-hidden rounded-[10px] border bg-slate-950"
            style={{ borderColor: `${tone.accent}66`, boxShadow: `0 0 24px ${tone.accent}22` }}
          >
            <div
              className="absolute inset-0 opacity-70"
              style={{
                background: `radial-gradient(circle at 50% 42%, ${tone.accent}30, transparent 58%), repeating-linear-gradient(135deg, #172033 0 7px, #0b1220 7px 14px)`,
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isDiscovered ? (
                <div className="relative grid size-24 place-items-center">
                  <span className="absolute text-7xl opacity-30 grayscale" aria-hidden="true">{classMeta.emoji}</span>
                  <Image
                    src={`/api/species/cards/${species.id}/plate`}
                    alt={`${species.common_name || species.scientific_name || 'Species'} field plate`}
                    width={64}
                    height={64}
                    unoptimized
                    className="relative size-24 object-contain drop-shadow-2xl [image-rendering:pixelated]"
                    draggable={false}
                    onError={event => event.currentTarget.remove()}
                  />
                </div>
              ) : (
                <span className="text-7xl opacity-15 grayscale drop-shadow-2xl" aria-hidden="true">?</span>
              )}
              <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.24em] text-slate-500">
                {isDiscovered ? `${classMeta.label} field plate` : 'Undiscovered'}
              </span>
            </div>
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.025)_0_1px,transparent_1px_3px)]" />
          </div>

          <div className="relative z-[2] my-2.5 min-h-[43px]">
            <h2 className={cn('m-0 truncate font-serif text-[22px] leading-none tracking-tight', isDiscovered ? 'text-slate-50' : 'text-slate-600')}>
              {isDiscovered ? species.common_name || species.scientific_name : 'Unidentified'}
            </h2>
            <p className="m-0 mt-1 truncate text-[10px] italic text-slate-400">
              {isDiscovered ? species.scientific_name : 'Pending field study'}
            </p>
          </div>

          <div className="relative z-[2] flex flex-col gap-1.5">
            {facts.map((fact, index) => {
              const unlocked = Boolean(isDiscovered && fact.text && isFactUnlocked(unlockedFacts, fact.key, fact.text));
              return (
                <div key={fact.key} className="flex min-h-5 items-start gap-2">
                  <span className="shrink-0 font-mono text-[8px] font-bold tracking-wider" style={{ color: tone.accent }}>
                    0{index + 1}
                  </span>
                  {unlocked ? (
                    <span className="line-clamp-2 text-[10px] leading-[1.25] text-slate-300">{fact.text}</span>
                  ) : (
                    <span className="mt-0.5 h-3.5 flex-1 overflow-hidden rounded-sm border border-slate-700 bg-[repeating-linear-gradient(90deg,#334155_0_8px,transparent_8px_14px)] opacity-60" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="relative z-[2] mt-auto flex items-end justify-between border-t pt-2 font-mono text-[8px]" style={{ borderColor: `${tone.accent}33` }}>
            <div className="flex max-w-[210px] flex-wrap gap-1">
              {species.family && <CardPill>{species.family}</CardPill>}
              {species.terrestrial && <CardPill className="text-emerald-300">Land</CardPill>}
              {species.freshwater && <CardPill className="text-cyan-300">Fresh</CardPill>}
              {species.marine && <CardPill className="text-blue-300">Marine</CardPill>}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-slate-500">
              {isDiscovered && <span style={{ color: tone.accent }}>{completion}%</span>}
              <span>#{String(species.id).padStart(4, '0')}</span>
            </div>
          </div>
        </CardFace>

        <CardFace
          side="back"
          accent={tone.accent}
          visible={flipped}
          foil={Boolean(variantLabel)}
        >
          <div className="relative z-[2] flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 font-mono text-[8px] uppercase tracking-[0.22em]" style={{ color: tone.accent }}>Expedition Memory</p>
              <h3 className="m-0 mt-1 truncate font-serif text-base leading-none text-slate-100">
                {runMemory?.bioregion || runMemory?.realm || 'Unknown Region'}
              </h3>
              <p className="m-0 mt-1 truncate text-[9px] text-slate-500">{runMemory?.biome || 'Route not yet recorded'}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="m-0 font-serif text-2xl leading-none" style={{ color: tone.accent }}>
                {runMemory?.finalScore?.toLocaleString('en-US') ?? '—'}
              </p>
              <p className="m-0 mt-1 font-mono text-[7px] tracking-[0.18em] text-slate-500">PTS</p>
            </div>
          </div>

          <div className="relative z-[2] mt-2.5 overflow-hidden rounded-[10px] border" style={{ borderColor: `${tone.accent}55`, boxShadow: `0 0 24px ${tone.accent}22` }}>
            <ExpeditionRouteMap
              routePolyline={runMemory?.routePolyline}
              waypoints={memoryWaypoints}
              visitedWaypointSlot={visitedSlot}
              captured={runMemory?.captured ?? true}
              showLabels={false}
              ariaLabel={`Expedition route for ${isDiscovered ? species.common_name || species.scientific_name || 'species' : 'mystery species'}`}
            />
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.025)_0_1px,transparent_1px_4px)]" />
          </div>

          {runMemory?.nodes && runMemory.nodes.length > 0 && (
            <div className="relative z-[2] mt-2.5">
              <p className="m-0 mb-1.5 font-mono text-[7px] uppercase tracking-[0.2em]" style={{ color: tone.accent }}>
                Waypoints · {runMemory.nodes.length} stops
              </p>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {runMemory.nodes.slice(0, 6).map((node, index) => (
                  <span key={`${node.nodeOrder ?? index}-${node.waypoint?.name ?? 'node'}`} className="flex max-w-[135px] items-center gap-1 text-[9px] text-slate-300">
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: tone.accent }} />
                    <span className="truncate">{node.waypoint?.name || getRunNodeLabel(node)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {expeditionFacts.length > 0 && (
            <div className="relative z-[2] mt-2.5">
              <p className="m-0 mb-1 font-mono text-[7px] uppercase tracking-[0.2em]" style={{ color: tone.accent }}>Unlocked field facts</p>
              <ul className="m-0 space-y-1 p-0">
                {expeditionFacts.map(fact => <li key={fact} className="line-clamp-2 list-none text-[8px] leading-tight text-slate-400">• {fact}</li>)}
              </ul>
            </div>
          )}

          <div className="relative z-[2] mt-2.5 grid grid-cols-[1fr_auto] items-end gap-3">
            <div>
              <div className="flex items-center justify-between font-mono text-[7px] uppercase tracking-[0.16em] text-slate-500">
                <span>{rarityTier || 'Card progress'}</span>
                <span>{completion}%</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${completion}%`, background: `linear-gradient(90deg, ${tone.dim}, ${tone.accent})` }} />
              </div>
              <div className="mt-1 flex gap-2 font-mono text-[7px] text-slate-500">
                {bestRunScore != null && <span>Best {bestRunScore}</span>}
                {timesEncountered != null && timesEncountered > 0 && <span>{timesEncountered} encounters</span>}
              </div>
            </div>
            <div className="flex gap-1">
              {[...new Set(gisStamps)].slice(0, 5).map(featureClass => {
                const badge = FEATURE_CLASS_BADGES[featureClass];
                return badge ? (
                  <span key={featureClass} title={badge.label} className="flex size-6 items-center justify-center rounded-md border border-slate-700 bg-slate-950/80 text-xs">
                    {badge.icon}
                  </span>
                ) : null;
              })}
            </div>
          </div>

          <div className="relative z-[2] mt-auto border-t border-slate-700/40 pt-2">
            <div className="flex flex-wrap gap-1">
              {Object.entries(CLUE_LABELS).map(([key, label]) => {
                const unlocked = unlockedClueCategories.has(key);
                return (
                  <span
                    key={key}
                    className="rounded border px-1 py-0.5 font-mono text-[6.5px] uppercase tracking-wide"
                    style={unlocked
                      ? { color: tone.accent, borderColor: `${tone.accent}66` }
                      : { color: '#475569', borderColor: 'rgba(71,85,105,0.35)' }}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[7px] text-slate-600">
              <div className="flex gap-2">
                {knownAffinities.map(affinity => {
                  const definition = getAffinityDefinition(affinity);
                  return <span key={affinity} style={{ color: definition.color }}>{definition.familyLabel}</span>;
                })}
              </div>
              {memoryDate && <span>{formatDate(memoryDate)}</span>}
            </div>
          </div>
        </CardFace>

        <RotateCw className="pointer-events-none absolute bottom-3 right-3 z-[4] size-3.5 text-slate-600" aria-hidden="true" />
      </div>
    </div>
  );
}

function CardFace({
  side,
  accent,
  visible,
  foil,
  children,
}: {
  side: 'front' | 'back';
  accent: string;
  visible: boolean;
  foil: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col overflow-hidden rounded-2xl border-[1.5px] bg-[linear-gradient(180deg,#0b1220_0%,#050a14_100%)] p-3.5 [backface-visibility:hidden] transition-opacity duration-150',
        side === 'back' && '[transform:rotateY(180deg)]',
      )}
      style={{
        borderColor: accent,
        boxShadow: `0 0 0 1px #0009, 0 0 32px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.05)`,
        visibility: visible ? 'visible' : 'hidden',
        opacity: visible ? 1 : 0,
      }}
    >
      {foil && (
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-35 mix-blend-screen"
          style={{ background: 'linear-gradient(115deg, transparent 28%, rgba(255,0,200,.22) 40%, rgba(0,255,255,.28) 49%, rgba(255,220,0,.2) 58%, transparent 70%)' }}
        />
      )}
      {children}
    </div>
  );
}

function CardPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('rounded bg-slate-800/80 px-1.5 py-0.5 uppercase tracking-wide text-slate-400', className)}>{children}</span>;
}

function isFactUnlocked(unlockedFacts: Set<string>, factKey: string, factText: string): boolean {
  return unlockedFacts.has(factKey) || unlockedFacts.has(factText);
}

function clampPercent(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getKnownAffinityTags(value: string[]): AffinityType[] {
  const known = new Set<string>(AFFINITY_TYPES);
  return [...new Set(value)].filter((tag): tag is AffinityType => known.has(tag));
}

function getMemoryWaypoints(memory: SpeciesCardRunMemory | null | undefined): ExpeditionWaypointMemory[] {
  if (memory?.waypoints?.length) return memory.waypoints;
  return memory?.nodes?.flatMap(node => node.waypoint ? [node.waypoint] : []) ?? [];
}

function getVisitedWaypointSlot(
  memory: SpeciesCardRunMemory | null | undefined,
  waypoints: ExpeditionWaypointMemory[],
): number | undefined {
  if (typeof memory?.visitedWaypointSlot === 'number') return memory.visitedWaypointSlot;
  const slots = [
    ...(memory?.routePolyline ?? []).flatMap(point => Number.isInteger(point.waypointSlot) ? [point.waypointSlot!] : []),
    ...waypoints.flatMap(waypoint => Number.isInteger(waypoint.slot) ? [waypoint.slot!] : []),
  ];
  if (slots.length > 0) return Math.max(...slots);
  return memory?.routePolyline?.length ? memory.routePolyline.length - 1 : undefined;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
