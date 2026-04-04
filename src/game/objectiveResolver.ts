import type { ActionGemType, GemType } from './constants';
import type { NodeObstacle } from './nodeObstacles';
import type { AffinityType } from '@/expedition/affinities';
import type { ObstacleFamily } from '@/game/nodeObstacles';

export interface ObjectiveResolverContext {
  counterGem: ActionGemType | null;
  obstacleFamily: ObstacleFamily | null;
  activeAffinities: AffinityType[];
  nodeObstacles: NodeObstacle[];
}

export function isWaterObstacleSet(obstacles: NodeObstacle[]): boolean {
  return obstacles.includes('flow_shift') || obstacles.includes('mud_tiles');
}

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
