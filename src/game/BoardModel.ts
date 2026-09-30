// BoardModel: the match-3 rules. It owns the grid of gems and the toys on it
// (special gems left by big matches), swaps neighbors, finds matches, sets toys
// off and refills. No Phaser: BoardView draws what it decides and
// BoardController runs the two together. Pinned by tests/game/boardModel.test.ts.
import { GEM_TYPES, type GemType } from './constants';
import { mulberry32, shuffled } from '@/lib/seededRng';

/** Column-major: grid[x][y], y = 0 at the top. */
export type Grid = GemType[][];
export type Cell = [x: number, y: number];
/** Swap the gems in two neighboring cells. */
export interface Move { from: Cell; to: Cell }
/**
 * A run of three or more gems of one color, the rare gems collected this phase (next to a run, or in a blast), or
 * (`blast`) the gems of one color that toys cleared outside any run.
 */
export interface MatchGroup { gemType: GemType; cells: Cell[]; blast?: true }
/** A gem that never matches by itself: it's collected when a match happens next to it. `chance` per new gem. */
export interface RareGem { type: GemType; chance: number }
/**
 * A toy a big match leaves on the board, riding on a gem: a line gem (a straight 4) clears its row or column, a
 * blast gem (an L or T) the 3×3 around it, a color gem (a straight 5) every gem of one color. A matched toy goes off;
 * a color gem goes off when swapped with any gem, and two toys swapped together go off as one big clear.
 */
export type Special = 'row' | 'column' | 'bomb' | 'color';
/** Column-major like the grid: the toy on each cell, or null. */
export type Toys = (Special | null)[][];
export interface Toy { cell: Cell; special: Special; gemType: GemType }
/**
 * A toy going off: where it was and the cells it cleared. `combo`: two toys swapped together, cleared as one shape
 * (a cross of two lines, the 5×5 around, or the whole board).
 */
export interface Fire { cell: Cell; special: Special; cells: Cell[]; combo?: 'cross' | 'square' | 'board' }

/** A toy about to go off; `used`: the other toy of a combo, cleared with it and not set off again. */
interface Trigger { cell: Cell; special: Special; target?: GemType | 'all'; cells?: Cell[]; combo?: Fire['combo']; used?: Cell[] }
/**
 * One explode step: the groups (runs, collected rare gems, blasts), every cell emptied (toys made this phase stay),
 * the toys made and set off, then the new gems dropped in at the top of each column.
 */
export interface ExplodePhase {
  groups: MatchGroup[];
  cleared: Cell[];
  made: Toy[];
  fired: Fire[];
  refills: Array<[column: number, gems: GemType[]]>;
}

const key = ([x, y]: Cell) => `${x},${y}`;
const NONE: ExplodePhase = { groups: [], cleared: [], made: [], fired: [], refills: [] };

export function isNeighbor([ax, ay]: Cell, [bx, by]: Cell): boolean {
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}

/** Every swap of two neighboring cells on a width x height board: each cell with the one right of it and the one below it. */
export function neighborSwaps(width: number, height: number): Move[] {
  const moves: Move[] = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (x + 1 < width) moves.push({ from: [x, y], to: [x + 1, y] });
      if (y + 1 < height) moves.push({ from: [x, y], to: [x, y + 1] });
    }
  }
  return moves;
}

/** Apply a swap to any column-major grid (gems here, sprites in BoardView), in place. */
export function applySwap<T>(grid: T[][], { from: [ax, ay], to: [bx, by] }: Move): void {
  [grid[ax][ay], grid[bx][by]] = [grid[bx][by], grid[ax][ay]];
}

export class BoardModel {
  private grid: Grid = [];
  private toys: Toys = [];
  private gemTypes: GemType[] = [...GEM_TYPES];
  private rng: () => number = Math.random;
  private rare: RareGem | null = null;
  private moves = 0;

  constructor(readonly width: number, readonly height: number) {}

  /** Moves that made a match since the board was created. */
  get movesUsed(): number {
    return this.moves;
  }

