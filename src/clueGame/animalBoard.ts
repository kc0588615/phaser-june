// Plan 044 rules: the animal board. Five suspects sit pinned on the board; four clue
// orders, filled by collecting their gems, answer yes/no questions about the
// mystery; witness gems show its hand-written clues; the player marks suspects
// "ruled out", and a marked suspect is released when a gem next to it is cleared.
// Release every look-alike and the last one is found; release the mystery and it
// escapes. Pure: no DOM, no Phaser, no randomness except the rng passed in. Shared
// by the balance bot (scripts/balance-044.ts) and, later, the game.
import type { Cell, ExplodePhase } from '@/game/BoardModel';
import type { GemType } from '@/game/constants';
import {
  FAMILY_TREE_RANKS, PREFIX_CATEGORY, likeness, prefixOf, questionText, shortQuestionText,
  type Animal, type Book, type FieldNote,
} from '@/clueGame/questionMatch';
import { clueFace } from '@/clueGame/clueFaces';
import { REGIONS, type ContinentKey } from '@/clueGame/regions';
import { hash32 } from '@/lib/seededRng';

export interface AnimalRules {
  /** Saved with every round (clue_match_solves.rules_version). */
  version: string;
  suspects: number;
  clues: number;
  moves: number;
  /** Gems of its picture a clue order needs before its answer shows. */
  orderSize: number;
  /** Chance a new gem is a witness gem. */
  witnessChance: number;
  /** Moves left at the find for ★★ and for ★★★. */
  starMoves: [two: number, three: number];
  hearts: number;
  trailRounds: number;
  points: { star: number; moveLeft: number; streakStep: number; streakMax: number };
}

/**
 * Tuned by the balance bot (plan 044, Part 1): orders of 24 gems and 30 moves make long rounds (a careful player uses
 * about 16-19 moves) where aiming matters (careful finds 94-97%, a player who reasons as well but moves at random
 * 68-78%). Star lines from careful's moves left at the find.
 */
export const ANIMAL_RULES: AnimalRules = {
  version: '044-0', suspects: 5, clues: 4, moves: 30, orderSize: 24, witnessChance: 0.03, starMoves: [6, 13], hearts: 3, trailRounds: 5,
  points: { star: 50, moveLeft: 10, streakStep: 10, streakMax: 100 },
};

/** The board's gems: one per clue order (the 043 shapes), the pebble that asks nothing, and the rare witness gem. */
export const CLUE_GEMS: readonly GemType[] = ['orange', 'yellow', 'green', 'blue'];
export const PEBBLE_GEM: GemType = 'black';
export const WITNESS_GEM: GemType = 'purple';
export const BOARD_GEMS: readonly GemType[] = [...CLUE_GEMS, PEBBLE_GEM];

const QUESTION_PREFIXES = Object.keys(PREFIX_CATEGORY);

function animal(book: Book, id: number): Animal {
  const found = book.byId.get(id);
  if (!found) throw new Error(`No animal ${id}`);
  return found;
}

// ---- Suspects and clues ----

/** A yes/no question every suspect in a set has a record for, with each suspect's answer (in the set's order). */
export interface Clue { tag: string; question: string; short: string; row: boolean[] }

/**
 * The questions a set can be asked: every suspect has a record for the trait and the answers aren't all alike. One
 * question per way of splitting the set (a question and its opposite split it the same way); Range stays inside the
 * place, as in the 041 game.
 */
export function fullTable(book: Book, set: readonly number[], place: ContinentKey | null): Clue[] {
  const tags = new Set<string>();
  for (const id of set) for (const [prefix, values] of book.traits.get(id)!) if (PREFIX_CATEGORY[prefix]) for (const tag of values) tags.add(tag);
  const ordered = [...tags]
    .filter(tag => !(prefixOf(tag) === 'region' && place && REGIONS[tag.slice(7)]?.continent !== place))
    .sort((a, b) => QUESTION_PREFIXES.indexOf(prefixOf(a)) - QUESTION_PREFIXES.indexOf(prefixOf(b)) || a.localeCompare(b));
  const splits = new Set<string>();
  const clues: Clue[] = [];
  for (const tag of ordered) {
    const records = set.map(id => book.traits.get(id)!.get(prefixOf(tag)));
    if (records.some(record => !record)) continue;
    const row = records.map(record => record!.has(tag));
    if (row.every(answer => answer === row[0])) continue;
    const split = row.map(answer => (answer === row[0] ? 0 : 1)).join('');
    if (splits.has(split)) continue;
    splits.add(split);
    clues.push({ tag, question: questionText(tag), short: shortQuestionText(tag), row });
  }
  return clues;
}

