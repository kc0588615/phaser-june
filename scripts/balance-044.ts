// Balance bot for plan 044 (the animal board): plays seeded rounds with the real
// rules (src/clueGame/animalBoard.ts) on the real board with pinned tiles
// (src/game/BoardModel.ts) and prints how each kind of player does. Every player
// gets the same deals and boards; same arguments, same numbers. Players may preview
// a move's first clear (deterministic, and the game shows it); none sees future
// refills or answers not yet earned, except the oracle, a diagnostic that knows the
// mystery from the start. Plan 054: locker, autoguess and scribbler name early (scribbler pencils at random).
//   node scripts/run-typescript.mjs scripts/balance-044.ts [--rounds 400] [--seed 44] [--places africa,asia]
//     [--moves 30] [--order 24] [--board 7] [--witness 0.03] [--stars 6,13] [--players careful,novice,expert,reader,guesser,random,oracle,locker,autoguess,scribbler,dabbler] [--dab 1]
//     [--explain N]   (print round N's suspects, clue table and notes instead)
//     [--scout on|off] [--knows size,covering]   (plan 045 scouting, on in the rules: suspects' answers start hidden
//     and a move's clear next to an unmarked tile shows them; careful and reader know the --knows traits on sight,
//     novice none, expert all)
//     [--wander on|off] [--toy on|off]   (plan 047, on in the rules: marked tiles step to the edge each move and leave;
//     --toy: a release by the player's own run leaves a line toy; follows --wander unless set. 045-0: --wander off)
//     [--toyscout on|off]   (rules 047-1, on in the rules: a line or blast gem in the move's own clear scouts its color)
//     [--double N]   (rules 053-1, 2 in the rules: a move whose own runs are two colors adds N gems to each clue order hit; 0 off)
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ANIMAL_RULES, BOARD_GEMS, HEADING_STEP, PENCIL_WEIGHT, WITNESS_GEM, applyPhase, endOfMove, headingOf, mark, nameIt, newAnimalRound, newTrail,
  pickSuspectSet, reportOf, rewardToy, scoreRound, sharpEye, shownMismatches, starsFor, stillPossible, tileCells, trailAfter, trailFinished, travelOf, walkOff, walkers,
  type AnimalRound, type AnimalRules, type PhaseReport,
} from '../src/clueGame/animalBoard';
import type { AnimalProfile, ContentSource } from '../src/clueGame/profiles';
import { PREFIX_CATEGORY, makeBook, poolFor, type Book } from '../src/clueGame/questionMatch';
import { animalsFromProfiles } from '../src/clueGame/questionMatchContent';
import type { ContinentKey } from '../src/clueGame/regions';
import { BoardModel, neighborSwaps, type Cell, type ExplodePhase, type Move, type Special } from '../src/game/BoardModel';
import { hash32, mulberry32, shuffled } from '../src/lib/seededRng';

type Player = 'careful' | 'novice' | 'expert' | 'reader' | 'guesser' | 'random' | 'oracle' | 'locker' | 'autoguess' | 'scribbler' | 'dabbler';
/** Players who reason from the evidence (and aim, except reader). */
const THINKERS: readonly Player[] = ['careful', 'novice', 'expert', 'reader', 'locker'];
const PLAYER_NOTES: Record<Player, string> = {
  novice: 'careful, knowing no trait on sight (scouting only)',
  expert: 'careful, knowing every trait on sight (scouting never needed)',
  careful: 'reasons from answers and notes, marks what they rule out, aims each move (fills useful orders, clears next to marked tiles)',
  reader: 'reasons and marks like careful, but moves at random: what board planning is worth',
  guesser: 'marks four suspects at random at the start, then aims at them: the blind floor',
  random: 'random moves, never marks (finds only by naming); names at random when moves run out (053: a right name finds it)',
  locker: 'careful, and pencils every hidden cell it knows on sight (--knows), right; names it (054 bonus) as soon as only one is possible',
  autoguess: 'random moves; Auto rule-out marks for it (shown mismatches); once one is marked, names one still in at random: the blind baseline with the switch on',
  scribbler: 'autoguess, but pencils every hidden cell at random at the start: what random pencils add (054)',
  dabbler: 'at the start, pencils --dab random cells in the highest-weight questions, rules out one animal, names one still in at random: farming Sharp eye (Codex, 054-1)',
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
  /** Plan 047: steps a tile couldn't take, tiles that walked off, reward toys put down, releases by a toy's clear (not a run). */
  blocked: number;
  walked: number;
  rewards: number;
  toyReleases: number;
}

