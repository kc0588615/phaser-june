export const TAG_VOCAB = {
  activity_pattern: ['nocturnal', 'diurnal', 'crepuscular', 'cathemeral'],
  sociality: ['solitary', 'pair', 'small_group', 'herd', 'colony'],
  locomotion: ['cursorial', 'arboreal', 'fossorial', 'semi_aquatic', 'saltatorial', 'scansorial'],
  diet_type: [
    'carnivore',
    'herbivore',
    'omnivore',
    'insectivore',
    'piscivore',
    'folivore',
    'frugivore',
    'nectarivore',
    'myrmecophage',
  ],
  foraging_style: ['ambush', 'pursuit', 'graze', 'browse', 'forage', 'dig', 'fish', 'glean', 'scavenge'],
  size_bucket: ['mouse', 'rabbit', 'dog', 'human', 'horse', 'elephant'],
  body_plan: ['compact', 'elongated', 'robust', 'graceful', 'armored'],
  distinctive_features: [
    'horns',
    'tusks',
    'antlers',
    'quills',
    'scales',
    'pouch',
    'prehensile_tail',
    'webbed_feet',
    'wings',
    'claws_digging',
    'claws_climbing',
    'mask_face',
    'stripes',
    'spots',
    'tuft_ears',
  ],
  climate_zone: ['arctic', 'temperate', 'tropical', 'arid', 'montane'],
  habitat_tag: [
    'rainforest',
    'dry_forest',
    'savanna',
    'grassland',
    'wetland',
    'river',
    'lake',
    'mangrove',
    'tundra',
    'desert',
    'montane_forest',
    'alpine',
    'cave',
    'urban_fringe',
    'coastal',
  ],
  threat_tag: [
    'poaching',
    'deforestation',
    'climate_change',
    'invasive',
    'disease',
    'agriculture',
    'pollution',
    'roadkill',
    'pet_trade',
    'trophy_hunt',
    'mining',
    'urban_development',
  ],
  parity: ['semelparous', 'iteroparous'],
  care_pattern: ['precocial', 'altricial', 'pouch', 'nest', 'den'],
  lifespan_bucket: ['under_5y', '5_15y', '15_25y', '25_50y', 'over_50y'],
} as const;

export type TagCategory = keyof typeof TAG_VOCAB;

export type DeductionProfileCategory =
  | 'habitat'
  | 'morphology'
  | 'diet'
  | 'behavior'
  | 'reproduction'
  | 'taxonomy'
  | 'geography'
  | 'conservation'
  | 'key_fact';

export const WHITELISTED_TAG_PREFIXES = [
  'family:',
  'genus:',
  'iucn:',
  'continent:',
  'signature:',
  'bioregion:',
  'misc:',
] as const;

export const ALL_TAGS: Set<string> = new Set(Object.values(TAG_VOCAB).flat());

const VOCAB_KEYS_BY_PROFILE_CATEGORY: Record<DeductionProfileCategory, readonly TagCategory[]> = {
  habitat: ['habitat_tag'],
  morphology: ['size_bucket', 'body_plan', 'distinctive_features'],
  diet: ['diet_type'],
  behavior: ['activity_pattern', 'sociality', 'locomotion', 'foraging_style'],
  reproduction: ['parity', 'care_pattern', 'lifespan_bucket'],
  taxonomy: [],
  geography: ['climate_zone'],
  conservation: ['threat_tag'],
  key_fact: [],
};

const DYNAMIC_PREFIX_HOME: Partial<Record<string, DeductionProfileCategory>> = {
  family: 'taxonomy',
  genus: 'taxonomy',
  continent: 'geography',
  bioregion: 'geography',
  iucn: 'conservation',
};

const TAG_VOCAB_BY_KEY = TAG_VOCAB as Record<TagCategory, readonly string[]>;
const DYNAMIC_TAG_VALUE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const IUCN_CODES = new Set(['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE']);

export function canonicalizeDeductionTag(
  tag: string,
  category: DeductionProfileCategory,
): string | null {
  if (tag.includes(':')) return isCanonicalDeductionTag(tag, category) ? tag : null;

  const matchingKeys = VOCAB_KEYS_BY_PROFILE_CATEGORY[category]
    .filter(key => TAG_VOCAB_BY_KEY[key].includes(tag));
  return matchingKeys.length === 1 ? `${matchingKeys[0]}:${tag}` : null;
}

