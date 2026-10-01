// Balance bot for plan 044 (the animal board): plays seeded rounds with the real
// rules (src/clueGame/animalBoard.ts) on the real board with pinned tiles
// (src/game/BoardModel.ts) and prints how each kind of player does. Every player
// gets the same deals and boards; same arguments, same numbers. Players may preview
// a move's first clear (deterministic, and the game shows it); none sees future
// refills or answers not yet earned, except the oracle, a diagnostic that knows the
// mystery from the start.
//   node scripts/run-typescript.mjs scripts/balance-044.ts [--rounds 400] [--seed 44] [--places africa,asia]
//     [--moves 30] [--order 24] [--board 7] [--witness 0.03] [--stars 6,13] [--players careful,reader,guesser,random,oracle]
//     [--explain N]   (print round N's suspects, clue table and notes instead)
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ANIMAL_RULES, BOARD_GEMS, WITNESS_GEM, applyPhase, endOfMove, mark, nameAtTimeout, newAnimalRound, newTrail, pickSuspectSet, reportOf,
  starsFor, stillPossible, tileCells, trailAfter, trailFinished,
  type AnimalRound, type AnimalRules, type PhaseReport,
} from '../src/clueGame/animalBoard';
import type { AnimalProfile, ContentSource } from '../src/clueGame/profiles';
import { makeBook, poolFor, type Book } from '../src/clueGame/questionMatch';
import { animalsFromProfiles } from '../src/clueGame/questionMatchContent';
import type { ContinentKey } from '../src/clueGame/regions';
import { BoardModel, neighborSwaps, type Cell, type Move, type Special } from '../src/game/BoardModel';
import { hash32, mulberry32, shuffled } from '../src/lib/seededRng';

type Player = 'careful' | 'reader' | 'guesser' | 'random' | 'oracle';
const PLAYER_NOTES: Record<Player, string> = {
  careful: 'reasons from answers and notes, marks what they rule out, aims each move (fills useful orders, clears next to marked tiles)',
  reader: 'reasons and marks like careful, but moves at random: what board planning is worth',
  guesser: 'marks four suspects at random at the start, then aims at them: the blind floor',
  random: 'random moves, never marks (0 finds by rule); names at random when moves run out',
  oracle: 'diagnostic: knows the mystery, marks the look-alikes at once, aims like careful: is a finish possible in the moves?',
};

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? process.argv[at + 1] : fallback;
}

interface Deal { suspects: number[]; mysteryId: number; place: ContinentKey | null; boardSeed: number; pins: Array<[Cell, number]> }

interface Result {
  state: AnimalRound;
  identifiedAt: number | null;
  toys: number;
  stuck: boolean;
}

const toysOf = (board: BoardModel): Array<[Cell, Special]> =>
  board.getToys().flatMap((column, x) => column.flatMap((toy, y): Array<[Cell, Special]> => (toy ? [[[x, y], toy]] : [])));

/** How far a cell is from the nearest of these cells (steps up, down, left and right). */
const distance = ([x, y]: Cell, cells: readonly Cell[]) => cells.reduce((best, [cx, cy]) => Math.min(best, Math.abs(cx - x) + Math.abs(cy - y)), 99);

function play(book: Book, rules: AnimalRules, board: BoardModel, scratch: BoardModel, deal: Deal, player: Player, rng: () => number): Result {
  let state = newAnimalRound(book, rules, { suspects: deal.suspects, mysteryId: deal.mysteryId, place: deal.place });
  const reasons = player === 'careful' || player === 'reader';
  if (player === 'guesser') {
    for (const id of shuffled(state.suspects, rng).slice(0, rules.suspects - 1)) state = mark(state, id, true);
  }
  if (player === 'oracle') for (const id of state.suspects) if (id !== state.mysteryId) state = mark(state, id, true);
  let identifiedAt: number | null = null;
  let toys = 0;
  let stuck = false;

  while (state.status === 'playing') {
    if (reasons) {
      const possible = stillPossible(book, state);
      for (const id of state.suspects) if (!possible.includes(id) && !state.released.includes(id) && !state.marked.includes(id)) state = mark(state, id, true);
      if (identifiedAt === null && possible.length === 1) identifiedAt = state.movesUsed;
    }
    let valid = neighborSwaps(board.width, board.height).filter(move => board.canSwap(move));
    if (valid.length === 0) {
      board.shuffle();
      valid = neighborSwaps(board.width, board.height).filter(move => board.canSwap(move));
      if (valid.length === 0) { stuck = true; break; }
    }
    const move = player === 'random' || player === 'reader' ? valid[Math.floor(rng() * valid.length)] : aim(book, state, board, scratch, valid, player);
    let phase = board.nextPhase(move);
    for (let cascade = false; phase.groups.length > 0; cascade = true) {
      toys += phase.made.length;
      const before = state.released.length;
      state = applyPhase(book, state, reportOf(phase), cascade);
      if (state.status !== 'playing') break;
      board.unpin(state.released.slice(before));
      phase = board.nextPhase();
    }
    state = endOfMove(state);
    if (state.status === 'playing' && !board.hasAnyValidMove()) board.shuffle();
  }
  if (state.status === 'out-of-moves') {
    const left = player === 'careful' || player === 'reader' || player === 'oracle'
      ? stillPossible(book, state)
      : state.suspects.filter(id => !state.released.includes(id));
    state = nameAtTimeout(state, left[Math.floor(rng() * left.length)] ?? null);
  }
  return { state, identifiedAt, toys, stuck };
}

