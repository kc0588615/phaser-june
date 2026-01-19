import type { Species } from '@/types/database';

export interface SpeciesQueryResult {
  species: Species[];
  count: number;
}

export interface RasterHabitatResult {
  habitat_type: string;
  percentage: number;
}

// Static habitat code → label map (baseline; keep in sync with habitatColors.ts)
const STATIC_HABITAT_CODE_TO_LABEL: Record<number, string> = {
  0: "Water",
  100: "Forest", 101: "Forest - Boreal", 102: "Forest - Subarctic", 103: "Forest - Subantarctic",
  104: "Forest - Temperate", 105: "Forest - Subtropical-tropical dry",
  106: "Forest - Subtropical-tropical moist lowland", 107: "Forest - Subtropical-tropical mangrove vegetation",
  108: "Forest - Subtropical-tropical swamp", 109: "Forest - Subtropical-tropical moist montane",
  200: "Savanna", 201: "Savanna - Dry", 202: "Savanna - Moist",
  300: "Shrubland", 301: "Shrubland - Subarctic", 302: "Shrubland - Subantarctic", 303: "Shrubland - Boreal",
  304: "Shrubland - Temperate", 305: "Shrubland - Subtropical-tropical dry",
  306: "Shrubland - Subtropical-tropical moist", 307: "Shrubland - Subtropical-tropical high altitude",
  308: "Shrubland - Mediterranean-type",
  400: "Grassland", 401: "Grassland - Tundra", 402: "Grassland - Subarctic", 403: "Grassland - Subantarctic",
  404: "Grassland - Temperate", 405: "Grassland - Subtropical-tropical dry",
  406: "Grassland - Subtropical-tropical seasonally wet or flooded", 407: "Grassland - Subtropical-tropical high altitude",
  500: "Wetlands (inland)", 501: "Wetlands (inland) - Permanent rivers streams creeks",
  502: "Wetlands (inland) - Seasonal/intermittent/irregular rivers/streams/creeks",
  503: "Wetlands (inland) - Shrub dominated wetlands", 504: "Wetlands (inland) - Bogs/marshes/swamps/fens/peatlands",
  505: "Wetlands (inland) - Permanent freshwater lakes",
  506: "Wetlands (inland) - Seasonal/intermittent freshwater lakes (over 8 ha)",
  507: "Wetlands (inland) - Permanent freshwater marshes/pools (under 8 ha)",
  508: "Wetlands (inland) - Seasonal/intermittent freshwater marshes/pools (under 8 ha)",
  509: "Wetlands (inland) - Freshwater springs and oases", 510: "Wetlands (inland) - Tundra wetlands",
  511: "Wetlands (inland) - Alpine wetlands", 512: "Wetlands (inland) - Geothermal wetlands",
  513: "Wetlands (inland) - Permanent inland deltas",
  514: "Wetlands (inland) - Permanent saline brackish or alkaline lakes",
  515: "Wetlands (inland) - Seasonal/intermittent saline brackish or alkaline lakes and flats",
  516: "Wetlands (inland) - Permanent /saline / brackish or alkaline marshes/pools",
  517: "Wetlands (inland) - Seasonal/intermittent /saline / brackish or alkaline marshes/pools",
  518: "Wetlands (inland) / Karst and other subterranean hydrological systems",
  600: "Rocky Areas",
  800: "Desert", 801: "Desert - Hot", 802: "Desert - Temperate", 803: "Desert - Cold",
  900: "Marine - Neritic", 901: "Marine - Neritic Pelagic", 908: "Marine - Coral Reefs",
  909: "Marine - Seagrass (submerged)",
  1000: "Marine - Oceanic", 1001: "Marine - Epipelagic", 1002: "Marine - Mesopelagic",
  1003: "Marine - Bathypelagic", 1004: "Marine - Abyssopelagic",
  1100: "Marine - Deep Ocean Floor", 1101: "Marine - Continental Slope/Bathyl zone",
  1102: "Marine - Abyssal Plain", 1103: "Marine - Abyssal Mountains/Hills",
  1104: "Marine - Hadal/Deep Sea Trench", 1105: "Marine - Seamounts", 1106: "Marine - Deep Sea Vent",
  1200: "Marine - Intertidal", 1206: "Marine - Tidepools", 1207: "Marine - Mangroves submerged Roots",
  1400: "Artificial - Terrestrial", 1401: "Arable land", 1402: "Pastureland", 1403: "Plantations",
  1404: "Rural Gardens", 1405: "Urban Areas", 1406: "Subtropical/Tropical Heavily Degraded Former Forest",
  1700: "Unknown"
};

