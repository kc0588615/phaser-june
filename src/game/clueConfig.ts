import type { Species } from '@/types/database';

export enum GemCategory {
  CLASSIFICATION = 0,  // 🧬 Red gem
  HABITAT = 1,        // 🌳 Green gem
  GEOGRAPHIC = 2,     // 🗺️ Blue gem
  MORPHOLOGY = 3,     // 🐾 Orange gem
  BEHAVIOR = 5,       // 💨 Yhite gem
  LIFE_CYCLE = 6,     // ⏳ Black gem
  CONSERVATION = 7,   // 🛡️ White gem
  KEY_FACTS = 8,      // 🔮 Purple gem
}

export interface ClueConfigItem {
  color: string;                   // e.g. 'red'
  categoryName: string;            // e.g. 'Classification'
  icon: string;                    // e.g. '🧬'
  getClue: (s: Species) => string; // one function for this category
}

export interface CluePayload {
  category: GemCategory;
  heading: string;
  clue: string;
  speciesId: number;
  name: string;
  icon: string;
  color: string;
}

// ---- Progressive classification helpers ----
const CLASSIFICATION_SEQUENCE: Array<keyof Species> = [
  'phylum',
  'class',
  'order_',   // note underscore
  'family',
  'genus',
  'sci_name'
];

// Tracks how many steps revealed per Species instance
const classificationProgress = new WeakMap<Species, number>();

function getNextClassificationClue(species: Species): string {
  let progress = classificationProgress.get(species) ?? 0;

  while (progress < CLASSIFICATION_SEQUENCE.length) {
    const field = CLASSIFICATION_SEQUENCE[progress];
    const value = species[field] as unknown as string | undefined;
    progress++;
    classificationProgress.set(species, progress);

    if (value) {
      // Format label based on field
      switch (field) {
        case 'phylum': return `Phylum: ${value}`;
        case 'class': return `Class: ${value}`;
        case 'order_': return `Order: ${value}`;
        case 'family': return `Family: ${value}`;
        case 'genus': return `Genus: ${value}`;
        case 'sci_name': return `Scientific name: ${value}`;
        default: return value;
      }
    }
    // If value missing, loop to attempt next field (still counts toward progress)
  }

  return ''; // No more clues
}

export function isClassificationComplete(species: Species): boolean {
  const progress = classificationProgress.get(species) ?? 0;
  // Complete when we've iterated through entire sequence
  return progress >= CLASSIFICATION_SEQUENCE.length;
}

export function resetClassificationProgress(species: Species) {
  classificationProgress.delete(species);
}

// ------------------------------------------------

