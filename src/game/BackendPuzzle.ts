// BackendPuzzle — the pure rules engine of the match-3 board (the model).
//
// It owns the grid of gems, applies row/column shifts (MoveAction), finds
// matches and refills columns. It knows nothing about Phaser: BoardView renders
// what this class decides and BoardController runs the two together. Behavior is
// pinned by tests/game/backendPuzzle.test.ts.
import { ExplodeAndReplacePhase, type ColumnReplacement, type Match } from './ExplodeAndReplacePhase';
import { MoveAction } from './MoveAction';
import { GEM_TYPES, type GemType } from './constants';
import { createBoardCell, type BoardCell, type PuzzleGrid } from './boardTypes';
import { createStatefulMulberry32 } from '@/lib/seededRng';

export type { BoardCell, PuzzleGrid };

export class BackendPuzzle {
    private grid: PuzzleGrid;
    private movesUsed = 0;
    private gemTypes: GemType[] = [...GEM_TYPES];
    private rng: () => number = Math.random;

    constructor(public readonly width: number, public readonly height: number) {
        this.grid = this.freshGrid();
    }

    /** Colors that spawn; at least three. */
    setGemTypes(types: readonly GemType[]): void {
        const unique = [...new Set(types.filter(type => GEM_TYPES.includes(type)))];
        if (unique.length < 3) throw new RangeError('A board requires at least three gem types.');
        this.gemTypes = unique;
    }

