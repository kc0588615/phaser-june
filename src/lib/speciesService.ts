import { supabase } from './supabaseClient';
import type { Species } from '@/types/database';

export interface SpeciesQueryResult {
  species: Species[];
  count: number;
}

export interface RasterHabitatResult {
  habitat_type: string;
  percentage: number;
}

export const speciesService = {
  /**
   * Query species that intersect with a given point (longitude, latitude)
   */
  async getSpeciesAtPoint(longitude: number, latitude: number): Promise<SpeciesQueryResult> {
    try {
      // Try to use the RPC function if it exists
      // If not, fall back to a simple query for MVP
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_species_at_point', { lon: longitude, lat: latitude });
        
        if (!rpcError && rpcData) {
          console.log(`Spatial query returned ${rpcData.length} species at (${longitude}, ${latitude})`);
          return {
            species: rpcData as Species[],
            count: rpcData.length
          };
        } else if (rpcError) {
          console.error('RPC error:', rpcError);
        }
      } catch (rpcErr) {
        console.log('RPC function not available, using fallback query', rpcErr);
      }
      
      // Fallback: fetch a subset of species for MVP
      const { data, error, count } = await supabase
        .from('icaa')
        .select('*', { count: 'exact' })
        .limit(10) // Limit to 10 species for MVP
        .order('ogc_fid', { ascending: true });

      if (error) {
        console.error('Error querying species:', error);
        return { species: [], count: 0 };
      }

      // TODO: In production, create a PostgreSQL function like:
      // CREATE OR REPLACE FUNCTION get_species_at_point(lon float, lat float)
      // RETURNS SETOF icaa AS $$
      // BEGIN
      //   RETURN QUERY
      //   SELECT * FROM icaa
      //   WHERE ST_Contains(wkb_geometry, ST_SetSRID(ST_MakePoint(lon, lat), 4326));
      // END;
      // $$ LANGUAGE plpgsql;
      //
      // Then call it with: supabase.rpc('get_species_at_point', { lon: longitude, lat: latitude })

      return {
        species: data || [],
        count: count || 0
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
      const { data, error } = await supabase
        .from('icaa')
        .select('*')
        .in('ogc_fid', ids)
        .order('ogc_fid', { ascending: true });

      if (error) {
        console.error('Error fetching species by IDs:', error);
        return [];
      }

      // Bioregion data now comes directly from the icaa table columns

      return data || [];
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
    bioregio_1: string | null;
    realm: string | null;
    sub_realm: string | null;
    biome: string | null;
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_species_bioregions', { species_ids: speciesIds });
      
      if (error) {
        console.error('Error fetching species bioregions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSpeciesBioregions:', error);
      return [];
    }
  },

  /**
   * Get habitat distribution within 10km of a point using raster data
   */
  async getRasterHabitatDistribution(longitude: number, latitude: number): Promise<RasterHabitatResult[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_habitat_distribution_10km', { lon: longitude, lat: latitude });
      
      if (error) {
        console.error('Error querying raster habitat distribution:', error);
        return [];
      }

      console.log(`Raster habitat query returned ${data?.length || 0} habitat types at (${longitude}, ${latitude})`);
      return data || [];
    } catch (error) {
      console.error('Error in getRasterHabitatDistribution:', error);
      return [];
    }
  },

  /**
   * Render species polygons on Cesium (returns GeoJSON)
   */
  async getSpeciesGeoJSON(speciesIds: number[]): Promise<any> {
    try {
      // For MVP, we'll fetch the species data but not the actual geometry
      // The geometry rendering will be handled by the Cesium integration
      const species = await this.getSpeciesByIds(speciesIds);
      
      // Convert to basic GeoJSON structure
      return {
        type: 'FeatureCollection',
        features: species.map(sp => ({
          type: 'Feature',
          properties: {
            ogc_fid: sp.ogc_fid,
            comm_name: sp.comm_name,
            sci_name: sp.sci_name
          },
          geometry: null // Geometry will be handled separately
        }))
      };
    } catch (error) {
      console.error('Error in getSpeciesGeoJSON:', error);
      return { type: 'FeatureCollection', features: [] };
    }
  },

  /**
   * Get the closest habitat polygon when no species are found at a point
   */
  async getClosestHabitat(longitude: number, latitude: number): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('get_closest_habitat', { lon: longitude, lat: latitude });
      
      if (error) {
        console.error('Error finding closest habitat:', error);
        return null;
      }

      console.log(`Found closest habitat at (${longitude}, ${latitude})`);
      return data; // This will be GeoJSON geometry
    } catch (error) {
      console.error('Error in getClosestHabitat:', error);
      return null;
    }
  }
};