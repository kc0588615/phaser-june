// Content -> the Animal records the animal board plays with (questionMatch.ts): the traits
// questions can ask about, regions and continents, family tree names, field guide lines,
// signs, and field notes with their sources.
// Two front doors, one builder: animalsFromPool for the game (database rows from
// GET /api/clue-game/pool; it skips, with a warning, a sign this code doesn't know) and
// animalsFromProfiles for the balance bot and the unit tests (db/content/animals/*.json; strict).
// Also witnessNameProblems, the authoring check that no sign's witness sentence names a holder. Pure.
import { isHandWrittenClue, presentCountries, profileClues, type AnimalProfile, type ContentSource } from '@/clueGame/profiles';
import type { CluePool } from '@/clueGame/pool';
import { SIGNS, heldSigns, isKnownSign, signsOf, witnessSentence, type SignTable } from '@/clueGame/signs';
import { FAMILY_NAMES, ORDER_NAMES } from '@/clueGame/speciesInfo';
import { REGIONS, countryName, regionOfCountry, type ContinentKey } from '@/clueGame/regions';
import { PREFIX_CATEGORY, prefixOf, type Animal, type ChargeCategory, type FieldNote, type Source } from '@/clueGame/questionMatch';

const CLASS_PLAIN: Record<string, string> = { mammalia: 'mammals', amphibia: 'amphibians', reptilia: 'reptiles', aves: 'birds' };

const GUIDE_CATEGORY: Record<string, ChargeCategory | 'family'> = {
  taxonomy: 'family', morphology: 'body', diet: 'habits', behavior: 'habits', habitat: 'habitat', reproduction: 'life',
};

const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

/** What `censor` puts in place of a word that would name the animal. */
const BLANK = '____';
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

/** The animal's regions, from its countries (a country with no region adds none). */
const regionsOf = (countries: ReadonlyArray<{ code: string }>): string[] =>
  [...new Set(countries.map(country => regionOfCountry(country.code)).filter((region): region is string => region !== null))];

/** A family's plain name, unless FAMILY_NAMES only describes it ("which has only one living species"). */
const familyPlainOf = (family: string): string | null => {
  const plain = FAMILY_NAMES[family.toUpperCase()];
  return plain && !plain.startsWith('which') ? plain : null;
};

/** Words that would name the animal: its name, its groups (frog, cat, pangolin), its Latin names, and where it lives. */
function giveawaysOf(animal: { commonName: string; scientificName: string; taxonomy: AnimalInput['taxonomy']; countries: ReadonlyArray<{ code: string; name: string }> }): string[] {
  const tax = animal.taxonomy;
  return [
    animal.commonName.toLowerCase(),
    ...nameWords(animal.commonName),
    ...[CLASS_PLAIN[tax.class.toLowerCase()] ?? null, ORDER_NAMES[tax.order.toUpperCase()]?.toLowerCase() ?? null, familyPlainOf(tax.family)].flatMap(groupNouns).flatMap(forms),
    ...[tax.class, tax.order, tax.family, tax.genus].map(name => name.toLowerCase()),
    ...animal.scientificName.toLowerCase().split(/\s+/).slice(1),
    ...animal.countries.map(country => country.name.toLowerCase()),
    ...regionsOf(animal.countries).map(region => REGIONS[region].name.toLowerCase().replace(/^the /, '')),
  ].filter(word => word.length > 0);
}

/**
 * Each held sign whose witness sentence names one of its holders (giveawaysOf, no exemptions), as a message naming the
 * animal and the sign; empty when every sentence is safe to deal. Signs held by implication count; null sentences don't.
 * Unknown open tags are skipped (checkProfile reports them), so the known signs are still checked and preview runs on.
 */
export function witnessNameProblems(profiles: readonly AnimalProfile[], table: SignTable = SIGNS): string[] {
  return profiles.flatMap(profile => {
    const words = giveawaysOf({ ...profile, countries: presentCountries(profile) });
    const tags = profileClues(profile).flatMap(clue => clue.tags).filter(tag => tag.includes(':') || isKnownSign(tag, table));
    return [...heldSigns(tags, table)].flatMap(sign => {
      const text = witnessSentence(sign, table);
      if (text === null) return [];
      const named = censor(text, words);
      return named.blanks > 0 ? [`${profile.commonName}: the witness sentence of "${sign}" names it ("${named.text}"): reword it in SIGNS (src/clueGame/signs.ts)`] : [];
    });
  });
}

