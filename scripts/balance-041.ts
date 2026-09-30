// Balance bot for plans 041 and 043: plays seeded Question Match rounds with the real
// rules (src/clueGame/questionMatch.ts) on the real board (src/game/BoardModel.ts)
// and prints how each kind of player does. Every player gets the same rounds and
// boards; same arguments, same numbers. Default: today's rules (043, a match asks its
// color's lead question); `--rules 041-5 --board 5` plays the charges game.
//   node scripts/run-typescript.mjs scripts/balance-041.ts [--rules 041-5] [--rounds 400] [--moves 6] [--board 7] [--candidates 12]
//     [--tree one-of-each|charges|match] [--tree-charges 8] [--tree-match 4] [--notes-chance 0.05] [--per-match 1,2,3]
//     [--places africa,asia,world] [--offer-useless] [--no-auto-ask] [--look-alikes | --relatives]
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AnimalProfile, ContentSource } from '../src/clueGame/profiles';
import { animalsFromProfiles } from '../src/clueGame/questionMatchContent';
import {
  CHARGE_CATEGORIES, DEFAULT_RULES, FAMILY_TREE_RANKS, RULES_041, applyMatches, ask, buyFamilyTreeStep, canAsk, chargesEarned, familyTreeQuote, guess, leadQuestions,
  makeBook, newRound, pickRound, poolFor, questionsFor, scoreSolve, splitOf, standing,
  type Book, type ChargeCategory, type FamilyTreeCost, type GemKind, type MatchedGroup, type Question, type Rules,
} from '../src/clueGame/questionMatch';
import type { ContinentKey } from '../src/clueGame/regions';
import { BoardModel, neighborSwaps, type Cell, type ExplodePhase, type Move, type Special } from '../src/game/BoardModel';
import { GRID_COLS, type GemType } from '../src/game/constants';
import { mulberry32 } from '../src/lib/seededRng';

const GEM_OF: Record<GemKind, GemType> = { body: 'orange', habits: 'yellow', habitat: 'green', range: 'blue', life: 'black', notes: 'purple' };
const KIND_OF = new Map(Object.entries(GEM_OF).map(([kind, gem]) => [gem, kind as GemKind]));
const COLORS = CHARGE_CATEGORIES.map(c => GEM_OF[c]);

// 'random swaps': careful questions with random swaps, to show what the board part of the skill is worth.
type Strategy = 'careful' | 'random swaps' | 'random' | 'worst' | 'family tree first';
// Rules 043 have no question to choose, so only the swap differs: careful reads the legend, worst matches what the legend says is useless.
const strategiesFor = (rules: Rules): Strategy[] => (rules.askOnMatch ? ['careful', 'random', 'worst'] : ['careful', 'random swaps', 'random', 'worst', 'family tree first']);

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? process.argv[at + 1] : fallback;
}

const split = (q: Question) => Math.min(q.has, q.lacks);
const groupsOf = (phase: ExplodePhase): MatchedGroup[] => phase.groups.map(group => ({ kind: KIND_OF.get(group.gemType)!, size: group.cells.length, ...(group.blast ? { blast: true } : {}) }));
const toysOf = (board: BoardModel): Array<[Cell, Special]> => board.getToys().flatMap((column, x) => column.flatMap((toy, y): Array<[Cell, Special]> => (toy ? [[[x, y], toy]] : [])));

/**
 * Play one round; returns the final state and the charges earned (before any are spent). `scratch`: a board with the
 * same colors, to try a move on without making it (a toy's or a color gem's clear shows only when it's played).
 */
