// Question Match rules (plan 041): matches earn charges, charges buy yes/no
// questions and (one of each color) family tree steps, rare note gems collected
// next to matches save field notes for a last chance, and the player names the
// mystery animal within a move budget. Rules 043 (plan 043, `askOnMatch`): a match
// asks its color's lead question at once instead. Pure: no DOM, no Phaser, no randomness except
// the rng passed in. Shared by the game, the balance bot (scripts/balance-041.ts) and
// the prototype (PROTOTYPE-041-question-match.html).
import type { ContinentKey } from '@/clueGame/regions';
import { REGIONS } from '@/clueGame/regions';
import { hash32 } from '@/lib/seededRng';

export const CHARGE_CATEGORIES = ['body', 'habits', 'habitat', 'range', 'life'] as const;
export type ChargeCategory = typeof CHARGE_CATEGORIES[number];
/** What a gem color gives: charges of a category, or field notes. */
export type GemKind = ChargeCategory | 'notes';
export const GEM_KINDS: readonly GemKind[] = [...CHARGE_CATEGORIES, 'notes'];

export const CATEGORY_LABELS: Record<GemKind, string> = {
  body: 'Body', habits: 'Habits', habitat: 'Habitat', range: 'Range', life: 'Life cycle', notes: 'Field notes',
};

/** Which category asks about each trait prefix. */
export const PREFIX_CATEGORY: Record<string, ChargeCategory> = {
  size: 'body', covering: 'body',
  diet: 'habits', activity: 'habits', social: 'habits',
  system: 'habitat', habitat: 'habitat',
  region: 'range',
  birth: 'life', young: 'life', lifespan: 'life',
};
const PREFIX_ORDER = Object.keys(PREFIX_CATEGORY);

export const FAMILY_TREE_RANKS = ['class', 'order', 'family'] as const;
export type FamilyTreeRank = typeof FAMILY_TREE_RANKS[number];

export interface Source { name: string; url: string | null }
/** `text` may have blanks where a word would name the animal; `full` is the whole note, for after the round. */
export interface FieldNote { text: string; full?: string; source: Source }
export interface RankName { latin: string; plain: string | null }

export interface Animal {
  id: number;
  name: string;
  scientificName: string;
  photo: string | null;
  redList: string;
  redListUrl: string;
  continents: ContinentKey[];
  /** Trait tags by prefix (size: ['size:large'], region: ['region:east-africa', ...]). No prefix = no record. */
  traits: Record<string, string[]>;
  /** Where each trait tag's fact comes from. */
  traitSources: Record<string, Source>;
  familyTree: Record<FamilyTreeRank, RankName> & { genus: string; species: string };
  /** Hand-written notes for a round, in order, with blanks where a word would name the animal. */
  notes: FieldNote[];
  /** Notes held for the reveal card (too many blanks to read). */
  revealNotes: FieldNote[];
  /** Field guide lines by category, plus 'family' (class, order, family; never the genus). */
  guide: Record<ChargeCategory | 'family', string[]>;
}

export type FamilyTreeCost = 'match' | 'charges' | 'one-of-each';

export interface Rules {
  /** Saved with every round (clue_match_solves.rules_version). */
  version: string;
  moves: number;
  candidates: number;
  /**
   * How a family tree step is earned: a match of `match` gems or more ('match'), `charges` charges of any
   * color ('charges'), or one charge of every color ('one-of-each').
   */
  familyTree: { cost: FamilyTreeCost; match: number; charges: number };
  /** A round's other animals: closest relatives first, then (when on) the look-alikes, sharing the most traits with the mystery. */
  lookAlikes: boolean;
  /** Ask a color's questions automatically when there's no choice: enough charges for all of them (see autoAsk). */
  autoAsk: boolean;
  /** Also offer questions that can't cross anything out (every animal standing shares the answer), as Guess Who does. */
  offerUseless: boolean;
  /** Rules 043: a match asks its color's lead question at once (see leadQuestions); charges are never held or chosen. */
  askOnMatch: boolean;
  /** Which question leads a color: the best split ('best'), or one dealt at random per round from the useful ones ('dealt'). */
  lead: 'best' | 'dealt';
  /** Charges a question costs. */
  questionCost: number;
  /** Charges for a match of 3, 4 and 5 or more. */
  perMatch: [three: number, four: number, fivePlus: number];
  /** Gems a toy clears outside any match (all colors together) that earn one charge, of the color it cleared most. */
  perBlast: number;
  points: {
    solved: number; moveLeft: number; standing: number; firstTry: number;
    wrongGuess: number; wrongGuessMoves: number; streakStep: number; streakMax: number;
  };
}

