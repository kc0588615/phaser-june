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

// ---- Progressive system helpers ----

// Classification sequence
const CLASSIFICATION_SEQUENCE: Array<keyof Species> = [
  'tax_comm',   // Taxonomic comments/context first
  'phylum',
  'class',
  'order_',     // note underscore
  'family',
  'genus',
  'sci_name'
];

// Key Facts sequence
const KEY_FACTS_SEQUENCE: Array<keyof Species> = [
  'key_fact1',
  'key_fact2', 
  'key_fact3'
];

// Behavior sequence (includes diet fields)
const BEHAVIOR_SEQUENCE: Array<keyof Species> = [
  'behav_1',
  'behav_2',
  'diet_type',
  'diet_prey',
  'diet_flora'
];

// Life Cycle sequence
const LIFE_CYCLE_SEQUENCE: Array<keyof Species> = [
  'life_desc1',
  'life_desc2'
];

// Conservation sequence
const CONSERVATION_SEQUENCE: Array<keyof Species> = [
  'cons_text',
  'threats'
];

// Geographic sequence
const GEOGRAPHIC_SEQUENCE: Array<keyof Species> = [
  'geo_desc',
  'dist_comm',
  'hab_desc',
  'hab_tags'
];

// Morphology sequence
const MORPHOLOGY_SEQUENCE: Array<keyof Species> = [
  'pattern',
  'color_prim',
  'color_sec', 
  'shape_desc',
  'size_max',
  'weight_kg'
];

// Progress tracking using WeakMaps for memory efficiency
const classificationProgress = new WeakMap<Species, number>();
const keyFactsProgress = new WeakMap<Species, number>();
const behaviorProgress = new WeakMap<Species, number>();
const lifeCycleProgress = new WeakMap<Species, number>();
const conservationProgress = new WeakMap<Species, number>();
const geographicProgress = new WeakMap<Species, number>();
const morphologyProgress = new WeakMap<Species, number>();

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
        case 'tax_comm': return value; // Taxonomic comments are already complete sentences
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


// Key Facts progressive function
function getNextKeyFactClue(species: Species): string {
  let progress = keyFactsProgress.get(species) ?? 0;

  while (progress < KEY_FACTS_SEQUENCE.length) {
    const field = KEY_FACTS_SEQUENCE[progress];
    const value = species[field] as unknown as string | undefined;
    progress++;
    keyFactsProgress.set(species, progress);

    if (value) {
      return value; // Key facts are already complete sentences
    }
  }

  return ''; // No more facts
}

// Behavior progressive function
function getNextBehaviorClue(species: Species): string {
  let progress = behaviorProgress.get(species) ?? 0;

  while (progress < BEHAVIOR_SEQUENCE.length) {
    const field = BEHAVIOR_SEQUENCE[progress];
    const value = species[field] as unknown as string | undefined;
    progress++;
    behaviorProgress.set(species, progress);

    if (value) {
      switch (field) {
        case 'behav_1': return value;
        case 'behav_2': return value;
        case 'diet_type': return `Diet type: ${value}`;
        case 'diet_prey': return `Preys on: ${value}`;
        case 'diet_flora': return `Eats plants: ${value}`;
        default: return value;
      }
    }
  }

  return ''; // No more behavior clues
}

// Life Cycle progressive function
function getNextLifeCycleClue(species: Species): string {
  let progress = lifeCycleProgress.get(species) ?? 0;

  while (progress < LIFE_CYCLE_SEQUENCE.length) {
    const field = LIFE_CYCLE_SEQUENCE[progress];
    const value = species[field] as unknown as string | undefined;
    progress++;
    lifeCycleProgress.set(species, progress);

    if (value) {
      return value;
    }
  }

  return ''; // No more life cycle clues
}

// Conservation progressive function
function getNextConservationClue(species: Species): string {
  let progress = conservationProgress.get(species) ?? 0;

  while (progress < CONSERVATION_SEQUENCE.length) {
    const field = CONSERVATION_SEQUENCE[progress];
    const value = species[field] as unknown as string | undefined;
    progress++;
    conservationProgress.set(species, progress);

    if (value) {
      switch (field) {
        case 'cons_text': return value;
        case 'threats': return `Threats: ${value}`;
        default: return value;
      }
    }
  }

  return ''; // No more conservation clues
}

// Geographic progressive function
function getNextGeographicClue(species: Species): string {
  let progress = geographicProgress.get(species) ?? 0;

  while (progress < GEOGRAPHIC_SEQUENCE.length) {
    const field = GEOGRAPHIC_SEQUENCE[progress];
    const value = species[field] as unknown as string | undefined;
    progress++;
    geographicProgress.set(species, progress);

    if (value) {
      switch (field) {
        case 'geo_desc': return value;
        case 'dist_comm': return value;
        case 'hab_desc': return value;
        case 'hab_tags': return `Habitat: ${value}`;
        default: return value;
      }
    }
  }

  return ''; // No more geographic clues
}

