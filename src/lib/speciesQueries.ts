// =============================================================================
// SPECIES QUERIES - Drizzle ORM + Raw SQL for PostGIS
// =============================================================================
// This file provides type-safe database queries for species data.
//
// ARCHITECTURE:
// - Drizzle for non-spatial queries (listing, filtering)
// - Drizzle sql`` template for PostGIS spatial queries
// =============================================================================

import { eq, inArray, ilike, or, asc, desc, count, sql } from 'drizzle-orm';
import { db, icaa } from '@/db';
import type { Species } from '@/types/database';

// Explicit snake_case column aliases (excludes wkb_geometry for payload size)
const speciesColumns = {
  ogc_fid: icaa.ogcFid,
  common_name: icaa.commonName,
  scientific_name: icaa.scientificName,
  taxonomic_comment: icaa.taxonomicComment,
  iucn_url: icaa.iucnUrl,
  kingdom: icaa.kingdom,
  phylum: icaa.phylum,
  class: icaa.class,
  taxon_order: icaa.taxonOrder,
  family: icaa.family,
  genus: icaa.genus,
  category: icaa.category,
  conservation_code: icaa.conservationCode,
  conservation_text: icaa.conservationText,
  threats: icaa.threats,
  habitat_description: icaa.habitatDescription,
  habitat_tags: icaa.habitatTags,
  marine: icaa.marine,
  terrestrial: icaa.terrestrial,
  freshwater: icaa.freshwater,
  aquatic: icaa.aquatic,
  geographic_description: icaa.geographicDescription,
  distribution_comment: icaa.distributionComment,
  island: icaa.island,
  origin: icaa.origin,
  bioregion: icaa.bioregion,
  realm: icaa.realm,
  subrealm: icaa.subrealm,
  biome: icaa.biome,
  color_primary: icaa.colorPrimary,
  color_secondary: icaa.colorSecondary,
  pattern: icaa.pattern,
  shape_description: icaa.shapeDescription,
  size_min_cm: icaa.sizeMinCm,
  size_max_cm: icaa.sizeMaxCm,
  weight_kg: icaa.weightKg,
  diet_type: icaa.dietType,
  diet_prey: icaa.dietPrey,
  diet_flora: icaa.dietFlora,
  behavior_1: icaa.behavior1,
  behavior_2: icaa.behavior2,
  lifespan: icaa.lifespan,
  maturity: icaa.maturity,
  reproduction_type: icaa.reproductionType,
  clutch_size: icaa.clutchSize,
  life_description_1: icaa.lifeDescription1,
  life_description_2: icaa.lifeDescription2,
  key_fact_1: icaa.keyFact1,
  key_fact_2: icaa.keyFact2,
  key_fact_3: icaa.keyFact3,
};

// Minimal columns for catalog listing
const catalogColumns = {
  ogc_fid: icaa.ogcFid,
  common_name: icaa.commonName,
  scientific_name: icaa.scientificName,
  taxon_order: icaa.taxonOrder,
  family: icaa.family,
  genus: icaa.genus,
  kingdom: icaa.kingdom,
  phylum: icaa.phylum,
  class: icaa.class,
  realm: icaa.realm,
  biome: icaa.biome,
  bioregion: icaa.bioregion,
  category: icaa.category,
  marine: icaa.marine,
  terrestrial: icaa.terrestrial,
  freshwater: icaa.freshwater,
  aquatic: icaa.aquatic,
};

// =============================================================================
// DRIZZLE QUERIES - Non-spatial operations with type safety
// =============================================================================

/**
 * Fetches species catalog for SpeciesList component.
 * Returns a minimal set of fields for efficient list rendering.
 */
export async function getSpeciesCatalog() {
  return db
    .select(catalogColumns)
    .from(icaa)
    .orderBy(asc(icaa.commonName));
}

/**
 * Type for catalog items (subset of ICAA fields).
 */
export type SpeciesCatalogItem = Awaited<ReturnType<typeof getSpeciesCatalog>>[number];

/**
 * Fetches full species details by ID (excludes geometry).
 */
export async function getSpeciesById(ogcFid: number): Promise<Species | null> {
  const results = await db
    .select(speciesColumns)
    .from(icaa)
    .where(eq(icaa.ogcFid, ogcFid))
    .limit(1);

  return (results[0] as unknown as Species) || null;
}

/**
 * Fetches multiple species by their IDs (excludes geometry).
 */
export async function getSpeciesByIds(ids: number[]): Promise<Species[]> {
  const results = await db
    .select(speciesColumns)
    .from(icaa)
    .where(inArray(icaa.ogcFid, ids))
    .orderBy(asc(icaa.commonName));

  return results as unknown as Species[];
}

/**
 * Searches species by common or scientific name.
 * Case-insensitive partial matching.
 */
export async function searchSpecies(query: string) {
  const searchTerm = `%${query}%`;

  return db
    .select({
      ogc_fid: icaa.ogcFid,
      common_name: icaa.commonName,
      scientific_name: icaa.scientificName,
      category: icaa.category,
      realm: icaa.realm,
    })
    .from(icaa)
    .where(
      or(
        ilike(icaa.commonName, searchTerm),
        ilike(icaa.scientificName, searchTerm)
      )
    )
    .orderBy(asc(icaa.commonName))
    .limit(20);
}