/**
 * The charges game with toys on the board (plan 041, part 13): 12 look-alike animals keep random tapping from
 * solving nearly every round now that toys make the board worth 4 moves of play. Kept for the balance bot.
 */
export const RULES_041: Rules = {
  version: '041-5',
  moves: 4,
  candidates: 12,
  // One charge of every color per step: a set to collect ("I still need a Range charge"), so the family tree
  // pushes players to match every kind of clue.
  familyTree: { cost: 'one-of-each', match: 4, charges: 8 },
  lookAlikes: true,
  autoAsk: true,
  offerUseless: false,
  askOnMatch: false,
  lead: 'dealt',
  questionCost: 1,
  perMatch: [1, 2, 3],
  perBlast: 3,
  points: { solved: 50, moveLeft: 10, standing: 10, firstTry: 25, wrongGuess: 30, wrongGuessMoves: 2, streakStep: 10, streakMax: 100 },
};

/**
 * Plan 043, part 0: each color leads with one question, dealt per round and shown in the legend under the board;
 * a color's charges ask it as soon as they cover it (2 charges), on a 7x7 board with 5 moves. A match of 5 or more
 * in a line reveals the next family tree step: at 4, big matches on 7x7 solved rounds through the tree and
 * questions stopped mattering. Bot numbers: plans/043, part 0.
 */
export const DEFAULT_RULES: Rules = {
  ...RULES_041,
  version: '043-0',
  moves: 5,
  familyTree: { cost: 'match', match: 5, charges: 8 },
  askOnMatch: true,
  lead: 'dealt',
  questionCost: 2,
};

const QUESTION_TEXT: Record<string, string> = {
  'size:tiny': 'Is it tiny (under 100 g)?', 'size:small': 'Is it small (100 g to 2 kg)?', 'size:medium': 'Is it medium-sized (2 to 30 kg)?',
  'size:large': 'Is it large (30 to 300 kg)?', 'size:huge': 'Is it huge (over 300 kg)?',
  'covering:fur': 'Is it covered in fur?', 'covering:spines': 'Is it covered in spines?', 'covering:scales': 'Is it covered in overlapping scales?',
  'covering:armor': 'Does it have bands of bony armor?', 'covering:shell': 'Does it have a shell?', 'covering:skin': 'Does it have bare skin (no fur or scales)?',
  'diet:plants': 'Is it a plant-eater (plants only)?', 'diet:meat': 'Is it a meat-eater (other animals only)?',
  'diet:insects': 'Does it mostly eat insects and other small bugs?', 'diet:mixed': 'Does it eat both plants and animals?',
  'activity:day': 'Is it mainly active in the day?', 'activity:night': 'Is it mainly active at night?',
  'activity:twilight': 'Is it mainly active at dawn and dusk?', 'activity:any': 'Is it active both day and night?',
  'social:alone': 'Does it live alone?', 'social:pairs': 'Does it live in pairs or small families?', 'social:groups': 'Does it live in groups?',
  'birth:eggs': 'Does it lay eggs?', 'birth:live': 'Does it give birth to live young?',
  'young:one': 'Does it have just 1 or 2 young at a time?', 'young:few': 'Does it have 3 to 10 young at a time?', 'young:many': 'Does it have more than 10 young at once?',
  'lifespan:short': 'Does it live less than 5 years?', 'lifespan:medium': 'Does it live 5 to 20 years?', 'lifespan:long': 'Can it live more than 20 years?',
  'system:terrestrial': 'Does it live on land?', 'system:freshwater': 'Does it live in fresh water?', 'system:marine': 'Does it live in the sea?',
  'habitat:forest': 'Does it live in forests?', 'habitat:savanna': 'Does it live in savanna (grassland with scattered trees)?',
  'habitat:shrubland': 'Does it live in shrubland (land covered in bushes)?', 'habitat:grassland': 'Does it live in grassland?',
  'habitat:wetlands': 'Does it live in wetlands (rivers, lakes, marshes)?', 'habitat:rocky': 'Does it live in rocky places?',
  'habitat:caves': 'Does it live in caves?', 'habitat:desert': 'Does it live in desert?', 'habitat:marine': 'Does it live along coasts or in the sea?',
  'habitat:artificial': 'Does it also live on farms, plantations or in towns?',
};

