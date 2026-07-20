// Method verbs — per-method counting rules for the board objective.
//
// Every method keeps the same progress formula (max(1, len - 2)) and targets;
// a verb only changes WHICH method-color matches count, so the server
// objective contract (objectiveProgress/objectiveTarget) is unchanged.
// Pure module (no Phaser) so rules are unit-testable.
// Behavior is pinned by tests/expedition/methodVerbs.test.ts.
import type { MethodType } from './domain';
import type { NodeObstacle } from '@/game/nodeObstacles';

export type MethodVerbRule =
  | { kind: 'trail'; windowMoves: number }
  | { kind: 'minLength'; min: number }
  | { kind: 'zones' }
  | { kind: 'cascadeBonus'; multiplier: number }
  | { kind: 'baseline' };

export const METHOD_VERB_RULES: Record<MethodType, MethodVerbRule> = {
  track: { kind: 'trail', windowMoves: 2 },
  observe: { kind: 'minLength', min: 4 },
  survey: { kind: 'zones' },
  listen: { kind: 'cascadeBonus', multiplier: 2 },
  analyze: { kind: 'baseline' },
};

/** Player-facing counting rule, one line each (grades 6-12 outdoor-tech tone). */
export const METHOD_VERB_RULE_COPY: Record<MethodType, string> = {
  track: 'Fresh trail only: a find counts if it comes within 2 moves of your last find.',
  observe: 'Hold for a clear look: only matches of 4 or more count.',
  survey: 'Work the marked plots: matches must touch a survey zone.',
  listen: 'Let the board ripple: chain-reaction matches count double.',
  analyze: 'Standard protocol: every method match counts.',
};

// Field-note drip (Phase B): an off-method match of this length or more earns
// one fact about a public case candidate — study material for the deduction.
export const FIELD_NOTE_MIN_MATCH_LENGTH = 4;
export const FIELD_NOTE_DRIPS_PER_NODE = 4;

// --- Obstacle friction (Phase C) --------------------------------------------
// Which node obstacles make each verb harder to execute. This is read support
// for the method choice, not a mechanic: blockers really do interrupt trails,
// hide sightlines, and choke refills — these hints just say so up front.

export const METHOD_FRICTION_OBSTACLES: Record<MethodType, readonly NodeObstacle[]> = {
  track: ['mud_tiles', 'flow_shift', 'steep_terrain'],
  observe: ['overgrowth', 'low_visibility', 'signal_dropout', 'limited_signal'],
  listen: ['junk_blockers', 'noise_interference', 'time_pressure'],
  survey: ['unknown_terrain', 'steep_terrain', 'flow_shift'],
  analyze: [],
};

const METHOD_FRICTION_COPY: Record<MethodType, string> = {
  track: 'Rough ground here — blockers can break your trail.',
  observe: 'Poor sightlines here — a long look takes setup.',
  listen: 'Noisy site — chain reactions are harder to ride.',
  survey: 'Uneven plots — zone work takes extra moves.',
  analyze: '',
};

/** One-line friction warning for a method at a node, or null when the node's
 *  obstacles don't stress that verb. */
export function methodFrictionForObstacles(
  method: MethodType,
  obstacles: ReadonlyArray<NodeObstacle> | undefined,
): string | null {
  if (!obstacles?.length) return null;
  const stressed = METHOD_FRICTION_OBSTACLES[method].some(obstacle => obstacles.includes(obstacle));
  return stressed && METHOD_FRICTION_COPY[method] ? METHOD_FRICTION_COPY[method] : null;
}

export interface SurveyZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MatchCell = readonly [number, number];

export interface VerbMatchContext {
  /** True when the group resolved from a cascade, not the player's swap. */
  isCascade: boolean;
  /** Moves since the last counting method match; null before the first one. */
  movesSinceCountingMatch: number | null;
  cells: ReadonlyArray<MatchCell>;
  zones: ReadonlyArray<SurveyZone>;
}

export function zoneContainsCell(zone: SurveyZone, [x, y]: MatchCell): boolean {
  return x >= zone.x && x < zone.x + zone.width && y >= zone.y && y < zone.y + zone.height;
}

/**
 * Progress contribution of one method-color match group under the method's
 * verb. Returns 0 when the group does not count. Off-method groups must be
 * filtered out by the caller.
 */
export function verbContribution(
  method: MethodType,
  matchLength: number,
  context: VerbMatchContext,
): number {
  if (matchLength < 3) return 0;
  const base = Math.max(1, matchLength - 2);
  const rule = METHOD_VERB_RULES[method];

  switch (rule.kind) {
    case 'trail':
      return context.movesSinceCountingMatch === null
        || context.movesSinceCountingMatch < rule.windowMoves
        ? base
        : 0;
    case 'minLength':
      return matchLength >= rule.min ? base : 0;
    case 'zones':
      // No zones generated (defensive) → behave as baseline rather than soft-lock.
      if (context.zones.length === 0) return base;
      return context.cells.some(cell => context.zones.some(zone => zoneContainsCell(zone, cell)))
        ? base
        : 0;
    case 'cascadeBonus':
      return context.isCascade ? base * rule.multiplier : base;
    case 'baseline':
      return base;
  }
}

// --- Survey zone generation ------------------------------------------------
// Deterministic in (seed, board size, blocked cells) — same node always shows
// the same plots. Mirrors the xorshift RNG used by nodeObstacles.ts.

const SURVEY_ZONE_COUNT = 2;
const SURVEY_ZONE_DIMS: ReadonlyArray<readonly [number, number]> = [[3, 2], [2, 3]];

function createRng(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1000000) / 1000000;
  };
}

function zonesOverlap(a: SurveyZone, b: SurveyZone): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

export function generateSurveyZones(
  seed: number,
  width: number,
  height: number,
  blockedCells: ReadonlyArray<{ x: number; y: number }> = [],
): SurveyZone[] {
  const blocked = new Set(blockedCells.map(cell => `${cell.x},${cell.y}`));
  const rng = createRng(seed);
  const zones: SurveyZone[] = [];

  const zoneIsClear = (zone: SurveyZone) => {
    for (let x = zone.x; x < zone.x + zone.width; x++) {
      for (let y = zone.y; y < zone.y + zone.height; y++) {
        if (blocked.has(`${x},${y}`)) return false;
      }
    }
    return true;
  };

  const tryPlace = (requireClear: boolean): boolean => {
    const [zoneWidth, zoneHeight] = SURVEY_ZONE_DIMS[Math.floor(rng() * SURVEY_ZONE_DIMS.length)];
    if (zoneWidth > width || zoneHeight > height) return false;
    const zone: SurveyZone = {
      x: Math.floor(rng() * (width - zoneWidth + 1)),
      y: Math.floor(rng() * (height - zoneHeight + 1)),
      width: zoneWidth,
      height: zoneHeight,
    };
    if (zones.some(existing => zonesOverlap(existing, zone))) return false;
    if (requireClear && !zoneIsClear(zone)) return false;
    zones.push(zone);
    return true;
  };

  for (let zoneIndex = 0; zoneIndex < SURVEY_ZONE_COUNT; zoneIndex++) {
    let placed = false;
    for (let attempt = 0; attempt < 40 && !placed; attempt++) placed = tryPlace(true);
    // Dense obstacle layouts: allow zones over blockers rather than dropping the plot.
    for (let attempt = 0; attempt < 40 && !placed; attempt++) placed = tryPlace(false);
  }

  return zones;
}
