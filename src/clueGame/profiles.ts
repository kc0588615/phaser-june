// Animal profiles (db/content/animals/*.json) are the source of truth for Clue
// Match content. Each holds the animal's IUCN Red List data, a value for every
// shared trait (size, diet, habitats...) and its own clues and fun facts, each
// with a source. This module turns a profile into database rows: shared traits
// become template clues every animal gets, so decoys can share them and the
// answer shows itself slowly. Pure; scripts/content.ts loads the rows.
import type { SpeciesClueCategory } from '@/clueGame/categories';
import type { ContentRows } from '@/clueGame/pool';
import { FAMILY_NAMES, ORDER_NAMES } from '@/clueGame/speciesInfo';
import { COMPLETE_PREFIXES, EXCLUSIVE_PREFIXES, prefixOf } from '@/clueGame/traits';

export type Size = 'tiny' | 'small' | 'medium' | 'large' | 'huge';
export type Lifespan = 'short' | 'medium' | 'long';
export type Diet = 'plants' | 'meat' | 'insects' | 'mixed';
export type Activity = 'day' | 'night' | 'twilight' | 'any';
export type Birth = 'eggs' | 'live';
export type Young = 'one' | 'few' | 'many';
export type Social = 'alone' | 'pairs' | 'groups';
export type Covering = 'fur' | 'spines' | 'scales' | 'armor' | 'shell' | 'skin';
export type System = 'terrestrial' | 'freshwater' | 'marine';
export type RedListCode = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX' | 'DD';
export type FactCategory = 'key_fact' | 'behavior' | 'diet_prey' | 'diet_flora' | 'life_description' | 'threat';

/** A shared trait's value, an optional detail sentence, and where it comes from (`url` when not the profile's page for that source). */
export interface Sourced<T> { value: T; note?: string; source: string; url?: string }

export interface AnimalProfile {
  id: number;
  commonName: string;
  scientificName: string;
  taxonomy: { class: string; order: string; family: string; genus: string };
  /** Key into the imported IUCN range polygons (iucn.id_no). */
  iucnId: number;
  /** trend: leave it out when the assessment doesn't give one. */
  redList: { category: RedListCode; year: number; trend?: 'increasing' | 'stable' | 'decreasing' | 'unknown'; url: string };
  systems: System[];
  /** IUCN habitat classes and kinds, e.g. 'savanna', 'savanna:dry', 'rocky'. */
  habitats: string[];
  /** Metres above sea level, from the Red List. */
  elevation?: [number, number];
  /** Shared traits. Leave one out when no source documents it: missing data never rules a candidate out. */
  traits: {
    size?: Sourced<Size>;
    lifespan?: Sourced<Lifespan>;
    diet?: Sourced<Diet>;
    activity?: Sourced<Activity>;
    birth?: Sourced<Birth>;
    young?: Sourced<Young>;
    social?: Sourced<Social>;
    covering?: Sourced<Covering>;
  };
  /** Written by `npm run content -- ranges` from the range maps (realms with at least 10% of the range; globe countries). */
  range?: { realms: string[]; countries: Array<{ code: string; name: string }> };
  /** Clues only this animal has (tags make them deductive). */
  clues: Array<{ category: SpeciesClueCategory; text: string; tags?: string[]; source: string; url?: string }>;
  /** Fun notes, shown once a color's clues run out and on the reveal card. */
  facts: Array<{ category: FactCategory; text: string; source: string; url?: string }>;
  /** Source key (content_sources.key) -> the page used for this animal. */
  sources: Record<string, string>;
  /** null: checked, no photo of the right species (`photos` skips it). */
  photo?: { url: string; credit: string; license: string; page: string } | null;
}

export interface ContentSource { id: number; key: string; tier: 1 | 2 | 3 | 4; name: string; url: string; notes: string }

const CLASS_TEXT: Record<string, string> = {
  amphibia: "It's an amphibian (class Amphibia).",
  reptilia: "It's a reptile (class Reptilia).",
  mammalia: "It's a mammal (class Mammalia).",
  aves: "It's a bird (class Aves).",
};