/**
 * The aimed move: each valid swap's first clear, tried on the scratch board. Worth: marked tiles it releases, progress
 * on orders whose clue still splits the suspects left (by how many it's sure to rule out), witness gems while notes
 * are left, and clears landing near marked tiles (to set up the next release).
 */
function aim(book: Book, state: AnimalRound, board: BoardModel, scratch: BoardModel, valid: Move[], player: Player): Move {
  const grid = board.getGrid();
  const toys = toysOf(board);
  const pins = board.pinnedCells();
  const marked = pins.filter(([, id]) => state.marked.includes(id) && !state.released.includes(id));
  const markedIds = new Set(marked.map(([, id]) => id));
  const possible = player === 'careful' ? stillPossible(book, state) : [];
  const weight = state.orders.map(order => {
    if (player !== 'careful' || order.answer) return 0;
    const yes = possible.filter(id => order.row[state.suspects.indexOf(id)]).length;
    return Math.min(yes, possible.length - yes);
  });
  let best = valid[0];
  let bestValue = -Infinity;
  for (const move of valid) {
    scratch.loadBoard(grid, toys, pins);
    const phase = scratch.nextPhase(move);
    const report: PhaseReport = reportOf(phase);
    let value = 5 * report.touched.filter(id => markedIds.has(id)).length;
    state.orders.forEach((order, i) => {
      if (weight[i] > 0) value += 6 * weight[i] * Math.min(report.collected[order.gem] ?? 0, state.rules.orderSize - order.have) / state.rules.orderSize;
    });
    if (player === 'careful' && state.notesLeft.length > 0) value += report.witness;
    for (const [cell] of marked) value += 0.3 * Math.max(0, 3 - distance(cell, phase.cleared));
    if (value > bestValue) { best = move; bestValue = value; }
  }
  return best;
}

const pct = (n: number, of: number) => (of ? `${Math.round((100 * n) / of)}%` : '-');
/** A 95% interval half-width, in percentage points. */
const pm = (n: number, of: number) => { const p = n / of; return `±${Math.round(196 * Math.sqrt((p * (1 - p)) / of))}`; };
const avg = (values: number[]) => (values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '-');

