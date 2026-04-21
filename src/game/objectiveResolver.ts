import type { ActionGemType, GemType } from './constants';
import type { NodeObstacle } from './nodeObstacles';
import type { AffinityType } from '@/expedition/affinities';
import type { ObstacleFamily } from '@/game/nodeObstacles';
import type { EncounterState } from './encounterState';
import { applyMatchToEncounter } from './encounterState';

export interface ObjectiveResolverContext {
  counterGem: ActionGemType | null;
  obstacleFamily: ObstacleFamily | null;
  activeAffinities: AffinityType[];
  nodeObstacles: NodeObstacle[];
}

export function isWaterObstacleSet(obstacles: NodeObstacle[]): boolean {
  return obstacles.includes('flow_shift') || obstacles.includes('mud_tiles');
}

/** Legacy single-threat resolver — kept for backward compat (crisis/analysis nodes). */
export function resolveObjectiveContribution(
  gemType: GemType,
  matchSize: number,
  context: ObjectiveResolverContext
): number {
  if (!context.counterGem || gemType !== context.counterGem || matchSize <= 0) {
    return 0;
  }

  let contribution = matchSize;

  if (gemType === 'staff' && context.activeAffinities.includes('avian')) {
    contribution *= 2;
  }

  if (gemType === 'key' && context.activeAffinities.includes('amphibian') && isWaterObstacleSet(context.nodeObstacles)) {
    contribution *= 2;
  }

  return Math.max(0, Math.round(contribution));
}

/** Multi-threat encounter resolver. */
export interface EncounterMatchResult {
  threatContributions: Map<string, number>;
  chipDamageAdded: number;
  spookDelta: number;
  /** Legacy-compat: total progress added across all threats */
  totalContribution: number;
}

export function resolveMatchAgainstEncounter(
  gemType: GemType,
  matchSize: number,
  encounter: EncounterState,
  affinities: AffinityType[],
  nodeObstacles: NodeObstacle[],
): EncounterMatchResult {
  // Only action gems contribute to encounter threats
  const actionGems: ActionGemType[] = ['sword', 'staff', 'shield', 'key', 'crate', 'power', 'thought', 'multiplier'];
  if (!actionGems.includes(gemType as ActionGemType) || matchSize <= 0) {
    return { threatContributions: new Map(), chipDamageAdded: 0, spookDelta: 0, totalContribution: 0 };
  }

  let effectiveSize = matchSize;

  // Affinity bonuses apply to their specific gem types
  if (gemType === 'staff' && affinities.includes('avian')) {
    effectiveSize *= 2;
  }
  if (gemType === 'key' && affinities.includes('amphibian') && isWaterObstacleSet(nodeObstacles)) {
    effectiveSize *= 2;
  }

  effectiveSize = Math.max(0, Math.round(effectiveSize));

  const result = applyMatchToEncounter(encounter, gemType as ActionGemType, effectiveSize);
  const totalContribution = Array.from(result.threatContributions.values()).reduce((a, b) => a + b, 0);

  return { ...result, totalContribution };
}