// Morphology progressive function
function getNextMorphologyClue(species: Species): string {
  let progress = morphologyProgress.get(species) ?? 0;

  while (progress < MORPHOLOGY_SEQUENCE.length) {
    const field = MORPHOLOGY_SEQUENCE[progress];
    const value = species[field] as unknown as string | number | undefined;
    progress++;
    morphologyProgress.set(species, progress);

    if (value !== null && value !== undefined) {
      switch (field) {
        case 'pattern': return value as string;
        case 'color_prim': return `Primary color: ${value}`;
        case 'color_sec': return `Secondary color: ${value}`;
        case 'shape_desc': return value as string;
        case 'size_max': return `Maximum length: ${value} units`;
        case 'weight_kg': return `Weight: ${value} kg`;
        default: return String(value);
      }
    }
  }

  return ''; // No more morphology clues
}

// Completion check functions
export function isClassificationComplete(species: Species): boolean {
  const progress = classificationProgress.get(species) ?? 0;
  return progress >= CLASSIFICATION_SEQUENCE.length;
}

export function isKeyFactsComplete(species: Species): boolean {
  const progress = keyFactsProgress.get(species) ?? 0;
  return progress >= KEY_FACTS_SEQUENCE.length;
}

export function isBehaviorComplete(species: Species): boolean {
  const progress = behaviorProgress.get(species) ?? 0;
  return progress >= BEHAVIOR_SEQUENCE.length;
}

export function isLifeCycleComplete(species: Species): boolean {
  const progress = lifeCycleProgress.get(species) ?? 0;
  return progress >= LIFE_CYCLE_SEQUENCE.length;
}

export function isConservationComplete(species: Species): boolean {
  const progress = conservationProgress.get(species) ?? 0;
  return progress >= CONSERVATION_SEQUENCE.length;
}

export function isGeographicComplete(species: Species): boolean {
  const progress = geographicProgress.get(species) ?? 0;
  return progress >= GEOGRAPHIC_SEQUENCE.length;
}

export function isMorphologyComplete(species: Species): boolean {
  const progress = morphologyProgress.get(species) ?? 0;
  return progress >= MORPHOLOGY_SEQUENCE.length;
}

// Reset functions for species changes
export function resetClassificationProgress(species: Species) {
  classificationProgress.delete(species);
}

export function resetKeyFactsProgress(species: Species) {
  keyFactsProgress.delete(species);
}

export function resetBehaviorProgress(species: Species) {
  behaviorProgress.delete(species);
}

export function resetLifeCycleProgress(species: Species) {
  lifeCycleProgress.delete(species);
}

export function resetConservationProgress(species: Species) {
  conservationProgress.delete(species);
}

export function resetGeographicProgress(species: Species) {
  geographicProgress.delete(species);
}

export function resetMorphologyProgress(species: Species) {
  morphologyProgress.delete(species);
}

export function resetAllProgressiveClues(species: Species) {
  resetClassificationProgress(species);
  resetKeyFactsProgress(species);
  resetBehaviorProgress(species);
  resetLifeCycleProgress(species);
  resetConservationProgress(species);
  resetGeographicProgress(species);
  resetMorphologyProgress(species);
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
      const habitats: string[] = [];
      if (species.aquatic || species.freshwater) habitats.push('freshwater');
      if (species.terrestria) habitats.push('terrestrial');
      if (species.marine) habitats.push('marine');
      
      if (habitats.length > 0) {
        return `Found in ${habitats.join(' and ')} habitats`;
      }
      
      return '';
    },
  },
  [GemCategory.GEOGRAPHIC]: {
    color: 'blue',
    categoryName: 'Geographic & Habitat',
    icon: '🗺️',
    getClue: (species: Species) => {
      return getNextGeographicClue(species); // Progressive geographic clues
    },
  },
  [GemCategory.MORPHOLOGY]: {
    color: 'orange',
    categoryName: 'Morphology',
    icon: '🐆',
    getClue: (species: Species) => {
      return getNextMorphologyClue(species); // Progressive morphology clues
    },
  },
  [GemCategory.BEHAVIOR]: {
    color: 'yellow',
    categoryName: 'Behavior & Diet',
    icon: '💨',
    getClue: (species: Species) => {
      return getNextBehaviorClue(species); // Progressive behavior and diet clues
    },
  },
  [GemCategory.LIFE_CYCLE]: {
    color: 'black',
    categoryName: 'Life Cycle',
    icon: '⏳',
    getClue: (species: Species) => {
      // Try progressive life cycle descriptions first
      const lifeCycleClue = getNextLifeCycleClue(species);
      if (lifeCycleClue) return lifeCycleClue;
      
      // Fallback to structured life info if no more descriptions
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
      // Try progressive conservation clues first
      const conservationClue = getNextConservationClue(species);
      if (conservationClue) return conservationClue;
      
      // Fallback to conservation status if no more progressive clues
      if (species.cons_code || species.category) {
        return `Conservation status: ${species.cons_code || species.category}`;
      }
      return '';
    },
  },
  [GemCategory.KEY_FACTS]: {
    color: 'purple',
    categoryName: 'Key Facts',
    icon: '🔮',
    getClue: (species: Species) => {
      return getNextKeyFactClue(species); // Progressive key facts
    },
  }
};
