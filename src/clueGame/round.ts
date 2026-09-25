// One round of Clue Match: a mystery species hidden among look-alike
// candidates. Matching a gem color reveals the next clue in that color's
// category, broadest first, so the answer shows itself slowly; deductive clues
// mark how each candidate's record compares.
import type { GemType } from '@/game/constants';
import { GEM_CATEGORIES } from '@/clueGame/categories';
import { evaluateClue, fitClue, isDeductive, type ClueFit } from '@/clueGame/deduction';
import { isPlaceholderText, type CluePool, type PoolClue } from '@/clueGame/pool';
import { allTraits, buildSpeciesRecords, type SpeciesRecords } from '@/clueGame/traits';
import { shuffled } from '@/lib/seededRng';

const CANDIDATES_PER_ROUND = 6;
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
  /** Decoys picked for sharing the mystery's traits (the difficulty ramp). */
  relatives: number;
  /** Where the mysteries come from now, when it changed (e.g. "Africa" after a place's animals are all found). */
  scope?: string;
  queues: Record<GemType, QueuedNote[]>;
  /** Player moves this round (cascades are free). */
  moves: number;
  /** Clues and notes shown per gem color this round. */
  revealedByGem: Partial<Record<GemType, number>>;
  /** Candidates contradicted by a clue or wrongly guessed. */
  ruledOut: number[];
  wrongGuesses: number[];
  /** Gems whose "no more notes" message was already shown. */
  exhausted: GemType[];
}

export type Reveal =
  | { kind: 'clue'; gem: GemType; text: string; fits: Record<number, ClueFit> }
  | { kind: 'note'; gem: GemType; text: string }
  | { kind: 'empty'; gem: GemType };

/** Lead-ins for fact categories whose text is a bare list ("Ants; termites"). */
const FACT_LEAD: Partial<Record<string, string>> = { threat: 'Threats', diet_prey: 'Eats', diet_flora: 'Plants it eats' };

const comparable = (text: string) => text.trim().toLowerCase().replace(/\.$/, '');

/**
 * Each color's queue: deductive clues that fit the most candidates first (they
 * narrow the least), then notes, then facts.
 */
function buildQueues(pool: CluePool, mysteryId: number, candidateIds: readonly number[], records: SpeciesRecords): Record<GemType, QueuedNote[]> {
  const clues = pool.clues.filter(clue => clue.speciesId === mysteryId);
  const facts = pool.facts.filter(fact => fact.speciesId === mysteryId && !isPlaceholderText(fact.text));
  const breadth = new Map(clues.map(clue => [clue, isDeductive(clue) ? candidateIds.filter(id => fitClue(clue, id, records) === 'fits').length : -1]));
  const queues = {} as Record<GemType, QueuedNote[]>;
  for (const category of GEM_CATEGORIES) {
    const ownClues = clues
      .filter(clue => category.clueCategories.includes(clue.category))
      .sort((a, b) => breadth.get(b)! - breadth.get(a)! || a.revealOrder - b.revealOrder
        || category.clueCategories.indexOf(a.category) - category.clueCategories.indexOf(b.category));
    // Skip facts a clue already says, even inside a longer label ("Preys on: <fact>").
    const said = ownClues.map(clue => comparable(clue.label));
    const ownFacts = facts
      .filter(fact => category.factCategories.includes(fact.category) && !said.some(label => label.includes(comparable(fact.text))))
      .sort((a, b) => category.factCategories.indexOf(a.category) - category.factCategories.indexOf(b.category) || a.sortOrder - b.sortOrder);
    queues[category.gem] = [
      ...ownClues.filter(isDeductive).map(clue => ({ text: clue.label, clue })),
      ...ownClues.filter(clue => !isDeductive(clue)).map(clue => ({ text: clue.label, clue })),
      ...ownFacts.map(fact => ({ text: FACT_LEAD[fact.category] ? `${FACT_LEAD[fact.category]}: ${fact.text}` : fact.text, clue: null })),
    ];
  }
  return queues;
}

/** Species that can be a mystery: they have at least one clue. */
export function playableSpeciesIds(pool: Pick<CluePool, 'clues'>): number[] {
  return [...new Set(pool.clues.map(clue => clue.speciesId))].sort((a, b) => a - b);
}

