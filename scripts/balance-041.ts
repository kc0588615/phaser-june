// Balance bot for plan 041: plays seeded Question Match rounds with the real
// rules (src/clueGame/questionMatch.ts) on the real board (src/game/BoardModel.ts)
// and prints how each kind of player does. Every player gets the same rounds and
// boards; same arguments, same numbers.
//   node scripts/run-typescript.mjs scripts/balance-041.ts [--rounds 400] [--moves 4] [--board 5] [--candidates 8]
//     [--tree one-of-each|charges|match] [--tree-charges 8] [--tree-match 4] [--notes-chance 0.05] [--per-match 1,2,3]
//     [--places africa,asia,world] [--offer-useless] [--no-auto-ask] [--look-alikes | --relatives]
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AnimalProfile, ContentSource } from '../src/clueGame/profiles';
import { animalsFromProfiles } from '../src/clueGame/questionMatchContent';
import {
  CHARGE_CATEGORIES, DEFAULT_RULES, FAMILY_TREE_RANKS, applyMatches, ask, buyFamilyTreeStep, familyTreeQuote, guess, makeBook, newRound, pickRound,
  poolFor, questionsFor, scoreSolve, standing,
  type Book, type ChargeCategory, type FamilyTreeCost, type GemKind, type Question, type RoundState, type Rules,
} from '../src/clueGame/questionMatch';
import type { ContinentKey } from '../src/clueGame/regions';
import { BoardModel, neighborSwaps, type Move } from '../src/game/BoardModel';
import type { GemType } from '../src/game/constants';
import { mulberry32 } from '../src/lib/seededRng';

const GEM_OF: Record<GemKind, GemType> = { body: 'orange', habits: 'yellow', habitat: 'green', range: 'blue', life: 'black', notes: 'purple' };
const KIND_OF = new Map(Object.entries(GEM_OF).map(([kind, gem]) => [gem, kind as GemKind]));
const COLORS = CHARGE_CATEGORIES.map(c => GEM_OF[c]);

// 'random swaps': careful questions with random swaps, to show what the board part of the skill is worth.
type Strategy = 'careful' | 'random swaps' | 'random' | 'worst' | 'family tree first';
const STRATEGIES: Strategy[] = ['careful', 'random swaps', 'random', 'worst', 'family tree first'];

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? process.argv[at + 1] : fallback;
}

const split = (q: Question) => Math.min(q.has, q.lacks);
const totalCharges = (state: RoundState) => CHARGE_CATEGORIES.reduce((sum, c) => sum + state.charges[c], 0);

/** Play one round; returns the final state and the charges earned. */
function play(book: Book, rules: Rules, board: BoardModel, setup: Parameters<typeof newRound>[2], strategy: Strategy, rng: () => number) {
  let state = newRound(book, rules, setup);
  let income = 0;
  const treeFirst = strategy === 'family tree first';
  const goodQuestions = strategy === 'careful' || strategy === 'random swaps' || treeFirst;
  const spend = (final: boolean) => {
    for (;;) {
      if (standing(state).length <= 1) return;
      // The family tree: always first for its fan; for everyone else, only with charges no question can use.
      const affordable = Object.values(questionsFor(book, state)).flat().filter(q => state.charges[q.category] > 0);
      const quote = familyTreeQuote(book, state);
      if (quote?.affordable && (treeFirst || affordable.length === 0)) { state = buyFamilyTreeStep(book, state); continue; }
      // The fan saves for the next step, and asks only once the tree is done or the round is ending.
      if (treeFirst && quote && !final) return;
      if (affordable.length === 0) return;
      const pick = goodQuestions ? affordable.reduce((a, b) => (split(b) > split(a) ? b : a))
        : strategy === 'worst' ? affordable.reduce((a, b) => (split(b) < split(a) ? b : a))
        : affordable[Math.floor(rng() * affordable.length)];
      state = ask(book, state, pick.tag);
    }
  };
  while (state.status === 'playing' && standing(state).length > 1) {
    const valid = neighborSwaps(board.width, board.height).filter(move => board.canSwap(move));
    let move: Move = valid[Math.floor(rng() * valid.length)];
    if (strategy === 'careful' || treeFirst) {
      // Aim: a big match while it earns a family tree step; else a color that's missing (the fan wants one of each)
      // or, for the careful player, a color with a useful question and no charge yet.
      const questions = questionsFor(book, state);
      const wanted = (kind: GemKind | undefined) => kind !== undefined && kind !== 'notes' && state.charges[kind as ChargeCategory] === 0
        && (treeFirst || questions[kind as ChargeCategory].length > 0);
      const big = rules.familyTree.cost === 'match' && state.familyTreeSteps < FAMILY_TREE_RANKS.length
        && valid.find(m => board.matchesAfter(m).some(group => group.cells.length >= rules.familyTree.match));
      move = big || valid.find(m => board.matchesAfter(m).some(group => wanted(KIND_OF.get(group.gemType)))) || move;
    }
    let phase = board.nextPhase(move);
    for (let cascade = false; phase.groups.length > 0; cascade = true) {
      const before = totalCharges(state);
      state = applyMatches(book, state, phase.groups.map(group => ({ kind: KIND_OF.get(group.gemType)!, size: group.cells.length, blast: group.blast })), cascade);
      income += Math.max(0, totalCharges(state) - before);
      phase = board.nextPhase();
    }
    if (!board.hasAnyValidMove()) board.shuffle();
    spend(state.status !== 'playing');
  }
  spend(true);
  // Guess: the one left, or (forced) any animal still standing.
  while (state.status !== 'solved' && state.status !== 'lost') {
    const left = standing(state);
    state = guess(book, state, left[Math.floor(rng() * left.length)]);
  }
  return { state, income };
}

