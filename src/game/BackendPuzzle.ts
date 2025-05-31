// src/game/BackendPuzzle.ts
import { ExplodeAndReplacePhase, ColumnReplacement, Match } from './ExplodeAndReplacePhase';
import { MoveAction } from './MoveAction';
import { GEM_TYPES, GemType, HABITAT_GEM_MAP } from './constants';

// Type for a gem in the puzzle
export interface Gem {
    gemType: GemType;
}

// Type for the puzzle grid
export type PuzzleGrid = (Gem | null)[][];

export class BackendPuzzle {
    private puzzleState: PuzzleGrid;
    private nextGemsToSpawn: GemType[] = [];
    private currentHabitatInfluence: number[] | null = null;

    constructor(
        public readonly width: number,
        public readonly height: number
    ) {
        console.log(`BackendPuzzle: Constructor (width=${width}, height=${height})`);
        // Initial puzzle state will be random, can be influenced later
        this.puzzleState = this.getInitialPuzzleStateWithNoMatches(width, height);
        console.log("BackendPuzzle: Initial puzzleState created.");
    }

    /**
     * Sets the habitat influence for gem generation.
     * This also triggers a regeneration of the puzzle state if the board is
     * intended to reflect the new influence immediately.
     * @param habitatValues - Array of numeric habitat codes.
     */
    setHabitatInfluence(habitatValues: number[] | null): void {
        if (Array.isArray(habitatValues)) {
            const validHabitats = habitatValues.filter(h => typeof h === 'number' && !isNaN(h));
            this.currentHabitatInfluence = validHabitats.length > 0 ? validHabitats : null;
        } else {
            this.currentHabitatInfluence = null;
        }
        console.log("BackendPuzzle: Habitat influence set to:", this.currentHabitatInfluence);

        // **IMPORTANT**: Regenerate the puzzle state to reflect the new influence for the initial board.
        // This assumes that when habitat influence changes, the whole board should be fresh.
        // If only new falling gems should be influenced, you would skip this line.
        console.log("BackendPuzzle: Regenerating puzzle state with new habitat influence.");
        this.puzzleState = this.getInitialPuzzleStateWithNoMatches(this.width, this.height);
    }

    getGridState(): PuzzleGrid {
        return this.puzzleState;
    }

    /**
     * Generates an initial grid state with no immediate matches,
     * potentially influenced by currentHabitatInfluence.
     */
    private getInitialPuzzleStateWithNoMatches(width: number, height: number): PuzzleGrid {
        console.log("BackendPuzzle: getInitialPuzzleStateWithNoMatches called.");
        const grid: PuzzleGrid = [];

        for (let x = 0; x < width; x++) {
            grid[x] = new Array(height).fill(null);
            for (let y = 0; y < height; y++) {
                let gemType: GemType;
                // Try to get gem type based on habitat influence for initial fill
                // This makes the initial board reflect the selected area.
                if (this.currentHabitatInfluence && this.currentHabitatInfluence.length > 0) {
                    // Pick one habitat value randomly from the available ones for this specific gem
                    const habitatValue = this.currentHabitatInfluence[Math.floor(Math.random() * this.currentHabitatInfluence.length)];
                    const mappedGemType = HABITAT_GEM_MAP[habitatValue];
                    if (mappedGemType && (GEM_TYPES as readonly string[]).includes(mappedGemType)) {
                        gemType = mappedGemType;
                    } else {
                        // Fallback if habitat value not in map or maps to invalid type for this specific gem
                        gemType = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
                    }
                } else {
                    // Fallback to purely random if no influence for initial fill
                    gemType = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
                }

                // Check against previously placed gems to avoid initial 3-in-a-row
                // This loop tries a few times to find a non-matching gem.
                let attempts = 0;
                const maxAttempts = GEM_TYPES.length * 2; // Heuristic
                while (attempts < maxAttempts) {
                    const prevY1Type = grid[x]?.[y - 1]?.gemType;
                    const prevY2Type = grid[x]?.[y - 2]?.gemType;
                    const prevX1Type = grid[x - 1]?.[y]?.gemType;
                    const prevX2Type = grid[x - 2]?.[y]?.gemType;

                    const yMatch = (y >= 2 && prevY1Type && prevY1Type === prevY2Type && prevY1Type === gemType);
                    const xMatch = (x >= 2 && prevX1Type && prevX1Type === prevX2Type && prevX1Type === gemType);

                    if (!yMatch && !xMatch) {
                        break; // Found a suitable gemType
                    }

                    // Try a different gem type if it would create an initial match
                    // (and if habitat influence didn't already pick one)
                    let possibleTypes = [...GEM_TYPES];
                    if (yMatch) possibleTypes = possibleTypes.filter(type => type !== prevY1Type);
                    if (xMatch) possibleTypes = possibleTypes.filter(type => type !== prevX1Type);

                    if (possibleTypes.length > 0) {
                        gemType = possibleTypes[Math.floor(Math.random() * possibleTypes.length)] as GemType;
                    } else {
                        // Very rare, stick with the current random/habitat gem
                        if (attempts === 0) console.warn(`Initial fill at [${x},${y}] might create match, limited options.`);
                        break;
                    }
                    attempts++;
                }
                if (attempts >= maxAttempts) {
                    console.warn(`Could not avoid initial match at [${x},${y}] after ${maxAttempts} attempts.`);
                }

                grid[x][y] = { gemType };
            }
        }
        console.log("BackendPuzzle: getInitialPuzzleStateWithNoMatches finished creating grid.");
        return grid;
    }

