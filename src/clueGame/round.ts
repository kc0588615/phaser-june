// One round of Clue Match: a mystery species hidden in a pool of known
// candidates. Matching a gem color reveals the next clue in that color's
// category; deductive clues mark how each candidate's record compares.
import type { LootGemType } from '@/expedition/domain';
import { GEM_CATEGORIES } from '@/clueGame/categories';
import { evaluateClue, isDeductive, type ClueFit } from '@/clueGame/deduction';
import type { CluePool, PoolClue } from '@/clueGame/pool';
import type { SpeciesRecords } from '@/clueGame/traits';

export const CANDIDATES_PER_ROUND = 6;
/** A species can't be the mystery again until this many other rounds have passed. */
const MYSTERY_COOLDOWN = 8;

export interface QueuedNote {
  text: string;
  /** The source clue; null for species_facts notes, which never deduce. */
  clue: PoolClue | null;
}

export interface RoundState {
  round: number;
  mysteryId: number;
  candidateIds: number[];
  queues: Record<LootGemType, QueuedNote[]>;
  /** Player moves this round (cascades are free). */
  moves: number;
  /** Clues and notes shown per gem color this round. */
  revealedByGem: Partial<Record<LootGemType, number>>;
  /** Candidates contradicted by a clue or wrongly guessed. */
  ruledOut: number[];
  wrongGuesses: number[];
  /** Gems whose "no more notes" message was already shown. */
  exhausted: LootGemType[];
}

export type Reveal =
  | { kind: 'clue'; gem: LootGemType; text: string; fits: Record<number, ClueFit> }
  | { kind: 'note'; gem: LootGemType; text: string }
  | { kind: 'empty'; gem: LootGemType };

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQueues(pool: CluePool, mysteryId: number): Record<LootGemType, QueuedNote[]> {
  const clues = pool.clues.filter(clue => clue.speciesId === mysteryId);
  const facts = pool.facts.filter(fact => fact.speciesId === mysteryId);
  const queues = {} as Record<LootGemType, QueuedNote[]>;
  for (const category of GEM_CATEGORIES) {
    const ownClues = clues
      .filter(clue => category.clueCategories.includes(clue.category))
      .sort((a, b) => a.revealOrder - b.revealOrder
        || category.clueCategories.indexOf(a.category) - category.clueCategories.indexOf(b.category));
    const seen = new Set(ownClues.map(clue => clue.label.trim().toLowerCase()));
    const ownFacts = facts
      .filter(fact => category.factCategories.includes(fact.category) && !seen.has(fact.text.trim().toLowerCase()))
      .sort((a, b) => category.factCategories.indexOf(a.category) - category.factCategories.indexOf(b.category) || a.sortOrder - b.sortOrder);
    queues[category.gem] = [
      ...ownClues.map(clue => ({ text: clue.label, clue })),
      ...ownFacts.map(fact => ({ text: fact.text, clue: null })),
    ];
  }
  return queues;
}

/** Species that can be a mystery: they have at least one clue. */
export function playableSpeciesIds(pool: Pick<CluePool, 'clues'>): number[] {
  return [...new Set(pool.clues.map(clue => clue.speciesId))].sort((a, b) => a - b);
}

/** Pick a mystery (skipping recent ones) and fill the pool with decoys. */
export function createRound(pool: CluePool, rng: () => number, round: number, recentMysteryIds: readonly number[] = []): RoundState {
  const playable = playableSpeciesIds(pool);
  if (playable.length < 2) throw new Error('Clue pool needs at least two species with clues');
  const recent = new Set(recentMysteryIds.slice(-MYSTERY_COOLDOWN));
  const eligible = playable.filter(id => !recent.has(id));
  const choices = eligible.length > 0 ? eligible : playable;
  const mysteryId = choices[Math.floor(rng() * choices.length)];
  const decoys = shuffle(playable.filter(id => id !== mysteryId), rng).slice(0, CANDIDATES_PER_ROUND - 1);
  return {
    round,
    mysteryId,
    candidateIds: shuffle([mysteryId, ...decoys], rng),
    queues: buildQueues(pool, mysteryId),
    moves: 0,
    revealedByGem: {},
    ruledOut: [],
    wrongGuesses: [],
    exhausted: [],
  };
}

/** Reveal the next note for a matched gem color. Null once an empty category has already said so. */
export function revealNext(state: RoundState, gem: LootGemType, records: SpeciesRecords): { state: RoundState; reveal: Reveal | null } {
  const [note, ...rest] = state.queues[gem] ?? [];
  if (!note) {
    if (state.exhausted.includes(gem)) return { state, reveal: null };
    return { state: { ...state, exhausted: [...state.exhausted, gem] }, reveal: { kind: 'empty', gem } };
  }
  const next: RoundState = {
    ...state,
    queues: { ...state.queues, [gem]: rest },
    revealedByGem: { ...state.revealedByGem, [gem]: (state.revealedByGem[gem] ?? 0) + 1 },
  };
  if (!note.clue || !isDeductive(note.clue)) return { state: next, reveal: { kind: 'note', gem, text: note.text } };
  const fits = evaluateClue(note.clue, state.candidateIds, records);
  const contradicted = state.candidateIds.filter(id => fits[id] === 'contradicts' && !state.ruledOut.includes(id));
  return {
    state: { ...next, ruledOut: [...state.ruledOut, ...contradicted] },
    reveal: { kind: 'clue', gem, text: note.text, fits },
  };
}

export function liveCandidates(state: RoundState): number[] {
  return state.candidateIds.filter(id => !state.ruledOut.includes(id));
}

export function notesLeft(state: RoundState, gem: LootGemType): number {
  return state.queues[gem]?.length ?? 0;
}

export function registerWrongGuess(state: RoundState, speciesId: number): RoundState {
  return {
    ...state,
    wrongGuesses: [...state.wrongGuesses, speciesId],
    ruledOut: state.ruledOut.includes(speciesId) ? state.ruledOut : [...state.ruledOut, speciesId],
  };
}

export const WRONG_GUESS_PENALTY = 30;
export const FIRST_TRY_BONUS = 25;

export interface ScorePart { label: string; points: number }

/** Why a correct guess scores what it does: fewer moves score more; a first try and a streak add on top. */
export function scoreBreakdown({ moves, streak, firstTry }: { moves: number; streak: number; firstTry: boolean }): ScorePart[] {
  const parts: ScorePart[] = [
    { label: 'Solved', points: 50 },
    { label: moves === 1 ? 'Speed (1 move)' : `Speed (${moves} moves)`, points: Math.max(0, 10 - moves) * 10 },
  ];
  if (firstTry) parts.push({ label: 'First try', points: FIRST_TRY_BONUS });
  if (streak > 0) parts.push({ label: `Streak ×${streak}`, points: 10 * Math.min(streak, 10) });
  return parts.filter(part => part.points > 0);
}

export function correctGuessScore(input: { moves: number; streak: number; firstTry: boolean }): number {
  return scoreBreakdown(input).reduce((sum, part) => sum + part.points, 0);
}