/** Two-line versions for the gem legend (rules 043). */
const SHORT_TEXT: Record<string, string> = {
  'size:tiny': 'Tiny (under 100 g)?', 'size:small': 'Small (100 g to 2 kg)?', 'size:medium': 'Medium (2 to 30 kg)?',
  'size:large': 'Large (30 to 300 kg)?', 'size:huge': 'Huge (over 300 kg)?',
  'covering:fur': 'Covered in fur?', 'covering:spines': 'Covered in spines?', 'covering:scales': 'Covered in scales?',
  'covering:armor': 'Bands of bony armor?', 'covering:shell': 'Has a shell?', 'covering:skin': 'Bare skin?',
  'diet:plants': 'Eats only plants?', 'diet:meat': 'Eats only meat?', 'diet:insects': 'Eats mostly bugs?', 'diet:mixed': 'Eats plants and animals?',
  'activity:day': 'Out in the day?', 'activity:night': 'Out at night?', 'activity:twilight': 'Out at dawn and dusk?', 'activity:any': 'Out day and night?',
  'social:alone': 'Lives alone?', 'social:pairs': 'Lives in pairs?', 'social:groups': 'Lives in groups?',
  'birth:eggs': 'Lays eggs?', 'birth:live': 'Gives birth to live young?',
  'young:one': '1 or 2 young at a time?', 'young:few': '3 to 10 young at a time?', 'young:many': 'Over 10 young at once?',
  'lifespan:short': 'Lives under 5 years?', 'lifespan:medium': 'Lives 5 to 20 years?', 'lifespan:long': 'Lives over 20 years?',
  'system:terrestrial': 'Lives on land?', 'system:freshwater': 'Lives in fresh water?', 'system:marine': 'Lives in the sea?',
  'habitat:forest': 'Lives in forests?', 'habitat:savanna': 'Lives in savanna?', 'habitat:shrubland': 'Lives in shrubland?',
  'habitat:grassland': 'Lives in grassland?', 'habitat:wetlands': 'Lives in wetlands?', 'habitat:rocky': 'Lives in rocky places?',
  'habitat:caves': 'Lives in caves?', 'habitat:desert': 'Lives in desert?', 'habitat:marine': 'Lives by coasts or sea?',
  'habitat:artificial': 'Lives on farms or in towns?',
};

export const prefixOf = (tag: string): string => tag.slice(0, tag.indexOf(':'));

export function questionText(tag: string): string {
  if (tag.startsWith('region:')) return `Does it live in ${REGIONS[tag.slice(7)]?.name ?? tag.slice(7)}?`;
  return QUESTION_TEXT[tag] ?? tag;
}

export function shortQuestionText(tag: string): string {
  if (tag.startsWith('region:')) return `Lives in ${REGIONS[tag.slice(7)]?.name ?? tag.slice(7)}?`;
  return SHORT_TEXT[tag] ?? questionText(tag);
}

// ---- Looking animals up ----

export interface Book {
  byId: Map<number, Animal>;
  /** prefix -> tags, per animal. */
  traits: Map<number, Map<string, Set<string>>>;
}

export function makeBook(animals: readonly Animal[]): Book {
  return {
    byId: new Map(animals.map(animal => [animal.id, animal])),
    traits: new Map(animals.map(animal => [animal.id, new Map(Object.entries(animal.traits).map(([prefix, tags]) => [prefix, new Set(tags)]))])),
  };
}

function animal(book: Book, id: number): Animal {
  const found = book.byId.get(id);
  if (!found) throw new Error(`No animal ${id}`);
  return found;
}

