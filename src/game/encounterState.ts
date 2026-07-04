/**
 * Multi-threat encounter model (YMBAB-style).
 *
 * Each node presents 1-3 ThreatSlots. Each slot has a primary counterGem
 * (full-rate progress) and an optional altGem (half-rate).
 * Off-gem and support-gem matches feed a shared chip-damage pool that
 * auto-assigns 1 progress to the highest-remaining threat every 3 points.
 *
 * spookLevel is the single pressure axis (replaces nodeBonusPool).
 */

import type { ActionGemType } from './constants';
import type { ObstacleFamily } from './nodeObstacles';

export type ThreatType = 'quarry' | 'blocker' | 'hazard' | 'loot_cache' | 'time_pressure';

export interface ThreatSlot {
  id: string;
  threatType: ThreatType;
  counterGem: ActionGemType;
  altGem: ActionGemType | null;
  progress: number;
  target: number;
  resistances: ObstacleFamily[];
  resolved: boolean;
}

export interface EncounterState {
  threats: ThreatSlot[];
  turnsElapsed: number;
  spookLevel: number;
  spookRate: number;
  chipDamagePool: number;
  chipDamageTotal: number;
  resolved: boolean;
  outcome: 'in_progress' | 'success' | 'escaped' | 'partial';
}

/** Config stored on RunNode — describes what threats to spawn. */
export interface EncounterConfig {
  threats: Array<{
    threatType: ThreatType;
    counterGem: ActionGemType;
    altGem: ActionGemType | null;
    target: number;
    resistances: ObstacleFamily[];
  }>;
  baseSpookRate: number;
}

/** Hydrate an EncounterState from config. */
export function createEncounterState(config: EncounterConfig): EncounterState {
  return {
    threats: config.threats.map((t, i) => ({
      id: `${t.threatType}_${i}`,
      threatType: t.threatType,
      counterGem: t.counterGem,
      altGem: t.altGem,
      progress: 0,
      target: t.target,
      resistances: t.resistances,
      resolved: false,
    })),
    turnsElapsed: 0,
    spookLevel: 0,
    spookRate: config.baseSpookRate,
    chipDamagePool: 0,
    chipDamageTotal: 0,
    resolved: false,
    outcome: 'in_progress',
  };
}

const CHIP_DAMAGE_THRESHOLD = 3;

/** Apply a gem match to the encounter. Returns delta info for UI/scoring. */
export function applyMatchToEncounter(
  state: EncounterState,
  gemType: ActionGemType,
  matchSize: number,
): { threatContributions: Map<string, number>; chipDamageAdded: number; spookDelta: number } {
  const contributions = new Map<string, number>();
  let chipDamageAdded = 0;
  let spookDelta = 0;

  // Shield matches reduce spook rate
  if (gemType === 'shield') {
    const reduction = matchSize * 0.5;
    spookDelta = -reduction;
    state.spookRate = Math.max(0, state.spookRate - reduction);
  }

  // Try direct contribution to unresolved threats
  let directHit = false;
  const unresolved = state.threats.filter((t) => !t.resolved);

  for (const threat of unresolved) {
    if (gemType === threat.counterGem) {
      // Full-rate
      const added = Math.min(matchSize, threat.target - threat.progress);
      if (added > 0) {
        threat.progress += added;
        contributions.set(threat.id, added);
        if (threat.progress >= threat.target) threat.resolved = true;
        directHit = true;
        break; // one match → one threat
      }
    } else if (gemType === threat.altGem) {
      // Half-rate
      const added = Math.min(Math.floor(matchSize / 2), threat.target - threat.progress);
      if (added > 0) {
        threat.progress += added;
        contributions.set(threat.id, added);
        if (threat.progress >= threat.target) threat.resolved = true;
        directHit = true;
        break;
      }
    }
  }

  // Off-gem / support gems → chip-damage pool
  if (!directHit && matchSize > 0) {
    chipDamageAdded = matchSize;
    state.chipDamagePool += matchSize;
    state.chipDamageTotal += matchSize;

    // Auto-assign from chip-damage pool
    while (state.chipDamagePool >= CHIP_DAMAGE_THRESHOLD) {
      const target = unresolvedByHighestRemaining(state.threats);
      if (!target) break;
      state.chipDamagePool -= CHIP_DAMAGE_THRESHOLD;
      const added = Math.min(1, target.target - target.progress);
      target.progress += added;
      contributions.set(target.id, (contributions.get(target.id) ?? 0) + added);
      if (target.progress >= target.target) target.resolved = true;
    }
  }

  // Check overall resolution
  const allResolved = state.threats.every((t) => t.resolved);
  if (allResolved) {
    state.resolved = true;
    state.outcome = 'success';
  }

  return { threatContributions: contributions, chipDamageAdded, spookDelta };
}

/** Tick spook after each turn. Returns new spook level. */
export function tickSpook(state: EncounterState): number {
  state.turnsElapsed++;
  // Unresolved hazards increase spook faster
  const unresolvedHazards = state.threats.filter((t) => !t.resolved && t.threatType === 'hazard').length;
  const effectiveRate = state.spookRate + unresolvedHazards * 0.5;
  state.spookLevel = Math.min(100, state.spookLevel + effectiveRate);
  if (state.spookLevel >= 100 && !state.resolved) {
    state.outcome = 'escaped';
    state.resolved = true;
  }
  return state.spookLevel;
}

/** Snapshot for persistence. */
export function snapshotEncounterOutcome(state: EncounterState) {
  const outcome: 'success' | 'escaped' | 'partial' =
    state.outcome === 'success' ? 'success'
    : state.outcome === 'escaped' ? 'escaped'
    : 'partial';
  return {
    threats: state.threats.map((t) => ({
      id: t.id,
      threatType: t.threatType as string,
      progress: t.progress,
      target: t.target,
      resolved: t.resolved,
    })),
    finalSpookLevel: state.spookLevel,
    outcome,
    chipDamageTotal: state.chipDamageTotal,
  };
}

function unresolvedByHighestRemaining(threats: ThreatSlot[]): ThreatSlot | null {
  let best: ThreatSlot | null = null;
  let maxRemaining = 0;
  for (const t of threats) {
    if (t.resolved) continue;
    const remaining = t.target - t.progress;
    if (remaining > maxRemaining) {
      maxRemaining = remaining;
      best = t;
    }
  }
  return best;
}
