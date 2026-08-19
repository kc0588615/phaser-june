import { ACTIVE_GEM_TYPES, type GemType } from '@/game/constants';
import type { BoardCell, BoardCheckpointV1, PuzzleGrid } from '@/game/boardTypes';

const UINT32_MAX = 0xffff_ffff;
const MAX_SCORE = 10_000_000;
const MAX_REFILL_QUEUE = 64;

function record(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function parseCell(value: unknown, allowed: ReadonlySet<GemType>): BoardCell | null | undefined {
    if (value === null) return null;
    const source = record(value);
    if (!source || typeof source.gemType !== 'string' || !allowed.has(source.gemType as GemType)) return undefined;
    const stateSource = source.state === undefined ? null : record(source.state);
    if (source.state !== undefined && !stateSource) return undefined;
    const blockerId = stateSource?.blockerId;
    const durability = stateSource?.durability;
    const flags = stateSource?.flags;
    if (blockerId !== undefined && blockerId !== null && typeof blockerId !== 'string') return undefined;
    if (durability !== undefined && durability !== null
        && (!Number.isInteger(durability) || (durability as number) < 0 || (durability as number) > 20)) return undefined;
    if (flags !== undefined && (!Array.isArray(flags) || flags.length > 16
        || flags.some(flag => typeof flag !== 'string' || flag.length > 64))) return undefined;
    return {
        family: 'loot',
        gemType: source.gemType as GemType,
        ...(stateSource ? {
            state: {
                blockerId: blockerId as string | null | undefined,
                durability: durability as number | null | undefined,
                flags: flags as string[] | undefined,
            },
        } : {}),
    };
}

export function parseBoardCheckpoint(
    value: unknown,
    expected?: { width?: number; height?: number; maxMoves?: number },
): BoardCheckpointV1 | null {
    const source = record(value);
    if (!source || source.version !== 1) return null;
    const width = source.width;
    const height = source.height;
    const score = source.score;
    const movesUsed = source.movesUsed;
    const maxMoves = source.maxMoves;
    const rngState = source.rngState;
    const fieldSignalSpawned = source.fieldSignalSpawned;
    if (!Number.isInteger(width) || (width as number) < 3 || (width as number) > 12
        || !Number.isInteger(height) || (height as number) < 3 || (height as number) > 12
        || expected?.width !== undefined && width !== expected.width
        || expected?.height !== undefined && height !== expected.height
        || !Number.isInteger(score) || (score as number) < 0 || (score as number) > MAX_SCORE
        || !Number.isInteger(maxMoves) || (maxMoves as number) < 1 || (maxMoves as number) > 50
        || expected?.maxMoves !== undefined && maxMoves !== expected.maxMoves
        || !Number.isInteger(movesUsed) || (movesUsed as number) < 0 || (movesUsed as number) > (maxMoves as number)
        || !Number.isInteger(rngState) || (rngState as number) < 0 || (rngState as number) > UINT32_MAX
        || fieldSignalSpawned !== undefined && typeof fieldSignalSpawned !== 'boolean') return null;

    if (!Array.isArray(source.allowedGemTypes) || source.allowedGemTypes.length < 3
        || source.allowedGemTypes.length > ACTIVE_GEM_TYPES.length) return null;
    const allowedGemTypes = source.allowedGemTypes as unknown[];
    if (allowedGemTypes.some(value => typeof value !== 'string' || !ACTIVE_GEM_TYPES.includes(value as GemType))
        || new Set(allowedGemTypes).size !== allowedGemTypes.length) return null;
    const allowed = new Set(allowedGemTypes as GemType[]);

    if (!Array.isArray(source.nextGemsToSpawn) || source.nextGemsToSpawn.length > MAX_REFILL_QUEUE
        || source.nextGemsToSpawn.some(value => typeof value !== 'string' || !allowed.has(value as GemType))) return null;
    if (!Array.isArray(source.grid) || source.grid.length !== width) return null;
    const grid: PuzzleGrid = [];
    for (const columnValue of source.grid) {
        if (!Array.isArray(columnValue) || columnValue.length !== height) return null;
        const column: PuzzleGrid[number] = [];
        for (const cellValue of columnValue) {
            const cell = parseCell(cellValue, allowed);
            if (cell === undefined) return null;
            column.push(cell);
        }
        grid.push(column);
    }
    return {
        version: 1,
        width: width as number,
        height: height as number,
        grid,
        score: score as number,
        movesUsed: movesUsed as number,
        maxMoves: maxMoves as number,
        nextGemsToSpawn: [...source.nextGemsToSpawn] as GemType[],
        allowedGemTypes: [...allowedGemTypes] as GemType[],
        rngState: rngState as number,
        ...(fieldSignalSpawned === true ? { fieldSignalSpawned: true } : {}),
    };
}
