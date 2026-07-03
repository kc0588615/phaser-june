// src/game/BackendPuzzle.ts
import { ExplodeAndReplacePhase, ColumnReplacement, Match } from './ExplodeAndReplacePhase';
import { MoveAction } from './MoveAction';
import { GEM_TYPES, ACTION_GEM_TYPES, LOOT_GEM_TYPES, GemType, type BoardSpawnConfig, DEFAULT_BOARD_SPAWN_CONFIG, type ActionGemType } from './constants';
import { createBoardCell, getBoardCellGemType, type BoardCell, type BoardCellState, type PuzzleGrid } from './boardTypes';
import type { CellStateSeed } from './nodeObstacles';
import { MATCH_BATTLE_PIECE_IDS, PIECE_CATALOG, normalizePiecePool } from './matchBattle/catalog';
import type { MatchBattleBoardConfig, PiecePoolEntry } from './matchBattle/types';

export type Gem = BoardCell;
export type { BoardCell, PuzzleGrid };

export type GemPoolConfig = BoardSpawnConfig;

const DEFAULT_GEM_POOL: GemPoolConfig = {
    lootChance: DEFAULT_BOARD_SPAWN_CONFIG.lootChance,
    actionWeights: { ...DEFAULT_BOARD_SPAWN_CONFIG.actionWeights },
};

export class BackendPuzzle {
    private puzzleState: PuzzleGrid;
    private nextGemsToSpawn: GemType[] = [];
    private score: number = 0;
    private movesUsed: number = 0;
    private gemPool: GemPoolConfig = DEFAULT_GEM_POOL;
    private matchBattleConfig: MatchBattleBoardConfig | null = null;
    private snippetRow: GemType[] = [];
    private pendingCleanseCount: number = 0;

    constructor(
        public readonly width: number,
        public readonly height: number
    ) {
        console.log(`BackendPuzzle: Constructor (width=${width}, height=${height})`);
        // Initial puzzle state will be random, can be influenced later
        this.puzzleState = this.getInitialPuzzleStateWithNoMatches(width, height);
        console.log("BackendPuzzle: Initial puzzleState created.");
    }

    setGemPool(config: GemPoolConfig): void {
        this.gemPool = {
            lootChance: config.lootChance,
            actionWeights: { ...config.actionWeights },
        };
        this.matchBattleConfig = null;
        this.snippetRow = [];
    }

    setMatchBattleConfig(config: MatchBattleBoardConfig): void {
        this.matchBattleConfig = {
            snippetsEnabled: config.snippetsEnabled,
            boardCols: config.boardCols,
            boardRows: config.boardRows,
            lootChance: config.lootChance,
            piecePool: normalizePiecePool(config.piecePool),
        };
        this.snippetRow = [];
        this.puzzleState = this.getInitialPuzzleStateWithNoMatches(this.width, this.height);
        if (this.matchBattleConfig.snippetsEnabled) {
            this.snippetRow = this.createSnippetRow();
        }
        this.score = 0;
        this.movesUsed = 0;
    }

    /**
     * Regenerates the puzzle board with new random gems.
     * Called when user clicks on the map to start a new game.
     */
    regenerateBoard(): void {
        console.log("BackendPuzzle: Regenerating puzzle state with new random gems.");
        this.puzzleState = this.getInitialPuzzleStateWithNoMatches(this.width, this.height);
        if (this.matchBattleConfig?.snippetsEnabled) {
            this.snippetRow = this.createSnippetRow();
        }
        this.score = 0;
        this.movesUsed = 0;
    }

    getScore(): number {
        return this.score;
    }

    getMovesUsed(): number {
        return this.movesUsed;
    }

    isGameOver(): boolean {
        // Unlimited play: moves are counted for stats but never end the game.
        return false;
    }

    getGridState(): PuzzleGrid {
        return this.cloneGridState(this.puzzleState);
    }