/** The animals a place holds: every animal on that continent, or everyone when there's no place. */
export function poolFor(animals: readonly Animal[], place: ContinentKey | null): number[] {
  return animals.filter(a => !place || a.continents.includes(place)).map(a => a.id);
}

// ---- Rounds ----

/** 'last-chance': a final guess was wrong, and the saved field notes opened for one more guess. */
export type RoundStatus = 'playing' | 'out-of-moves' | 'last-chance' | 'solved' | 'lost';
export type Removal = { by: 'answer'; question: number } | { by: 'family-tree'; rank: FamilyTreeRank } | { by: 'guess' };

export type LogEntry =
  | { kind: 'answer'; n: number; tag: string; question: string; category: ChargeCategory; answer: 'yes' | 'no' | 'no-record'; ruledOut: number[]; noRecord: number[]; source: Source | null; auto?: true }
  | { kind: 'note'; text: string; full?: string; source: Source }
  | { kind: 'notes-empty' }
  /** A family tree step: earned by a big match, or free because every animal left shares it. */
  | { kind: 'step'; rank: FamilyTreeRank; name: RankName; free: boolean; paid?: Partial<Record<ChargeCategory, number>>; ruledOut: number[]; source: Source }
  | { kind: 'guess'; id: number; correct: boolean }
  | { kind: 'last-chance'; notes: number };

export interface RoundState {
  rules: Rules;
  /** The continent the round's animals come from; null for the whole world. Range questions stay inside it. */
  place: ContinentKey | null;
  mysteryId: number;
  candidateIds: number[];
  out: Record<number, Removal>;
  movesLeft: number;
  movesUsed: number;
  charges: Record<ChargeCategory, number>;
  /** Field notes saved from note gems: sealed until a last chance, whole on the reveal card. */
  notesCollected: number;
  asked: string[];
  /** Family tree steps revealed: 0 none, 1 class, 2 order, 3 family. */
  familyTreeSteps: number;
  wrongGuesses: number[];
  status: RoundStatus;
  log: LogEntry[];
}

/**
 * A mystery and the round's other cards, all from the pool, closest relatives first (same family, then order,
 * then class; ties at random), so a round compares animals that are hard to tell apart. The last `recent`
 * mysteries aren't repeated.
 */
export function pickRound(
  book: Book, pool: readonly number[], rng: () => number,
  { size, recent = [], lookAlikes = false, place = null }: { size: number; recent?: readonly number[]; lookAlikes?: boolean; place?: ContinentKey | null },
): { mysteryId: number; candidateIds: number[] } {
  if (pool.length < 2) throw new Error('A round needs at least two animals');
  const cooldown = new Set(recent.slice(-Math.min(8, pool.length - 1)));
  const eligible = pool.filter(id => !cooldown.has(id));
  const choices = eligible.length > 0 ? eligible : pool;
  const mysteryId = choices[Math.floor(rng() * choices.length)];
  const tree = animal(book, mysteryId).familyTree;
  const closeness = (id: number) => FAMILY_TREE_RANKS.filter(rank => animal(book, id).familyTree[rank].latin === tree[rank].latin).length;
  // Animals no question can tell from the mystery go last: with them in, a round can't be narrowed to one.
  const apart = (id: number) => Number(canTellApart(book, mysteryId, id, place));
  const like = (id: number) => (lookAlikes ? likeness(book, mysteryId, id) : 0);
  const others = shuffle(pool.filter(id => id !== mysteryId), rng)
    .sort((a, b) => apart(b) - apart(a) || closeness(b) - closeness(a) || like(b) - like(a))
    .slice(0, size - 1);
  return { mysteryId, candidateIds: shuffle([mysteryId, ...others], rng) };
}

/** How alike two animals' records are: +1 for each kind of trait they share, -1 for each they differ on (no record: 0). */
function likeness(book: Book, a: number, b: number): number {
  const theirs = book.traits.get(b)!;
  let score = 0;
  for (const [prefix, tags] of book.traits.get(a)!) {
    const other = theirs.get(prefix);
    if (PREFIX_CATEGORY[prefix] && other) score += [...tags].some(tag => other.has(tag)) ? 1 : -1;
  }
  return score;
}