const SYSTEM_TEXT: Record<string, string> = {
  terrestrial: 'It lives on land.',
  freshwater: 'It lives in fresh water.',
  'freshwater,terrestrial': 'It lives on land and in fresh water.',
  marine: 'It lives in the sea.',
  'marine,terrestrial': 'It lives on land and in the sea.',
  'freshwater,marine': 'It lives in fresh water and in the sea.',
  'freshwater,marine,terrestrial': 'It lives on land, in fresh water and in the sea.',
};

const HABITAT_TEXT: Record<string, string> = {
  forest: 'It lives in forests.',
  savanna: 'It lives in savanna: grassland with scattered trees.',
  shrubland: 'It lives in shrubland, land covered in bushes.',
  grassland: 'It lives in grassland.',
  wetlands: 'It lives in wetlands: rivers, lakes, marshes or swamps.',
  rocky: 'It lives in rocky places like cliffs, boulder hills or mountain peaks.',
  caves: 'It lives in caves.',
  desert: 'It lives in desert.',
  marine: 'It lives along coasts or in the sea.',
  artificial: 'It also lives on land people have changed, like farms, plantations or towns.',
};

const HABITAT_KIND_TEXT: Record<string, string> = {
  'forest:boreal': 'It lives in cold northern (boreal) forest.',
  'forest:subarctic': 'It lives in subarctic forest near the Arctic.',
  'forest:subantarctic': 'It lives in subantarctic forest, the cool rainy forests of the far south.',
  'forest:temperate': 'It lives in temperate forest, with warm summers and cold winters.',
  'forest:tropical_dry': 'It lives in tropical dry forest.',
  'forest:tropical_moist_lowland': 'It lives in tropical lowland rainforest.',
  'forest:mangrove': 'It lives in mangrove forest on tropical coasts.',
  'forest:tropical_swamp': 'It lives in tropical swamp forest.',
  'forest:tropical_moist_montane': 'It lives in tropical mountain rainforest (cloud forest).',
  'savanna:dry': 'It lives in dry savanna.',
  'savanna:moist': 'It lives in moist savanna.',
  'shrubland:boreal': 'It lives in cold northern shrubland.',
  'shrubland:temperate': 'It lives in temperate shrubland.',
  'shrubland:tropical_dry': 'It lives in tropical dry shrubland (thorn bush).',
  'shrubland:tropical_moist': 'It lives in tropical moist shrubland.',
  'shrubland:tropical_high_altitude': 'It lives in high mountain shrubland in the tropics.',
  'shrubland:mediterranean': 'It lives in Mediterranean-type shrubland, with dry summers and wet winters.',
  'grassland:tundra': 'It lives on the tundra, the treeless land of the far north.',
  'grassland:subarctic': 'It lives in subarctic grassland.',
  'grassland:temperate': 'It lives in temperate grassland, like prairie or steppe.',
  'grassland:tropical_dry': 'It lives in tropical dry grassland.',
  'grassland:tropical_seasonally_wet': 'It lives in tropical grassland that floods in the wet season.',
  'grassland:tropical_high_altitude': 'It lives in high mountain grassland in the tropics.',
  'wetlands:permanent_rivers': 'It lives in or by rivers and streams that flow all year.',
  'wetlands:seasonal_rivers': 'It lives by streams that only flow in the wet season.',
  'wetlands:shrub_wetlands': 'It lives in bushy wetlands.',
  'wetlands:bogs_marshes': 'It lives in bogs, marshes, swamps or fens.',
  'wetlands:permanent_lakes': 'It lives in lakes that hold water all year.',
  'wetlands:seasonal_lakes': 'It lives in lakes that fill up in the wet season.',
  'wetlands:permanent_marshes': 'It lives in small marshes and pools that hold water all year.',
  'wetlands:seasonal_marshes': 'It lives in pools that only fill in the wet season.',
  'wetlands:springs': 'It lives by freshwater springs or oases.',
  'wetlands:alpine': 'It lives in wetlands high in the mountains.',
  'wetlands:inland_deltas': 'It lives in big river deltas far from the sea.',
  'wetlands:karst': 'It lives in underground streams and caves in limestone.',
  'desert:hot': 'It lives in hot desert.',
  'desert:temperate': 'It lives in temperate desert.',
  'desert:cold': 'It lives in cold desert.',
  'marine:intertidal': 'It lives on the shore between high and low tide.',
  'marine:coastal': 'It lives on sandy or rocky coasts.',
  'marine:estuaries': 'It lives in estuaries, where rivers meet the sea.',
  'marine:mangroves': 'It lives among mangrove roots at the coast.',
  'artificial:arable': 'It also lives in farm fields.',
  'artificial:pasture': 'It also lives in pastures where livestock graze.',
  'artificial:plantations': 'It also lives in plantations, like oil palm or rubber.',
  'artificial:gardens': 'It also lives in village gardens.',
  'artificial:urban': 'It also lives in towns or cities.',
  'artificial:degraded_forest': 'It also lives in tropical forest that has been heavily cut.',
  'artificial:ponds': 'It also lives in ponds, canals or reservoirs people have made.',
};

