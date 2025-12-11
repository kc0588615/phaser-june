// =============================================================================
// SPECIES QUERIES - Hybrid Prisma + Supabase Approach
// =============================================================================
// This file provides type-safe database queries for species data.
//
// ARCHITECTURE DECISION:
// ----------------------
// We use a HYBRID approach combining two tools:
//
// 1. PRISMA - For non-spatial queries (listing, filtering, relations)
//    - Type-safe with autocompletion
//    - Great for simple CRUD operations
//    - Generates TypeScript types automatically
//
// 2. SUPABASE RPCs - For PostGIS spatial queries (radius search, point lookup)
//    - PostGIS functions like ST_DWithin, ST_Contains, ST_Intersects
//    - Prisma doesn't natively support PostGIS geometry types
//    - RPCs encapsulate complex spatial logic server-side
//
// WHEN TO USE WHICH:
// ------------------
// | Operation                    | Tool        | Reason                      |
// |------------------------------|-------------|------------------------------|
// | List all species             | Prisma      | Simple SELECT, type-safe     |
// | Get species by ID            | Prisma      | Single record fetch          |
// | Species within radius        | Supabase RPC| PostGIS ST_DWithin          |
// | Species at point (click)     | Supabase RPC| PostGIS ST_Contains         |
// | Player discoveries + species | Prisma      | Relations, joins             |
// | Bioregion intersection       | Supabase RPC| PostGIS ST_Intersects       |
// =============================================================================

import { prisma, type ICAA } from '@/lib/prisma';
import { supabase } from '@/lib/supabaseClient';

// =============================================================================
// PRISMA QUERIES - Non-spatial operations with type safety
// =============================================================================

/**
 * Fetches species catalog for SpeciesList component.
 * Returns a minimal set of fields for efficient list rendering.
 *
 * @example
 * ```typescript
 * const species = await getSpeciesCatalog();
 * species.forEach(s => console.log(s.comm_name, s.realm));
 * ```
 */
export async function getSpeciesCatalog() {
  return prisma.iCAA.findMany({
    select: {
      ogc_fid: true,
      comm_name: true,
      sci_name: true,
      order_: true,
      family: true,
      genus: true,
      kingdom: true,
      phylum: true,
      class_: true,
      realm: true,
      biome: true,
      bioregio_1: true,
      category: true,     // IUCN conservation status
      marine: true,
      terrestria: true,
      freshwater: true,
      aquatic: true,
    },
    orderBy: { comm_name: 'asc' },
  });
}

/**
 * Type for catalog items (subset of ICAA fields).
 * Inferred from getSpeciesCatalog return type.
 */
export type SpeciesCatalogItem = Awaited<ReturnType<typeof getSpeciesCatalog>>[number];

/**
 * Fetches full species details by ID.
 * Use for species detail view / modal display.
 *
 * @param ogcFid - The species unique identifier
 * @returns Full species record or null if not found
 *
 * @example
 * ```typescript
 * const turtle = await getSpeciesById(1);
 * if (turtle) {
 *   console.log(turtle.key_fact1, turtle.cons_text);
 * }
 * ```
 */
export async function getSpeciesById(ogcFid: number): Promise<ICAA | null> {
  return prisma.iCAA.findUnique({
    where: { ogc_fid: ogcFid },
  });
}

/**
 * Fetches multiple species by their IDs.
 * Useful for batch operations or displaying selected species.
 *
 * @param ids - Array of species ogc_fid values
 */
export async function getSpeciesByIds(ids: number[]) {
  return prisma.iCAA.findMany({
    where: {
      ogc_fid: { in: ids },
    },
    orderBy: { comm_name: 'asc' },
  });
}

/**
 * Searches species by common or scientific name.
 * Case-insensitive partial matching.
 *
 * @param query - Search term to match against names
 *
 * @example
 * ```typescript
 * const results = await searchSpecies('turtle');
 * // Returns species with "turtle" in common or scientific name
 * ```
 */