/** Whether some question tells two animals apart: a trait both have records for, where one has a tag the other lacks (Range: the place's regions only). */
function canTellApart(book: Book, a: number, b: number, place: ContinentKey | null): boolean {
  const theirs = book.traits.get(b)!;
  for (const [prefix, tags] of book.traits.get(a)!) {
    const other = theirs.get(prefix);
    if (!PREFIX_CATEGORY[prefix] || !other) continue;
    for (const tag of new Set([...tags, ...other])) {
      if (prefix === 'region' && place && REGIONS[tag.slice(7)]?.continent !== place) continue;
      if (tags.has(tag) !== other.has(tag)) return true;
    }
  }
  return false;
}

export function newRound(book: Book, rules: Rules, { mysteryId, candidateIds, place }: { mysteryId: number; candidateIds: number[]; place: ContinentKey | null }): RoundState {
  const state: RoundState = {
    rules, place, mysteryId, candidateIds, out: {}, movesLeft: rules.moves, movesUsed: 0,
    charges: { body: 0, habits: 0, habitat: 0, range: 0, life: 0 }, notesCollected: 0, asked: [],
    familyTreeSteps: 0, wrongGuesses: [], status: 'playing', log: [],
  };
  return settleFamilyTree(book, state);
}

export const standing = (state: RoundState): number[] => state.candidateIds.filter(id => !state.out[id]);
const isOver = (state: RoundState) => state.status === 'solved' || state.status === 'lost';

export type MatchedGroup = { kind: GemKind; size: number; blast?: boolean };

/** Charges one explode phase earns, before any are spent (applyMatches, and the balance bot's move values). */
export function chargesEarned(rules: Rules, groups: ReadonlyArray<MatchedGroup>): Record<ChargeCategory, number> {
  const earned: Record<ChargeCategory, number> = { body: 0, habits: 0, habitat: 0, range: 0, life: 0 };
  for (const group of groups) {
    if (group.kind !== 'notes' && !group.blast) earned[group.kind] += rules.perMatch[group.size >= 5 ? 2 : group.size === 4 ? 1 : 0];
  }
  // Toys: every `perBlast` gems cleared outside a match (all colors together) earn a charge, of the color cleared most.
  const blasts = groups.filter(group => group.blast && group.kind !== 'notes');
  const pooled = Math.floor(blasts.reduce((sum, group) => sum + group.size, 0) / rules.perBlast);
  if (pooled > 0) earned[blasts.reduce((a, b) => (b.size > a.size ? b : a)).kind as ChargeCategory] += pooled;
  return earned;
}

/** One explode phase of the board: the move's own matches (cascade false) or a cascade. `blast`: gems a toy cleared. */
export function applyMatches(book: Book, state: RoundState, groups: ReadonlyArray<MatchedGroup>, cascade: boolean): RoundState {
  if (isOver(state) || (!cascade && state.status !== 'playing')) return state;
  const earned = chargesEarned(state.rules, groups);
  const charges = { ...state.charges };
  for (const category of CHARGE_CATEGORIES) charges[category] += earned[category];
  // Each note gem collected next to a match.
  const notes = groups.reduce((sum, group) => sum + (group.kind === 'notes' ? group.size : 0), 0);
  const mystery = animal(book, state.mysteryId);
  // Note gems save field notes for a last chance; they aren't read now.
  const saved = Math.min(notes, mystery.notes.length - state.notesCollected);
  const log: LogEntry[] = notes > saved ? [{ kind: 'notes-empty' }] : [];
  const movesLeft = cascade ? state.movesLeft : state.movesLeft - 1;
  let next: RoundState = {
    ...state, charges, movesLeft, movesUsed: state.movesUsed + (cascade ? 0 : 1), notesCollected: state.notesCollected + saved,
    status: movesLeft <= 0 ? 'out-of-moves' : state.status, log: [...state.log, ...log],
  };
  // With cost 'match', each big match (a run, not a toy's clear) reveals the next family tree step (free steps are already filled in, so it always tells something).
  const { cost, match } = state.rules.familyTree;
  for (const group of groups) {
    if (cost !== 'match' || group.kind === 'notes' || group.blast || group.size < match || next.familyTreeSteps >= FAMILY_TREE_RANKS.length) continue;
    next = settleFamilyTree(book, revealStep(book, next, false));
  }
  return autoAsk(book, next);
}

