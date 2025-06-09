import type { Species } from '@/types/database';
import { GemType } from './constants';

export interface GemCategoryInfo {
  categoryName: string;
  icon: string; // Emoji or path to custom icon
}

export const gemCategoryMapping: Record<GemType, GemCategoryInfo> = {
  [GemType.Red]: { categoryName: 'Classification', icon: '🧬' },
  [GemType.Green]: { categoryName: 'Habitat', icon: '🌳' },
  [GemType.Blue]: { categoryName: 'Geographic', icon: '🗺️' },
  [GemType.Orange]: { categoryName: 'Morphology', icon: '🐾' }, // Combines Color/Pattern and Size/Shape
  [GemType.Pink]: { categoryName: 'Diet', icon: '🌿' },
  [GemType.White]: { categoryName: 'Behavior', icon: '💨' },
  [GemType.Black]: { categoryName: 'Life Cycle', icon: '⏳' },
  [GemType.Yellow]: { categoryName: 'Conservation', icon: '🛡️' },
  [GemType.Purple]: { categoryName: 'Key Facts', icon: '❗' },
};

export enum GemCategory {
  CLASSIFICATION = 0,  // 🧬 Red gem
  HABITAT = 1,        // 🌳 Green gem
  GEOGRAPHIC = 2,     // 🗺️ Blue gem
  MORPHOLOGY = 3,     // 🐾 Orange gem (combines Color/Pattern and Size/Shape)
  DIET = 4,           // 🌿 Pink gem
  BEHAVIOR = 5,       // 💨 White gem
  LIFE_CYCLE = 6,     // ⏳ Black gem
  CONSERVATION = 7,   // 🛡️ Yellow gem
  KEY_FACTS = 8       // ❗ Purple gem
}

export interface ClueData {
  category: GemCategory;
  heading: string;
  clue: string;
  speciesId: number;
}

export class GemClueMapper {
  /**
   * Get a clue for a specific gem category from a species
   */
  static getClueForCategory(species: Species, category: GemCategory): ClueData | null {
    const clueData: ClueData = {
      category,
      heading: species.comm_name || species.sci_name || 'Unknown Species',
      clue: '',
      speciesId: species.ogc_fid
    };

    switch (category) {
      case GemCategory.CLASSIFICATION:
        clueData.clue = this.getClassificationClue(species);
        break;
      case GemCategory.HABITAT:
        clueData.clue = this.getHabitatClue(species);
        break;
      case GemCategory.GEOGRAPHIC:
        clueData.clue = this.getGeographicClue(species);
        break;
      case GemCategory.MORPHOLOGY:
        clueData.clue = this.getMorphologyClue(species);
        break;
      case GemCategory.DIET:
        clueData.clue = this.getDietClue(species);
        break;
      case GemCategory.BEHAVIOR:
        clueData.clue = this.getBehaviorClue(species);
        break;
      case GemCategory.LIFE_CYCLE:
        clueData.clue = this.getLifeCycleClue(species);
        break;
      case GemCategory.CONSERVATION:
        clueData.clue = this.getConservationClue(species);
        break;
      case GemCategory.KEY_FACTS:
        clueData.clue = this.getKeyFactsClue(species);
        break;
    }

    return clueData.clue ? clueData : null;
  }

  private static getClassificationClue(species: Species): string {
    // Try to return the most specific classification available
    if (species.genus) return `Genus: ${species.genus}`;
    if (species.family) return `Family: ${species.family}`;
    if (species.order_) return `Order: ${species.order_}`;
    if (species.class) return `Class: ${species.class}`;
    if (species.phylum) return `Phylum: ${species.phylum}`;
    if (species.kingdom) return `Kingdom: ${species.kingdom}`;
    if (species.tax_comm) return species.tax_comm;
    return '';
  }

  private static getHabitatClue(species: Species): string {
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
  }

  private static getGeographicClue(species: Species): string {
    if (species.geo_desc) return species.geo_desc;
    if (species.dist_comm) return species.dist_comm;
    if (species.island) return `Found on islands`;
    if (species.origin === 1) return 'Native to its range';
    return '';
  }

  private static getMorphologyClue(species: Species): string {
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
  }

  // Keep these methods for backward compatibility if needed
  private static getColorPatternClue(species: Species): string {
    if (species.pattern) return species.pattern;
    
    const colors: string[] = [];
    if (species.color_prim) colors.push(species.color_prim);
    if (species.color_sec) colors.push(species.color_sec);
    
    if (colors.length > 0) {
      return `Colors: ${colors.join(' and ')}`;
    }
    return '';
  }

  private static getSizeShapeClue(species: Species): string {
    if (species.shape_desc) return species.shape_desc;
    
    const sizeInfo: string[] = [];
    if (species.size_min && species.size_max) {
      sizeInfo.push(`Length: ${species.size_min}-${species.size_max} units`);
    } else if (species.size_max) {
      sizeInfo.push(`Maximum length: ${species.size_max} units`);
    }
    
    if (species.weight_kg) {
      sizeInfo.push(`Weight: ${species.weight_kg} kg`);
    }
    
    return sizeInfo.join(', ');
  }

  private static getDietClue(species: Species): string {
    if (species.diet_type) return `Diet type: ${species.diet_type}`;
    if (species.diet_prey) return `Preys on: ${species.diet_prey}`;
    if (species.diet_flora) return `Eats plants: ${species.diet_flora}`;
    return '';
  }

  private static getBehaviorClue(species: Species): string {
    if (species.behav_1) return species.behav_1;
    if (species.behav_2) return species.behav_2;
    return '';
  }

  private static getLifeCycleClue(species: Species): string {
    if (species.life_desc1) return species.life_desc1;
    if (species.life_desc2) return species.life_desc2;
    
    const lifeInfo: string[] = [];
    if (species.lifespan) lifeInfo.push(`Lifespan: ${species.lifespan}`);
    if (species.maturity) lifeInfo.push(`Maturity: ${species.maturity}`);
    if (species.repro_type) lifeInfo.push(`Reproduction: ${species.repro_type}`);
    if (species.clutch_sz) lifeInfo.push(`Clutch size: ${species.clutch_sz}`);
    
    return lifeInfo.join(', ');
  }

  /**
   * Get conservation status and unique traits (for future 10-gem system)
   */
  static getConservationClue(species: Species): string {
    if (species.cons_text) return species.cons_text;
    if (species.cons_code || species.category) {
      return `Conservation status: ${species.cons_code || species.category}`;
    }
    if (species.threats) return `Threats: ${species.threats}`;
    return '';
  }

  private static getKeyFactsClue(species: Species): string {
    if (species.key_fact1) return species.key_fact1;
    if (species.key_fact2) return species.key_fact2;
    if (species.key_fact3) return species.key_fact3;
    return '';
  }

  static getUniqueTraitClue(species: Species): string {
    if (species.key_fact1) return species.key_fact1;
    if (species.key_fact2) return species.key_fact2;
    if (species.key_fact3) return species.key_fact3;
    return '';
  }
}