    getSnippetPreview(count = this.width): GemType[] {
        if (!this.matchBattleConfig?.snippetsEnabled) return [];
        this.ensureSnippetRow();
        return this.snippetRow.slice(0, count);
    }

    addBonusScore(points: number): void {
        if (points > 0) this.score += Math.floor(points);
    }

    registerMove(): number {
        this.movesUsed += 1;
        return this.movesUsed;
    }

    resetMoves(): void {
        this.movesUsed = 0;
    }

    applyCellStateSeeds(seeds: CellStateSeed[]): void {
        for (const seed of seeds) {
            const cell = this.puzzleState[seed.x]?.[seed.y];
            if (!cell) continue;
            this.puzzleState[seed.x][seed.y] = {
                ...cell,
                state: this.mergeCellState(cell.state, seed.state),
            };
        }
    }

    calculatePhaseBaseScore(phase: ExplodeAndReplacePhase): number {
        let totalMatched = 0;
        phase.matches.forEach(match => {
            totalMatched += match.length;
        });
        
        if (totalMatched > 0) {
            const baseScore = totalMatched * 10;
            const bonus = totalMatched > 3 ? (totalMatched - 3) * 5 : 0;
            return baseScore + bonus;
        }
        return 0;
    }

    /**
     * Generates an initial grid state with no immediate matches.
     * Uses the algorithm from the Python match_three code.
     */
    private getInitialPuzzleStateWithNoMatches(width: number, height: number): PuzzleGrid {
        console.log("BackendPuzzle: getInitialPuzzleStateWithNoMatches called.");
        const grid: PuzzleGrid = [];

        // Initialize empty grid
        for (let x = 0; x < width; x++) {
            grid[x] = [];
        }

        // Fill the grid left-to-right, top-to-bottom
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                // Start with all possible gem types
                let possibleGems = new Set<GemType>(this.matchBattleConfig ? this.getSpawnableMatchBattlePieces() : GEM_TYPES);

                // Check if placing a gem would create a vertical match of 3
                if (y >= 2) {
                    const gem1 = grid[x][y - 1]?.gemType;
                    const gem2 = grid[x][y - 2]?.gemType;
                    if (gem1 && gem2 && gem1 === gem2) {
                        // Remove this gem type from possible choices
                        possibleGems.delete(gem1);
                    }
                }

                // Check if placing a gem would create a horizontal match of 3
                if (x >= 2) {
                    const gem1 = grid[x - 1][y]?.gemType;
                    const gem2 = grid[x - 2][y]?.gemType;
                    if (gem1 && gem2 && gem1 === gem2) {
                        // Remove this gem type from possible choices
                        possibleGems.delete(gem1);
                    }
                }

                if (possibleGems.size === 0) {
                    possibleGems = new Set<GemType>(this.matchBattleConfig ? this.getSpawnableMatchBattlePieces() : GEM_TYPES);
                }

                // Pick a weighted random gem, retrying if it would create a match
                let gemType: GemType;
                let attempts = 0;
                do {
                    gemType = this.pickWeightedGem();
                    attempts++;
                } while (!possibleGems.has(gemType) && attempts < 20);
                // Fallback: pick any non-matching gem
                if (!possibleGems.has(gemType)) {
                    const possibleGemsArray = Array.from(possibleGems);
                    gemType = possibleGemsArray[Math.floor(Math.random() * possibleGemsArray.length)] ?? this.pickWeightedGem();
                }

                grid[x][y] = this.createSpawnedCell(gemType);
            }
        }
        console.log("BackendPuzzle: getInitialPuzzleStateWithNoMatches finished creating grid.");
        return grid;
    }

    getNextExplodeAndReplacePhase(actions: MoveAction[]): ExplodeAndReplacePhase {
        for (const action of actions) {
            this.applyMoveToGrid(this.puzzleState, action);
        }
        const matchGridState = this.cloneGridState(this.puzzleState);
        const matches = this.getMatches(this.puzzleState);
        const replacements: ColumnReplacement[] = [];
        
        if (matches.length > 0) {
            const explosionCounts: Record<number, number> = {};
            const explodedCoords = new Set<string>();
            matches.forEach(match => match.forEach(([x, y]) => explodedCoords.add(`${x},${y}`)));
            
            explodedCoords.forEach(coordStr => {
                const [xStr] = coordStr.split(',');
                const x = parseInt(xStr, 10);
                explosionCounts[x] = (explosionCounts[x] || 0) + 1;
            });
            
            for (let x = 0; x < this.width; x++) {
                const count = explosionCounts[x] || 0;
                if (count > 0) {
                    const typesForCol: GemType[] = [];
                    for (let i = 0; i < count; i++) {
                        typesForCol.push(this.getNextGemToSpawnTypeForColumn(x, i === 0));
                    }
                    replacements.push([x, typesForCol]);
                }
            }
        }
        
        const phaseResult = new ExplodeAndReplacePhase(matches, replacements, matchGridState);
        if (!phaseResult.isNothingToDo()) {
            this.applyExplodeAndReplacePhase(phaseResult);
        }
        return phaseResult;
    }

    getMatchesFromHypotheticalMove(moveAction: MoveAction): Match[] {
        let hypotheticalState: PuzzleGrid;
        try {
            hypotheticalState = structuredClone(this.puzzleState);
        } catch (e) {
            console.warn("structuredClone not supported, using JSON workaround.");
            hypotheticalState = JSON.parse(JSON.stringify(this.puzzleState));
        }
        this.applyMoveToGrid(hypotheticalState, moveAction);
        return this.getMatches(hypotheticalState);
    }

    /**
     * Returns the type of the next gem to spawn randomly.
     * This is used when gems are falling in to replace matched ones.
     */
    private getNextGemToSpawnType(): GemType {
        if (this.nextGemsToSpawn.length > 0) {
            return this.nextGemsToSpawn.shift()!;
        }

        return this.pickWeightedGem();
    }

    private getNextGemToSpawnTypeForColumn(column: number, consumeSnippet: boolean): GemType {
        if (this.nextGemsToSpawn.length > 0) {
            return this.nextGemsToSpawn.shift()!;
        }

        if (this.matchBattleConfig?.snippetsEnabled && consumeSnippet) {
            this.ensureSnippetRow();
            const next = this.snippetRow[column] ?? this.pickWeightedPiece();
            this.snippetRow[column] = this.pickWeightedPiece();
            return next;
        }

        return this.pickWeightedGem();
    }

    /** Pick a random gem weighted by action-vs-loot board config. */
    private pickWeightedGem(): GemType {
        if (this.matchBattleConfig) {
            if (Math.random() < this.matchBattleConfig.lootChance) {
                return LOOT_GEM_TYPES[Math.floor(Math.random() * LOOT_GEM_TYPES.length)];
            }
            return this.pickWeightedPiece();
        }
        if (Math.random() < this.gemPool.lootChance) {
            return LOOT_GEM_TYPES[Math.floor(Math.random() * LOOT_GEM_TYPES.length)];
        }
        return this.pickWeightedActionGem();
    }

    private pickWeightedPiece(): ActionGemType {
        const pool = this.matchBattleConfig?.piecePool ?? [];
        const total = pool.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
        if (total <= 0) return 'sword';
        let roll = Math.random() * total;
        for (const entry of pool) {
            roll -= Math.max(0, entry.weight);
            if (roll <= 0) return entry.pieceId;
        }
        // Float rounding fallthrough: return a positive-weight piece, never a zero-weight one.
        return pool.find(entry => entry.weight > 0)?.pieceId ?? 'sword';
    }

    private getSpawnableMatchBattlePieces(): GemType[] {
        const pool = this.matchBattleConfig?.piecePool ?? [];
        const pieces = pool
            .filter(entry => entry.weight > 0)
            .map(entry => entry.pieceId);
        const fallback: ActionGemType[] = [...MATCH_BATTLE_PIECE_IDS];
        for (const piece of fallback) {
            if (pieces.length >= 3) break;
            if (!pieces.includes(piece)) pieces.push(piece);
        }
        if ((this.matchBattleConfig?.lootChance ?? 0) > 0) {
            return [...pieces, ...LOOT_GEM_TYPES];
        }
        return pieces.length > 0 ? pieces : fallback;
    }

    private getPieceEntry(gemType: GemType): PiecePoolEntry | null {
        if (!this.matchBattleConfig || !ACTION_GEM_TYPES.includes(gemType as ActionGemType)) return null;
        return this.matchBattleConfig.piecePool.find(entry => entry.pieceId === gemType) ?? { pieceId: gemType as ActionGemType, level: 1, weight: 1 };
    }

    private createSpawnedCell(gemType: GemType, state?: BoardCellState): BoardCell {
        const piece = this.getPieceEntry(gemType);
        if (!piece) return createBoardCell(gemType, state);
        const def = PIECE_CATALOG[piece.pieceId];
        if (!def) return createBoardCell(gemType, state);
        return createBoardCell(gemType, state, {
            pieceId: piece.pieceId,
            level: piece.level,
            trigger: def.trigger,
        });
    }

    private createSnippetRow(): GemType[] {
        return Array.from({ length: this.width }, () => this.pickWeightedPiece());
    }

    private ensureSnippetRow(): void {
        while (this.snippetRow.length < this.width) {
            this.snippetRow.push(this.pickWeightedPiece());
        }
        if (this.snippetRow.length > this.width) {
            this.snippetRow = this.snippetRow.slice(0, this.width);
        }
    }

    private pickWeightedActionGem(): ActionGemType {
        const roll = Math.random();
        let cursor = 0;

        for (const gemType of ACTION_GEM_TYPES) {
            cursor += this.gemPool.actionWeights[gemType] ?? 0;
            if (roll <= cursor) {
                return gemType;
            }
        }

        return ACTION_GEM_TYPES[ACTION_GEM_TYPES.length - 1];
    }

    /** Check if any adjacent swap produces a match. */
    hasAnyValidMove(): boolean {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (x + 1 < this.width) {
                    const move = new MoveAction({ x, y }, { x: x + 1, y });
                    if (this.getMatchesFromHypotheticalMove(move).length > 0) return true;
                }
                if (y + 1 < this.height) {
                    const move = new MoveAction({ x, y }, { x, y: y + 1 });
                    if (this.getMatchesFromHypotheticalMove(move).length > 0) return true;
                }
            }
        }
        return false;
    }

    /** Shuffle gem cells in place (Fisher-Yates), preserving slot states and cell ids. Repeats until at least one valid move exists. */
    shuffle(): void {
        const cells: { x: number; y: number; cell: BoardCell }[] = [];
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const c = this.puzzleState[x]?.[y];
                if (c) cells.push({ x, y, cell: c });
            }
        }
        let attempts = 0;
        do {
            const shuffledCells = cells.map(c => c.cell);
            for (let i = shuffledCells.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledCells[i], shuffledCells[j]] = [shuffledCells[j], shuffledCells[i]];
            }
            for (let i = 0; i < cells.length; i++) {
                const { x, y } = cells[i];
                this.puzzleState[x][y] = {
                    ...shuffledCells[i],
                    state: cells[i].cell.state,
                };
            }
            attempts++;
        } while (!this.hasAnyValidMove() && attempts < 50);

        // Permuting existing cells can never create a match when no gem type
        // appears 3+ times (small board + wide gem pool). Respawn fresh gems.
        let regenAttempts = 0;
        while (!this.hasAnyValidMove() && regenAttempts < 20) {
            this.puzzleState = this.getInitialPuzzleStateWithNoMatches(this.width, this.height);
            regenAttempts++;
        }
    }

    addNextGemToSpawn(gemType: GemType): void {
        this.nextGemsToSpawn.push(gemType);
    }

    addNextGemsToSpawn(gemTypes: GemType[]): void {
        this.nextGemsToSpawn.push(...gemTypes);
    }

    reset(): void {
        // Generate a new random board
        this.puzzleState = this.getInitialPuzzleStateWithNoMatches(this.width, this.height);
        this.nextGemsToSpawn = [];
        this.snippetRow = this.matchBattleConfig?.snippetsEnabled ? this.createSnippetRow() : [];
        this.movesUsed = 0;
        console.log("BackendPuzzle reset: new random board generated.");
    }

    private applyMoveToGrid(grid: PuzzleGrid, moveAction: MoveAction): void {
        if (!moveAction.isSwap() || moveAction.isNoop() || !moveAction.isAdjacent()) return;

        const { from, to } = moveAction;
        if (!this.isInBounds(from.x, from.y) || !this.isInBounds(to.x, to.y)) return;

        const fromCell = grid[from.x]?.[from.y];
        const toCell = grid[to.x]?.[to.y];
        if (!fromCell || !toCell) return;
        // Debuffed cells are immovable — reject the swap (state is anchored to the slot).
        if (fromCell.state?.debuffId || toCell.state?.debuffId) return;

        grid[from.x][from.y] = { ...toCell, state: fromCell.state };
        grid[to.x][to.y] = { ...fromCell, state: toCell.state };
    }

    private isInBounds(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    /** Damage a blocker at (x,y). Returns true if the blocker was destroyed. */
    damageBlocker(x: number, y: number): boolean {
        const cell = this.puzzleState[x]?.[y];
        if (!cell?.state?.blockerId || !cell.state.durability) return false;
        cell.state.durability -= 1;
        if (cell.state.durability <= 0) {
            cell.state.blockerId = null;
            cell.state.durability = null;
            cell.state.flags = [];
            return true;
        }
        return false;
    }

    /** Clear a single cell's debuff, assigning a FRESH state object (matchGridState clone is shallow). */
    clearCellDebuff(x: number, y: number): boolean {
        const cell = this.puzzleState[x]?.[y];
        const oldId = cell?.state?.debuffId;
        if (!cell || !oldId) return false;
        cell.state = {
            ...cell.state,
            debuffId: null,
            flags: (cell.state?.flags ?? []).filter(f => f !== oldId),
        };
        return true;
    }

    /** Number of debuffs cleansed since the last consume; consume reads and resets it. */
    consumeCleanseCount(): number {
        const count = this.pendingCleanseCount;
        this.pendingCleanseCount = 0;
        return count;
    }

    /** Cleanse debuffs on cells orthogonally adjacent to (but not part of) the given matches. */
    private clearDebuffsAdjacentToMatches(matches: Match[]): number {
        if (matches.length === 0) return 0;
        const matched = new Set<string>();
        matches.forEach(match => match.forEach(([x, y]) => matched.add(`${x},${y}`)));
        const toClear = new Set<string>();
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        matches.forEach(match => match.forEach(([x, y]) => {
            for (const [dx, dy] of dirs) {
                const nx = x + dx;
                const ny = y + dy;
                if (!this.isInBounds(nx, ny) || matched.has(`${nx},${ny}`)) continue;
                if (this.puzzleState[nx]?.[ny]?.state?.debuffId) toClear.add(`${nx},${ny}`);
            }
        }));
        let count = 0;
        toClear.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            if (this.clearCellDebuff(x, y)) count++;
        });
        return count;
    }

    private getMatches(puzzleState: PuzzleGrid): Match[] {
        const matches: Match[] = [];
        if (!puzzleState || this.width === 0 || this.height === 0) return matches;

        const getGemType = (x: number, y: number): GemType | null => {
            const cell = puzzleState[x]?.[y];
            // Skip cells with active blockers
            if (cell?.state?.blockerId && cell.state.durability && cell.state.durability > 0) return null;
            // Skip debuffed cells — unmatchable (no durability gate; debuffs have none)
            if (cell?.state?.debuffId) return null;
            return getBoardCellGemType(cell);
        };

        // Check vertical matches
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height - 2; ) {
                const currentType = getGemType(x, y);
                if (!currentType) { y++; continue; }
                let matchLength = 1;
                while (y + matchLength < this.height && getGemType(x, y + matchLength) === currentType) {
                    matchLength++;
                }
                if (matchLength >= 3) {
                    const match: Match = [];
                    for (let i = 0; i < matchLength; i++) {
                        match.push([x, y + i]);
                    }
                    matches.push(match);
                }
                y += matchLength;
            }
        }
        
        // Check horizontal matches
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 2; ) {
                const currentType = getGemType(x, y);
                if (!currentType) { x++; continue; }
                let matchLength = 1;
                while (x + matchLength < this.width && getGemType(x + matchLength, y) === currentType) {
                    matchLength++;
                }
                if (matchLength >= 3) {
                    const match: Match = [];
                    for (let i = 0; i < matchLength; i++) {
                        match.push([x + i, y]);
                    }
                    matches.push(match);
                }
                x += matchLength;
            }
        }
        return matches;
    }

    private applyExplodeAndReplacePhase(phase: ExplodeAndReplacePhase): void {
        if (phase.isNothingToDo()) return;

        // Cleanse debuffs orthogonally adjacent to matches, on pre-collapse coords,
        // before surviving cells are shifted by gravity.
        this.pendingCleanseCount += this.clearDebuffsAdjacentToMatches(phase.matches);

        // Calculate score based on matched gems
        let totalMatched = 0;
        phase.matches.forEach(match => {
            totalMatched += match.length;
        });
        
        if (totalMatched > 0) {
            // Basic scoring: 10 points per gem, with bonus for larger matches
            const baseScore = totalMatched * 10;
            const bonus = totalMatched > 3 ? (totalMatched - 3) * 5 : 0;
            this.score += baseScore + bonus;
            
            // Note: Moves are now decremented in Game.ts once per turn, not per match
        }
        
        const explodeCoords = new Set<string>();
        phase.matches.forEach(match => match.forEach(coord => explodeCoords.add(`${coord[0]},${coord[1]}`)));
        const replacementsMap = new Map(phase.replacements);
        const newGrid: PuzzleGrid = [];
        
        for (let x = 0; x < this.width; x++) {
            newGrid[x] = [];
            const currentColumn = this.puzzleState[x] || [];
            const survivingGems = currentColumn.filter((gem, y) => !explodeCoords.has(`${x},${y}`));
            const newGemTypes = replacementsMap.get(x) || [];
            const newGems: BoardCell[] = newGemTypes.map(type => this.createSpawnedCell(type));
            newGrid[x] = [...newGems, ...survivingGems];
            
            if (newGrid[x].length !== this.height) {
                console.error(`Backend Error: Column ${x} length mismatch after phase. Expected ${this.height}, got ${newGrid[x].length}. Fixing...`);
                while (newGrid[x].length < this.height) newGrid[x].push(null); // Pad with null
                if (newGrid[x].length > this.height) newGrid[x] = newGrid[x].slice(0, this.height); // Truncate
            }
        }
        this.puzzleState = newGrid;
    }

    private mergeCellState(current: BoardCellState | undefined, incoming: BoardCellState): BoardCellState {
        return {
            blockerId: incoming.blockerId ?? current?.blockerId ?? null,
            durability: incoming.durability ?? current?.durability ?? null,
            flags: incoming.flags ?? current?.flags ?? [],
            debuffId: incoming.debuffId ?? current?.debuffId ?? null,
            charge: incoming.charge ?? current?.charge ?? null,
        };
    }

    private cloneGridState(grid: PuzzleGrid): PuzzleGrid {
        return grid.map(col => col.map(cell => cell ? { ...cell } : null));
    }

}