const toysOf = (board: BoardModel): Array<[Cell, Special]> =>
  board.getToys().flatMap((column, x) => column.flatMap((toy, y): Array<[Cell, Special]> => (toy ? [[[x, y], toy]] : [])));

/** How far a cell is from the nearest of these cells (steps up, down, left and right). */
const distance = ([x, y]: Cell, cells: readonly Cell[]) => cells.reduce((best, [cx, cy]) => Math.min(best, Math.abs(cx - x) + Math.abs(cy - y)), 99);

interface Options { knows: readonly string[]; dab: number }

function play(book: Book, rules: AnimalRules, board: BoardModel, scratch: BoardModel, deal: Deal, player: Player, rng: () => number, options: Options): Result {
  let state = newAnimalRound(book, rules, { suspects: deal.suspects, mysteryId: deal.mysteryId, place: deal.place });
  const reasons = THINKERS.includes(player);
  const pencil: Record<string, 'yes' | 'no'> = {};
  const knows = (tag: string) => player === 'expert' || (player !== 'novice' && options.knows.includes(tag.slice(0, tag.indexOf(':'))));
  // Marking fixes the way a tile walks, from where it stands now (plan 047).
  const markOut = (id: number) => {
    const cell = board.pinnedCells().find(([, other]) => other === id)![0];
    state = mark(state, id, true, rules.wander ? headingOf(travelOf(book.byId.get(id)!), cell, board.width) : undefined);
  };
  if (player === 'guesser') {
    for (const id of shuffled(state.suspects, rng).slice(0, rules.suspects - 1)) markOut(id);
  }
  if (player === 'oracle') for (const id of state.suspects) if (id !== state.mysteryId) markOut(id);
  if (player === 'scribbler') for (const id of state.suspects) for (const order of state.orders) pencil[`${id}:${order.tag}`] = rng() < 0.5 ? 'yes' : 'no';
  if (player === 'dabbler') {
    const weight = (tag: string) => PENCIL_WEIGHT[PREFIX_CATEGORY[tag.slice(0, tag.indexOf(':'))]];
    const cells = shuffled(state.suspects.flatMap(id => state.orders.map(order => `${id}:${order.tag}`)), rng)
      .sort((a, b) => weight(b.slice(b.indexOf(':') + 1)) - weight(a.slice(a.indexOf(':') + 1)));
    for (const key of cells.slice(0, options.dab)) pencil[key] = rng() < 0.5 ? 'yes' : 'no';
    const first = Number(cells[0].slice(0, cells[0].indexOf(':')));
    markOut(first);
    const stillIn = state.suspects.filter(id => id !== first);
    state = nameIt(state, stillIn[Math.floor(rng() * stillIn.length)], pencil);
  }
  /** Plan 054: name early. The locker pencils what it knows on sight (always right) and names once sure; autoguess and
   * scribbler let Auto rule-out mark, then name one still in at random once any is marked. */
  const tryName = () => {
    if (player === 'locker') {
      state.suspects.forEach((id, i) => { for (const order of state.orders) if (!order.seen[i] && knows(order.tag)) pencil[`${id}:${order.tag}`] = order.row[i] ? 'yes' : 'no'; });
      const possible = stillPossible(book, state, knows);
      if (possible.length === 1) state = nameIt(state, possible[0], pencil);
    }
    if (player === 'autoguess' || player === 'scribbler') {
      for (const id of shownMismatches(state)) markOut(id);
      const stillIn = state.suspects.filter(id => !state.marked.includes(id) && !state.released.includes(id));
      if (stillIn.length < state.suspects.length) state = nameIt(state, stillIn[Math.floor(rng() * stillIn.length)], pencil);
    }
  };
  let identifiedAt: number | null = null;
  let toys = 0;
  let stuck = false;
  let blocked = 0, walked = 0, rewards = 0, toyReleases = 0;
  const earned: Array<[Cell, Special]> = [];

  /** A phase and its cascades. `own`: the first is the player's swap (scouts, uses the move, earns reward toys). */
  const resolve = (first: ExplodePhase, own: boolean) => {
    let phase = first;
    for (let cascade = !own; phase.groups.length > 0; cascade = true) {
      toys += phase.made.length;
      const before = state.released;
      const cells = new Map(board.pinnedCells().map(([cell, id]) => [id, cell]));
      state = applyPhase(book, state, reportOf(phase), cascade);
      if (state.status !== 'playing') return;
      const newly = state.released.filter(id => !before.includes(id));
      toyReleases += newly.filter(id => !phase.runTouched.includes(id)).length;
      if (!cascade && rules.wanderToy) for (const id of newly) if (phase.runTouched.includes(id)) earned.push([cells.get(id)!, rewardToy(state.headings[id] ?? 'left')]);
      board.unpin(newly);
      phase = board.nextPhase();
    }
  };

  while (state.status === 'playing') {
    if (reasons) {
      const possible = stillPossible(book, state, knows);
      for (const id of state.suspects) if (!possible.includes(id) && !state.released.includes(id) && !state.marked.includes(id)) markOut(id);
      if (identifiedAt === null && possible.length === 1) identifiedAt = state.movesUsed;
    }
    tryName();
    if (state.status !== 'playing') break;
    let valid = neighborSwaps(board.width, board.height).filter(move => board.canSwap(move));
    if (valid.length === 0) {
      board.shuffle();
      valid = neighborSwaps(board.width, board.height).filter(move => board.canSwap(move));
      if (valid.length === 0) { stuck = true; break; }
    }
    const move = player === 'random' || player === 'reader' || player === 'autoguess' || player === 'scribbler' ? valid[Math.floor(rng() * valid.length)] : aim(book, state, board, scratch, valid, player, knows);
    resolve(board.nextPhase(move), true);
    // Plan 047: each marked tile tries one step, in order; each step settles (walk-off refill, cascades) before the next.
    if (rules.wander) {
      for (const [id, heading] of walkers(state, board.pinnedCells(), board.width, board.height)) {
        if (state.status !== 'playing') break;
        const step = board.stepPin(id, HEADING_STEP[heading]);
        if (step.kind === 'blocked') { blocked++; continue; }
        if (step.kind === 'left') { walked++; state = walkOff(state, id); }
        if (state.status === 'playing') resolve(board.nextPhase(), false);
      }
    }
    for (const [cell, special] of earned.splice(0)) if (state.status === 'playing' && board.placeToy(cell, special)) rewards++;
    state = endOfMove(state);
    if (state.status === 'playing' && !board.hasAnyValidMove()) board.shuffle();
  }
  if (state.status === 'out-of-moves') {
    const left = reasons || player === 'oracle'
      ? stillPossible(book, state, knows)
      : state.suspects.filter(id => !state.released.includes(id));
    state = nameIt(state, left[Math.floor(rng() * left.length)] ?? null, pencil);
  }
  return { state, identifiedAt, toys, stuck, blocked, walked, rewards, toyReleases };
}