/**
 * Ask a color's questions for the player when there's no choice to make: the charges cover every question of
 * that color, with one to spare for the family tree while it still needs one of each color. Answers can shrink
 * other colors' lists, so it repeats until nothing qualifies.
 */
export function autoAsk(book: Book, state: RoundState): RoundState {
  if (isOver(state)) return state;
  if (state.rules.askOnMatch) {
    // Every charge a match earned asks its color's lead question; a color with none left keeps its charges unused.
    const leads = leadQuestions(book, state);
    const category = CHARGE_CATEGORIES.find(c => state.charges[c] >= state.rules.questionCost && leads[c]);
    return category ? ask(book, state, leads[category]!.tag) : state;
  }
  if (!state.rules.autoAsk) return state;
  const reserve = state.rules.familyTree.cost === 'one-of-each' && state.familyTreeSteps < FAMILY_TREE_RANKS.length ? 1 : 0;
  const all = questionsFor(book, state);
  const useful = (c: ChargeCategory) => all[c].filter(question => question.lacks > 0);
  const category = CHARGE_CATEGORIES.find(c => useful(c).length > 0 && state.charges[c] >= useful(c).length + reserve);
  return category ? ask(book, state, useful(category)[0].tag, true) : state;
}

export interface FamilyTreeQuote { rank: FamilyTreeRank; affordable: boolean; pay: Partial<Record<ChargeCategory, number>> }

/** What the next family tree step costs when it's bought with charges, and which ones would pay; null when it can't be bought. */
export function familyTreeQuote(book: Book, state: RoundState): FamilyTreeQuote | null {
  const { cost, charges: price } = state.rules.familyTree;
  if (cost === 'match' || isOver(state) || state.familyTreeSteps >= FAMILY_TREE_RANKS.length) return null;
  const rank = FAMILY_TREE_RANKS[state.familyTreeSteps];
  if (cost === 'one-of-each') {
    return { rank, affordable: CHARGE_CATEGORIES.every(c => state.charges[c] > 0), pay: Object.fromEntries(CHARGE_CATEGORIES.map(c => [c, 1])) };
  }
  // Any color: charges with no useful question left go first, then the biggest piles.
  const questions = questionsFor(book, state);
  const order = [...CHARGE_CATEGORIES].sort((a, b) => Number(questions[a].length > 0) - Number(questions[b].length > 0) || state.charges[b] - state.charges[a]);
  const pay: Partial<Record<ChargeCategory, number>> = {};
  let due = price;
  for (const category of order) {
    const take = Math.min(due, state.charges[category]);
    if (take > 0) { pay[category] = take; due -= take; }
  }
  return { rank, affordable: due === 0, pay };
}

/** Buy the next family tree step: reveal the mystery's rank and cross out every animal with another. */
export function buyFamilyTreeStep(book: Book, state: RoundState): RoundState {
  const quote = familyTreeQuote(book, state);
  if (!quote?.affordable) return state;
  const charges = { ...state.charges };
  for (const [category, n] of Object.entries(quote.pay) as Array<[ChargeCategory, number]>) charges[category] -= n;
  return autoAsk(book, settleFamilyTree(book, revealStep(book, { ...state, charges }, false, quote.pay)));
}

export interface Question { tag: string; text: string; category: ChargeCategory; has: number; lacks: number; unknown: number }