/** Whether these clues give every suspect a different row of answers. */
export function tellsApart(clues: readonly Clue[], suspects: number): boolean {
  return new Set(Array.from({ length: suspects }, (_unused, i) => clues.map(clue => (clue.row[i] ? 1 : 0)).join(''))).size === suspects;
}

function* combinations<T>(items: readonly T[], size: number, start = 0, picked: T[] = []): Generator<T[]> {
  if (picked.length === size) { yield [...picked]; return; }
  for (let i = start; i <= items.length - (size - picked.length); i++) yield* combinations(items, size, i + 1, [...picked, items[i]]);
}

/**
 * The clue deck: `count` questions that tell every suspect apart, chosen from the set alone (its sorted ids), so the
 * deck never depends on which suspect is the mystery. Prefers a mix of a strong clue (splits 2 against 3) and a weak
 * one (1 against 4), then the most categories; ties break on a hash of the set. No two clues show the same picture
 * on the board (clueFace), or their gems couldn't be told apart. Null when no such deck exists.
 */
export function dealClues(book: Book, set: readonly number[], place: ContinentKey | null, count: number): Clue[] | null {
  const sorted = [...set].sort((a, b) => a - b);
  const table = fullTable(book, sorted, place);
  if (table.length < count) return null;
  const salt = sorted.join(',');
  let best: { clues: Clue[]; score: number; tie: number } | null = null;
  for (const deck of combinations(table, count)) {
    if (!tellsApart(deck, sorted.length) || new Set(deck.map(clue => clueFace(clue.tag))).size < deck.length) continue;
    const smaller = deck.map(clue => { const yes = clue.row.filter(Boolean).length; return Math.min(yes, sorted.length - yes); });
    const score = (smaller.some(n => n >= 2) ? 4 : 0) + (smaller.some(n => n === 1) ? 4 : 0) + new Set(deck.map(clue => PREFIX_CATEGORY[prefixOf(clue.tag)])).size;
    const tie = hash32(`${salt}:${deck.map(clue => clue.tag).join('|')}`);
    if (!best || score > best.score || (score === best.score && tie < best.tie)) best = { clues: deck, score, tie };
  }
  return best?.clues ?? null;
}

/**
 * A round's suspects (sorted ids): the seed animal and its closest look-alikes from the pool (relatives first, then the
 * most shared traits). A look-alike that no full yes/no question could tell from the others is skipped for the next
 * one (the two long-beaked echidnas, two poison frogs). Null when the seed can't make a set with a clue deck.
 */
export function pickSuspectSet(book: Book, pool: readonly number[], seedId: number, rules: AnimalRules, place: ContinentKey | null): number[] | null {
  const tree = animal(book, seedId).familyTree;
  const closeness = (id: number) => FAMILY_TREE_RANKS.filter(rank => animal(book, id).familyTree[rank].latin === tree[rank].latin).length;
  const order = pool.filter(id => id !== seedId)
    .sort((a, b) => closeness(b) - closeness(a) || likeness(book, seedId, b) - likeness(book, seedId, a) || a - b);
  const set = [seedId];
  for (const id of order) {
    if (set.length === rules.suspects) break;
    if (tellsApart(fullTable(book, [...set, id], place), set.length + 1)) set.push(id);
  }
  if (set.length < rules.suspects || !dealClues(book, set, place, rules.clues)) return null;
  return set.sort((a, b) => a - b);
}

/** A hand-written clue about the mystery, with how many suspects' field guides record the same thing. */
export interface WitnessNote extends FieldNote { fits: number }

/**
 * The mystery's witness notes: its hand-written clues whose tags fit 2 or more suspects but not all of them. A note
 * fitting only the mystery would solve the round; one without tags says nothing a field guide can check. A suspect
 * fits when its field guide records every tag of the note (an untagged trait counts as not recorded).
 */
export function witnessNotes(book: Book, suspects: readonly number[], mysteryId: number): WitnessNote[] {
  return animal(book, mysteryId).notes.flatMap(note => {
    if (!note.tags?.length) return [];
    const fits = suspects.filter(id => note.tags!.every(tag => animal(book, id).tags?.includes(tag))).length;
    return fits >= 2 && fits < suspects.length ? [{ ...note, fits }] : [];
  });
}

/**
 * Where the tiles go: at least 3 apart (counting steps up, down, left and right, so no cell touches two tiles) and
 * never in a corner. Null if the board is too small for that.
 */