/** How many decoys share the mystery's traits: one at first, up to four from round 7. */
export function lookalikesForRound(round: number): number {
  return Math.min(4, Math.ceil(round / 2));
}

const recordsCache = new WeakMap<CluePool, SpeciesRecords>();
function recordsFor(pool: CluePool): SpeciesRecords {
  let records = recordsCache.get(pool);
  if (!records) recordsCache.set(pool, records = buildSpeciesRecords(pool));
  return records;
}

/**
 * How much two species look alike: the traits they share, rare ones counting
 * most (sharing dry savanna says more than both living on land).
 */
function similarity(pool: CluePool, records: SpeciesRecords): (a: number, b: number) => number {
  const traits = new Map([...records].map(([id, record]) => [id, allTraits(record)]));
  const count = new Map<string, number>();
  for (const tags of traits.values()) for (const tag of tags) count.set(tag, (count.get(tag) ?? 0) + 1);
  const weight = (tag: string) => Math.log((pool.species.length + 1) / (count.get(tag) ?? 1));
  return (a, b) => [...(traits.get(a) ?? [])].filter(tag => traits.get(b)?.has(tag)).reduce((sum, tag) => sum + weight(tag), 0);
}

export interface RoundOptions {
  /** Mysteries of recent rounds, oldest first; they aren't repeated for a while. */
  recent?: readonly number[];
  /** Only these species can be the mystery (a place's animals); decoys still come from the whole pool. */
  mysteryIds?: readonly number[];
  /** Shown on the round's divider when the mysteries' source changes. */
  scope?: string;
}

/**
 * Pick a mystery (skipping recent ones) and five decoys: some are look-alikes
 * that share its traits (more each round), the rest random, so no single
 * clue gives the answer away.
 */
export function createRound(pool: CluePool, rng: () => number, round: number, { recent = [], mysteryIds, scope }: RoundOptions = {}): RoundState {
  const playable = playableSpeciesIds(pool);
  if (playable.length < 2) throw new Error('Clue pool needs at least two species with clues');
  const inScope = mysteryIds ? playable.filter(id => mysteryIds.includes(id)) : [];
  const candidates = inScope.length > 0 ? inScope : playable;
  // A small place repeats sooner: the cooldown never covers all its animals.
  const cooldown = new Set(recent.slice(-Math.min(MYSTERY_COOLDOWN, candidates.length - 1)));
  const eligible = candidates.filter(id => !cooldown.has(id));
  const choices = eligible.length > 0 ? eligible : candidates;
  const mysteryId = choices[Math.floor(rng() * choices.length)];

  const records = recordsFor(pool);
  const alike = similarity(pool, records);
  const others = shuffled(playable.filter(id => id !== mysteryId), rng); // random order breaks ties
  const wanted = Math.min(lookalikesForRound(round), CANDIDATES_PER_ROUND - 1);
  // Draw the look-alikes from a few more of the closest, so rounds vary.
  const closest = [...others].sort((a, b) => alike(mysteryId, b) - alike(mysteryId, a)).slice(0, wanted + 2);
  const lookalikes = shuffled(closest, rng).slice(0, wanted);
  const decoys = [...lookalikes, ...others.filter(id => !lookalikes.includes(id))].slice(0, CANDIDATES_PER_ROUND - 1);
  const candidateIds = shuffled([mysteryId, ...decoys], rng);
  return {
    round,
    mysteryId,
    relatives: lookalikes.length,
    ...(scope ? { scope } : {}),
    candidateIds,
    queues: buildQueues(pool, mysteryId, candidateIds, records),
    moves: 0,
    revealedByGem: {},
    ruledOut: [],
    wrongGuesses: [],
    exhausted: [],
  };
}

/** Reveal the next note for a matched gem color. Null once an empty category has already said so. */
export function revealNext(state: RoundState, gem: GemType, records: SpeciesRecords): { state: RoundState; reveal: Reveal | null } {
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

export function registerWrongGuess(state: RoundState, speciesId: number): RoundState {
  return {
    ...state,
    wrongGuesses: [...state.wrongGuesses, speciesId],
    ruledOut: state.ruledOut.includes(speciesId) ? state.ruledOut : [...state.ruledOut, speciesId],
  };
}

/** Clues a matched group reveals: one, plus one per gem past three (at most three). */
export function cluesForMatch(size: number): number {
  return 1 + Math.min(2, Math.max(0, size - 3));
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
