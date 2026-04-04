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

interface ObstacleSeedConfig {
    width: number;
    height: number;
    obstacles: NodeObstacle[];
    nodeIndex?: number;
}

const STATIC_FOOTPRINTS: Partial<Record<NodeObstacle, { count: number; state: BoardCellState; topRowsOnly?: number }>> = {
    mud_tiles: {
        count: 4,
        state: { blockerId: 'mud', durability: 2, flags: ['mud_tiles', 'sticky'] },
    },
    overgrowth: {
        count: 3,
        state: { blockerId: 'vine', durability: 1, flags: ['overgrowth'] },
    },
    junk_blockers: {
        count: 2,
        topRowsOnly: 2,
        state: { blockerId: 'junk', durability: 1, flags: ['junk_blockers'] },
    },
    steep_terrain: {
        count: 3,
        state: { blockerId: 'stone', durability: 1, flags: ['steep_terrain'] },
    },
    signal_dropout: {
        count: 3,
        state: { blockerId: 'signal', durability: 1, flags: ['signal_dropout'] },
    },
    noise_interference: {
        count: 3,
        state: { blockerId: 'noise', durability: 1, flags: ['noise_interference'] },
    },
    unknown_terrain: {
        count: 3,
        state: { blockerId: 'unknown', durability: 1, flags: ['unknown_terrain'] },
    },
    limited_signal: {
        count: 2,
        state: { blockerId: 'signal', durability: 1, flags: ['limited_signal'] },
    },
};

export function isStaticSeededObstacle(obstacle: NodeObstacle): boolean {
    return obstacle in STATIC_FOOTPRINTS;
}

function hashSeed(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function createRng(seed: number): () => number {
    let state = seed || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return ((state >>> 0) % 1000000) / 1000000;
    };
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

export function buildNodeObstacleSeeds(config: ObstacleSeedConfig): CellStateSeed[] {
    const { width, height, obstacles, nodeIndex = 0 } = config;
    const seeds: CellStateSeed[] = [];
    const usedCoords = new Set<string>();
    const rng = createRng(hashSeed(`${nodeIndex}:${obstacles.join('|')}:${width}x${height}`));

    for (const obstacle of obstacles) {
        const footprint = STATIC_FOOTPRINTS[obstacle];
        if (!footprint) continue;

        let attempts = 0;
        const maxY = footprint.topRowsOnly ? Math.min(height, footprint.topRowsOnly) : height;

        while (seeds.filter(seed => seed.state.flags?.includes(obstacle)).length < footprint.count && attempts < width * height * 4) {
            const x = Math.floor(rng() * width);
            const y = Math.floor(rng() * maxY);
            const key = `${x},${y}`;
            attempts++;
            if (usedCoords.has(key)) continue;
            usedCoords.add(key);
            seeds.push({
                x,
                y,
                state: {
                    blockerId: footprint.state.blockerId ?? null,
                    durability: footprint.state.durability ?? null,
                    flags: [...(footprint.state.flags ?? [])],
                },
            });
        }
    }

    return seeds;
}

export function buildNodeBoardContext(config: ObstacleSeedConfig): NodeBoardContext {
    const { width, height, obstacles, nodeIndex = 0 } = config;
    const staticObstacles = obstacles.filter(isStaticSeededObstacle);
    const dynamicObstacles = obstacles.filter((obstacle) => !isStaticSeededObstacle(obstacle));
    const seed = hashSeed(`${nodeIndex}:${obstacles.join('|')}:${width}x${height}`);

    return {
        width,
        height,
        seed,
        staticObstacles,
        dynamicObstacles,
        obstacleSeeds: buildNodeObstacleSeeds(config),
    };
}