// Track unknown codes once per session to avoid log spam
const loggedUnknownCodes = new Set<number>();

// Runtime cache of habitat_colormap from API
let habitatColormapCache: Record<number, string> | null = null;

async function getHabitatColormap(): Promise<Record<number, string>> {
  if (habitatColormapCache) return habitatColormapCache;

  try {
    const response = await fetch('/api/habitat/colormap');
    if (!response.ok) {
      console.error('Failed to fetch habitat_colormap:', response.statusText);
      habitatColormapCache = {};
      return habitatColormapCache;
    }

    const data = await response.json();
    const map: Record<number, string> = {};
    for (const row of data) {
      map[row.value] = row.label;
    }
    habitatColormapCache = map;
    console.log(`Loaded ${data.length} habitat codes from habitat_colormap`);
    return habitatColormapCache;
  } catch (err) {
    console.error('Error fetching habitat colormap:', err);
    habitatColormapCache = {};
    return habitatColormapCache;
  }
}

/**
 * Create a bounding box polygon from a point
 */
function createBboxGeoJSON(longitude: number, latitude: number, radiusMeters: number): {
  feature: any;
  bounds: { west: number; south: number; east: number; north: number };
} {
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLon = 111320 * Math.cos(latitude * Math.PI / 180);

  const deltaLat = radiusMeters / metersPerDegreeLat;
  const deltaLon = radiusMeters / metersPerDegreeLon;

  const west = longitude - deltaLon;
  const east = longitude + deltaLon;
  const south = latitude - deltaLat;
  const north = latitude + deltaLat;

  return {
    feature: {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south]
        ]]
      },
      properties: {}
    },
    bounds: { west, south, east, north }
  };
}