export function tileCells(width: number, height: number, count: number, rng: () => number): Cell[] | null {
  const corner = ([x, y]: Cell) => (x === 0 || x === width - 1) && (y === 0 || y === height - 1);
  for (let attempt = 0; attempt < 100; attempt++) {
    const cells: Cell[] = [];
    for (let tries = 0; cells.length < count && tries < 200; tries++) {
      const cell: Cell = [Math.floor(rng() * width), Math.floor(rng() * height)];
      if (!corner(cell) && cells.every(([x, y]) => Math.abs(x - cell[0]) + Math.abs(y - cell[1]) >= 3)) cells.push(cell);
    }
    if (cells.length === count) return cells;
  }
  return null;
}

// ---- A round ----

/** 'out-of-moves': the moves ran out with look-alikes left; the player may name the animal (journal only), then it's lost. */
export type AnimalStatus = 'playing' | 'out-of-moves' | 'found' | 'lost';

export interface ClueOrder extends Clue { gem: GemType; have: number; answer: 'yes' | 'no' | null }

export type AnimalLogEntry =
  | { kind: 'answer'; tag: string; question: string; answer: 'yes' | 'no' }
  | { kind: 'note'; note: WitnessNote }
  | { kind: 'released'; id: number }
  | { kind: 'escaped'; id: number }
  | { kind: 'found'; id: number }
  | { kind: 'out-of-moves' }
  | { kind: 'named'; id: number; correct: boolean };

export interface AnimalRound {
  rules: AnimalRules;
  place: ContinentKey | null;
  /** Sorted ids; each clue's row is in this order. */
  suspects: number[];
  mysteryId: number;
  orders: ClueOrder[];
  /** Witness notes still to come, in profile order, and the ones collected. */
  notesLeft: WitnessNote[];
  notes: WitnessNote[];
  marked: number[];
  released: number[];
  movesLeft: number;
  movesUsed: number;
  status: AnimalStatus;
  lostBy: 'escaped' | 'out-of-moves' | null;
  /** The name given when moves ran out (journal only). */
  named: { id: number; correct: boolean } | null;
  log: AnimalLogEntry[];
}

export function newAnimalRound(book: Book, rules: AnimalRules, { suspects, mysteryId, place }: { suspects: readonly number[]; mysteryId: number; place: ContinentKey | null }): AnimalRound {
  const sorted = [...suspects].sort((a, b) => a - b);
  if (!sorted.includes(mysteryId)) throw new Error('The mystery must be a suspect');
  const deck = dealClues(book, sorted, place, rules.clues);
  if (!deck) throw new Error('No clue deck for these suspects');
  return {
    rules, place, suspects: sorted, mysteryId,
    orders: deck.map((clue, i) => ({ ...clue, gem: CLUE_GEMS[i], have: 0, answer: null })),
    notesLeft: witnessNotes(book, sorted, mysteryId), notes: [],
    marked: [], released: [], movesLeft: rules.moves, movesUsed: 0, status: 'playing', lostBy: null, named: null, log: [],
  };
}

/** What one explode phase of the board did, for the rules. */
export interface PhaseReport { collected: Partial<Record<GemType, number>>; witness: number; touched: readonly number[] }

/** A board phase as the rules see it: gems cleared by color (runs and toys' clears alike), witness gems, tiles touched. */
export function reportOf(phase: ExplodePhase): PhaseReport {
  const collected: Partial<Record<GemType, number>> = {};
  let witness = 0;
  for (const group of phase.groups) {
    if (group.gemType === WITNESS_GEM) witness += group.cells.length;
    else collected[group.gemType] = (collected[group.gemType] ?? 0) + group.cells.length;
  }
  return { collected, witness, touched: phase.touched };
}

/**
 * One explode phase: the move's own clear (cascade false, uses a move) or a cascade. Collected gems fill their orders
 * (a full order stamps its answer), witness gems show the next notes, and marked tiles touched are released. If the
 * mystery is among them it escapes and the round is lost, even when the same clear released every look-alike.
 */
