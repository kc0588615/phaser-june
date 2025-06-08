// src/game/BackendPuzzle.ts
import { ExplodeAndReplacePhase, ColumnReplacement, Match } from './ExplodeAndReplacePhase';
import { MoveAction } from './MoveAction';
import { GEM_TYPES, GemType } from './constants';

// Type for a gem in the puzzle
export interface Gem {
    gemType: GemType;
}

// Type for the puzzle grid
export type PuzzleGrid = (Gem | null)[][];

export class BackendPuzzle {
    private puzzleState: PuzzleGrid;
    private nextGemsToSpawn: GemType[] = [];
    private score: number = 0;
    private movesRemaining: number = 50; // Simple game over condition

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
     * Regenerates the puzzle board with new random gems.
     * Called when user clicks on the map to start a new game.
     */
    regenerateBoard(): void {
        console.log("BackendPuzzle: Regenerating puzzle state with new random gems.");
        this.puzzleState = this.getInitialPuzzleStateWithNoMatches(this.width, this.height);
        this.score = 0;
        this.movesRemaining = 50;
    }

    getScore(): number {
        return this.score;
    }

    getMovesRemaining(): number {
        return this.movesRemaining;
    }

    isGameOver(): boolean {
        return this.movesRemaining <= 0;
    }

    getGridState(): PuzzleGrid {
        return this.puzzleState;
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
                let possibleGems = new Set(GEM_TYPES);

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

                // Convert set to array and pick a random gem from remaining choices
                const possibleGemsArray = Array.from(possibleGems);
                const gemType = possibleGemsArray[Math.floor(Math.random() * possibleGemsArray.length)] as GemType;

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
     * Returns the type of the next gem to spawn randomly.
     * This is used when gems are falling in to replace matched ones.
     */
    private getNextGemToSpawnType(): GemType {
        if (this.nextGemsToSpawn.length > 0) {
            return this.nextGemsToSpawn.shift()!;
        }

        // Always return a random gem type
        return GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
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
        console.log("BackendPuzzle reset: new random board generated.");
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
            
            // Decrement moves when a successful match is made
            this.movesRemaining--;
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

}