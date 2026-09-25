// BoardModel: the match-3 rules. It owns the grid of gems, shifts rows and
// columns, finds matches and refills. No Phaser: BoardView draws what it
// decides and BoardController runs the two together. Pinned by
// tests/game/boardModel.test.ts.
import { GEM_TYPES, type GemType } from './constants';
import { mulberry32, shuffled } from '@/lib/seededRng';

/** Column-major: grid[x][y], y = 0 at the top. */
export type Grid = GemType[][];
export type MoveDirection = 'row' | 'col';
/** Shift row or column `index` by `amount` cells (positive: right or down), wrapping around. */
export interface Move { rowOrCol: MoveDirection; index: number; amount: number }
export type Cell = [x: number, y: number];
/** A run of three or more gems of one color. */
export interface MatchGroup { gemType: GemType; cells: Cell[] }
/** One explode step: the groups cleared, then the new gems dropped in at the top of each column. */
export interface ExplodePhase { groups: MatchGroup[]; refills: Array<[column: number, gems: GemType[]]> }

/** Apply a move to any column-major grid (gems here, sprites in BoardView), in place. */
export function applyShift<T>(grid: T[][], { rowOrCol, index, amount }: Move): void {
  const rotate = (items: T[]) => {
    const shift = ((amount % items.length) + items.length) % items.length;
    return [...items.slice(items.length - shift), ...items.slice(0, items.length - shift)];
  };
  if (rowOrCol === 'col') {
    if (grid[index]) grid[index] = rotate(grid[index]);
  } else if (index >= 0 && index < (grid[0]?.length ?? 0)) {
    const row = rotate(grid.map(column => column[index]));
    grid.forEach((column, x) => { column[index] = row[x]; });
  }
}

export class BoardModel {
  private grid: Grid = [];
  private gemTypes: GemType[] = [...GEM_TYPES];
  private rng: () => number = Math.random;
  private moves = 0;

  constructor(readonly width: number, readonly height: number) {}

  /** Moves that made a match since the board was created. */
  get movesUsed(): number {
    return this.moves;
  }

  /** A new board from a uint32 seed and at least three colors: no ready-made matches, at least one valid move. */
  newBoard(seed: number, gemTypes: readonly GemType[] = GEM_TYPES): void {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) throw new RangeError('Board seed must be a uint32.');
    const types = [...new Set(gemTypes.filter(type => GEM_TYPES.includes(type)))];
    if (types.length < 3) throw new RangeError('A board needs at least three gem types.');
    this.gemTypes = types;
    this.rng = mulberry32(seed);
    this.moves = 0;
    this.grid = this.freshGrid();
    if (!this.hasAnyValidMove()) this.shuffle();
  }

  getGrid(): Grid {
    return this.grid.map(column => [...column]);
  }

  /** Apply a move, then clear one round of matches and refill. Call again without a move for each cascade. */
  nextPhase(move?: Move): ExplodePhase {
    if (move) applyShift(this.grid, move);
    const groups = this.findMatches(this.grid);
    if (groups.length === 0) return { groups, refills: [] };
    if (move) this.moves++;
    const cleared = new Set(groups.flatMap(group => group.cells.map(([x, y]) => `${x},${y}`)));
    const refills: ExplodePhase['refills'] = [];
    this.grid = this.grid.map((column, x) => {
      const survivors = column.filter((_gem, y) => !cleared.has(`${x},${y}`));
      const fresh = Array.from({ length: this.height - survivors.length }, () => this.pickGem());
      if (fresh.length > 0) refills.push([x, fresh]);
      return [...fresh, ...survivors];
    });
    return { groups, refills };
  }

  /** The groups a move would clear, without making it. */
  matchesAfter(move: Move): MatchGroup[] {
    const grid = this.getGrid();
    applyShift(grid, move);
    return this.findMatches(grid);
  }

  /** Whether any one-cell row or column shift makes a match. */
  hasAnyValidMove(): boolean {
    for (const [rowOrCol, lines] of [['row', this.height], ['col', this.width]] as const) {
      for (let index = 0; index < lines; index++) {
        for (const amount of [1, -1]) {
          if (this.matchesAfter({ rowOrCol, index, amount }).length > 0) return true;
        }
      }
    }
    return false;
  }

  /** Reshuffle the same gems until no match is standing and a valid move exists (up to 50 tries). */
  shuffle(): void {
    for (let attempt = 0; attempt < 50; attempt++) {
      const gems = shuffled(this.grid.flat(), this.rng);
      this.grid = Array.from({ length: this.width }, (_column, x) => gems.slice(x * this.height, (x + 1) * this.height));
      if (this.findMatches(this.grid).length === 0 && this.hasAnyValidMove()) return;
    }
  }

  /** Fill column by column, never placing a third gem in a line. */
  private freshGrid(): Grid {
    const grid: Grid = Array.from({ length: this.width }, () => []);
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const allowed = new Set(this.gemTypes);
        if (y >= 2 && grid[x][y - 1] === grid[x][y - 2]) allowed.delete(grid[x][y - 1]);
        if (x >= 2 && grid[x - 1][y] === grid[x - 2][y]) allowed.delete(grid[x - 1][y]);
        const options = [...allowed];
        grid[x][y] = options[Math.floor(this.rng() * options.length)];
      }
    }
    return grid;
  }

  private pickGem(): GemType {
    return this.gemTypes[Math.floor(this.rng() * this.gemTypes.length)];
  }

  /** Runs of three or more: down each column, then along each row. */
  private findMatches(grid: Grid): MatchGroup[] {
    const lines: Cell[][] = [
      ...Array.from({ length: this.width }, (_line, x) => Array.from({ length: this.height }, (_cell, y): Cell => [x, y])),
      ...Array.from({ length: this.height }, (_line, y) => Array.from({ length: this.width }, (_cell, x): Cell => [x, y])),
    ];
    const groups: MatchGroup[] = [];
    for (const line of lines) {
      const gemAt = (i: number) => grid[line[i][0]][line[i][1]];
      for (let start = 0, end = 1; end <= line.length; end++) {
        if (end < line.length && gemAt(end) === gemAt(start)) continue;
        if (end - start >= 3) groups.push({ gemType: gemAt(start), cells: line.slice(start, end) });
        start = end;
      }
    }
    return groups;
  }
}