    /** Seed the board's RNG (uint32), so the same seed gives the same boards and refills. */
    setSeed(seed: number): void {
        if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) throw new RangeError('Board seed must be a uint32.');
        const rng = createStatefulMulberry32(seed);
        this.rng = () => rng.next();
    }

    /** A new board with no ready-made matches and at least one valid move. */
    regenerateBoard(): void {
        this.grid = this.freshGrid();
        this.movesUsed = 0;
        if (!this.hasAnyValidMove()) this.shuffle();
    }

    getGridState(): PuzzleGrid {
        return this.grid.map(column => column.map(cell => (cell ? { ...cell } : null)));
    }

    registerMove(): number {
        return ++this.movesUsed;
    }

    getMovesUsed(): number {
        return this.movesUsed;
    }

    /** Apply the moves, then clear one round of matches and refill. Call again for cascades (with no moves). */
    getNextExplodeAndReplacePhase(actions: MoveAction[]): ExplodeAndReplacePhase {
        for (const action of actions) this.applyMove(this.grid, action);
        const matchGridState = this.getGridState();
        const matches = this.findMatches(this.grid);
        const replacements: ColumnReplacement[] = [];
        if (matches.length > 0) {
            const cleared = new Set(matches.flatMap(match => match.map(([x, y]) => `${x},${y}`)));
            for (let x = 0; x < this.width; x++) {
                const count = [...cleared].filter(key => Number(key.split(',')[0]) === x).length;
                if (count > 0) replacements.push([x, Array.from({ length: count }, () => this.pickGem())]);
            }
        }
        const phase = new ExplodeAndReplacePhase(matches, replacements, matchGridState);
        if (!phase.isNothingToDo()) this.applyPhase(phase);
        return phase;
    }

    getMatchesFromHypotheticalMove(move: MoveAction): Match[] {
        const grid = this.getGridState();
        this.applyMove(grid, move);
        return this.findMatches(grid);
    }

    /** Whether any one-cell row or column shift makes a match. */
    hasAnyValidMove(): boolean {
        for (const [rowOrCol, lines] of [['row', this.height], ['col', this.width]] as const) {
            for (let index = 0; index < lines; index++) {
                for (const amount of [1, -1]) {
                    if (this.getMatchesFromHypotheticalMove(new MoveAction(rowOrCol, index, amount)).length > 0) return true;
                }
            }
        }
        return false;
    }

    /** Shuffle the gems in place until no match is standing and a valid move exists (up to 50 tries). */
    shuffle(): void {
        const cells: Array<[number, number]> = [];
        for (let x = 0; x < this.width; x++) for (let y = 0; y < this.height; y++) if (this.grid[x]?.[y]) cells.push([x, y]);
        let attempts = 0;
        do {
            const types = cells.map(([x, y]) => this.grid[x][y]!.gemType);
            for (let i = types.length - 1; i > 0; i--) {
                const j = Math.floor(this.rng() * (i + 1));
                [types[i], types[j]] = [types[j], types[i]];
            }
            cells.forEach(([x, y], i) => { this.grid[x][y] = createBoardCell(types[i]); });
            attempts++;
        } while ((this.findMatches(this.grid).length > 0 || !this.hasAnyValidMove()) && attempts < 50);
    }

    /** Fill left to right, top to bottom, never placing a third gem in a line. */
    private freshGrid(): PuzzleGrid {
        const grid: PuzzleGrid = Array.from({ length: this.width }, () => []);
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const allowed = new Set(this.gemTypes);
                const above = [grid[x][y - 1]?.gemType, grid[x][y - 2]?.gemType];
                if (y >= 2 && above[0] && above[0] === above[1]) allowed.delete(above[0]);
                const left = [grid[x - 1]?.[y]?.gemType, grid[x - 2]?.[y]?.gemType];
                if (x >= 2 && left[0] && left[0] === left[1]) allowed.delete(left[0]);
                let gem = this.pickGem();
                for (let attempt = 1; !allowed.has(gem) && attempt < 20; attempt++) gem = this.pickGem();
                if (!allowed.has(gem)) {
                    const options = [...allowed];
                    gem = options[Math.floor(this.rng() * options.length)];
                }
                grid[x][y] = createBoardCell(gem);
            }
        }
        return grid;
    }

    private pickGem(): GemType {
        return this.gemTypes[Math.min(this.gemTypes.length - 1, Math.floor(this.rng() * this.gemTypes.length))];
    }

    /** Shift a row right (or a column down) by `amount`, wrapping around. */
    private applyMove(grid: PuzzleGrid, { rowOrCol, index, amount }: MoveAction): void {
        if (rowOrCol === 'row') {
            const shift = ((amount % this.width) + this.width) % this.width;
            if (shift === 0 || index < 0 || index >= this.height) return;
            const row = grid.map(column => column[index] ?? null);
            const shifted = [...row.slice(-shift), ...row.slice(0, this.width - shift)];
            grid.forEach((column, x) => { column[index] = shifted[x]; });
        } else {
            const shift = ((amount % this.height) + this.height) % this.height;
            if (shift === 0 || !grid[index]) return;
            const column = grid[index];
            grid[index] = [...column.slice(this.height - shift), ...column.slice(0, this.height - shift)];
        }
    }

    private findMatches(grid: PuzzleGrid): Match[] {
        const matches: Match[] = [];
        const at = (x: number, y: number) => grid[x]?.[y]?.gemType ?? null;
        // Vertical runs, then horizontal runs, of 3 or more.
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height - 2;) {
                const type = at(x, y);
                let length = 1;
                while (type && y + length < this.height && at(x, y + length) === type) length++;
                if (type && length >= 3) matches.push(Array.from({ length }, (_, i) => [x, y + i] as [number, number]));
                y += type ? length : 1;
            }
        }
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 2;) {
                const type = at(x, y);
                let length = 1;
                while (type && x + length < this.width && at(x + length, y) === type) length++;
                if (type && length >= 3) matches.push(Array.from({ length }, (_, i) => [x + i, y] as [number, number]));
                x += type ? length : 1;
            }
        }
        return matches;
    }

    /** Remove cleared gems; each column's survivors fall and new gems fill in from the top. */
    private applyPhase(phase: ExplodeAndReplacePhase): void {
        const cleared = new Set(phase.matches.flatMap(match => match.map(([x, y]) => `${x},${y}`)));
        const refills = new Map(phase.replacements);
        this.grid = this.grid.map((column, x) => {
            const survivors = column.filter((_cell, y) => !cleared.has(`${x},${y}`));
            return [...(refills.get(x) ?? []).map(createBoardCell), ...survivors].slice(0, this.height);
        });
    }
}