function play(book: Book, rules: Rules, board: BoardModel, scratch: BoardModel, setup: Parameters<typeof newRound>[2], strategy: Strategy, rng: () => number) {
  let state = newRound(book, rules, setup);
  let income = 0;
  const treeFirst = strategy === 'family tree first';
  const goodQuestions = strategy === 'careful' || strategy === 'random swaps' || treeFirst;
  const spend = (final: boolean) => {
    for (;;) {
      if (standing(state).length <= 1) return;
      // The family tree: always first for its fan; for everyone else, only with charges no question can use.
      const affordable = Object.values(questionsFor(book, state)).flat().filter(q => canAsk(state, q.category));
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
    if (rules.askOnMatch && strategy !== 'random') {
      // What the legend shows: each color's lead question and the animals it's sure to cross out ("?" when some have
      // no record, read as less sure). A run reaching the family tree size also reveals a step while one is left
      // (worth about 3 animals). Each move is tried on the scratch board: its first clear, runs and toys alike.
      const leads = leadQuestions(book, state);
      const left = standing(state).length;
      const treeOpen = rules.familyTree.cost === 'match' && state.familyTreeSteps < FAMILY_TREE_RANKS.length;
      const grid = board.getGrid();
      const toys = toysOf(board);
      const worth = (m: Move) => {
        scratch.loadBoard(grid, toys);
        const groups = groupsOf(scratch.nextPhase(m));
        const earned = chargesEarned(rules, groups);
        let value = treeOpen && groups.some(group => !group.blast && group.kind !== 'notes' && group.size >= rules.familyTree.match) ? 3 : 0;
        for (const category of CHARGE_CATEGORIES) {
          const lead = leads[category];
          if (!lead || earned[category] === 0) continue;
          value += splitOf(lead) * ((left - lead.unknown) / left) * Math.min(2, (state.charges[category] + earned[category]) / rules.questionCost);
        }
        return value;
      };
      const sign = strategy === 'worst' ? -1 : 1;
      move = valid.reduce((best, m) => (sign * worth(m) > sign * worth(best) ? m : best), move);
    } else if (strategy === 'careful' || treeFirst) {
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
      const groups = groupsOf(phase);
      income += Object.values(chargesEarned(rules, groups)).reduce((sum, n) => sum + n, 0);
      state = applyMatches(book, state, groups, cascade);
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
  const boardSize = Number(arg('board', String(GRID_COLS)));
  const notesChance = Number(arg('notes-chance', '0.05'));
  const base = arg('rules', DEFAULT_RULES.version) === RULES_041.version ? RULES_041 : DEFAULT_RULES;
  const rules: Rules = {
    ...base,
    moves: Number(arg('moves', String(base.moves))),
    perMatch: arg('per-match', base.perMatch.join(',')).split(',').map(Number) as Rules['perMatch'],
    offerUseless: process.argv.includes('--offer-useless'),
    autoAsk: !process.argv.includes('--no-auto-ask'),
    candidates: Number(arg('candidates', String(base.candidates))),
    lead: arg('lead', base.lead) as Rules['lead'],
    questionCost: Number(arg('cost', String(base.questionCost))),
    lookAlikes: process.argv.includes('--relatives') ? false : process.argv.includes('--look-alikes') || base.lookAlikes,
    familyTree: {
      cost: arg('tree', base.familyTree.cost) as FamilyTreeCost,
      match: Number(arg('tree-match', String(base.familyTree.match))),
      charges: Number(arg('tree-charges', String(base.familyTree.charges))),
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
  console.log(`Balance, rules ${rules.version}${rules.askOnMatch ? ` (a match asks its color's lead question, ${rules.lead}, ${rules.questionCost} charge${rules.questionCost === 1 ? '' : 's'} a question)` : ''}: ${rounds} rounds per row, ${rules.candidates} ${rules.lookAlikes ? 'look-alike' : 'related'} animals, ${rules.moves} moves, ${boardSize}x${boardSize} board (5 colors + note gems at ${notesChance}), family tree step = ${treeText}.\n`);
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
    for (const strategy of strategiesFor(rules)) {
      const rng = mulberry32(7);
      const board = new BoardModel(boardSize, boardSize);
      const scratch = new BoardModel(boardSize, boardSize);
      scratch.newBoard(1, COLORS, { type: GEM_OF.notes, chance: notesChance }); // its colors and note gem; the grid is loaded per try
      let solved = 0, firstTry = 0, lastChance = 0, narrowed = 0, points = 0, steps = 0, income = 0, notes = 0, asked = 0;
      for (const { setup, boardSeed } of deals) {
        board.newBoard(boardSeed, COLORS, { type: GEM_OF.notes, chance: notesChance });
        const { state, income: earned } = play(book, rules, board, scratch, setup, strategy, rng);
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
    verdicts.push(`${name} (${pool.length}): solved ${strategiesFor(rules).map(strategy => `${strategy} ${f(strategy)}%`).join(', ')}`);
  }
  console.log(`\n${verdicts.join('\n')}`);
}

main().catch(error => { console.error(error); process.exit(1); });
