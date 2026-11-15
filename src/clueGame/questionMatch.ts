// The questions the animal board (animalBoard.ts) asks, from plan 041's Question Match: the five question
// categories and the trait prefixes each asks about, each question's full, short and column text, the Animal
// type the content builds (questionMatchContent.ts), the book that looks animals up, poolFor and likeness.
// Pure: no DOM, no Phaser.
import type { ContinentKey } from '@/clueGame/regions';
import { REGIONS } from '@/clueGame/regions';

export const CHARGE_CATEGORIES = ['body', 'habits', 'habitat', 'range', 'life'] as const;
export type ChargeCategory = typeof CHARGE_CATEGORIES[number];
/** What a gem color gives: charges of a category, or field notes. */
export type GemKind = ChargeCategory | 'notes';

export const CATEGORY_LABELS: Record<GemKind, string> = {
  body: 'Body', habits: 'Habits', habitat: 'Habitat', range: 'Range', life: 'Life cycle', notes: 'Field notes',
};

/** Which category asks about each trait prefix. */
export const PREFIX_CATEGORY: Record<string, ChargeCategory> = {
  size: 'body', covering: 'body',
  diet: 'habits', activity: 'habits', social: 'habits', trees: 'habits',
  system: 'habitat', habitat: 'habitat',
  region: 'range',
  birth: 'life', young: 'life', lifespan: 'life',
};

export const FAMILY_TREE_RANKS = ['class', 'order', 'family'] as const;
export type FamilyTreeRank = typeof FAMILY_TREE_RANKS[number];

export interface Source { name: string; url: string | null }
/** `text` may have blanks where a word would name the animal; `full` is the whole note, for after the round; `tags`: the hand-written clue's tags (plan 044 witness notes). */
export interface FieldNote { text: string; full?: string; source: Source; tags?: readonly string[] }
/** A sign: one open tag of an animal's clues (digging_claws), as a phrase, under the question category it bears on (plan 055). */
export interface Sign { tag: string; text: string; category: ChargeCategory }
export interface RankName { latin: string; plain: string | null }

export interface Animal {
  id: number;
  name: string;
  scientificName: string;
  photo: string | null;
  continents: ContinentKey[];
  /** Trait tags by prefix (size: ['size:large'], region: ['region:east-africa', ...]). No prefix = no record. */
  traits: Record<string, string[]>;
  familyTree: Record<FamilyTreeRank, RankName> & { genus: string; species: string };
  /** Hand-written notes for a round, in order, with blanks where a word would name the animal. */
  notes: FieldNote[];
  /** Notes held for the reveal card (too many blanks to read). */
  revealNotes: FieldNote[];
  /** Field guide lines by category, plus 'family' (class, order, family; never the genus), each with the question tags it records. */
  guide: Record<ChargeCategory | 'family', Array<{ text: string; tags: readonly string[] }>>;
  /** Its signs, in tag order; every one shows beside the guide's photo in its category's group, never hidden (plans 055, 058). */
  signs: Sign[];
  /** Every tag on its clues, trait tags and open ones like digging_claws (plan 044: what its field guide records). */
  tags?: readonly string[];
}

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
  'trees:yes': 'Does it live in trees?',
  'birth:eggs': 'Does it lay eggs?', 'birth:live': 'Does it give birth to live young?',
  'young:one': 'Does it have just 1 or 2 young at a time?', 'young:few': 'Does it have 3 to 10 young at a time?', 'young:many': 'Does it have more than 10 young at once?',
  'lifespan:short': 'Does it live less than 5 years?', 'lifespan:medium': 'Does it live 5 to 20 years?', 'lifespan:long': 'Can it live more than 20 years?',
  'system:terrestrial': 'Does it live on land?', 'system:freshwater': 'Does it live in fresh water?', 'system:marine': 'Does it live in the sea?',
  'habitat:forest': 'Does it live in forests?', 'habitat:savanna': 'Does it live in savanna (grassland with scattered trees)?',
  'habitat:shrubland': 'Does it live in shrubland (land covered in bushes)?', 'habitat:grassland': 'Does it live in grassland?',
  'habitat:wetlands': 'Does it live in wetlands (rivers, lakes, marshes)?', 'habitat:rocky': 'Does it live in rocky places?',
  'habitat:caves': 'Does it live in caves?', 'habitat:desert': 'Does it live in desert?', 'habitat:marine': 'Does it live along coasts or in the sea?',
};