  /** A new board from a uint32 seed and at least three colors: no ready-made matches, at least one valid move. */
  newBoard(seed: number, gemTypes: readonly GemType[] = GEM_TYPES, rare: RareGem | null = null): void {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) throw new RangeError('Board seed must be a uint32.');
    const types = [...new Set(gemTypes.filter(type => GEM_TYPES.includes(type)))];
    if (types.length < 3) throw new RangeError('A board needs at least three gem types.');
    this.gemTypes = types;
    this.rare = rare && !types.includes(rare.type) ? rare : null;
    this.rng = mulberry32(seed);
    this.moves = 0;
    this.grid = this.freshGrid();
    this.toys = this.noToys();
    if (!this.hasAnyValidMove()) this.shuffle();
  }

  /** Replace the board with these gems and toys (tests and the dev bridge); the rng and colors stay. */
  loadBoard(grid: Grid, toys: Array<[Cell, Special]> = []): void {
    this.grid = grid.map(column => [...column]);
    this.toys = this.noToys();
    for (const [[x, y], special] of toys) this.toys[x][y] = special;
  }

  getGrid(): Grid {
    return this.grid.map(column => [...column]);
  }

  getToys(): Toys {
    return this.toys.map(column => [...column]);
  }

  /**
   * Make a move (a swap that matches or sets a toy off; any other is ignored), then clear one round of matches and
   * blasts and refill. Call again without a move for each cascade.
   */
  nextPhase(move?: Move): ExplodePhase {
    let triggered: Trigger[] = [];
    if (move) {
      if (!this.canSwap(move)) return NONE;
      triggered = this.swapTriggers(move);
      applySwap(this.grid, move);
      applySwap(this.toys, move);
    }
    const runs = this.findMatches(this.grid, this.toys);
    if (runs.length === 0 && triggered.length === 0) return NONE;
    if (move) this.moves++;

    const made = this.makeToys(runs, move);
    const madeKeys = new Set(made.map(toy => key(toy.cell)));
    const matched = new Set(runs.flatMap(run => run.cells.map(key)));

    // Toys go off: the ones a swap set off, every toy in a run, and every toy a blast reaches (once each).
    const queue: Trigger[] = [...triggered];
    for (const run of runs) for (const cell of run.cells) { const special = this.toys[cell[0]][cell[1]]; if (special) queue.push({ cell, special }); }
    const fired: Fire[] = [];
    const done = new Set<string>();
    const blasted = new Set<string>();
    while (queue.length > 0) {
      const next = queue.shift()!;
      if (done.has(key(next.cell))) continue;
      done.add(key(next.cell));
      for (const cell of next.used ?? []) done.add(key(cell));
      const cells = next.cells ?? this.blastCells(next.cell, next.special, next.target);
      fired.push({ cell: next.cell, special: next.special, cells, ...(next.combo ? { combo: next.combo } : {}) });
      for (const cell of [next.cell, ...cells]) {
        if (madeKeys.has(key(cell))) continue;
        blasted.add(key(cell));
        const special = this.toys[cell[0]][cell[1]];
        if (special && !done.has(key(cell))) queue.push({ cell, special });
      }
    }

    const rare = this.rare?.type;
    const collected = new Map<string, Cell>();
    if (rare) {
      for (const run of runs) {
        for (const [x, y] of run.cells) {
          for (const near of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as Cell[]) {
            if (this.onBoard(near) && this.grid[near[0]][near[1]] === rare) collected.set(key(near), near);
          }
        }
      }
    }
    const blastByColor = new Map<GemType, Cell[]>();
    for (const cellKey of blasted) {
      const cell = cellKey.split(',').map(Number) as Cell;
      const gem = this.grid[cell[0]][cell[1]];
      if (gem === rare) collected.set(cellKey, cell);
      else if (!matched.has(cellKey) && this.toys[cell[0]][cell[1]] !== 'color') blastByColor.set(gem, [...(blastByColor.get(gem) ?? []), cell]);
    }
    const groups: MatchGroup[] = [...runs];
    if (rare && collected.size > 0) groups.push({ gemType: rare, cells: [...collected.values()] });
    for (const [gemType, cells] of blastByColor) groups.push({ gemType, cells, blast: true });

    const clearedKeys = new Set([...matched, ...collected.keys(), ...blasted].filter(cellKey => !madeKeys.has(cellKey)));
    const cleared = [...clearedKeys].map(cellKey => cellKey.split(',').map(Number) as Cell);
    for (const toy of made) this.toys[toy.cell[0]][toy.cell[1]] = toy.special;
    const refills: ExplodePhase['refills'] = [];
    const nextToys: Toys = [];
    this.grid = this.grid.map((column, x) => {
      const keep = column.map((_gem, y) => !clearedKeys.has(`${x},${y}`));
      const survivors = column.filter((_gem, y) => keep[y]);
      const fresh = Array.from({ length: this.height - survivors.length }, () => this.pickGem());
      if (fresh.length > 0) refills.push([x, fresh]);
      nextToys[x] = [...fresh.map(() => null), ...this.toys[x].filter((_toy, y) => keep[y])];
      return [...fresh, ...survivors];
    });
    this.toys = nextToys;
    return { groups, cleared, made, fired, refills };
  }

  /** Whether a swap is a move: it makes a match, or sets a toy off (a color gem with any gem, or two toys together). */
  canSwap(move: Move): boolean {
    if (!this.onBoard(move.from) || !this.onBoard(move.to) || !isNeighbor(move.from, move.to)) return false;
    return this.matchesAfter(move).length > 0 || this.swapTriggers(move).length > 0;
  }

  /** The groups a swap would clear, without making it; none when the cells aren't neighbors on the board. */
  matchesAfter(move: Move): MatchGroup[] {
    if (!this.onBoard(move.from) || !this.onBoard(move.to) || !isNeighbor(move.from, move.to)) return [];
    const grid = this.getGrid();
    const toys = this.getToys();
    applySwap(grid, move);
    applySwap(toys, move);
    return this.findMatches(grid, toys);
  }

  /** Whether any swap of two neighbors is a move. */
  hasAnyValidMove(): boolean {
    return neighborSwaps(this.width, this.height).some(move => this.canSwap(move));
  }

  onBoard([x, y]: Cell): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /** Reshuffle the same gems (each toy stays on its gem) until no match is standing and a valid move exists (up to 50 tries). */
  shuffle(): void {
    const pairs = this.grid.flatMap((column, x) => column.map((gem, y): [GemType, Special | null] => [gem, this.toys[x][y]]));
    for (let attempt = 0; attempt < 50; attempt++) {
      const order = shuffled(pairs, this.rng);
      this.grid = Array.from({ length: this.width }, (_column, x) => order.slice(x * this.height, (x + 1) * this.height).map(([gem]) => gem));
      this.toys = Array.from({ length: this.width }, (_column, x) => order.slice(x * this.height, (x + 1) * this.height).map(([, toy]) => toy));
      if (this.findMatches(this.grid, this.toys).length === 0 && this.hasAnyValidMove()) return;
    }
  }

  /**
   * Toys a swap sets off by itself (before any match): a color gem swapped with a gem, or two toys swapped together.
   * Cells are where the toys land after the swap: the gem from `from` ends on `to` and the other way round.
   */
  private swapTriggers({ from, to }: Move): Trigger[] {
    if (!this.onBoard(from) || !this.onBoard(to) || !isNeighbor(from, to)) return [];
    const [a, b] = [this.toys[from[0]][from[1]], this.toys[to[0]][to[1]]];
    const [gemA, gemB] = [this.grid[from[0]][from[1]], this.grid[to[0]][to[1]]];
    const rare = this.rare?.type;
    const everywhere = this.grid.flatMap((column, x) => column.map((_gem, y): Cell => [x, y])).filter(([x, y]) => x !== to[0] || y !== to[1]);
    if (a === 'color' && b === 'color') return [{ cell: to, special: 'color', combo: 'board', cells: everywhere, used: [from] }];
    // A color gem clears every gem of the other gem's color (not note gems); a toy of that color goes off with them.
    if (a === 'color' && gemB !== rare) return [{ cell: to, special: 'color', target: gemB }];
    if (b === 'color' && gemA !== rare) return [{ cell: from, special: 'color', target: gemA }];
    if (a && b) {
      // Two line gems make a cross; a blast gem with a line gem or another blast gem clears the 5×5 around the swap.
      const cross = a !== 'bomb' && b !== 'bomb';
      const cells = cross ? [...this.lineCells(to, 'row'), ...this.lineCells(to, 'column')] : this.squareCells(to, 2);
      return [{ cell: to, special: cross ? a : 'bomb', combo: cross ? 'cross' : 'square', cells, used: [from] }];
    }
    return [];
  }

  /** The cells a toy clears when it goes off (not counting itself). */
  private blastCells(cell: Cell, special: Special, target?: GemType | 'all'): Cell[] {
    if (special === 'row' || special === 'column') return this.lineCells(cell, special);
    if (special === 'bomb') return this.squareCells(cell, 1);
    const color = target ?? this.commonestColor();
    const cells: Cell[] = [];
    this.grid.forEach((column, x) => column.forEach((gem, y) => {
      if ((x !== cell[0] || y !== cell[1]) && (color === 'all' || (gem === color && gem !== this.rare?.type))) cells.push([x, y]);
    }));
    return cells;
  }

  private lineCells([x, y]: Cell, line: 'row' | 'column'): Cell[] {
    return line === 'row'
      ? Array.from({ length: this.width }, (_cell, i): Cell => [i, y]).filter(([cx]) => cx !== x)
      : Array.from({ length: this.height }, (_cell, i): Cell => [x, i]).filter(([, cy]) => cy !== y);
  }

  private squareCells([x, y]: Cell, radius: number): Cell[] {
    const cells: Cell[] = [];
    for (let cx = x - radius; cx <= x + radius; cx++) {
      for (let cy = y - radius; cy <= y + radius; cy++) if ((cx !== x || cy !== y) && this.onBoard([cx, cy])) cells.push([cx, cy]);
    }
    return cells;
  }

  /** The color with the most gems on the board (a color gem set off by a blast clears it). */
  private commonestColor(): GemType {
    const counts = new Map<GemType, number>();
    this.grid.forEach((column, x) => column.forEach((gem, y) => {
      if (gem !== this.rare?.type && this.toys[x][y] !== 'color') counts.set(gem, (counts.get(gem) ?? 0) + 1);
    }));
    return this.gemTypes.reduce((best, gem) => ((counts.get(gem) ?? 0) > (counts.get(best) ?? 0) ? gem : best), this.gemTypes[0]);
  }

  /**
   * The toys this phase's runs leave: runs of one color that share a cell form one shape. A straight 5 makes a color
   * gem, an L or T a blast gem, a straight 4 a line gem along it. It sits where the player's swapped gem landed, else
   * where the runs cross or in the middle of the longest run.
   */
  private makeToys(runs: MatchGroup[], move?: Move): Toy[] {
    const shapes: MatchGroup[][] = [];
    for (const run of runs) {
      const touching = shapes.filter(shape => shape[0].gemType === run.gemType && shape.some(other => other.cells.some(cell => run.cells.some(c => key(c) === key(cell)))));
      const merged = [run, ...touching.flat()];
      for (const shape of touching) shapes.splice(shapes.indexOf(shape), 1);
      shapes.push(merged);
    }
    const toys: Toy[] = [];
    for (const shape of shapes) {
      const longest = shape.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
      const across = (run: MatchGroup) => run.cells[0][1] === run.cells[1][1];
      const crossing = shape.some(across) && shape.some(run => !across(run));
      const special: Special | null = longest.cells.length >= 5 ? 'color' : crossing ? 'bomb' : longest.cells.length === 4 ? (across(longest) ? 'row' : 'column') : null;
      if (!special) continue;
      const cells = shape.flatMap(run => run.cells);
      const inShape = (cell: Cell) => cells.some(c => key(c) === key(cell));
      const crossCell = cells.find(cell => cells.filter(c => key(c) === key(cell)).length > 1);
      const cell = move && inShape(move.to) ? move.to : move && inShape(move.from) ? move.from
        : special === 'bomb' && crossCell ? crossCell : longest.cells[Math.floor((longest.cells.length - 1) / 2)];
      toys.push({ cell, special, gemType: shape[0].gemType });
    }
    return toys;
  }

  private noToys(): Toys {
    return Array.from({ length: this.width }, () => new Array<Special | null>(this.height).fill(null));
  }

  /** Fill column by column, never placing a third gem in a line (rare gems land at their chance). */
  private freshGrid(): Grid {
    const grid: Grid = Array.from({ length: this.width }, () => []);
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.rare && this.rng() < this.rare.chance) { grid[x][y] = this.rare.type; continue; }
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
    if (this.rare && this.rng() < this.rare.chance) return this.rare.type;
    return this.gemTypes[Math.floor(this.rng() * this.gemTypes.length)];
  }

  /** Runs of three or more: down each column, then along each row. Rare gems and color gems never match. */
  private findMatches(grid: Grid, toys: Toys): MatchGroup[] {
    const lines: Cell[][] = [
      ...Array.from({ length: this.width }, (_line, x) => Array.from({ length: this.height }, (_cell, y): Cell => [x, y])),
      ...Array.from({ length: this.height }, (_line, y) => Array.from({ length: this.width }, (_cell, x): Cell => [x, y])),
    ];
    const groups: MatchGroup[] = [];
    for (const line of lines) {
      const gemAt = (i: number) => (toys[line[i][0]]?.[line[i][1]] === 'color' ? `color${i}` : grid[line[i][0]][line[i][1]]);
      for (let start = 0, end = 1; end <= line.length; end++) {
        if (end < line.length && gemAt(end) === gemAt(start)) continue;
        if (end - start >= 3 && gemAt(start) !== this.rare?.type) groups.push({ gemType: gemAt(start) as GemType, cells: line.slice(start, end) });
        start = end;
      }
    }
    return groups;
  }
}