const COVERING_TEXT: Record<Covering, string> = {
  fur: 'Its body is covered in fur.',
  spines: 'Its body is covered in spines.',
  scales: 'Its body is covered in overlapping scales.',
  armor: 'Its body is protected by bands of bony armor.',
  shell: 'It has a shell.',
  skin: 'Its skin is bare, with no scales, fur or feathers.',
};

const SIZE_TEXT: Record<Size, string> = {
  tiny: 'It is tiny: under 100 g, lighter than an apple.',
  small: 'It is small: between 100 g and 2 kg.',
  medium: 'It is medium-sized: between 2 and 30 kg.',
  large: 'It is large: between 30 and 300 kg.',
  huge: 'It is huge: over 300 kg.',
};

const DIET_TEXT: Record<Diet, string> = {
  plants: 'It eats plants.',
  meat: 'It eats other animals.',
  insects: 'It eats insects and other small invertebrates.',
  mixed: 'It eats both plants and animals.',
};

const ACTIVITY_TEXT: Record<Activity, string> = {
  day: 'It is active during the day.',
  night: 'It is active at night.',
  twilight: 'It is most active at dawn and dusk.',
  any: 'It can be active by day or by night.',
};

const SOCIAL_TEXT: Record<Social, string> = {
  alone: 'It lives alone for most of its life.',
  pairs: 'It lives in pairs or small families.',
  groups: 'It lives in groups.',
};

const BIRTH_TEXT: Record<Birth, string> = {
  eggs: 'It lays eggs.',
  live: 'It gives birth to live young.',
};

const YOUNG_TEXT: Record<Young, string> = {
  one: 'It has just one or two young at a time.',
  few: 'It has a few young at a time (3 to 10).',
  many: 'It has lots of young at once (more than 10).',
};

const LIFESPAN_TEXT: Record<Lifespan, string> = {
  short: 'It lives less than 5 years.',
  medium: 'It can live 5 to 20 years.',
  long: 'It can live more than 20 years.',
};

const RED_LIST_TEXT: Record<RedListCode, string> = {
  LC: 'Least Concern', NT: 'Near Threatened', VU: 'Vulnerable', EN: 'Endangered', CR: 'Critically Endangered',
  EW: 'Extinct in the Wild', EX: 'Extinct', DD: 'Data Deficient',
};

const TREND_TEXT = {
  decreasing: 'Its numbers are going down.',
  stable: 'Its numbers are holding steady.',
  increasing: 'Its numbers are going up.',
  unknown: 'Nobody knows yet whether its numbers are rising or falling.',
} as const;

const REALM_TEXT: Record<string, string> = {
  'realm:nearctic': 'It lives in North America (the Nearctic realm).',
  'realm:neotropical': 'It lives in Central or South America (the Neotropical realm).',
  'realm:palearctic': 'It lives in Europe, North Africa or northern Asia (the Palearctic realm).',
  'realm:afrotropical': 'It lives in Africa south of the Sahara (the Afrotropical realm).',
  'realm:indomalayan': 'It lives in South or Southeast Asia (the Indomalayan realm).',
  'realm:australasian': 'It lives in Australia or New Guinea (the Australasian realm).',
  'realm:oceanian': 'It lives on the Pacific islands (the Oceanian realm).',
  'realm:antarctic': 'It lives in Antarctica (the Antarctic realm).',
};

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
/** A template sentence, then the profile's detail sentence. */
const withNote = (text: string, note?: string) => (note ? `${text} ${note}` : text);
const listNames = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

