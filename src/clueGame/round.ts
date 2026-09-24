// One round of the clue-category game: a mystery species hidden in a pool of
// known candidates. Matching a gem color reveals the next clue in that color's
// category; deductive clues mark each candidate as fitting or not.
import type { LootGemType } from '@/expedition/domain';
import { GEM_CATEGORIES, gemCategory } from '@/clueGame/categories';
import { evaluateClue, isDeductive, type ClueFit, type TraitSets } from '@/clueGame/deduction';
import type { CluePool, PoolClue } from '@/clueGame/pool';

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
  /** Clues and notes shown this round. */
  revealed: number;
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

/** Pick a mystery (skipping recent ones) and fill the pool with decoys. */
export function createRound(pool: CluePool, rng: () => number, round: number, recentMysteryIds: readonly number[] = []): RoundState {
  const withClues = [...new Set(pool.clues.map(clue => clue.speciesId))];
  if (withClues.length < 2) throw new Error('Clue pool needs at least two species with clues');
  const recent = new Set(recentMysteryIds.slice(-MYSTERY_COOLDOWN));
  const eligible = withClues.filter(id => !recent.has(id));
  const choices = eligible.length > 0 ? eligible : withClues;
  const mysteryId = choices[Math.floor(rng() * choices.length)];
  const decoys = shuffle(withClues.filter(id => id !== mysteryId), rng).slice(0, CANDIDATES_PER_ROUND - 1);
  return {
    round,
    mysteryId,
    candidateIds: shuffle([mysteryId, ...decoys], rng),
    queues: buildQueues(pool, mysteryId),
    revealed: 0,
    ruledOut: [],
    wrongGuesses: [],
    exhausted: [],
  };
}

/** Reveal the next note for a matched gem color. Null once an empty category has already said so. */
export function revealNext(state: RoundState, gem: LootGemType, traits: TraitSets): { state: RoundState; reveal: Reveal | null } {
  const [note, ...rest] = state.queues[gem] ?? [];
  if (!note) {
    if (state.exhausted.includes(gem)) return { state, reveal: null };
    return { state: { ...state, exhausted: [...state.exhausted, gem] }, reveal: { kind: 'empty', gem } };
  }
  const next: RoundState = { ...state, queues: { ...state.queues, [gem]: rest }, revealed: state.revealed + 1 };
  if (!note.clue || !isDeductive(note.clue)) return { state: next, reveal: { kind: 'note', gem, text: note.text } };
  const fits = evaluateClue(note.clue, state.candidateIds, traits);
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

/**
 * Faster guesses score more: fewer notes read, and a bonus for guessing while
 * more than one candidate is still possible. Streaks add a little on top.
 */
export function correctGuessScore(revealed: number, liveCount: number, streak: number): number {
  const base = Math.max(20, 100 - 5 * revealed);
  const boldBonus = liveCount >= 2 ? 50 : 0;
  return base + boldBonus + 10 * streak;
}

export function gemLabel(gem: LootGemType): string {
  return gemCategory(gem).label;
}