/**
 * Filters species by conservation status (IUCN category).
 */
export async function getSpeciesByConservationStatus(categories: string[]): Promise<Species[]> {
  const results = await db
    .select(speciesColumns)
    .from(icaa)
    .where(inArray(icaa.category, categories))
    .orderBy(asc(icaa.commonName));

  return results as unknown as Species[];
}

/**
 * Filters species by realm (biogeographic region).
 */
export async function getSpeciesByRealm(realm: string): Promise<Species[]> {
  const results = await db
    .select(speciesColumns)
    .from(icaa)
    .where(eq(icaa.realm, realm))
    .orderBy(asc(icaa.commonName));

  return results as unknown as Species[];
}

// =============================================================================
// POSTGIS SPATIAL QUERIES - Using Drizzle sql`` template
// =============================================================================

interface SpatialSpeciesRow {
  ogc_fid: number;
  common_name: string | null;
  scientific_name: string | null;
  category: string | null;
  realm: string | null;
  biome: string | null;
  taxon_order: string | null;
  family: string | null;
  genus: string | null;
  [key: string]: unknown;
}

/**
 * Finds species within a radius of a geographic point.
 * Uses PostGIS ST_DWithin for efficient spatial query.
 */
export async function getSpeciesInRadius(
  lon: number,
  lat: number,
  radiusMeters: number = 10000
) {
  const results = await db.execute<SpatialSpeciesRow>(sql`
    SELECT *
    FROM icaa
    WHERE wkb_geometry IS NOT NULL
      AND ST_DWithin(
        wkb_geometry::geography,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
  `);

  return [...results];
}

/**
 * Finds species whose habitat polygon contains a specific point.
 * Uses PostGIS ST_Contains to check point-in-polygon.
 */
export async function getSpeciesAtPoint(lon: number, lat: number) {
  const results = await db.execute<SpatialSpeciesRow>(sql`
    SELECT *
    FROM icaa
    WHERE wkb_geometry IS NOT NULL
      AND ST_Contains(
        wkb_geometry,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
      )
  `);

  return [...results];
}

/**
 * Gets the closest species habitat to a point.
 * Used when no species are found at the click location.
 */
export async function getClosestHabitat(lon: number, lat: number) {
  const results = await db.execute<SpatialSpeciesRow>(sql`
    SELECT *
    FROM icaa
    WHERE wkb_geometry IS NOT NULL
    ORDER BY wkb_geometry::geography <-> ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
    LIMIT 1
  `);

  const rows = [...results];
  return rows[0] || null;
}

/**
 * Gets bioregion information for a list of species.
 */
export async function getSpeciesBioregions(speciesIds: number[]) {
  if (speciesIds.length === 0) return [];

  const species = await db
    .select({
      ogc_fid: icaa.ogcFid,
      bioregion: icaa.bioregion,
      realm: icaa.realm,
      subrealm: icaa.subrealm,
      biome: icaa.biome,
    })
    .from(icaa)
    .where(inArray(icaa.ogcFid, speciesIds));

  return species.map(s => ({
    species_id: s.ogc_fid,
    bioregion: s.bioregion,
    realm: s.realm,
    subrealm: s.subrealm,
    biome: s.biome,
  }));
}

// =============================================================================
// RAW SQL ESCAPE HATCH - For complex custom queries
// =============================================================================

/**
 * Executes a raw SQL query using Drizzle's sql template.
 * Always use tagged template literals (parameterized) for safety.
 */
export async function executeRawQuery<T extends Record<string, unknown>>(
  query: ReturnType<typeof sql>
): Promise<T[]> {
  const results = await db.execute<T>(query);
  return [...results] as T[];
}

// =============================================================================
// AGGREGATION QUERIES - Statistics and counts
// =============================================================================

/**
 * Gets count of species by conservation status.
 */
export async function getSpeciesCountByStatus() {
  const results = await db
    .select({
      category: icaa.category,
      count: count(icaa.ogcFid),
    })
    .from(icaa)
    .groupBy(icaa.category)
    .orderBy(desc(count(icaa.ogcFid)));

  return results.reduce<Record<string, number>>((acc, item) => {
    if (item.category) {
      acc[item.category] = item.count;
    }
    return acc;
  }, {});
}

/**
 * Gets count of species by realm.
 */
export async function getSpeciesCountByRealm() {
  const results = await db
    .select({
      realm: icaa.realm,
      count: count(icaa.ogcFid),
    })
    .from(icaa)
    .groupBy(icaa.realm)
    .orderBy(desc(count(icaa.ogcFid)));

  return results.reduce<Record<string, number>>((acc, item) => {
    if (item.realm) {
      acc[item.realm] = item.count;
    }
    return acc;
  }, {});
}

/**
 * Gets total species count in database.
 */
export async function getTotalSpeciesCount(): Promise<number> {
  const results = await db
    .select({ count: count(icaa.ogcFid) })
    .from(icaa);

  return results[0]?.count ?? 0;
}
