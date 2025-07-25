import type { Species } from '@/types/database';

/**
 * Extract unique ecoregions from species data
 */
export function getEcoregions(species: Species[]): string[] {
  const ecoregions = new Set<string>();
  
  species.forEach(sp => {
    if (sp.bioregio_1 && sp.bioregio_1 !== 'NULL' && sp.bioregio_1 !== 'null') {
      ecoregions.add(sp.bioregio_1);
    }
  });
  
  return Array.from(ecoregions).sort();
}

/**
 * Extract unique realms from species data
 */
export function getRealms(species: Species[]): string[] {
  const realms = new Set<string>();
  
  species.forEach(sp => {
    if (sp.realm && sp.realm !== 'NULL' && sp.realm !== 'null') {
      realms.add(sp.realm);
    }
  });
  
  return Array.from(realms).sort();
}

/**
 * Extract unique biomes from species data
 */
export function getBiomes(species: Species[]): string[] {
  const biomes = new Set<string>();
  
  species.forEach(sp => {
    if (sp.biome && sp.biome !== 'NULL' && sp.biome !== 'null') {
      biomes.add(sp.biome);
    }
  });
  
  return Array.from(biomes).sort();
}

/**
 * Group species by order and genus
 */
export function groupSpeciesByCategory(species: Species[]): Record<string, Record<string, Species[]>> {
  const grouped: Record<string, Record<string, Species[]>> = {};
  
  species.forEach(sp => {
    // Use the actual order as the category
    const order = sp.order_ || 'Unknown';
    const genus = sp.genus || 'Unknown';
    
    if (!grouped[order]) {
      grouped[order] = {};
    }
    
    if (!grouped[order][genus]) {
      grouped[order][genus] = [];
    }
    
    grouped[order][genus].push(sp);
  });
  
  // Sort species within each genus by common name
  Object.values(grouped).forEach(genera => {
    Object.values(genera).forEach(speciesList => {
      speciesList.sort((a, b) => {
        const nameA = a.comm_name || a.sci_name || '';
        const nameB = b.comm_name || b.sci_name || '';
        return nameA.localeCompare(nameB);
      });
    });
  });
  
  return grouped;
}

/**
 * Group species by taxonomic hierarchy (class -> order -> genus)
 */
export function groupSpeciesByTaxonomy(species: Species[]): Record<string, Record<string, Record<string, Species[]>>> {
  const grouped: Record<string, Record<string, Record<string, Species[]>>> = {};
  
  species.forEach(sp => {
    const className = sp.class || 'Unknown';
    const orderName = sp.order_ || 'Unknown';
    const genus = sp.genus || 'Unknown';
    
    if (!grouped[className]) {
      grouped[className] = {};
    }
    
    if (!grouped[className][orderName]) {
      grouped[className][orderName] = {};
    }
    
    if (!grouped[className][orderName][genus]) {
      grouped[className][orderName][genus] = [];
    }
    
    grouped[className][orderName][genus].push(sp);
  });
  
  // Sort species within each genus by common name
  Object.values(grouped).forEach(orders => {
    Object.values(orders).forEach(genera => {
      Object.values(genera).forEach(speciesList => {
        speciesList.sort((a, b) => {
          const nameA = a.comm_name || a.sci_name || '';
          const nameB = b.comm_name || b.sci_name || '';
          return nameA.localeCompare(nameB);
        });
      });
    });
  });
  
  return grouped;
}

/**
 * Get display name for an order
 */
export function getOrderDisplayName(order: string): string {
  // Return the order name as-is for now
  // Can be enhanced later with display names if needed
  return order;
}

/**
 * Get all possible categories (orders) from species data
 */
export function getAllCategories(species?: Species[]): string[] {
  if (!species || species.length === 0) {
    // Return known orders as fallback
    return ['Testudines', 'Anura'];
  }
  return getUniqueOrders(species);
}

/**
 * Map category names to order values
 */
export function getCategoryOrderMapping(): Record<string, string> {
  // Since we're now using order names directly, this maps order to itself
  // and includes some legacy mappings for backward compatibility
  return {
    'Turtles': 'Testudines',
    'Turtle': 'Testudines',
    'Frogs': 'Anura',
    'Frog': 'Anura',
    'Testudines': 'Testudines',
    'Anura': 'Anura'
  };
}

/**
 * Get order value from category name (case-insensitive)
 */
export function getOrderFromCategory(category: string): string | null {
  const mapping = getCategoryOrderMapping();
  const normalizedCategory = category.toLowerCase();
  
  for (const [key, value] of Object.entries(mapping)) {
    if (key.toLowerCase() === normalizedCategory) {
      return value;
    }
  }
  
  return null;
}

/**
 * Get category name from order value
 */
export function getCategoryFromOrder(order: string): string {
  // Return the order name directly since we're using orders as categories
  return order || 'Unknown';
}

/**
 * Extract unique genus values from species data
 */
export function getUniqueGenera(species: Species[]): string[] {
  const genera = new Set<string>();
  
  species.forEach(sp => {
    if (sp.genus && sp.genus !== 'NULL' && sp.genus !== 'null') {
      genera.add(sp.genus);
    }
  });
  
  return Array.from(genera).sort();
}

/**
 * Extract unique order values from species data
 */
export function getUniqueOrders(species: Species[]): string[] {
  const orders = new Set<string>();
  
  species.forEach(sp => {
    if (sp.order_ && sp.order_ !== 'NULL' && sp.order_ !== 'null') {
      orders.add(sp.order_);
    }
  });
  
  return Array.from(orders).sort();
}