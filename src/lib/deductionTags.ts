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
  ],
  parity: ['semelparous', 'iteroparous'],
  care_pattern: ['precocial', 'altricial', 'pouch', 'nest', 'den'],
  lifespan_bucket: ['under_5y', '5_15y', '15_25y', '25_50y', 'over_50y'],
} as const;

export type TagCategory = keyof typeof TAG_VOCAB;

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

export function isKnownTag(tag: string): boolean {
  return ALL_TAGS.has(tag) || WHITELISTED_TAG_PREFIXES.some(prefix => tag.startsWith(prefix));
}