/** Questions that could rule out an animal still standing, per category. */
export function questionsFor(book: Book, state: RoundState): Record<ChargeCategory, Question[]> {
  const ids = standing(state);
  const asked = new Set(state.asked);
  const byCategory: Record<ChargeCategory, Question[]> = { body: [], habits: [], habitat: [], range: [], life: [] };
  const tags = new Set<string>();
  for (const id of ids) for (const set of book.traits.get(id)!.values()) for (const tag of set) tags.add(tag);
  for (const tag of tags) {
    const category = PREFIX_CATEGORY[prefixOf(tag)];
    if (!category || asked.has(tag)) continue;
    if (state.place && category === 'range' && REGIONS[tag.slice(7)]?.continent !== state.place) continue;
    let has = 0, lacks = 0, unknown = 0;
    for (const id of ids) {
      const values = book.traits.get(id)!.get(prefixOf(tag));
      if (!values) unknown++;
      else if (values.has(tag)) has++;
      else lacks++;
    }
    if (has > 0 && (lacks > 0 || state.rules.offerUseless)) byCategory[category].push({ tag, text: questionText(tag), category, has, lacks, unknown });
  }
  for (const list of Object.values(byCategory)) {
    list.sort((a, b) => PREFIX_ORDER.indexOf(prefixOf(a.tag)) - PREFIX_ORDER.indexOf(prefixOf(b.tag)) || a.text.localeCompare(b.text));
  }
  return byCategory;
}

/**
 * Rules 043: the question a match of each color asks now, the one that splits the animals still standing most
 * evenly (ties: questionsFor's order); null when no question of that color can cross anything out.
 */
export function leadQuestions(book: Book, state: RoundState): Record<ChargeCategory, Question | null> {
  const all = questionsFor(book, state);
  // Dealt: a fixed shuffle per round (the round's animals seed it), so a color keeps its question until it's asked or can't help.
  const deal = (q: Question) => -hash32(`${state.candidateIds.join(',')}:${q.tag}`);
  const score = state.rules.lead === 'best' ? splitOf : deal;
  const lead = (list: Question[]) => list.filter(q => q.lacks > 0).reduce<Question | null>((best, q) => (!best || score(q) > score(best) ? q : best), null);
  return { body: lead(all.body), habits: lead(all.habits), habitat: lead(all.habitat), range: lead(all.range), life: lead(all.life) };
}

/** Animals a question is sure to cross out: whichever way the answer goes. */
export const splitOf = (q: Question): number => Math.min(q.has, q.lacks);

/** Whether a question of this category can be asked now: the round is on and there's a charge of its color. */
export function canAsk(state: RoundState, category: ChargeCategory): boolean {
  return !isOver(state) && state.charges[category] >= state.rules.questionCost;
}

/** Spend a charge of the tag's category on a yes/no question. No record: the charge comes back. `auto`: asked by autoAsk. */
export function ask(book: Book, state: RoundState, tag: string, auto = false): RoundState {
  const category = PREFIX_CATEGORY[prefixOf(tag)];
  if (!category || !canAsk(state, category) || state.asked.includes(tag)) return state;
  const mystery = animal(book, state.mysteryId);
  const values = book.traits.get(mystery.id)!.get(prefixOf(tag));
  const n = state.log.filter(entry => entry.kind === 'answer' && entry.answer !== 'no-record').length + 1;
  const base = { kind: 'answer' as const, n, tag, question: questionText(tag), category, ...(auto ? { auto: true as const } : {}) };
  if (!values) {
    return autoAsk(book, { ...state, asked: [...state.asked, tag], log: [...state.log, { ...base, answer: 'no-record', ruledOut: [], noRecord: [], source: null }] });
  }
  const yes = values.has(tag);
  const ruledOut: number[] = [];
  const noRecord: number[] = [];
  for (const id of standing(state)) {
    const theirs = book.traits.get(id)!.get(prefixOf(tag));
    if (!theirs) noRecord.push(id);
    else if (theirs.has(tag) !== yes) ruledOut.push(id);
  }
  const out = { ...state.out };
  for (const id of ruledOut) out[id] = { by: 'answer', question: n };
  const source = mystery.traitSources[yes ? tag : [...values][0]] ?? null;
  return autoAsk(book, settleFamilyTree(book, {
    ...state, out, asked: [...state.asked, tag], charges: { ...state.charges, [category]: state.charges[category] - state.rules.questionCost },
    log: [...state.log, { ...base, answer: yes ? 'yes' : 'no', ruledOut, noRecord, source }],
  }));
}

