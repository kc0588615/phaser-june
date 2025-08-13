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

export interface FamilyMapping {
  scientificName: string;
  commonName: string;
  description?: string;
}

/**
 * Core mapping of scientific family names to common names
 */
export const FAMILY_COMMON_NAMES: Record<string, string> = {
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
 * Extended family information for detailed descriptions
 */
export const FAMILY_DETAILS: Record<string, FamilyMapping> = {
  'Arthroleptidae': {
    scientificName: 'Arthroleptidae',
    commonName: 'squeakers & African tree frogs',
    description: 'Small to medium-sized African frogs known for their distinctive calls'
  },
  'Ascaphidae': {
    scientificName: 'Ascaphidae',
    commonName: 'tailed frogs',
    description: 'Primitive frogs found in cold mountain streams of North America'
  },
  'Brevicipitidae': {
    scientificName: 'Brevicipitidae',
    commonName: 'rain frogs',
    description: 'Small, burrowing frogs that emerge during rainy periods'
  },
  'Carettochelyidae': {
    scientificName: 'Carettochelyidae',
    commonName: 'pig-nosed turtle family',
    description: 'Distinctive freshwater turtles with paddle-like limbs and pig-like snouts'
  },
  'Conrauidae': {
    scientificName: 'Conrauidae',
    commonName: 'giant (goliath) & slippery frogs',
    description: 'Includes the world\'s largest frog species, the Goliath frog'
  },
  'Dendrobatidae': {
    scientificName: 'Dendrobatidae',
    commonName: 'poison-dart (poison-arrow) frogs',
    description: 'Brightly colored frogs with toxic skin secretions, used by indigenous peoples for arrow tips'
  },
  'Emydidae': {
    scientificName: 'Emydidae',
    commonName: 'pond, marsh & terrapin turtles',
    description: 'Semi-aquatic turtles commonly found in freshwater habitats'
  },
  'Geoemydidae': {
    scientificName: 'Geoemydidae',
    commonName: 'Asian river & box turtles',
    description: 'Diverse family of Asian freshwater and terrestrial turtles'
  },
  'Microhylidae': {
    scientificName: 'Microhylidae',
    commonName: 'narrow-mouthed frogs',
    description: 'Small frogs with pointed snouts, specialized for eating ants and termites'
  },
  'Nasikabatrachidae': {
    scientificName: 'Nasikabatrachidae',
    commonName: 'purple (pig-nose) frogs',
    description: 'Ancient lineage of burrowing frogs with distinctive purple coloration'
  },
  'Phyllomedusidae': {
    scientificName: 'Phyllomedusidae',
    commonName: 'leaf frogs',
    description: 'Arboreal frogs that often rest on leaves with distinctive postures'
  },
  'Pipidae': {
    scientificName: 'Pipidae',
    commonName: 'tongueless clawed frogs',
    description: 'Aquatic frogs without tongues, with clawed digits for feeding'
  },
  'Platysternidae': {
    scientificName: 'Platysternidae',
    commonName: 'big-headed turtle family',
    description: 'Freshwater turtles with large heads that cannot be retracted into their shells'
  },
  'Rhacophoridae': {
    scientificName: 'Rhacophoridae',
    commonName: 'Asian tree (moss) frogs',
    description: 'Arboreal frogs with expanded toe pads for climbing'
  },
  'Rhinodermatidae': {
    scientificName: 'Rhinodermatidae',
    commonName: 'mouth-brooding (Darwin\'s) frogs',
    description: 'Males carry developing tadpoles in their vocal sacs'
  },
  'Testudinidae': {
    scientificName: 'Testudinidae',
    commonName: 'tortoises',
    description: 'Terrestrial turtles with high-domed shells and elephant-like feet'
  },
  'Trionychidae': {
    scientificName: 'Trionychidae',
    commonName: 'softshell turtles',
    description: 'Aquatic turtles with leathery shells and elongated snouts'
  },
  'TRIONYCHIDAE': {
    scientificName: 'TRIONYCHIDAE',
    commonName: 'softshell turtles',
    description: 'Aquatic turtles with leathery shells and elongated snouts'
  },
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
  return FAMILY_COMMON_NAMES[scientificFamily] || null;
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
 * Get detailed information about a family
 * @param scientificFamily - The scientific family name
 * @returns Family mapping with description or null if not found
 */
export function getFamilyDetails(scientificFamily: string): FamilyMapping | null {
  if (!scientificFamily || scientificFamily === 'Unknown' || scientificFamily === 'NULL') {
    return null;
  }
  return FAMILY_DETAILS[scientificFamily] || null;
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

/**
 * Get all available family mappings
 * @returns Array of all family mappings
 */
export function getAllFamilyMappings(): FamilyMapping[] {
  return Object.keys(FAMILY_COMMON_NAMES).map(scientificName => ({
    scientificName,
    commonName: FAMILY_COMMON_NAMES[scientificName],
    description: FAMILY_DETAILS[scientificName]?.description
  }));
}

/**
 * Check if a family has a common name mapping
 * @param scientificFamily - The scientific family name
 * @returns True if a common name exists for this family
 */
export function hasFamilyCommonName(scientificFamily: string): boolean {
  return getFamilyCommonName(scientificFamily) !== null;
}