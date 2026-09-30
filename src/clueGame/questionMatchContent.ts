// Content -> the data the Question Match rules play with (plan 041): the traits
// questions can ask about, regions and continents, family tree names, field notes
// (with blanks where a word would name the animal), and the source of every fact.
// Two front doors, one builder: animalsFromPool for the app (database rows from
// GET /api/clue-game/pool) and animalsFromProfiles for the prototype and the
// balance bot (db/content/animals/*.json). Pure.
import { isHandWrittenClue, profileClues, type AnimalProfile, type ContentSource } from '@/clueGame/profiles';
import type { CluePool } from '@/clueGame/pool';
import { FAMILY_NAMES, ORDER_NAMES } from '@/clueGame/speciesInfo';
import { REGIONS, countryName, regionOfCountry, type ContinentKey } from '@/clueGame/regions';
import { PREFIX_CATEGORY, prefixOf, type Animal, type ChargeCategory, type FieldNote, type Source } from '@/clueGame/questionMatch';

const CLASS_PLAIN: Record<string, string> = { mammalia: 'mammals', amphibia: 'amphibians', reptilia: 'reptiles', aves: 'birds' };

const GUIDE_CATEGORY: Record<string, ChargeCategory | 'family'> = {
  taxonomy: 'family', morphology: 'body', diet: 'habits', behavior: 'habits', habitat: 'habitat', reproduction: 'life',
};

const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

/** The blank a field note shows in place of a word that would name the animal. */
export const BLANK = '____';
/** A note with more blanks than this is hard to read, so it waits for the reveal card. */
const MAX_BLANKS = 2;
/** Name words too generic to give an animal away ("Giant Pangolin" keeps "giant", "Red-eyed Tree Frog" keeps "tree"). */
const GENERIC = new Set(['giant', 'great', 'greater', 'lesser', 'common', 'northern', 'southern', 'eastern', 'western', 'island', 'tree', 'long', 'the', 'relatives']);

/** Words of a common name, lowercased, without possessives ("Blanding's Turtle" -> blanding, turtle). */
function nameWords(commonName: string): string[] {
  return commonName.toLowerCase().replace(/'s\b/g, '').split(/[\s-]+/).filter(word => word.length >= 3 && !GENERIC.has(word));
}

/** The nouns of a plain group name: "the dogs, wolves and foxes" -> dogs, wolves, foxes; "the monkeys of Africa and Asia" -> monkeys. */
function groupNouns(plain: string | null): string[] {
  if (!plain) return [];
  return plain.toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+of\s+.*$/, '').split(/,|\s+and\s+/)
    .map(part => part.trim().split(/\s+/).pop() ?? '').filter(word => word.length >= 3 && !GENERIC.has(word));
}

/** A plural noun and its singular forms (wolves -> wolf; foxes -> fox; tortoises -> tortoise; frogs -> frog). */
function forms(word: string): string[] {
  if (word.endsWith('ves')) return [word, `${word.slice(0, -3)}f`];
  if (word.endsWith('ies')) return [word, `${word.slice(0, -3)}y`];
  if (word.endsWith('es')) return [word, word.slice(0, -2), word.slice(0, -1)];
  if (word.endsWith('s')) return [word, word.slice(0, -1)];
  return [word];
}

/** Blank out every word that names the animal; longest first, so "red panda" becomes one blank. */
function censor(text: string, words: readonly string[]): { text: string; blanks: number } {
  let blanks = 0;
  let out = text;
  for (const word of [...new Set(words)].sort((a, b) => b.length - a.length)) {
    const pattern = new RegExp(`(^|[^\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:s|es|lets?|lings?)?(?=[^\\p{L}]|$)`, 'giu'); // froglets, ducklings
    out = out.replace(pattern, (_match, before: string) => { blanks++; return `${before}${BLANK}`; });
  }
  return { text: out, blanks };
}