/**
 * The aimed move: each valid swap's first clear, tried on the scratch board. Worth: marked tiles it releases, progress
 * on orders whose clue still splits the suspects left (by how many it's sure to rule out, counting hidden answers
 * either way), witness gems while notes are left, scouting answers it doesn't know for suspects still possible (more
 * once the clue is answered), and clears landing near marked tiles (to set up the next release).
 */
function aim(book: Book, state: AnimalRound, board: BoardModel, scratch: BoardModel, valid: Move[], player: Player, knows: (tag: string) => boolean): Move {
  const grid = board.getGrid();
  const toys = toysOf(board);
  const pins = board.pinnedCells();
  const marked = pins.filter(([, id]) => state.marked.includes(id) && !state.released.includes(id));
  const markedIds = new Set(marked.map(([, id]) => id));
  const thinks = THINKERS.includes(player);
  const possible = thinks ? stillPossible(book, state, knows) : [];
  const known = (order: AnimalRound['orders'][number], id: number) => order.seen[state.suspects.indexOf(id)] || knows(order.tag);
  const weight = state.orders.map(order => {
    if (!thinks || order.answer) return 0;
    const shown = possible.filter(id => known(order, id));
    const yes = shown.filter(id => order.row[state.suspects.indexOf(id)]).length;
    const hidden = possible.length - shown.length;
    return Math.min(yes + hidden, shown.length - yes + hidden, Math.floor(possible.length / 2));
  });
  const scoutWorth = state.orders.map(order => (order.answer ? 4 : weight[state.orders.indexOf(order)] > 0 ? 1 : 0));
  let best = valid[0];
  let bestValue = -Infinity;
  for (const move of valid) {
    scratch.loadBoard(grid, toys, pins);
    const phase = scratch.nextPhase(move);
    const report: PhaseReport = reportOf(phase);
    let value = 5 * report.touched.filter(id => markedIds.has(id)).length;
    state.orders.forEach((order, i) => {
      if (weight[i] > 0) value += 6 * weight[i] * Math.min((report.collected[order.gem] ?? 0) + (report.double?.includes(order.gem) ? state.rules.doubleBonus : 0), state.rules.orderSize - order.have) / state.rules.orderSize;
    });
    if (thinks && state.notesLeft.length > 0) value += report.witness;
    if (thinks && state.rules.scout) {
      for (const [id, colors] of report.nearColors ?? []) {
        if (markedIds.has(id) || !possible.includes(id)) continue;
        state.orders.forEach((order, i) => { if (colors.includes(order.gem) && !known(order, id)) value += scoutWorth[i]; });
      }
    }
    // Clears landing near marked tiles set up the next release; with wander they walk off anyway.
    if (!state.rules.wander) for (const [cell] of marked) value += 0.3 * Math.max(0, 3 - distance(cell, phase.cleared));
    if (value > bestValue) { best = move; bestValue = value; }
  }
  return best;
}

