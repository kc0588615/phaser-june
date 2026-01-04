// =============================================================================
// SPECIES QUERIES - Prisma + Raw SQL for PostGIS
// =============================================================================
// This file provides type-safe database queries for species data.
//
// ARCHITECTURE:
// - Prisma for non-spatial queries (listing, filtering, relations)
// - Prisma $queryRaw for PostGIS spatial queries
// =============================================================================

import { prisma, type ICAA } from '@/lib/prisma';

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
// POSTGIS SPATIAL QUERIES - Using Prisma $queryRaw
// =============================================================================

/**
 * Finds species within a radius of a geographic point.
 * Uses PostGIS ST_DWithin for efficient spatial query.
 */
export async function getSpeciesInRadius(
  lon: number,
  lat: number,
  radiusMeters: number = 10000
) {
  const results = await prisma.$queryRaw<ICAA[]>`
    SELECT *
    FROM icaa
    WHERE wkb_geometry IS NOT NULL
      AND ST_DWithin(
        wkb_geometry::geography,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
  `;

  return results;
}

/**
 * Finds species whose habitat polygon contains a specific point.
 * Uses PostGIS ST_Contains to check point-in-polygon.
 */
export async function getSpeciesAtPoint(lon: number, lat: number) {
  const results = await prisma.$queryRaw<ICAA[]>`
    SELECT *
    FROM icaa
    WHERE wkb_geometry IS NOT NULL
      AND ST_Contains(
        wkb_geometry,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
      )
  `;

  return results;
}

/**
 * Gets the closest species habitat to a point.
 * Used when no species are found at the click location.
 */
export async function getClosestHabitat(lon: number, lat: number) {
  const results = await prisma.$queryRaw<ICAA[]>`
    SELECT *
    FROM icaa
    WHERE wkb_geometry IS NOT NULL
    ORDER BY wkb_geometry::geography <-> ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
    LIMIT 1
  `;

  return results[0] || null;
}

/**
 * Gets bioregion information for a list of species.
 * Returns data from the icaa table's bioregion columns.
 */
export async function getSpeciesBioregions(speciesIds: number[]) {
  if (speciesIds.length === 0) return [];

  const species = await prisma.iCAA.findMany({
    where: { ogc_fid: { in: speciesIds } },
    select: {
      ogc_fid: true,
      bioregio_1: true,
      realm: true,
      sub_realm: true,
      biome: true,
    },
  });

  return species.map(s => ({
    species_id: s.ogc_fid,
    bioregio_1: s.bioregio_1,
    realm: s.realm,
    sub_realm: s.sub_realm,
    biome: s.biome,
  }));
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
 * @returns Object mapping IUCN codes to counts, e.g. `{ CR: 5, EN: 10, ... }`
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
 * @returns Object mapping realms to counts, e.g. `{ Nearctic: 15, Neotropic: 8, ... }`
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