/** One animal's content, whichever door it came in by. */
interface AnimalInput {
  id: number;
  commonName: string;
  scientificName: string;
  taxonomy: { class: string; order: string; family: string; genus: string };
  redList: { category: string; url: string };
  photo: string | null;
  /** Generated trait clues and hand-written clues, in the profile's order; hand-written ones become field notes. */
  clues: Array<{ category: string; text: string; tags: readonly string[]; source: Source; handWritten: boolean }>;
  /** Fun facts, in the profile's order; they become field notes after the hand-written clues. */
  facts: Array<{ text: string; source: Source }>;
  countries: Array<{ code: string; name: string }>;
}

function buildAnimal(input: AnimalInput, warn: (text: string) => void): Animal {
  const traits: Record<string, string[]> = {};
  const traitSources: Record<string, Source> = {};
  const guide: Animal['guide'] = { family: [], body: [], habits: [], habitat: [], range: [], life: [] };
  const redListSource: Source = { name: 'IUCN Red List', url: input.redList.url || null };

  for (const clue of input.clues) {
    if (clue.handWritten) continue;
    const section = GUIDE_CATEGORY[clue.category];
    const askable = clue.tags.filter(tag => PREFIX_CATEGORY[prefixOf(tag)]);
    for (const tag of askable) {
      (traits[prefixOf(tag)] ??= []).push(tag);
      traitSources[tag] = clue.source;
    }
    // The field guide: family tree lines (never the genus), and every line a question can check.
    if (section === 'family' && !clue.tags.some(tag => tag.startsWith('genus:'))) guide.family.push(clue.text);
    else if (section && section !== 'family' && askable.length > 0) guide[section].push(clue.text);
  }

  const { countries } = input;
  for (const country of countries) if (!regionOfCountry(country.code)) warn(`${input.commonName}: no region for country ${country.code} (${country.name})`);
  if (countries.length === 0) warn(`${input.commonName}: no countries, so no region or continent`);
  const regions = [...new Set(countries.map(country => regionOfCountry(country.code)).filter((region): region is string => region !== null))];
  if (regions.length > 0) {
    traits.region = regions.map(region => `region:${region}`);
    for (const tag of traits.region) traitSources[tag] = redListSource;
    guide.range.push(`It lives in ${regions.map(region => REGIONS[region].name).join(', ')}.`);
  }
  const continents = [...new Set(regions.map(region => REGIONS[region].continent))] as ContinentKey[];

  const tax = input.taxonomy;
  const familyPlain = FAMILY_NAMES[tax.family.toUpperCase()];
  const familyTree: Animal['familyTree'] = {
    class: { latin: title(tax.class), plain: CLASS_PLAIN[tax.class.toLowerCase()] ?? null },
    order: { latin: title(tax.order), plain: ORDER_NAMES[tax.order.toUpperCase()]?.toLowerCase() ?? null },
    family: { latin: title(tax.family), plain: familyPlain && !familyPlain.startsWith('which') ? familyPlain : `the ${input.commonName.toLowerCase()} family` },
    genus: title(tax.genus),
    species: input.scientificName,
  };

  // Words that would name the animal in a field note: its name, its groups (frog, cat, pangolin), its Latin names,
  // and where it lives. A round shows the note with blanks; the reveal card shows it whole.
  const giveaways = [
    input.commonName.toLowerCase(),
    ...nameWords(input.commonName),
    ...[familyTree.class.plain, familyTree.order.plain, familyPlain && !familyPlain.startsWith('which') ? familyPlain : null].flatMap(groupNouns).flatMap(forms),
    ...[tax.class, tax.order, tax.family, tax.genus].map(name => name.toLowerCase()),
    ...input.scientificName.toLowerCase().split(/\s+/).slice(1),
    ...countries.map(country => country.name.toLowerCase()),
    ...regions.map(region => REGIONS[region].name.toLowerCase().replace(/^the /, '')),
  ];
  const notes: FieldNote[] = [];
  const revealNotes: FieldNote[] = [];
  for (const item of [...input.clues.filter(clue => clue.handWritten), ...input.facts]) {
    const { text, blanks } = censor(item.text, giveaways);
    if (blanks === 0) notes.push({ text: item.text, source: item.source });
    else if (blanks <= MAX_BLANKS) notes.push({ text, full: item.text, source: item.source });
    else revealNotes.push({ text: item.text, source: item.source });
  }

  return {
    id: input.id, name: input.commonName, scientificName: input.scientificName, photo: input.photo,
    redList: input.redList.category, redListUrl: input.redList.url, continents, traits, traitSources, familyTree, notes, revealNotes, guide,
  };
}