const pct = (n: number, of: number) => (of ? `${Math.round((100 * n) / of)}%` : '-');
/** A 95% interval half-width, in percentage points. */
const pm = (n: number, of: number) => { const p = n / of; return `±${Math.round(196 * Math.sqrt((p * (1 - p)) / of))}`; };
const avg = (values: number[]) => (values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '-');
/** The round reached its last move undecided (then named right, wrong, or skipped). */
const ranOut = (state: AnimalRound) => state.log.some(entry => entry.kind === 'out-of-moves');

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
    scout: arg('scout', ANIMAL_RULES.scout ? 'on' : 'off') === 'on',
    wander: arg('wander', ANIMAL_RULES.wander ? 'on' : 'off') === 'on',
  };
  rules.wanderToy = arg('toy', rules.wander ? 'on' : 'off') === 'on';
  rules.toyScout = arg('toyscout', ANIMAL_RULES.toyScout ? 'on' : 'off') === 'on';
  rules.doubleBonus = Number(arg('double', String(ANIMAL_RULES.doubleBonus)));
  const options: Options = { knows: arg('knows', 'size,covering').split(',').filter(Boolean), dab: Number(arg('dab', '1')) };
  const players = arg('players', 'careful,novice,expert,reader,guesser,random,oracle').split(',') as Player[];
  const dir = path.join(process.cwd(), 'db/content');
  const profiles = readdirSync(path.join(dir, 'animals')).filter(file => file.endsWith('.json')).sort()
    .map(file => JSON.parse(readFileSync(path.join(dir, 'animals', file), 'utf8')) as AnimalProfile);
  const registry = JSON.parse(readFileSync(path.join(dir, 'sources.json'), 'utf8')) as ContentSource[];
  const animals = animalsFromProfiles(profiles, registry, () => undefined);
  const book = makeBook(animals);
  const name = (id: number) => book.byId.get(id)!.name;

  const explain = process.argv.includes('--explain') ? Number(arg('explain', '0')) : null;
  if (explain === null) {
    console.log(`Plan 044 balance, rules ${rules.version}: ${rounds} rounds a place, ${rules.suspects} suspects, ${rules.moves} moves, order ${rules.orderSize}, ${size}x${size} board, witness gems ${rules.witnessChance}, setup seed ${setupSeed}${rules.scout ? `, scouting (careful and reader know ${options.knows.join(', ') || 'nothing'})` : ''}${rules.wander ? `, wander${rules.wanderToy ? ' with reward toys' : ''}` : ''}${rules.toyScout ? ', toy scouting' : ''}.`);
    for (const player of players) console.log(`- ${player}: ${PLAYER_NOTES[player]}`);
    console.log('\n| Place | Player | Found | ★★★ | Escaped | Ran out of moves | Named right at timeout (a find, 053) | Identified | Moves left at find | Moves after identified | Orders filled | Notes | Answers seen | Toys | Toy releases | Walked off | Blocked steps | Reward toys | Out of moves once identified | Trail finished | Finds a trail | Named early (054) | Pencil bonus at a find | Sharp eye (2★ by name) | Points a round (no streak) |');
    console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
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
      board.toyScout = scratch.toyScout = rules.toyScout;
      scratch.newBoard(1, BOARD_GEMS, { type: WITNESS_GEM, chance: rules.witnessChance });
      const results = deals.map((deal, r) => {
        board.newBoard(deal.boardSeed, BOARD_GEMS, { type: WITNESS_GEM, chance: rules.witnessChance }, deal.pins);
        // Seeded per deal, so runs under different rules pair up round by round.
        return play(book, rules, board, scratch, deal, player, mulberry32(hash32(`${player}:${setupSeed}:${r}`)), options);
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
        pct(count(r => ranOut(r.state)), n),
        pct(count(r => r.state.named?.correct === true), n),
        THINKERS.includes(player) ? pct(count(r => r.identifiedAt !== null), n) : '-',
        avg(found.map(r => r.state.movesLeft)),
        THINKERS.includes(player) ? avg(found.filter(r => r.identifiedAt !== null).map(r => r.state.movesUsed - r.identifiedAt!)) : '-',
        avg(results.map(r => r.state.orders.filter(order => order.answer).length)),
        avg(results.map(r => r.state.notes.length)),
        avg(results.map(r => r.state.orders.reduce((sum, order) => sum + order.seen.filter(Boolean).length, 0))),
        avg(results.map(r => r.toys)),
        avg(results.map(r => r.toyReleases)),
        avg(results.map(r => r.walked)),
        avg(results.map(r => r.blocked)),
        avg(results.map(r => r.rewards)),
        THINKERS.includes(player) ? pct(count(r => r.identifiedAt !== null && ranOut(r.state)), n) : '-',
        `${pct(finished, trails)} of ${trails}`,
        trails ? (trailFinds / trails).toFixed(1) : '-',
        pct(count(r => r.state.named !== null && r.state.movesLeft > 0), n),
        avg(found.filter(r => r.state.pencilBonus !== null).map(r => r.state.pencilBonus!)),
        pct(count(r => sharpEye(r.state)), n),
        avg(results.map(r => scoreRound(r.state, 0))),
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