/** Short versions: what the board calls each clue gem (screen readers), and columnLabel's fallback. */
const SHORT_TEXT: Record<string, string> = {
  'size:tiny': 'Tiny (under 100 g)?', 'size:small': 'Small (100 g to 2 kg)?', 'size:medium': 'Medium (2 to 30 kg)?',
  'size:large': 'Large (30 to 300 kg)?', 'size:huge': 'Huge (over 300 kg)?',
  'covering:fur': 'Covered in fur?', 'covering:spines': 'Covered in spines?', 'covering:scales': 'Covered in scales?',
  'covering:armor': 'Bands of bony armor?', 'covering:shell': 'Has a shell?', 'covering:skin': 'Bare skin?',
  'diet:plants': 'Eats only plants?', 'diet:meat': 'Eats only meat?', 'diet:insects': 'Eats mostly bugs?', 'diet:mixed': 'Eats plants and animals?',
  'activity:day': 'Out in the day?', 'activity:night': 'Out at night?', 'activity:twilight': 'Out at dawn and dusk?', 'activity:any': 'Out day and night?',
  'social:alone': 'Lives alone?', 'social:pairs': 'Lives in pairs?', 'social:groups': 'Lives in groups?',
  'trees:yes': 'Lives in trees?',
  'birth:eggs': 'Lays eggs?', 'birth:live': 'Gives birth to live young?',
  'young:one': '1 or 2 young at a time?', 'young:few': '3 to 10 young at a time?', 'young:many': 'Over 10 young at once?',
  'lifespan:short': 'Lives under 5 years?', 'lifespan:medium': 'Lives 5 to 20 years?', 'lifespan:long': 'Lives over 20 years?',
  'system:terrestrial': 'Lives on land?', 'system:freshwater': 'Lives in fresh water?', 'system:marine': 'Lives in the sea?',
  'habitat:forest': 'Lives in forests?', 'habitat:savanna': 'Lives in savanna?', 'habitat:shrubland': 'Lives in shrubland?',
  'habitat:grassland': 'Lives in grassland?', 'habitat:wetlands': 'Lives in wetlands?', 'habitat:rocky': 'Lives in rocky places?',
  'habitat:caves': 'Lives in caves?', 'habitat:desert': 'Lives in desert?', 'habitat:marine': 'Lives by coasts or sea?',
};

export const prefixOf = (tag: string): string => tag.slice(0, tag.indexOf(':'));

/** The question category of an asked tag, so its tile, answer row and guide heading share one mark. Throws on a tag no question asks. */
export function categoryOf(tag: string): ChargeCategory {
  const category = PREFIX_CATEGORY[prefixOf(tag)];
  if (!category) throw new Error(`no question category for "${tag}"`);
  return category;
}

export function questionText(tag: string): string {
  if (tag.startsWith('region:')) return `Does it live in ${REGIONS[tag.slice(7)]?.name ?? tag.slice(7)}?`;
  return QUESTION_TEXT[tag] ?? tag;
}

export function shortQuestionText(tag: string): string {
  if (tag.startsWith('region:')) return `Lives in ${REGIONS[tag.slice(7)]?.name ?? tag.slice(7)}?`;
  return SHORT_TEXT[tag] ?? questionText(tag);
}