export const CLUE_CONFIG: Record<GemCategory, ClueConfigItem> = {
  [GemCategory.CLASSIFICATION]: {
    color: 'red',
    categoryName: 'Classification',
    icon: '🧬',
    getClue: (species: Species) => {
      return getNextClassificationClue(species); // progressive
    },
  },
  [GemCategory.HABITAT]: {
    color: 'green',
    categoryName: 'Habitat',
    icon: '🌳',
    getClue: (species: Species) => {
      if (species.hab_desc) return species.hab_desc;
      
      const habitats: string[] = [];
      if (species.aquatic || species.freshwater) habitats.push('freshwater');
      if (species.terrestr || species.terrestria) habitats.push('terrestrial');
      if (species.marine) habitats.push('marine');
      
      if (habitats.length > 0) {
        return `Found in ${habitats.join(' and ')} habitats`;
      }
      
      if (species.hab_tags) return `Habitat: ${species.hab_tags}`;
      return '';
    },
  },
  [GemCategory.GEOGRAPHIC]: {
    color: 'blue',
    categoryName: 'Geographic & Habitat',
    icon: '🗺️',
    getClue: (species: Species) => {
      const clues: string[] = [];
      
      // Geographic info
      if (species.geo_desc) clues.push(species.geo_desc);
      else if (species.dist_comm) clues.push(species.dist_comm);
      else if (species.island) clues.push(`Found on islands`);
      else if (species.origin === 1) clues.push('Native to its range');
      
      // Habitat info
      if (species.hab_desc) clues.push(species.hab_desc);
      else {
        const habitats: string[] = [];
        if (species.aquatic || species.freshwater) habitats.push('freshwater');
        if (species.terrestr || species.terrestria) habitats.push('terrestrial');
        if (species.marine) habitats.push('marine');
        
        if (habitats.length > 0) {
          clues.push(`Found in ${habitats.join(' and ')} habitats`);
        } else if (species.hab_tags) {
          clues.push(`Habitat: ${species.hab_tags}`);
        }
      }
      
      return clues.join('. ');
    },
  },
  [GemCategory.MORPHOLOGY]: {
    color: 'orange',
    categoryName: 'Morphology',
    icon: '🐆',
    getClue: (species: Species) => {
      // Combine both color/pattern and size/shape information
      const morphologyInfo: string[] = [];
      
      // Add pattern information
      if (species.pattern) morphologyInfo.push(species.pattern);
      
      // Add color information
      const colors: string[] = [];
      if (species.color_prim) colors.push(species.color_prim);
      if (species.color_sec) colors.push(species.color_sec);
      if (colors.length > 0) {
        morphologyInfo.push(`Colors: ${colors.join(' and ')}`);
      }
      
      // Add shape description
      if (species.shape_desc) morphologyInfo.push(species.shape_desc);
      
      // Add size information
      if (species.size_min && species.size_max) {
        morphologyInfo.push(`Length: ${species.size_min}-${species.size_max} units`);
      } else if (species.size_max) {
        morphologyInfo.push(`Maximum length: ${species.size_max} units`);
      }
      
      if (species.weight_kg) {
        morphologyInfo.push(`Weight: ${species.weight_kg} kg`);
      }
      
      return morphologyInfo.join('; ');
    },
  },
  [GemCategory.BEHAVIOR]: {
    color: 'yellow',
    categoryName: 'Behavior & Diet',
    icon: '💨',
    getClue: (species: Species) => {
      const clues: string[] = [];
      
      // Behavior info
      if (species.behav_1) clues.push(species.behav_1);
      else if (species.behav_2) clues.push(species.behav_2);
      
      // Diet info
      if (species.diet_type) clues.push(`Diet type: ${species.diet_type}`);
      else if (species.diet_prey) clues.push(`Preys on: ${species.diet_prey}`);
      else if (species.diet_flora) clues.push(`Eats plants: ${species.diet_flora}`);
      
      return clues.join('. ');
    },
  },
  [GemCategory.LIFE_CYCLE]: {
    color: 'black',
    categoryName: 'Life Cycle',
    icon: '⏳',
    getClue: (species: Species) => {
      if (species.life_desc1) return species.life_desc1;
      if (species.life_desc2) return species.life_desc2;
      
      const lifeInfo: string[] = [];
      if (species.lifespan) lifeInfo.push(`Lifespan: ${species.lifespan}`);
      if (species.maturity) lifeInfo.push(`Maturity: ${species.maturity}`);
      if (species.repro_type) lifeInfo.push(`Reproduction: ${species.repro_type}`);
      if (species.clutch_sz) lifeInfo.push(`Clutch size: ${species.clutch_sz}`);
      
      return lifeInfo.join(', ');
    },
  },
  [GemCategory.CONSERVATION]: {
    color: 'white',
    categoryName: 'Conservation',
    icon: '🛡️',
    getClue: (species: Species) => {
      if (species.cons_text) return species.cons_text;
      if (species.cons_code || species.category) {
        return `Conservation status: ${species.cons_code || species.category}`;
      }
      if (species.threats) return `Threats: ${species.threats}`;
      return '';
    },
  },
  [GemCategory.KEY_FACTS]: {
    color: 'purple',
    categoryName: 'Key Facts',
    icon: '🔮',
    getClue: (species: Species) => {
      if (species.key_fact1) return species.key_fact1;
      if (species.key_fact2) return species.key_fact2;
      if (species.key_fact3) return species.key_fact3;
      return '';
    },
  }
};