export function isCanonicalDeductionTag(
  tag: string,
  category?: DeductionProfileCategory,
): boolean {
  const separator = tag.indexOf(':');
  if (separator <= 0 || separator === tag.length - 1 || tag.indexOf(':', separator + 1) !== -1) return false;

  const key = tag.slice(0, separator);
  const value = tag.slice(separator + 1);
  if (Object.hasOwn(TAG_VOCAB, key)) {
    const vocabKey = key as TagCategory;
    if (!TAG_VOCAB_BY_KEY[vocabKey].includes(value)) return false;
    return category === undefined || VOCAB_KEYS_BY_PROFILE_CATEGORY[category].includes(vocabKey);
  }

  if (!WHITELISTED_TAG_PREFIXES.some(prefix => prefix === `${key}:`)) return false;
  if (key === 'misc') return false;
  if (key === 'iucn') {
    return IUCN_CODES.has(value) && (category === undefined || category === 'conservation');
  }
  if (!DYNAMIC_TAG_VALUE.test(value)) return false;
  // A signature is stored in the one profile category that semantically owns it.
  if (key === 'signature') return true;
  return category === undefined || DYNAMIC_PREFIX_HOME[key] === category;
}

export function isFilteringDeductionTag(tag: string): boolean {
  return isCanonicalDeductionTag(tag) && !tag.startsWith('genus:') && !tag.startsWith('misc:');
}

export type DeductionTagProfile = Record<DeductionProfileCategory, readonly string[]> & {
  signatureTag: string | null;
};

export type DeductionProfileCorpusEntry = DeductionTagProfile & {
  id: string | number;
};

export function validateDeductionTagProfile(profile: DeductionTagProfile): string[] {
  const errors: string[] = [];
  const occurrences = new Map<string, DeductionProfileCategory[]>();

  for (const category of Object.keys(VOCAB_KEYS_BY_PROFILE_CATEGORY) as DeductionProfileCategory[]) {
    for (const tag of profile[category]) {
      if (!isCanonicalDeductionTag(tag, category)) errors.push(`${category}: invalid tag "${tag}"`);
      occurrences.set(tag, [...(occurrences.get(tag) ?? []), category]);
    }
  }

  for (const [tag, categories] of occurrences) {
    if (categories.length > 1) errors.push(`duplicate tag "${tag}"`);
  }

  if (profile.signatureTag) {
    if (!profile.signatureTag.startsWith('signature:') || !isCanonicalDeductionTag(profile.signatureTag)) {
      errors.push(`invalid signature tag "${profile.signatureTag}"`);
    }
    if ((occurrences.get(profile.signatureTag) ?? []).length !== 1) {
      errors.push(`signature tag "${profile.signatureTag}" must occur exactly once`);
    }
  }

  for (const tag of occurrences.keys()) {
    if (tag.startsWith('signature:') && tag !== profile.signatureTag) {
      errors.push(`undeclared signature tag "${tag}"`);
    }
  }

  return errors;
}

export function validateSeededSignatures(
  corpus: readonly DeductionProfileCorpusEntry[],
  seededIds: ReadonlySet<string | number>,
): string[] {
  const errors: string[] = [];
  const arrayOccurrences = new Map<string, Array<string | number>>();
  const signatureOwners = new Map<string, Array<string | number>>();

  for (const profile of corpus) {
    for (const category of Object.keys(VOCAB_KEYS_BY_PROFILE_CATEGORY) as DeductionProfileCategory[]) {
      for (const tag of profile[category]) {
        arrayOccurrences.set(tag, [...(arrayOccurrences.get(tag) ?? []), profile.id]);
      }
    }
    if (profile.signatureTag) {
      signatureOwners.set(profile.signatureTag, [...(signatureOwners.get(profile.signatureTag) ?? []), profile.id]);
    }
  }

  for (const profile of corpus) {
    if (!seededIds.has(profile.id)) continue;
    if (!profile.signatureTag) {
      errors.push(`${profile.id}: seeded profile requires a signature tag`);
      continue;
    }
    const tag = profile.signatureTag;
    if ((arrayOccurrences.get(tag) ?? []).length !== 1) {
      errors.push(`${profile.id}: signature tag "${tag}" must occur exactly once in profile corpus`);
    }
    if ((signatureOwners.get(tag) ?? []).some(id => id !== profile.id)) {
      errors.push(`${profile.id}: signature tag "${tag}" is another profile's signature`);
    }
  }

  return errors;
}

export function countDeductionTagOverlaps(
  profiles: readonly DeductionTagProfile[],
): Record<DeductionProfileCategory, Array<{ tag: string; count: number }>> {
  const result = {} as Record<DeductionProfileCategory, Array<{ tag: string; count: number }>>;
  for (const category of Object.keys(VOCAB_KEYS_BY_PROFILE_CATEGORY) as DeductionProfileCategory[]) {
    const counts = new Map<string, number>();
    for (const profile of profiles) {
      for (const tag of new Set(profile[category])) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    result[category] = [...counts]
      .filter(([, count]) => count > 1)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([tag, count]) => ({ tag, count }));
  }
  return result;
}

export function isKnownTag(tag: string): boolean {
  return ALL_TAGS.has(tag) || WHITELISTED_TAG_PREFIXES.some(prefix => tag.startsWith(prefix));
}