type ClueDraft = { category: SpeciesClueCategory; text: string; tags: string[]; source: string; url?: string };

/** The template clues every animal gets, then its own, in broad-to-narrow order within each category. */
export function profileClues(profile: AnimalProfile): ClueDraft[] {
  const { taxonomy: tax, traits } = profile;
  const drafts: ClueDraft[] = [];
  const add = (category: SpeciesClueCategory, text: string, tags: string[], source: string, url?: string) => drafts.push({ category, text, tags, source, url });

  // Family tree: one rank per clue, broadest first.
  const cls = tax.class.toLowerCase();
  add('taxonomy', CLASS_TEXT[cls] ?? `Its class is ${titleCase(cls)}.`, [`class:${cls}`], 'iucn');
  const orderName = ORDER_NAMES[tax.order.toUpperCase()];
  add('taxonomy', orderName ? `It belongs to the ${orderName.toLowerCase()} (order ${titleCase(tax.order)}).` : `Its order is ${titleCase(tax.order)}.`, [`order:${tax.order.toLowerCase()}`], 'iucn');
  const familyName = FAMILY_NAMES[tax.family.toUpperCase()];
  add('taxonomy', `Its family is ${titleCase(tax.family)}${familyName ? `, ${familyName}` : ''}.`, [`family:${tax.family.toLowerCase()}`], 'iucn');
  add('taxonomy', `Its genus is ${titleCase(tax.genus)}, the first word of its scientific name.`, [`genus:${tax.genus.toLowerCase()}`], 'iucn');

  // Habitat: land or water first, then IUCN habitat classes, then their kinds.
  const systems = [...profile.systems].sort();
  add('habitat', SYSTEM_TEXT[systems.join(',')] ?? `It lives in these systems: ${systems.join(', ')}.`, systems.map(system => `system:${system}`), 'iucn');
  for (const habitat of profile.habitats.filter(h => !h.includes(':'))) add('habitat', HABITAT_TEXT[habitat] ?? `It lives in ${habitat}.`, [`habitat:${habitat}`], 'iucn');
  for (const kind of profile.habitats.filter(h => h.includes(':'))) add('habitat', HABITAT_KIND_TEXT[kind] ?? `It lives in ${kind.replace(':', ' (').replace(/_/g, ' ')}).`, [kind], 'iucn');
  if (profile.elevation) {
    const [low, high] = profile.elevation.map(metres => metres.toLocaleString('en-US'));
    add('habitat', low === high ? `It is found at about ${low} m above sea level.` : `It is found from ${low} to ${high} m above sea level.`, [], 'iucn');
  }

  // Range, from the range maps: realms one by one, then every country at once.
  for (const realm of profile.range?.realms ?? []) add('geography', REALM_TEXT[realm] ?? `It lives in the ${realm.slice(6)} realm.`, [realm], 'iucn_range');
  const countries = profile.range?.countries ?? [];
  if (countries.length > 0) {
    const names = countries.map(country => country.name);
    const shown = names.length > 6 ? `${names.slice(0, 5).join(', ')} and ${names.length - 5} more countries` : listNames(names);
    add('geography', `It lives in ${shown}.`, countries.map(country => `country:${country.code.toLowerCase()}`), 'iucn_range');
  }

  const trait = <T extends string>(category: SpeciesClueCategory, name: string, value: Sourced<T> | undefined, text: Record<T, string>) => {
    if (value) add(category, withNote(text[value.value], value.note), [`${name}:${value.value}`], value.source, value.url);
  };
  trait('morphology', 'covering', traits.covering, COVERING_TEXT);
  trait('morphology', 'size', traits.size, SIZE_TEXT);
  trait('diet', 'diet', traits.diet, DIET_TEXT);
  trait('behavior', 'activity', traits.activity, ACTIVITY_TEXT);
  trait('behavior', 'social', traits.social, SOCIAL_TEXT);
  trait('reproduction', 'birth', traits.birth, BIRTH_TEXT);
  trait('reproduction', 'young', traits.young, YOUNG_TEXT);
  trait('reproduction', 'lifespan', traits.lifespan, LIFESPAN_TEXT);

  add('conservation', `IUCN Red List (${profile.redList.year}): ${RED_LIST_TEXT[profile.redList.category]}.`, [], 'iucn');
  if (profile.redList.trend && profile.redList.category !== 'EX') add('conservation', TREND_TEXT[profile.redList.trend], [], 'iucn');

  for (const clue of profile.clues) add(clue.category, clue.text, clue.tags ?? [], clue.source, clue.url);
  return drafts;
}