export function applyPhase(book: Book, state: AnimalRound, report: PhaseReport, cascade: boolean): AnimalRound {
  if (state.status !== 'playing') return state;
  const log = [...state.log];
  const mysteryTraits = book.traits.get(state.mysteryId)!;
  const orders = state.orders.map(order => {
    if (order.answer) return order;
    const have = Math.min(state.rules.orderSize, order.have + (report.collected[order.gem] ?? 0));
    if (have < state.rules.orderSize) return { ...order, have };
    const answer = mysteryTraits.get(prefixOf(order.tag))!.has(order.tag) ? 'yes' as const : 'no' as const;
    log.push({ kind: 'answer', tag: order.tag, question: order.question, answer });
    return { ...order, have, answer };
  });
  const notesLeft = [...state.notesLeft];
  const notes = [...state.notes];
  for (let i = 0; i < report.witness && notesLeft.length > 0; i++) {
    const note = notesLeft.shift()!;
    notes.push(note);
    log.push({ kind: 'note', note });
  }
  const newly = report.touched.filter(id => state.marked.includes(id) && !state.released.includes(id));
  const released = [...state.released, ...newly];
  let status: AnimalStatus = state.status;
  let lostBy = state.lostBy;
  if (newly.includes(state.mysteryId)) {
    status = 'lost';
    lostBy = 'escaped';
    log.push({ kind: 'escaped', id: state.mysteryId });
  } else {
    for (const id of newly) log.push({ kind: 'released', id });
    if (released.length === state.suspects.length - 1) {
      status = 'found';
      log.push({ kind: 'found', id: state.mysteryId });
    }
  }
  const used = cascade ? 0 : 1;
  return { ...state, orders, notesLeft, notes, released, status, lostBy, movesLeft: state.movesLeft - used, movesUsed: state.movesUsed + used, log };
}

/** After a move and its cascades have settled: out of moves with look-alikes left, the round waits for a name. */
export function endOfMove(state: AnimalRound): AnimalRound {
  if (state.status !== 'playing' || state.movesLeft > 0) return state;
  return { ...state, status: 'out-of-moves', log: [...state.log, { kind: 'out-of-moves' }] };
}

/** Mark a suspect "ruled out" (or clear the mark). Only marked suspects can be released. */
export function mark(state: AnimalRound, id: number, ruledOut: boolean): AnimalRound {
  if (state.status !== 'playing' || !state.suspects.includes(id) || state.released.includes(id)) return state;
  const marked = state.marked.filter(other => other !== id);
  return { ...state, marked: ruledOut ? [...marked, id] : marked };
}

/** Out of moves: name an animal still on the board. A right name goes in the journal; the round is lost either way. */
export function nameAtTimeout(state: AnimalRound, id: number | null): AnimalRound {
  if (state.status !== 'out-of-moves') return state;
  const named = id !== null && state.suspects.includes(id) && !state.released.includes(id) ? { id, correct: id === state.mysteryId } : null;
  return { ...state, status: 'lost', lostBy: 'out-of-moves', named, log: named ? [...state.log, { kind: 'named', ...named }] : state.log };
}

/**
 * The suspects the answers and notes so far leave possible, released ones aside. A reasoning aid for the bot and the
 * tests only: showing it to players would do their reasoning for them.
 */
export function stillPossible(book: Book, state: AnimalRound): number[] {
  return state.suspects.filter((id, i) => !state.released.includes(id)
    && state.orders.every(order => order.answer === null || order.row[i] === (order.answer === 'yes'))
    && state.notes.every(note => note.tags!.every(tag => animal(book, id).tags?.includes(tag))));
}

export function starsFor(state: AnimalRound): number {
  if (state.status !== 'found') return 0;
  const [two, three] = state.rules.starMoves;
  return 1 + (state.movesLeft >= two ? 1 : 0) + (state.movesLeft >= three ? 1 : 0);
}

/** Points for a found round; `streak` is the finds in a row before this one. */
export function scoreRound(state: AnimalRound, streak: number): number {
  const p = state.rules.points;
  if (state.status !== 'found') return 0;
  return starsFor(state) * p.star + state.movesLeft * p.moveLeft + Math.min(p.streakMax, streak * p.streakStep);
}

// ---- The trail ----

export interface Trail { rounds: number; hearts: number; finds: number; over: boolean }

export const newTrail = (rules: AnimalRules): Trail => ({ rounds: 0, hearts: rules.hearts, finds: 0, over: false });

/** A finished round on the trail: a find, or a lost heart. The trail ends after its last round or its last heart. */
export function trailAfter(rules: AnimalRules, trail: Trail, round: AnimalRound): Trail {
  const found = round.status === 'found';
  const next = { ...trail, rounds: trail.rounds + 1, finds: trail.finds + (found ? 1 : 0), hearts: trail.hearts - (found ? 0 : 1) };
  return { ...next, over: next.hearts <= 0 || next.rounds >= rules.trailRounds };
}

/** Every round of the trail played with a heart left. */
export const trailFinished = (rules: AnimalRules, trail: Trail): boolean => trail.rounds >= rules.trailRounds && trail.hearts > 0;