async function main() {
  const rounds = Number(arg('rounds', '400'));
  const setupSeed = Number(arg('seed', '44'));
  const size = Number(arg('board', '7'));
  const rules: AnimalRules = {
    ...ANIMAL_RULES,
    moves: Number(arg('moves', String(ANIMAL_RULES.moves))),
    orderSize: Number(arg('order', String(ANIMAL_RULES.orderSize))),
    witnessChance: Number(arg('witness', String(ANIMAL_RULES.witnessChance))),
    starMoves: arg('stars', ANIMAL_RULES.starMoves.join(',')).split(',').map(Number) as AnimalRules['starMoves'],
  };
  const players = arg('players', 'careful,reader,guesser,random,oracle').split(',') as Player[];
  const dir = path.join(process.cwd(), 'db/content');
  const profiles = readdirSync(path.join(dir, 'animals')).filter(file => file.endsWith('.json')).sort()
    .map(file => JSON.parse(readFileSync(path.join(dir, 'animals', file), 'utf8')) as AnimalProfile);
  const registry = JSON.parse(readFileSync(path.join(dir, 'sources.json'), 'utf8')) as ContentSource[];
  const animals = animalsFromProfiles(profiles, registry, () => undefined);
  const book = makeBook(animals);
  const name = (id: number) => book.byId.get(id)!.name;

  const explain = process.argv.includes('--explain') ? Number(arg('explain', '0')) : null;
  if (explain === null) {
    console.log(`Plan 044 balance, rules ${rules.version}: ${rounds} rounds a place, ${rules.suspects} suspects, ${rules.moves} moves, order ${rules.orderSize}, ${size}x${size} board, witness gems ${rules.witnessChance}, setup seed ${setupSeed}.`);
    for (const player of players) console.log(`- ${player}: ${PLAYER_NOTES[player]}`);
    console.log('\n| Place | Player | Found | ★★★ | Escaped | Out of moves | Named right at timeout | Identified | Moves left at find | Moves after identified | Orders filled | Notes | Toys | Trail finished | Finds a trail |');
    console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  }

  const starLines: string[] = [];
  for (const placeName of arg('places', 'africa,asia').split(',')) {
    const place = placeName === 'world' ? null : placeName as ContinentKey;
    const pool = poolFor(animals, place);
    const sets = new Map<number, number[]>();
    for (const seed of pool) { const set = pickSuspectSet(book, pool, seed, rules, place); if (set) sets.set(seed, set); }
    const seeds = [...sets.keys()];
    const setupRng = mulberry32(setupSeed);
    const deals: Deal[] = Array.from({ length: rounds }, (_unused, r) => {
      const suspects = sets.get(seeds[Math.floor(setupRng() * seeds.length)])!;
      const mysteryId = suspects[Math.floor(setupRng() * suspects.length)];
      // The board comes from the set and the round alone, never the mystery.
      const boardSeed = hash32(`044:${setupSeed}:${r}:${suspects.join(',')}`);
      const cells = tileCells(size, size, suspects.length, mulberry32(boardSeed))!;
      return { suspects, mysteryId, place, boardSeed, pins: suspects.map((id, i): [Cell, number] => [cells[i], id]) };
    });

    if (explain !== null) {
      const deal = deals[explain];
      const state = newAnimalRound(book, rules, { suspects: deal.suspects, mysteryId: deal.mysteryId, place });
      console.log(`${placeName} round ${explain}: the mystery is the ${name(deal.mysteryId)}.\n`);
      console.log(`| Suspect | ${state.orders.map(order => order.short).join(' | ')} |`);
      console.log(`|---|${state.orders.map(() => '---').join('|')}|`);
      state.suspects.forEach((id, i) => console.log(`| ${name(id)} | ${state.orders.map(order => (order.row[i] ? 'yes' : 'no')).join(' | ')} |`));
      console.log(`\nWitness notes (${state.notesLeft.length}):`);
      for (const note of state.notesLeft) console.log(`- "${note.text}" fits ${note.fits} of ${state.suspects.length}`);
      continue;
    }

    for (const player of players) {
      const board = new BoardModel(size, size);
      const scratch = new BoardModel(size, size);
      scratch.newBoard(1, BOARD_GEMS, { type: WITNESS_GEM, chance: rules.witnessChance });
      const rng = mulberry32(hash32(`${player}:${setupSeed}`));
      const results = deals.map(deal => {
        board.newBoard(deal.boardSeed, BOARD_GEMS, { type: WITNESS_GEM, chance: rules.witnessChance }, deal.pins);
        return play(book, rules, board, scratch, deal, player, rng);
      });
      const found = results.filter(r => r.state.status === 'found');
      let trail = newTrail(rules);
      let trails = 0, finished = 0, trailFinds = 0;
      for (const { state } of results) {
        trail = trailAfter(rules, trail, state);
        if (trail.over) { trails++; finished += trailFinished(rules, trail) ? 1 : 0; trailFinds += trail.finds; trail = newTrail(rules); }
      }
      const n = results.length;
      const count = (test: (r: Result) => boolean) => results.filter(test).length;
      console.log([
        `| ${placeName} (${pool.length}, ${new Set([...sets.values()].map(set => set.join())).size} sets)`, player,
        `${pct(found.length, n)} ${pm(found.length, n)}`,
        pct(count(r => starsFor(r.state) === 3), n),
        pct(count(r => r.state.lostBy === 'escaped'), n),
        pct(count(r => r.state.lostBy === 'out-of-moves'), n),
        pct(count(r => r.state.named?.correct === true), n),
        player === 'careful' || player === 'reader' ? pct(count(r => r.identifiedAt !== null), n) : '-',
        avg(found.map(r => r.state.movesLeft)),
        player === 'careful' || player === 'reader' ? avg(found.filter(r => r.identifiedAt !== null).map(r => r.state.movesUsed - r.identifiedAt!)) : '-',
        avg(results.map(r => r.state.orders.filter(order => order.answer).length)),
        avg(results.map(r => r.state.notes.length)),
        avg(results.map(r => r.toys)),
        `${pct(finished, trails)} of ${trails}`,
        trails ? (trailFinds / trails).toFixed(1) : '-',
      ].join(' | ') + (count(r => r.stuck) ? ` (stuck ${count(r => r.stuck)})` : '') + ' |');
      if (player === 'careful') {
        // Where to put the star lines: careful's moves left at the find, at the 20th, 40th and 60th percentile.
        const left = found.map(r => r.state.movesLeft).sort((a, b) => a - b);
        const at = (q: number) => left[Math.floor(q * (left.length - 1))];
        starLines.push(`${placeName}: careful moves left at the find, 20th/40th/60th percentile ${at(0.2)}/${at(0.4)}/${at(0.6)}`);
      }
    }
  }
  if (starLines.length) console.log(`\n${starLines.join('\n')}`);
}

main().catch(error => { console.error(error); process.exit(1); });