async function main() {
  const rounds = Number(arg('rounds', '400'));
  const boardSize = Number(arg('board', '5'));
  const notesChance = Number(arg('notes-chance', '0.05'));
  const rules: Rules = {
    ...DEFAULT_RULES,
    moves: Number(arg('moves', String(DEFAULT_RULES.moves))),
    perMatch: arg('per-match', DEFAULT_RULES.perMatch.join(',')).split(',').map(Number) as Rules['perMatch'],
    offerUseless: process.argv.includes('--offer-useless'),
    autoAsk: !process.argv.includes('--no-auto-ask'),
    candidates: Number(arg('candidates', String(DEFAULT_RULES.candidates))),
    lookAlikes: process.argv.includes('--relatives') ? false : process.argv.includes('--look-alikes') || DEFAULT_RULES.lookAlikes,
    familyTree: {
      cost: arg('tree', DEFAULT_RULES.familyTree.cost) as FamilyTreeCost,
      match: Number(arg('tree-match', String(DEFAULT_RULES.familyTree.match))),
      charges: Number(arg('tree-charges', String(DEFAULT_RULES.familyTree.charges))),
    },
  };
  const dir = path.join(process.cwd(), 'db/content');
  const files = (await readdir(path.join(dir, 'animals'))).filter(file => file.endsWith('.json')).sort();
  const profiles = await Promise.all(files.map(async file => JSON.parse(await readFile(path.join(dir, 'animals', file), 'utf8')) as AnimalProfile));
  const registry = JSON.parse(await readFile(path.join(dir, 'sources.json'), 'utf8')) as ContentSource[];
  const animals = animalsFromProfiles(profiles, registry, text => console.warn(`warning: ${text}`));
  const book = makeBook(animals);

  const { cost, match, charges } = rules.familyTree;
  const treeText = cost === 'match' ? `a ${match}+ match` : cost === 'charges' ? `${charges} charges of any color` : 'one charge of each color';
  console.log(`Plan 041 balance, rules ${rules.version}: ${rounds} rounds per row, ${rules.candidates} ${rules.lookAlikes ? 'look-alike' : 'related'} animals, ${rules.moves} moves, ${boardSize}x${boardSize} board (5 colors + note gems at ${notesChance}), family tree step = ${treeText}.\n`);
  console.log('| Place | Player | Solved | First try | On a last chance | Narrowed to 1 before guessing | Questions asked | Charges earned | Field notes saved | Family tree steps (not free) | Avg points |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  const verdicts: string[] = [];
  for (const name of arg('places', 'africa,asia').split(',')) {
    // 'world': every animal, a stand-in for a bigger pool with more close relatives (11 frogs, 11 turtles).
    const place = name === 'world' ? null : name as ContinentKey;
    const pool = poolFor(animals, place);
    // Every player plays the same rounds on the same boards; only its own choices differ.
    const setupRng = mulberry32(41);
    const recent: number[] = [];
    const deals = Array.from({ length: rounds }, () => {
      const setup = { ...pickRound(book, pool, setupRng, { size: rules.candidates, recent, lookAlikes: rules.lookAlikes, place }), place };
      recent.push(setup.mysteryId);
      return { setup, boardSeed: Math.floor(setupRng() * 0xffff_ffff) };
    });
    const solvedBy: Partial<Record<Strategy, number>> = {};
    for (const strategy of STRATEGIES) {
      const rng = mulberry32(7);
      const board = new BoardModel(boardSize, boardSize);
      let solved = 0, firstTry = 0, lastChance = 0, narrowed = 0, points = 0, steps = 0, income = 0, notes = 0, asked = 0;
      for (const { setup, boardSeed } of deals) {
        board.newBoard(boardSeed, COLORS, { type: GEM_OF.notes, chance: notesChance });
        const { state, income: earned } = play(book, rules, board, setup, strategy, rng);
        const atGuess = standing(state).length + state.wrongGuesses.length;
        if (state.status === 'solved') {
          solved++;
          points += scoreSolve(state, 0).reduce((sum, part) => sum + part.points, 0);
          if (state.wrongGuesses.length === 0) firstTry++;
          if (state.log.some(entry => entry.kind === 'last-chance')) lastChance++;
        }
        if (atGuess === 1) narrowed++;
        income += earned;
        notes += state.notesCollected;
        asked += state.log.filter(entry => entry.kind === 'answer' && entry.answer !== 'no-record').length;
        steps += state.log.filter(entry => entry.kind === 'step' && !entry.free).length;
      }
      solvedBy[strategy] = (100 * solved) / rounds;
      const pct = (n: number) => `${Math.round((100 * n) / rounds)}%`;
      const per = (n: number) => (n / rounds).toFixed(1);
      console.log(`| ${name} (${pool.length}) | ${strategy} | ${pct(solved)} | ${pct(firstTry)} | ${pct(lastChance)} | ${pct(narrowed)} | ${per(asked)} | ${per(income)} | ${per(notes)} | ${per(steps)} | ${Math.round(points / rounds)} |`);
    }
    const f = (strategy: Strategy) => (solvedBy[strategy] ?? 0).toFixed(0);
    verdicts.push(`${name} (${pool.length}): solved careful ${f('careful')}%, careful questions with random swaps ${f('random swaps')}%, random ${f('random')}%, worst ${f('worst')}%, family tree first ${f('family tree first')}%`);
  }
  console.log(`\n${verdicts.join('\n')}`);
}

main().catch(error => { console.error(error); process.exit(1); });
