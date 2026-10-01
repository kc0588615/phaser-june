// Plan 044 graybox: the picture each clue shows on its gems and order tile, as an
// emoji (or short text where no emoji fits), until the drawn clue art (Part 4).
// Avoids animal emoji, which would read as a suspect.
const FACES: Record<string, string> = {
  'size:tiny': 'XS', 'size:small': 'S', 'size:medium': 'M', 'size:large': 'L', 'size:huge': 'XL',
  'covering:fur': '🧶', 'covering:spines': '📍', 'covering:scales': '💠', 'covering:armor': '🛡️', 'covering:shell': '🐚', 'covering:skin': '✋',
  'diet:plants': '🥬', 'diet:meat': '🍖', 'diet:insects': '🐜', 'diet:mixed': '🍽️',
  'activity:day': '☀️', 'activity:night': '🌙', 'activity:twilight': '🌅', 'activity:any': '🕐',
  'social:alone': '👤', 'social:pairs': '👥', 'social:groups': '👪',
  'birth:eggs': '🥚', 'birth:live': '🍼',
  'young:one': 'x1', 'young:few': 'x3', 'young:many': 'x10',
  'lifespan:short': '⏱️', 'lifespan:medium': '⏳', 'lifespan:long': '🕰️',
  'system:terrestrial': '🏞️', 'system:freshwater': '💧', 'system:marine': '🌊',
  'habitat:forest': '🌳', 'habitat:savanna': '🌾', 'habitat:shrubland': '🌿', 'habitat:grassland': '🌱', 'habitat:wetlands': '💦',
  'habitat:rocky': '🪨', 'habitat:caves': '🕳️', 'habitat:desert': '🏜️', 'habitat:marine': '🏖️', 'habitat:artificial': '🏡',
};

/** Range questions point the way inside the continent, so two Range clues in a round look different. */
const REGION_FACES: Record<string, string> = {
  'north-africa': '⬆️', 'west-africa': '⬅️', 'central-africa': '🎯', 'east-africa': '➡️', 'southern-africa': '⬇️',
  'west-asia': '⬅️', 'central-asia': '🎯', 'east-asia': '➡️', 'south-asia': '⬇️', 'southeast-asia': '↘️',
  'northern-europe': '⬆️', 'western-europe': '⬅️', 'eastern-europe': '➡️', 'southern-europe': '⬇️',
  'usa-canada': '⬆️', 'central-america': '🎯', 'caribbean': '🏝️', 'south-america': '🧭',
  'melanesia': '⬆️', 'micronesia': '↗️', 'polynesia': '➡️', 'australia-nz': '⬇️',
};

/** The picture for a clue's tag. */
export function clueFace(tag: string): string {
  if (tag.startsWith('region:')) return REGION_FACES[tag.slice('region:'.length)] ?? '🧭';
  return FACES[tag] ?? '❓';
}

/** An open tag as a short phrase for a suspect's signs (digging_claws -> "digging claws"). */
export const signPhrase = (tag: string): string => tag.replace(/_/g, ' ');

/** A suspect's signs: the open tags its field guide records (not the question traits, which the clue chips show). */
export const signsOf = (tags: readonly string[] | undefined): string[] => (tags ?? []).filter(tag => !tag.includes(':')).map(signPhrase);