/**
 * Whether a clue row is one the profile author wrote (it becomes a field note) rather than one profileClues
 * generates from shared traits. Generated clues carry a trait tag (size:, realm:, habitat:, class: ...), except
 * the elevation line and the two Red List lines.
 */
export function isHandWrittenClue({ category, text, tags }: { category: string; text: string; tags: readonly string[] }): boolean {
  if (tags.some(tag => { const prefix = prefixOf(tag); return prefix !== null && (EXCLUSIVE_PREFIXES.has(prefix) || COMPLETE_PREFIXES.has(prefix)); })) return false;
  if (/^It is found (at about|from) [\d,]+( to [\d,]+)? m above sea level\.$/.test(text)) return false;
  if (category === 'conservation' && (text.startsWith('IUCN Red List (') || (Object.values(TREND_TEXT) as string[]).includes(text))) return false;
  return true;
}

const TRAIT_VALUES: Record<keyof AnimalProfile['traits'], readonly string[]> = {
  size: Object.keys(SIZE_TEXT), lifespan: Object.keys(LIFESPAN_TEXT), diet: Object.keys(DIET_TEXT), activity: Object.keys(ACTIVITY_TEXT),
  birth: Object.keys(BIRTH_TEXT), young: Object.keys(YOUNG_TEXT), social: Object.keys(SOCIAL_TEXT), covering: Object.keys(COVERING_TEXT),
};
const CLUE_CATEGORIES = ['habitat', 'morphology', 'diet', 'behavior', 'reproduction', 'taxonomy', 'key_fact', 'geography', 'conservation'];
const FACT_CATEGORIES = ['key_fact', 'behavior', 'diet_prey', 'diet_flora', 'life_description', 'threat'];