/** One animal's content, whichever door it came in by. */
interface AnimalInput {
  id: number;
  commonName: string;
  scientificName: string;
  taxonomy: { class: string; order: string; family: string; genus: string };
  photo: string | null;
  /** Generated trait clues and hand-written clues, in the profile's order; hand-written ones become field notes. */
  clues: Array<{ category: string; text: string; tags: readonly string[]; source: Source; handWritten: boolean }>;
  /** Fun facts, in the profile's order; they become field notes after the hand-written clues. */
  facts: Array<{ text: string; source: Source }>;
  countries: Array<{ code: string; name: string }>;
}

function buildAnimal(input: AnimalInput, warn: (text: string) => void): Animal {
  const traits: Record<string, string[]> = {};
  const guide: Animal['guide'] = { family: [], body: [], habits: [], habitat: [], range: [], life: [] };

  for (const clue of input.clues) {
    if (clue.handWritten) continue;
    const section = GUIDE_CATEGORY[clue.category];
    const askable = clue.tags.filter(tag => PREFIX_CATEGORY[prefixOf(tag)]);
    for (const tag of askable) (traits[prefixOf(tag)] ??= []).push(tag);
    // The field guide: family tree lines (never the genus), and every line a question can check.
    if (section === 'family' && !clue.tags.some(tag => tag.startsWith('genus:'))) guide.family.push({ text: clue.text, tags: [] });
    else if (section && section !== 'family' && askable.length > 0) guide[section].push({ text: clue.text, tags: askable });
  }

  const { countries } = input;
  for (const country of countries) if (!regionOfCountry(country.code)) warn(`${input.commonName}: no region for country ${country.code} (${country.name})`);
  if (countries.length === 0) warn(`${input.commonName}: no countries, so no region or continent`);
  const regions = regionsOf(countries);
  if (regions.length > 0) {
    traits.region = regions.map(region => `region:${region}`);
    guide.range.push({ text: `It lives in ${regions.map(region => REGIONS[region].name).join(', ')}.`, tags: traits.region });
  }
  const continents = [...new Set(regions.map(region => REGIONS[region].continent))] as ContinentKey[];

  const tax = input.taxonomy;
  const familyPlain = familyPlainOf(tax.family);
  const familyTree: Animal['familyTree'] = {
    class: { latin: title(tax.class), plain: CLASS_PLAIN[tax.class.toLowerCase()] ?? null },
    order: { latin: title(tax.order), plain: ORDER_NAMES[tax.order.toUpperCase()]?.toLowerCase() ?? null },
    family: { latin: title(tax.family), plain: familyPlain ?? `the ${input.commonName.toLowerCase()} family` },
    genus: title(tax.genus),
    species: input.scientificName,
  };

  // Field notes, whole, in profile order: the hand-written clues, then the facts (the reveal card lists them all).
  const notes: FieldNote[] = [];
  const items: Array<{ text: string; source: Source; tags?: readonly string[] }> = [...input.clues.filter(clue => clue.handWritten), ...input.facts];
  for (const item of items) notes.push({ text: item.text, source: item.source, ...(item.tags?.length ? { tags: [...item.tags] } : {}) });

  const allTags = [...new Set(input.clues.flatMap(clue => clue.tags))];
  return {
    id: input.id, name: input.commonName, scientificName: input.scientificName, photo: input.photo,
    continents, traits, familyTree, notes, guide,
    // An unknown sign throws here, at load (plan 055), never in a render.
    signs: signsOf(allTags), tags: allTags,
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
      photo: species.photo?.url ?? null,
      clues: clues.map(clue => ({
        category: clue.category, text: clue.label, source: clue.source ?? unsourced,
        // A sign a newer content build wrote, which this code doesn't know yet, is skipped, not a crash.
        tags: clue.compareTags.filter(tag => {
          if (tag.includes(':') || isKnownSign(tag)) return true;
          warn(`${species.commonName}: skipping unknown sign "${tag}" from pool`);
          return false;
        }),
        handWritten: isHandWrittenClue({ category: clue.category, text: clue.label, tags: clue.compareTags }),
      })),
      facts: pool.facts.filter(fact => fact.speciesId === species.id).sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
        .map(fact => ({ text: fact.text, source: fact.source ?? unsourced })),
      countries: codes.map(code => ({ code, name: countryName(code) ?? code })),
    }, warn);
  });
}

/** The bot's and the unit tests' door: the animal files, with the source registry for source names. */
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
      photo: profile.photo?.url ?? null,
      clues: drafts.map((draft, index) => ({ category: draft.category, text: draft.text, tags: draft.tags, source: sourceOf(draft.source, draft.url), handWritten: index >= firstOwn })),
      facts: profile.facts.map(fact => ({ text: fact.text, source: sourceOf(fact.source, fact.url) })),
      countries: presentCountries(profile),
    }, warn);
  });
}
