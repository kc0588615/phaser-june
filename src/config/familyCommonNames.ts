/**
 * Family Common Names Configuration
 * 
 * This file serves as the single source of truth for mapping scientific family names
 * to their common (vernacular) names. This mapping is used throughout the application
 * to display user-friendly family names alongside scientific names.
 * 
 * Format: Scientific Family Name → Common Name
 * 
 * @example
 * getFamilyCommonName('Testudinidae') // returns 'tortoises'
 * getFamilyDisplayName('Testudinidae') // returns 'Testudinidae (tortoises)'
 */

/**
 * Core mapping of scientific family names to common names
 */
export const FAMILY_COMMON_NAMES: Record<string, string> = {
  // Mammals
  'Ailuridae': 'red pandas',
  'Bovidae': 'cattle, antelopes, goats & sheep',
  'Bradypodidae': 'three-toed sloths',
  'Canidae': 'dogs',
  'Cercopithecidae': 'Old World monkeys',
  'Chlamyphoridae': 'armadillos',
  'Chrysochloridae': 'golden moles',
  'Dasyuridae': 'carnivorous marsupials',
  'Daubentoniidae': 'aye-ayes',
  'Elephantidae': 'elephants',
  'Equidae': 'horses, zebras & asses',
  'Felidae': 'cats',
  'Giraffidae': 'giraffes & okapis',
  'Hominidae': 'great apes',
  'Macropodidae': 'kangaroos & wallabies',
  'Macroscelididae': 'sengis',
  'Manidae': 'pangolins',
  'Mustelidae': 'weasels, otters & badgers',
  'Ochotonidae': 'pikas',
  'Pteropodidae': 'Old World fruit bats',
  'Rhinocerotidae': 'rhinoceroses',
  'Sciuridae': 'squirrels',
  'Solenodontidae': 'solenodons',
  'Tachyglossidae': 'echidnas',
  'Thylacomyidae': 'bilbies',
  'Vombatidae': 'wombats',

  // Amphibians - Frogs and Toads
  'Arthroleptidae': 'squeakers & African tree frogs',
  'Ascaphidae': 'tailed frogs',
  'Brevicipitidae': 'rain frogs',
  'Conrauidae': 'giant (goliath) & slippery frogs',
  'Dendrobatidae': 'poison-dart (poison-arrow) frogs',
  'Microhylidae': 'narrow-mouthed frogs',
  'Nasikabatrachidae': 'purple (pig-nose) frogs',
  'Phyllomedusidae': 'leaf frogs',
  'Pipidae': 'tongueless clawed frogs',
  'Rhacophoridae': 'Asian tree (moss) frogs',
  'Rhinodermatidae': 'mouth-brooding (Darwin\'s) frogs',
  
  // Reptiles - Turtles and Tortoises
  'Carettochelyidae': 'pig-nosed turtle family',
  'Emydidae': 'pond, marsh & terrapin turtles',
  'Geoemydidae': 'Asian river & box turtles',
  'Platysternidae': 'big-headed turtle family',
  'Testudinidae': 'tortoises',
  'Trionychidae': 'softshell turtles',
  'TRIONYCHIDAE': 'softshell turtles', // Alternative spelling
};

/**
 * Get the common name for a scientific family name
 * @param scientificFamily - The scientific family name (e.g., 'Testudinidae')
 * @returns The common name or null if not found
 */
export function getFamilyCommonName(scientificFamily: string): string | null {
  if (!scientificFamily || scientificFamily === 'Unknown' || scientificFamily === 'NULL') {
    return null;
  }
  const exact = FAMILY_COMMON_NAMES[scientificFamily];
  if (exact) return exact;
  const matchingKey = Object.keys(FAMILY_COMMON_NAMES).find(
    family => family.toLowerCase() === scientificFamily.toLowerCase(),
  );
  return matchingKey ? FAMILY_COMMON_NAMES[matchingKey] : null;
}

/**
 * Get a display-friendly family name with common name in parentheses
 * @param scientificFamily - The scientific family name
 * @returns Formatted string like "Testudinidae (tortoises)" or just the scientific name if no common name exists
 */
export function getFamilyDisplayName(scientificFamily: string): string {
  if (!scientificFamily || scientificFamily === 'Unknown' || scientificFamily === 'NULL') {
    return 'Unknown';
  }
  
  const commonName = getFamilyCommonName(scientificFamily);
  if (commonName) {
    return `${scientificFamily} (${commonName})`;
  }
  return scientificFamily;
}

/**
 * Search for families by common name (case-insensitive)
 * @param searchTerm - Term to search for in common names
 * @returns Array of scientific family names that match the search term
 */
export function searchFamiliesByCommonName(searchTerm: string): string[] {
  if (!searchTerm || searchTerm.length < 2) {
    return [];
  }
  
  const term = searchTerm.toLowerCase();
  const matches: string[] = [];
  
  Object.entries(FAMILY_COMMON_NAMES).forEach(([scientificName, commonName]) => {
    if (commonName.toLowerCase().includes(term)) {
      matches.push(scientificName);
    }
  });
  
  return matches;
}