export async function searchSpecies(query: string) {
  const searchTerm = `%${query}%`;

  return prisma.iCAA.findMany({
    where: {
      OR: [
        { comm_name: { contains: query, mode: 'insensitive' } },
        { sci_name: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: {
      ogc_fid: true,
      comm_name: true,
      sci_name: true,
      category: true,
      realm: true,
    },
    take: 20, // Limit results for performance
    orderBy: { comm_name: 'asc' },
  });
}

/**
 * Filters species by conservation status (IUCN category).
 *
 * @param categories - Array of IUCN codes: 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'EX', 'EW'
 *
 * @example
 * ```typescript
 * const endangered = await getSpeciesByConservationStatus(['CR', 'EN']);
 * ```
 */
export async function getSpeciesByConservationStatus(categories: string[]) {
  return prisma.iCAA.findMany({
    where: {
      category: { in: categories },
    },
    orderBy: { comm_name: 'asc' },
  });
}

/**
 * Filters species by realm (biogeographic region).
 *
 * @param realm - Realm name like 'Nearctic', 'Neotropic', 'Indomalayan'
 */
export async function getSpeciesByRealm(realm: string) {
  return prisma.iCAA.findMany({
    where: { realm },
    orderBy: { comm_name: 'asc' },
  });
}

// =============================================================================
// SUPABASE RPC QUERIES - PostGIS spatial operations
// =============================================================================

/**
 * Finds species within a radius of a geographic point.
 * Uses PostGIS ST_DWithin for efficient spatial query.
 *
 * This is the primary query for map clicks - finds all species
 * whose habitat polygons intersect a circle around the click point.
 *
 * @param lon - Longitude (WGS84)
 * @param lat - Latitude (WGS84)
 * @param radiusMeters - Search radius in meters (default: 10km)
 * @returns Array of species records with geometry as GeoJSON
 *
 * @example
 * ```typescript
 * // User clicks on map at coordinates
 * const species = await getSpeciesInRadius(-122.4194, 37.7749, 10000);
 * console.log(`Found ${species.length} species in 10km radius`);
 * ```
 */
export async function getSpeciesInRadius(
  lon: number,
  lat: number,
  radiusMeters: number = 10000
) {
  const { data, error } = await supabase.rpc('get_species_in_radius', {
    lon,
    lat,
    radius_m: radiusMeters,
  });

  if (error) {
    console.error('[speciesQueries] get_species_in_radius failed:', error);
    throw error;
  }

  return data || [];
}

/**
 * Finds species whose habitat polygon contains a specific point.
 * More precise than radius search - returns only direct hits.
 *
 * Uses PostGIS ST_Contains to check point-in-polygon.
 *
 * @param lon - Longitude (WGS84)
 * @param lat - Latitude (WGS84)
 * @returns Array of species at that exact location
 */
export async function getSpeciesAtPoint(lon: number, lat: number) {
  const { data, error } = await supabase.rpc('get_species_at_point', {
    lon,
    lat,
  });

  if (error) {
    console.error('[speciesQueries] get_species_at_point failed:', error);
    throw error;
  }

  return data || [];
}

/**
 * Gets the closest habitat polygon to a point.
 * Used when no species are found at the click location.
 *
 * Returns GeoJSON geometry of the nearest species habitat.
 *
 * @param lon - Longitude (WGS84)
 * @param lat - Latitude (WGS84)
 * @returns GeoJSON geometry object or null
 */
export async function getClosestHabitat(lon: number, lat: number) {
  const { data, error } = await supabase.rpc('get_closest_habitat', {
    lon,
    lat,
  });

  if (error) {
    console.error('[speciesQueries] get_closest_habitat failed:', error);
    throw error;
  }

  return data;
}

/**
 * Gets bioregion information for a list of species.
 * Uses spatial intersection with OneEarth bioregion polygons.
 *
 * @param speciesIds - Array of species ogc_fid values
 * @returns Bioregion data for each species (realm, biome, etc.)
 */
export async function getSpeciesBioregions(speciesIds: number[]) {
  const { data, error } = await supabase.rpc('get_species_bioregions', {
    species_ids: speciesIds,
  });

  if (error) {
    console.error('[speciesQueries] get_species_bioregions failed:', error);
    throw error;
  }

  return data || [];
}

// =============================================================================
// RAW SQL ESCAPE HATCH - For complex custom queries
// =============================================================================

/**
 * Executes a raw SQL query using Prisma's $queryRaw.
 *
 * USE WITH CAUTION:
 * - Only use for queries that can't be expressed with Prisma's query API
 * - Always use tagged template literals (not string concatenation!)
 * - Variables are automatically parameterized to prevent SQL injection
 *
 * @example
 * ```typescript
 * // Safe: using tagged template (parameterized)
 * const realm = 'Nearctic';
 * const results = await prisma.$queryRaw`
 *   SELECT ogc_fid, comm_name FROM icaa WHERE realm = ${realm}
 * `;
 *
 * // UNSAFE: never do this!
 * // const results = await prisma.$queryRawUnsafe(`SELECT * FROM icaa WHERE realm = '${userInput}'`);
 * ```
 */
export async function executeRawQuery<T>(
  query: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  // Prisma's $queryRaw with tagged template is SQL-injection safe
  return prisma.$queryRaw(query, ...values) as Promise<T[]>;
}

// =============================================================================
// AGGREGATION QUERIES - Statistics and counts
// =============================================================================

/**
 * Gets count of species by conservation status.
 *
 * @returns Object mapping IUCN codes to counts: { CR: 5, EN: 10, ... }
 */
export async function getSpeciesCountByStatus() {
  const results = await prisma.iCAA.groupBy({
    by: ['category'],
    _count: { ogc_fid: true },
    orderBy: { _count: { ogc_fid: 'desc' } },
  });

  // Transform to simple object
  return results.reduce<Record<string, number>>(
    (acc: Record<string, number>, item) => {
      if (item.category) {
        acc[item.category] = item._count.ogc_fid;
      }
      return acc;
    },
    {}
  );
}

/**
 * Gets count of species by realm.
 *
 * @returns Object mapping realms to counts: { Nearctic: 15, Neotropic: 8, ... }
 */
export async function getSpeciesCountByRealm() {
  const results = await prisma.iCAA.groupBy({
    by: ['realm'],
    _count: { ogc_fid: true },
    orderBy: { _count: { ogc_fid: 'desc' } },
  });

  return results.reduce<Record<string, number>>(
    (acc: Record<string, number>, item) => {
      if (item.realm) {
        acc[item.realm] = item._count.ogc_fid;
      }
      return acc;
    },
    {}
  );
}

/**
 * Gets total species count in database.
 */
export async function getTotalSpeciesCount(): Promise<number> {
  return prisma.iCAA.count();
}