export const speciesService = {
  /**
   * Query species within a radius of a given point
   */
  async getSpeciesInRadius(longitude: number, latitude: number, radiusMeters: number): Promise<SpeciesQueryResult> {
    try {
      const response = await fetch(
        `/api/species/in-radius?lon=${longitude}&lat=${latitude}&radius=${radiusMeters}`
      );

      if (!response.ok) {
        console.error('Error in circle-based species query:', response.statusText);
        return { species: [], count: 0 };
      }

      const data = await response.json();
      console.log(`Circle query returned ${data.count || 0} species within ${radiusMeters}m of (${longitude}, ${latitude})`);
      return {
        species: data.species || [],
        count: data.count || 0
      };
    } catch (error) {
      console.error('Error in getSpeciesInRadius:', error);
      return { species: [], count: 0 };
    }
  },

  /**
   * Query species that intersect with a given point
   */
  async getSpeciesAtPoint(longitude: number, latitude: number): Promise<SpeciesQueryResult> {
    try {
      const response = await fetch(
        `/api/species/at-point?lon=${longitude}&lat=${latitude}`
      );

      if (!response.ok) {
        console.error('Error in point species query:', response.statusText);
        return { species: [], count: 0 };
      }

      const data = await response.json();
      console.log(`Spatial query returned ${data.count || 0} species at (${longitude}, ${latitude})`);
      return {
        species: data.species || [],
        count: data.count || 0
      };
    } catch (error) {
      console.error('Error in getSpeciesAtPoint:', error);
      return { species: [], count: 0 };
    }
  },

  /**
   * Get species by their ogc_fid values
   */
  async getSpeciesByIds(ids: number[]): Promise<Species[]> {
    try {
      const response = await fetch(`/api/species/by-ids?ids=${ids.join(',')}`);

      if (!response.ok) {
        console.error('Error fetching species by IDs:', response.statusText);
        return [];
      }

      const data = await response.json();
      return data.species || [];
    } catch (error) {
      console.error('Error in getSpeciesByIds:', error);
      return [];
    }
  },

  /**
   * Get bioregion data for multiple species
   */
  async getSpeciesBioregions(speciesIds: number[]): Promise<Array<{
    species_id: number;
    bioregion: string | null;
    realm: string | null;
    subrealm: string | null;
    biome: string | null;
  }>> {
    try {
      const response = await fetch(`/api/species/bioregions?ids=${speciesIds.join(',')}`);

      if (!response.ok) {
        console.error('Error fetching species bioregions:', response.statusText);
        return [];
      }

      const data = await response.json();
      return data.bioregions || [];
    } catch (error) {
      console.error('Error in getSpeciesBioregions:', error);
      return [];
    }
  },

  /**
   * Get habitat distribution within 10km of a point using TiTiler statistics on COG
   */
  async getRasterHabitatDistribution(longitude: number, latitude: number): Promise<RasterHabitatResult[]> {
    try {
      const titilerBaseUrl = process.env.NEXT_PUBLIC_TITILER_BASE_URL;
      const cogUrl = process.env.NEXT_PUBLIC_COG_URL;

      if (!titilerBaseUrl || !cogUrl) {
        console.error('TiTiler or COG URL not configured in environment');
        return [];
      }

      const radiusMeters = 10000;
      const { feature: bboxFeature } = createBboxGeoJSON(longitude, latitude, radiusMeters);

      const featureCollection = {
        type: "FeatureCollection",
        features: [bboxFeature]
      };

      const url = new URL(`${titilerBaseUrl}/cog/statistics`);
      url.searchParams.set('url', cogUrl);
      url.searchParams.set('categorical', 'true');
      url.searchParams.set('max_size', '512');

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(featureCollection)
      });

      if (!response.ok) {
        console.error('TiTiler statistics request failed:', response.status, response.statusText);
        return [];
      }

      const statsData = await response.json();

      if (!statsData.features || statsData.features.length === 0) {
        console.log('No statistics data returned from TiTiler');
        return [];
      }

      const featureStats = statsData.features[0].properties?.statistics;
      if (!featureStats) {
        console.log('No statistics in TiTiler response');
        return [];
      }

      const band1Stats = featureStats.b1 || featureStats['1'];
      if (!band1Stats || !band1Stats.histogram) {
        console.log('No histogram data in band statistics');
        return [];
      }

      const categories: Record<string, number> | undefined = band1Stats.categorical || band1Stats.categories;
      const results: RasterHabitatResult[] = [];
      let totalPixels = 0;

      if (categories && Object.keys(categories).length > 0) {
        totalPixels = Object.values(categories).reduce((sum, count) => sum + count, 0);
        for (const [codeStr, count] of Object.entries(categories)) {
          const habitatCode = Number(codeStr);
          if (!Number.isFinite(habitatCode)) continue;
          const percentage = (count / totalPixels) * 100;
          if (percentage < 0.1 || habitatCode === 0) continue;
          results.push({ habitat_type: `__PENDING__${habitatCode}`, percentage });
        }
      } else if (band1Stats.histogram) {
        const [counts, values] = band1Stats.histogram;
        totalPixels = counts.reduce((sum: number, c: number) => sum + c, 0);

        const codeAggregates: Record<number, number> = {};
        for (let i = 0; i < values.length; i++) {
          const habitatCode = Math.round(values[i]);
          const count = counts[i];
          if (count === 0 || habitatCode === 0) continue;
          codeAggregates[habitatCode] = (codeAggregates[habitatCode] || 0) + count;
        }

        for (const [codeStr, count] of Object.entries(codeAggregates)) {
          const percentage = (count / totalPixels) * 100;
          if (percentage < 0.01) continue;
          results.push({ habitat_type: `__PENDING__${codeStr}`, percentage });
        }
      } else {
        console.warn('No categorical or histogram data returned from TiTiler');
        return [];
      }

      if (totalPixels === 0 || results.length === 0) {
        console.log('No pixels found in buffer area');
        return [];
      }

      const remoteColormap = await getHabitatColormap();
      const habitatLabelMap: Record<number, string> = {
        ...STATIC_HABITAT_CODE_TO_LABEL,
        ...remoteColormap
      };

      const resolved: RasterHabitatResult[] = [];
      for (const r of results) {
        const habitatCode = Number(r.habitat_type.replace('__PENDING__', ''));
        const habitatLabel = habitatLabelMap[habitatCode];
        if (!habitatLabel && !loggedUnknownCodes.has(habitatCode)) {
          loggedUnknownCodes.add(habitatCode);
          console.warn(`[Habitat] Unknown code ${habitatCode} - add to habitat_colormap`);
        }
        resolved.push({
          habitat_type: habitatLabel || `Unknown (${habitatCode})`,
          percentage: Math.round(r.percentage * 100) / 100
        });
      }

      resolved.sort((a, b) => b.percentage - a.percentage);

      console.log(`TiTiler habitat query returned ${resolved.length} habitat types at (${longitude}, ${latitude})`);
      return resolved;

    } catch (error) {
      console.error('Error in getRasterHabitatDistribution:', error);
      return [];
    }
  },

  /**
   * Get random species names for the guessing game
   */
  async getRandomSpeciesNames(count: number = 15, excludeId?: number): Promise<string[]> {
    try {
      const params = new URLSearchParams({ count: count.toString() });
      if (excludeId) params.set('exclude', excludeId.toString());

      const response = await fetch(`/api/species/random-names?${params}`);

      if (!response.ok) {
        console.error('Error fetching random species names:', response.statusText);
        return this.getFallbackNames();
      }

      const data = await response.json();
      return data.names || this.getFallbackNames();
    } catch (error) {
      console.error('Error in getRandomSpeciesNames:', error);
      return this.getFallbackNames();
    }
  },

  getFallbackNames(): string[] {
    return [
      'Loggerhead Sea Turtle',
      'Hawksbill Sea Turtle',
      'Leatherback Sea Turtle',
      'Olive Ridley Sea Turtle',
      'Kemp\'s Ridley Sea Turtle',
      'Flatback Sea Turtle',
      'Eastern Box Turtle',
      'Painted Turtle',
      'Red-eared Slider',
      'Snapping Turtle',
      'Softshell Turtle',
      'Wood Turtle',
      'Bog Turtle',
      'Spotted Turtle',
    ];
  },

  /**
   * Render species polygons on Cesium (returns GeoJSON)
   */
  async getSpeciesGeoJSON(speciesIds: number[]): Promise<any> {
    try {
      const species = await this.getSpeciesByIds(speciesIds);

      return {
        type: 'FeatureCollection',
        features: species.map(sp => ({
          type: 'Feature',
          properties: {
            ogc_fid: sp.ogc_fid,
            common_name: sp.common_name,
            scientific_name: sp.scientific_name
          },
          geometry: null
        }))
      };
    } catch (error) {
      console.error('Error in getSpeciesGeoJSON:', error);
      return { type: 'FeatureCollection', features: [] };
    }
  },

  /**
   * Get the closest habitat polygon when no species are found at a point
   * Uses PostGIS nearest-neighbor search with no distance limit
   */
  async getClosestHabitat(longitude: number, latitude: number): Promise<any> {
    try {
      const response = await fetch(
        `/api/species/closest?lon=${longitude}&lat=${latitude}`
      );

      if (!response.ok) {
        console.error('Error finding closest habitat:', response.statusText);
        return null;
      }

      const data = await response.json();
      if (data.geometry) {
        console.log(`Closest habitat: ${data.species?.common_name} (${data.species?.distance_km}km away)`);
        return data.geometry;
      }
      return null;
    } catch (error) {
      console.error('Error in getClosestHabitat:', error);
      return null;
    }
  }
};
