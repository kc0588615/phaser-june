import { supabase } from './supabaseClient';
import type { Species } from '@/types/database';

export interface SpeciesQueryResult {
  species: Species[];
  count: number;
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

      return data || [];
    } catch (error) {
      console.error('Error in getSpeciesByIds:', error);
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
  }
};