/** The app's door: the pool from GET /api/clue-game/pool. `warn` hears about data the game can't use yet. */
export function animalsFromPool(pool: CluePool, warn: (text: string) => void = () => {}): Animal[] {
  return pool.species.map(species => {
    const unsourced: Source = { name: 'IUCN Red List', url: species.redlistUrl ?? null };
    // Clue ids follow the profile's order (species id x 100 + position), so sorting by id restores it.
    const clues = pool.clues.filter(clue => clue.speciesId === species.id).sort((a, b) => a.id - b.id);
    const codes = [...new Set(clues.flatMap(clue => clue.compareTags).filter(tag => tag.startsWith('country:')).map(tag => tag.slice(8).toUpperCase()))];
    return buildAnimal({
      id: species.id,
      commonName: species.commonName,
      scientificName: species.scientificName,
      taxonomy: { class: species.className ?? '', order: species.taxonOrder ?? '', family: species.family ?? '', genus: species.genus ?? '' },
      redList: { category: species.conservationCode ?? '', url: species.redlistUrl ?? '' },
      photo: species.photo?.url ?? null,
      clues: clues.map(clue => ({
        category: clue.category, text: clue.label, tags: clue.compareTags, source: clue.source ?? unsourced,
        handWritten: isHandWrittenClue({ category: clue.category, text: clue.label, tags: clue.compareTags }),
      })),
      facts: pool.facts.filter(fact => fact.speciesId === species.id).sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
        .map(fact => ({ text: fact.text, source: fact.source ?? unsourced })),
      countries: codes.map(code => ({ code, name: countryName(code) ?? code })),
    }, warn);
  });
}

/** The prototype's and the bot's door: the animal files, with the source registry for source names. */
export function animalsFromProfiles(profiles: readonly AnimalProfile[], registry: readonly Pick<ContentSource, 'key' | 'name'>[], warn: (text: string) => void = () => {}): Animal[] {
  const sourceNames = new Map(registry.map(source => [source.key, source.name]));
  return profiles.map(profile => {
    const sourceOf = (key: string, url?: string): Source => ({
      name: key === 'iucn_range' ? 'IUCN Red List' : sourceNames.get(key) ?? key,
      url: url ?? (key === 'iucn_range' ? profile.redList.url : profile.sources[key] ?? null),
    });
    const drafts = profileClues(profile);
    // profileClues lists the generated clues first, then the profile's own.
    const firstOwn = drafts.length - profile.clues.length;
    return buildAnimal({
      id: profile.id,
      commonName: profile.commonName,
      scientificName: profile.scientificName,
      taxonomy: profile.taxonomy,
      redList: { category: profile.redList.category, url: profile.redList.url },
      photo: profile.photo?.url ?? null,
      clues: drafts.map((draft, index) => ({ category: draft.category, text: draft.text, tags: draft.tags, source: sourceOf(draft.source, draft.url), handWritten: index >= firstOwn })),
      facts: profile.facts.map(fact => ({ text: fact.text, source: sourceOf(fact.source, fact.url) })),
      countries: profile.range?.countries ?? [],
    }, warn);
  });
}