/** What's missing or wrong in a profile; empty when it can be built. */
export function checkProfile(profile: AnimalProfile, sources: readonly Pick<ContentSource, 'key'>[]): string[] {
  const problems: string[] = [];
  const known = new Set(sources.map(source => source.key));
  const cite = (where: string, key: string | undefined, url?: string) => {
    if (!key || !known.has(key)) problems.push(`${where}: unknown source "${key}"`);
    else if (key !== 'iucn_range' && !url && !profile.sources?.[key]) problems.push(`${where}: no ${key} page in "sources"`);
  };
  if (!profile.commonName || !profile.scientificName || !Number.isInteger(profile.id) || !Number.isInteger(profile.iucnId)) problems.push('id, names and iucnId are required');
  for (const rank of ['class', 'order', 'family', 'genus'] as const) if (!profile.taxonomy?.[rank]) problems.push(`taxonomy.${rank} is missing`);
  if (!RED_LIST_TEXT[profile.redList?.category] || !profile.redList?.year || !profile.redList?.url) problems.push('redList needs category, year and url');
  if (profile.redList?.trend && !TREND_TEXT[profile.redList.trend]) problems.push(`unknown trend "${profile.redList.trend}"`);
  if (!profile.systems?.length || profile.systems.some(system => !['terrestrial', 'freshwater', 'marine'].includes(system))) problems.push('systems must list terrestrial, freshwater or marine');
  for (const habitat of profile.habitats ?? []) {
    if (!HABITAT_TEXT[habitat] && !HABITAT_KIND_TEXT[habitat]) problems.push(`unknown habitat "${habitat}"`);
    const cls = habitat.split(':')[0];
    if (habitat.includes(':') && !profile.habitats.includes(cls)) problems.push(`habitat "${habitat}" needs its class "${cls}" too`);
  }
  if (!profile.habitats?.length) problems.push('habitats are missing');
  for (const [name, values] of Object.entries(TRAIT_VALUES) as Array<[keyof AnimalProfile['traits'], readonly string[]]>) {
    const trait = profile.traits?.[name];
    if (!trait) continue;
    if (!values.includes(trait.value)) problems.push(`traits.${name} must be one of ${values.join(', ')}`);
    else cite(`traits.${name}`, trait.source, trait.url);
  }
  for (const [i, clue] of (profile.clues ?? []).entries()) {
    if (!CLUE_CATEGORIES.includes(clue.category) || !clue.text?.trim()) problems.push(`clues[${i}] needs a category and text`);
    const reserved = (clue.tags ?? []).filter(tag => { const prefix = prefixOf(tag); return prefix && (EXCLUSIVE_PREFIXES.has(prefix) || COMPLETE_PREFIXES.has(prefix)); });
    if (reserved.length) problems.push(`clues[${i}] uses generated tags ${reserved.join(', ')}; set the trait instead`);
    if ((clue.tags ?? []).some(tag => tag !== tag.toLowerCase().trim())) problems.push(`clues[${i}] tags must be lowercase`);
    cite(`clues[${i}]`, clue.source, clue.url);
  }
  for (const [i, fact] of (profile.facts ?? []).entries()) {
    if (!FACT_CATEGORIES.includes(fact.category) || !fact.text?.trim()) problems.push(`facts[${i}] needs a category and text`);
    cite(`facts[${i}]`, fact.source, fact.url);
  }
  if ((profile.facts ?? []).filter(fact => fact.category === 'key_fact').length === 0) problems.push('add at least one key_fact for the reveal card');
  return problems;
}

/** Database rows for every profile, with stable ids (species id x 100 + position). */
export function contentRowsFromProfiles(profiles: readonly AnimalProfile[]) {
  const species = profiles.map(profile => ({
    id: profile.id,
    iucn_id: profile.iucnId,
    scientific_name: profile.scientificName,
    common_name: profile.commonName,
    class: profile.taxonomy.class.toUpperCase(),
    taxon_order: profile.taxonomy.order.toUpperCase(),
    family: profile.taxonomy.family.toUpperCase(),
    genus: titleCase(profile.taxonomy.genus),
    conservation_code: profile.redList.category,
    redlist_url: profile.redList.url,
    photo_url: profile.photo?.url ?? null,
    photo_credit: profile.photo?.credit ?? null,
    photo_license: profile.photo?.license ?? null,
    photo_page: profile.photo?.page ?? null,
  }));
  const clues = profiles.flatMap(profile => {
    const order = new Map<string, number>();
    return profileClues(profile).map((draft, index) => {
      const revealOrder = (order.get(draft.category) ?? 0) + 1;
      order.set(draft.category, revealOrder);
      return {
        id: profile.id * 100 + index + 1, species_id: profile.id, category: draft.category, label: draft.text,
        compare_tags: draft.tags, reveal_order: revealOrder, is_filtering: draft.tags.length > 0,
        source_key: draft.source, source_url: draft.url ?? profile.sources[draft.source] ?? null,
      };
    });
  });
  const facts = profiles.flatMap(profile => {
    const order = new Map<string, number>();
    return profile.facts.map((fact, index) => {
      const sortOrder = (order.get(fact.category) ?? 0) + 1;
      order.set(fact.category, sortOrder);
      return {
        id: profile.id * 100 + index + 1, species_id: profile.id, category: fact.category, fact_text: fact.text,
        sort_order: sortOrder, source_key: fact.source, source_url: fact.url ?? profile.sources[fact.source] ?? null,
      };
    });
  });
  return { species, clues, facts } satisfies ContentRows;
}
