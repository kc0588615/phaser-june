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
 * Group species by category and genus
 */
export function groupSpeciesByCategory(species: Species[]): Record<string, Record<string, Species[]>> {
  const grouped: Record<string, Record<string, Species[]>> = {};
  
  species.forEach(sp => {
    // Currently all species are turtles, but we'll make this flexible for future categories
    const category = 'Turtles';
    const genus = sp.genus || 'Unknown';
    
    if (!grouped[category]) {
      grouped[category] = {};
    }
    
    if (!grouped[category][genus]) {
      grouped[category][genus] = [];
    }
    
    grouped[category][genus].push(sp);
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