    getNextExplodeAndReplacePhase(actions: MoveAction[]): ExplodeAndReplacePhase {
        for (const action of actions) {
            this.applyMoveToGrid(this.puzzleState, action);
        }
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
                        // getNextGemToSpawnType will use habitatInfluence for *new* gems
                        typesForCol.push(this.getNextGemToSpawnType());
                    }
                    replacements.push([x, typesForCol]);
                }
            }
        }
        
        const phaseResult = new ExplodeAndReplacePhase(matches, replacements);
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
     * Returns the type of the next gem to spawn, influenced by habitats or randomly.
     * This is used when gems are falling in to replace matched ones.
     */
    private getNextGemToSpawnType(): GemType {
        if (this.nextGemsToSpawn.length > 0) {
            return this.nextGemsToSpawn.shift()!;
        }

        if (this.currentHabitatInfluence && this.currentHabitatInfluence.length > 0) {
            const habitatValue = this.currentHabitatInfluence[Math.floor(Math.random() * this.currentHabitatInfluence.length)];
            const mappedGemType = HABITAT_GEM_MAP[habitatValue];

            if (mappedGemType && (GEM_TYPES as readonly string[]).includes(mappedGemType)) {
                // console.log(`Spawning gem '${mappedGemType}' based on habitat ${habitatValue}`);
                return mappedGemType;
            } else {
                // console.warn(`Habitat value ${habitatValue} (from influence list) not in HABITAT_GEM_MAP or maps to invalid type. Using random.`);
                return GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
            }
        } else {
            // Fallback to purely random if no influence available for new falling gems
            return GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
        }
    }

    addNextGemToSpawn(gemType: GemType): void {
        this.nextGemsToSpawn.push(gemType);
    }

    addNextGemsToSpawn(gemTypes: GemType[]): void {
        this.nextGemsToSpawn.push(...gemTypes);
    }

    reset(): void {
        // When resetting, we clear habitat influence and generate a purely random board.
        // The habitat influence will be set again by Game.js when a new location is selected.
        this.currentHabitatInfluence = null;
        this.puzzleState = this.getInitialPuzzleStateWithNoMatches(this.width, this.height);
        this.nextGemsToSpawn = [];
        console.log("BackendPuzzle reset: habitat influence cleared, new random board generated.");
    }

    private applyMoveToGrid(grid: PuzzleGrid, moveAction: MoveAction): void {
        const { rowOrCol, index, amount } = moveAction;
        if (amount === 0) return;

        if (rowOrCol === 'row') {
            const width = this.width;
            const effectiveAmount = ((amount % width) + width) % width;
            if (effectiveAmount === 0) return;
            const y = index;
            if (y < 0 || y >= this.height) return;

            const currentRow: (Gem | null)[] = [];
            for (let x = 0; x < width; x++) {
                currentRow.push(grid[x]?.[y] ?? null);
            }
            if (currentRow.some(gem => gem === undefined)) {
                console.error(`Error reading row ${y} for move application.`);
                return;
            }
            const newRow = [...currentRow.slice(-effectiveAmount), ...currentRow.slice(0, width - effectiveAmount)];
            for (let x = 0; x < width; x++) {
                if (grid[x]) {
                    grid[x][y] = newRow[x];
                }
            }
        } else { // 'col'
            const height = this.height;
            const effectiveAmount = ((amount % height) + height) % height;
            if (effectiveAmount === 0) return;
            const x = index;
            if (x < 0 || x >= this.width || !grid[x]) return;
            const currentCol = grid[x];
            if (currentCol.some(gem => gem === undefined)) {
                console.error(`Error reading column ${x} for move application.`);
                return;
            }
            const newCol = [...currentCol.slice(height - effectiveAmount), ...currentCol.slice(0, height - effectiveAmount)];
            grid[x] = newCol;
        }
    }

    private getMatches(puzzleState: PuzzleGrid): Match[] {
        const matches: Match[] = [];
        if (!puzzleState || this.width === 0 || this.height === 0) return matches;
        
        const getGemType = (x: number, y: number): GemType | null => puzzleState[x]?.[y]?.gemType ?? null;

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
        
        const explodeCoords = new Set<string>();
        phase.matches.forEach(match => match.forEach(coord => explodeCoords.add(`${coord[0]},${coord[1]}`)));
        const replacementsMap = new Map(phase.replacements);
        const newGrid: PuzzleGrid = [];
        
        for (let x = 0; x < this.width; x++) {
            newGrid[x] = [];
            const currentColumn = this.puzzleState[x] || [];
            const survivingGems = currentColumn.filter((gem, y) => !explodeCoords.has(`${x},${y}`));
            const newGemTypes = replacementsMap.get(x) || [];
            const newGems: Gem[] = newGemTypes.map(type => ({ gemType: type }));
            newGrid[x] = [...newGems, ...survivingGems];
            
            if (newGrid[x].length !== this.height) {
                console.error(`Backend Error: Column ${x} length mismatch after phase. Expected ${this.height}, got ${newGrid[x].length}. Fixing...`);
                while (newGrid[x].length < this.height) newGrid[x].push(null); // Pad with null
                if (newGrid[x].length > this.height) newGrid[x] = newGrid[x].slice(0, this.height); // Truncate
            }
        }
        this.puzzleState = newGrid;
    }

    /**
     * Get the current score (placeholder for future implementation)
     */
    getScore(): number {
        // TODO: Implement scoring system
        return 0;
    }

    /**
     * Get remaining moves (placeholder for future implementation)
     */
    getMovesRemaining(): number {
        // TODO: Implement move counting system
        return 30;
    }

    /**
     * Check if game is over (placeholder for future implementation)
     */
    isGameOver(): boolean {
        // TODO: Implement game over logic
        return false;
    }
}