import type { BoardCellState } from './boardTypes';
import type { ActionGemType } from './constants';

export const NODE_OBSTACLES = [
    'flow_shift',
    'mud_tiles',
    'overgrowth',
    'low_visibility',
    'junk_blockers',
    'noise_interference',
    'steep_terrain',
    'time_pressure',
    'signal_dropout',
    'unknown_terrain',
    'limited_signal',
] as const;

export type NodeObstacle = typeof NODE_OBSTACLES[number];
export type ObstacleFamily = 'visibility' | 'alert' | 'terrain' | 'sighting' | 'panic';

export interface CellStateSeed {
    x: number;
    y: number;
    state: BoardCellState;
}

export interface NodeBoardContext {
    width: number;
    height: number;
    seed: number;
    staticObstacles: NodeObstacle[];
    dynamicObstacles: NodeObstacle[];
    obstacleSeeds: CellStateSeed[];
}

export const NODE_OBSTACLE_LABELS: Record<NodeObstacle, string> = {
    flow_shift: 'Flow Shift',
    mud_tiles: 'Mud Tiles',
    overgrowth: 'Overgrowth',
    low_visibility: 'Low Visibility',
    junk_blockers: 'Junk Blockers',
    noise_interference: 'Noise Interference',
    steep_terrain: 'Steep Terrain',
    time_pressure: 'Time Pressure',
    signal_dropout: 'Signal Dropout',
    unknown_terrain: 'Unknown Terrain',
    limited_signal: 'Limited Signal',
};

export const OBSTACLE_FAMILY_LABELS: Record<ObstacleFamily, string> = {
    visibility: 'Visibility',
    alert: 'Alert',
    terrain: 'Terrain',
    sighting: 'Sighting',
    panic: 'Panic',
};

export const OBSTACLE_COUNTER_GEM_MAP: Record<ObstacleFamily, ActionGemType> = {
    visibility: 'staff',
    alert: 'shield',
    terrain: 'key',
    sighting: 'sword',
    panic: 'crate',
};

export const NODE_OBSTACLE_FAMILY_MAP: Record<NodeObstacle, ObstacleFamily> = {
    flow_shift: 'terrain',
    mud_tiles: 'terrain',
    overgrowth: 'visibility',
    low_visibility: 'visibility',
    junk_blockers: 'panic',
    noise_interference: 'alert',
    steep_terrain: 'terrain',
    time_pressure: 'alert',
    signal_dropout: 'visibility',
    unknown_terrain: 'panic',
    limited_signal: 'visibility',
};

export interface ObstacleRule {
    obstacle: NodeObstacle;
    effect: 'block_matches' | 'resist_gem' | 'force_clear_first' | 'reveal_then_clear';
    targetGem?: ActionGemType;
    clearCondition?: { gem: ActionGemType; count: number };
}

interface ObstacleSeedConfig {
    width: number;
    height: number;
    obstacles: NodeObstacle[];
    nodeIndex?: number;
}

function hashSeed(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function formatNodeObstacleLabel(obstacle: NodeObstacle): string {
    return NODE_OBSTACLE_LABELS[obstacle] ?? obstacle.replace(/_/g, ' ');
}

export function getObstacleFamily(obstacle: NodeObstacle): ObstacleFamily {
    return NODE_OBSTACLE_FAMILY_MAP[obstacle];
}

export function getCounterGemForObstacleFamily(family: ObstacleFamily): ActionGemType {
    return OBSTACLE_COUNTER_GEM_MAP[family];
}

export function buildNodeBoardContext(config: ObstacleSeedConfig): NodeBoardContext {
    const { width, height, obstacles, nodeIndex = 0 } = config;
    const seed = hashSeed(`${nodeIndex}:${obstacles.join('|')}:${width}x${height}`);

    return {
        width,
        height,
        seed,
        staticObstacles: [],
        dynamicObstacles: obstacles,
        obstacleSeeds: [],
    };
}
