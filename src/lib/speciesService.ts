import { STATIC_HABITAT_CODE_TO_LABEL } from '@/lib/habitatLabels';
import type { Species } from '@/types/database';
import { getAppConfig } from '@/utils/config';

export interface SpeciesQueryResult {
  species: Species[];
  count: number;
}

export interface RasterHabitatResult {
  habitat_type: string;
  percentage: number;
}

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
  async getSpeciesInRadius(longitude: number, latitude: number, radiusMeters: number, signal?: AbortSignal): Promise<SpeciesQueryResult> {
    try {
      const response = await fetch(
        `/api/species/in-radius?lon=${longitude}&lat=${latitude}&radius=${radiusMeters}`,
        { signal }
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
      if ((error as Error).name !== 'AbortError') console.error('Error in getSpeciesInRadius:', error);
      return { species: [], count: 0 };
    }
  },

  /**
   * Get habitat distribution within 10km of a point using TiTiler statistics on COG
   */
  async getRasterHabitatDistribution(longitude: number, latitude: number, signal?: AbortSignal): Promise<RasterHabitatResult[]> {
    try {
      const { titilerBaseUrl, cogUrl } = await getAppConfig();

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
        body: JSON.stringify(featureCollection),
        signal
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
          habitat_type: habitatLabel || `Habitat code ${habitatCode}`,
          percentage: Math.round(r.percentage * 100) / 100
        });
      }

      resolved.sort((a, b) => b.percentage - a.percentage);

      console.log(`TiTiler habitat query returned ${resolved.length} habitat types at (${longitude}, ${latitude})`);
      return resolved;

    } catch (error) {
      if ((error as Error).name !== 'AbortError') console.error('Error in getRasterHabitatDistribution:', error);
      return [];
    }
  },

  /**
   * Get the closest habitat polygon when no species are found at a point
   * Uses PostGIS nearest-neighbor search with no distance limit
   */
  async getClosestHabitat(longitude: number, latitude: number, signal?: AbortSignal): Promise<any> {
    try {
      const response = await fetch(
        `/api/species/closest?lon=${longitude}&lat=${latitude}`,
        { signal }
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
      if ((error as Error).name !== 'AbortError') console.error('Error in getClosestHabitat:', error);
      return null;
    }
  }
};