function revealStep(book: Book, state: RoundState, free: boolean, paid?: Partial<Record<ChargeCategory, number>>): RoundState {
  const rank = FAMILY_TREE_RANKS[state.familyTreeSteps];
  const mystery = animal(book, state.mysteryId);
  const name = mystery.familyTree[rank];
  const ruledOut = standing(state).filter(id => animal(book, id).familyTree[rank].latin !== name.latin);
  const out = { ...state.out };
  for (const id of ruledOut) out[id] = { by: 'family-tree', rank };
  const source = { name: 'IUCN Red List', url: mystery.redListUrl };
  return { ...state, out, familyTreeSteps: state.familyTreeSteps + 1, log: [...state.log, { kind: 'step', rank, name, free, ...(paid ? { paid } : {}), ruledOut, source }] };
}

/** Fill in, for free, every next step that every animal still standing shares (it couldn't rule anything out). */
function settleFamilyTree(book: Book, state: RoundState): RoundState {
  let next = state;
  while (!isOver(next) && next.familyTreeSteps < FAMILY_TREE_RANKS.length) {
    const rank = FAMILY_TREE_RANKS[next.familyTreeSteps];
    const latin = animal(book, next.mysteryId).familyTree[rank].latin;
    if (!standing(next).every(id => animal(book, id).familyTree[rank].latin === latin)) break;
    next = revealStep(book, next, true);
  }
  return next;
}

/**
 * Guess an animal. Wrong: it's crossed out and costs moves. Wrong at 0 moves ends the round, unless field notes
 * were saved: then they open for a last chance, one more guess. Wrong again ends it.
 */
export function guess(book: Book, state: RoundState, id: number): RoundState {
  if (isOver(state) || state.out[id] || !state.candidateIds.includes(id)) return state;
  if (id === state.mysteryId) return { ...state, status: 'solved', log: [...state.log, { kind: 'guess', id, correct: true }] };
  const log: LogEntry[] = [...state.log, { kind: 'guess', id, correct: false }];
  const out = { ...state.out, [id]: { by: 'guess' as const } };
  const wrongGuesses = [...state.wrongGuesses, id];
  if (state.status === 'out-of-moves' && state.notesCollected > 0) {
    const notes: LogEntry[] = animal(book, state.mysteryId).notes.slice(0, state.notesCollected)
      .map(note => ({ kind: 'note', text: note.text, ...(note.full ? { full: note.full } : {}), source: note.source }));
    return autoAsk(book, settleFamilyTree(book, { ...state, out, wrongGuesses, status: 'last-chance', log: [...log, { kind: 'last-chance', notes: notes.length }, ...notes] }));
  }
  if (state.status === 'out-of-moves' || state.status === 'last-chance') return { ...state, out, wrongGuesses, status: 'lost', log };
  const movesLeft = Math.max(0, state.movesLeft - state.rules.points.wrongGuessMoves);
  return autoAsk(book, settleFamilyTree(book, { ...state, out, wrongGuesses, movesLeft, status: movesLeft === 0 ? 'out-of-moves' : 'playing', log }));
}

export interface ScorePart { label: string; points: number }

/** Points for a solved round; `streak` is the solves in a row before this one. */
export function scoreSolve(state: RoundState, streak: number): ScorePart[] {
  const p = state.rules.points;
  // A last chance is a rescue: it scores the solve, but no bonuses for moves or animals left.
  if (state.log.some(entry => entry.kind === 'last-chance')) {
    return [{ label: 'Solved on a last chance', points: p.solved }, ...(streak > 0 ? [{ label: `Streak ×${streak}`, points: Math.min(p.streakMax, streak * p.streakStep) }] : [])];
  }
  const others = standing(state).length - 1;
  const parts: ScorePart[] = [
    { label: 'Solved', points: p.solved },
    { label: `${state.movesLeft} move${state.movesLeft === 1 ? '' : 's'} left`, points: state.movesLeft * p.moveLeft },
    { label: `${others} other animal${others === 1 ? '' : 's'} still standing`, points: others * p.standing },
  ];
  if (state.wrongGuesses.length === 0) parts.push({ label: 'First try', points: p.firstTry });
  if (streak > 0) parts.push({ label: `Streak ×${streak}`, points: Math.min(p.streakMax, streak * p.streakStep) });
  return parts.filter(part => part.points > 0);
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