// One or two words over a question's column in the evidence grid (plan 044), 8 letters a line at most, keeping the
// qualifiers (weights, "only", "mostly"). Soft hyphens (\u00ad) let the long words break.
const COLUMN_LABEL: Record<string, string> = {
  'size:tiny': 'Tiny <100 g', 'size:small': 'Small 0.1–2 kg', 'size:medium': 'Medium 2–30 kg', 'size:large': 'Large 30–300 kg', 'size:huge': 'Huge 300+ kg',
  'covering:fur': 'Fur', 'covering:spines': 'Spines', 'covering:scales': 'Scales', 'covering:armor': 'Bony armor', 'covering:shell': 'Shell', 'covering:skin': 'Bare skin',
  'diet:plants': 'Only plants', 'diet:meat': 'Only meat', 'diet:insects': 'Mostly bugs', 'diet:mixed': 'Plants & animals',
  'activity:day': 'Day', 'activity:night': 'Night', 'activity:twilight': 'Dawn & dusk', 'activity:any': 'Day & night',
  'social:alone': 'Alone', 'social:pairs': 'Pairs', 'social:groups': 'Groups', 'trees:yes': 'Lives in trees',
  'birth:eggs': 'Lays eggs', 'birth:live': 'Live young',
  'young:one': '1–2 young', 'young:few': '3–10 young', 'young:many': '10+ young',
  'lifespan:short': 'Under 5 years', 'lifespan:medium': '5–20 years', 'lifespan:long': '20+ years',
  'system:terrestrial': 'On land', 'system:freshwater': 'Fresh water', 'system:marine': 'Sea',
  'habitat:forest': 'Forest', 'habitat:savanna': 'Savanna', 'habitat:shrubland': 'Shrub\u00adland', 'habitat:grassland': 'Grass\u00adland',
  'habitat:wetlands': 'Wetlands', 'habitat:rocky': 'Rocky places', 'habitat:caves': 'Caves', 'habitat:desert': 'Desert',
  'habitat:marine': 'Coasts & sea',
  'region:east-africa': 'East Africa', 'region:central-africa': 'Central Africa', 'region:north-africa': 'North Africa',
  'region:southern-africa': 'Southern Africa', 'region:west-africa': 'West Africa', 'region:central-asia': 'Central Asia',
  'region:east-asia': 'East Asia', 'region:southeast-asia': 'South\u00adeast Asia', 'region:south-asia': 'South Asia', 'region:west-asia': 'Middle East',
  'region:eastern-europe': 'East Europe', 'region:northern-europe': 'North Europe', 'region:southern-europe': 'South Europe',
  'region:western-europe': 'West Europe', 'region:caribbean': 'Caribbean', 'region:central-america': 'Central America',
  'region:usa-canada': 'USA & Canada', 'region:south-america': 'South America', 'region:australia-nz': 'Austra\u00adlia & NZ',
  'region:melanesia': 'New Guinea', 'region:micronesia': 'Micro\u00adnesia', 'region:polynesia': 'Poly\u00adnesia',
};

export function columnLabel(tag: string): string {
  return COLUMN_LABEL[tag] ?? shortQuestionText(tag).replace(/^Lives in (the )?/, '').replace(/\?$/, '');
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

/** The animals a place holds: every animal on that continent, or everyone when there's no place. */
export function poolFor(animals: readonly Animal[], place: ContinentKey | null): number[] {
  return animals.filter(a => !place || a.continents.includes(place)).map(a => a.id);
}

/** How alike two animals' records are: +1 for each kind of trait they share, -1 for each they differ on (no record: 0). */
export function likeness(book: Book, a: number, b: number): number {
  const theirs = book.traits.get(b)!;
  let score = 0;
  for (const [prefix, tags] of book.traits.get(a)!) {
    const other = theirs.get(prefix);
    if (PREFIX_CATEGORY[prefix] && other) score += [...tags].some(tag => other.has(tag)) ? 1 : -1;
  }
  return score;
}
