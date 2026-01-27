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
import { db, icaaView, ensureIcaaViewReady } from '@/db';
import type { Species } from '@/types/database';

// Explicit snake_case column aliases (excludes wkb_geometry for payload size)
const speciesColumns = {
  ogc_fid: icaaView.ogcFid,
  common_name: icaaView.commonName,
  scientific_name: icaaView.scientificName,
  taxonomic_comment: icaaView.taxonomicComment,
  iucn_url: icaaView.iucnUrl,
  kingdom: icaaView.kingdom,
  phylum: icaaView.phylum,
  class: icaaView.class,
  taxon_order: icaaView.taxonOrder,
  family: icaaView.family,
  genus: icaaView.genus,
  category: icaaView.category,
  conservation_code: icaaView.conservationCode,
  conservation_text: icaaView.conservationText,
  threats: icaaView.threats,
  habitat_description: icaaView.habitatDescription,
  habitat_tags: icaaView.habitatTags,
  marine: icaaView.marine,
  terrestrial: icaaView.terrestrial,
  freshwater: icaaView.freshwater,
  aquatic: icaaView.aquatic,
  geographic_description: icaaView.geographicDescription,
  distribution_comment: icaaView.distributionComment,
  island: icaaView.island,
  origin: icaaView.origin,
  bioregion: icaaView.bioregion,
  realm: icaaView.realm,
  subrealm: icaaView.subrealm,
  biome: icaaView.biome,
  color_primary: icaaView.colorPrimary,
  color_secondary: icaaView.colorSecondary,
  pattern: icaaView.pattern,
  shape_description: icaaView.shapeDescription,
  size_min_cm: icaaView.sizeMinCm,
  size_max_cm: icaaView.sizeMaxCm,
  weight_kg: icaaView.weightKg,
  diet_type: icaaView.dietType,
  diet_prey: icaaView.dietPrey,
  diet_flora: icaaView.dietFlora,
  behavior_1: icaaView.behavior1,
  behavior_2: icaaView.behavior2,
  lifespan: icaaView.lifespan,
  maturity: icaaView.maturity,
  reproduction_type: icaaView.reproductionType,
  clutch_size: icaaView.clutchSize,
  life_description_1: icaaView.lifeDescription1,
  life_description_2: icaaView.lifeDescription2,
  key_fact_1: icaaView.keyFact1,
  key_fact_2: icaaView.keyFact2,
  key_fact_3: icaaView.keyFact3,
};

// Minimal columns for catalog listing
const catalogColumns = {
  ogc_fid: icaaView.ogcFid,
  common_name: icaaView.commonName,
  scientific_name: icaaView.scientificName,
  taxon_order: icaaView.taxonOrder,
  family: icaaView.family,
  genus: icaaView.genus,
  kingdom: icaaView.kingdom,
  phylum: icaaView.phylum,
  class: icaaView.class,
  realm: icaaView.realm,
  biome: icaaView.biome,
  bioregion: icaaView.bioregion,
  category: icaaView.category,
  marine: icaaView.marine,
  terrestrial: icaaView.terrestrial,
  freshwater: icaaView.freshwater,
  aquatic: icaaView.aquatic,
};

async function requireIcaaView() {
  await ensureIcaaViewReady();
}

// =============================================================================
// DRIZZLE QUERIES - Non-spatial operations with type safety
// =============================================================================

/**
 * Fetches species catalog for SpeciesList component.
 * Returns a minimal set of fields for efficient list rendering.
 */
export async function getSpeciesCatalog() {
  await requireIcaaView();
  return db
    .select(catalogColumns)
    .from(icaaView)
    .orderBy(asc(icaaView.commonName));
}

/**
 * Type for catalog items (subset of ICAA fields).
 */
export type SpeciesCatalogItem = Awaited<ReturnType<typeof getSpeciesCatalog>>[number];

/**
 * Fetches full species details by ID (excludes geometry).
 */
export async function getSpeciesById(ogcFid: number): Promise<Species | null> {
  await requireIcaaView();
  const results = await db
    .select(speciesColumns)
    .from(icaaView)
    .where(eq(icaaView.ogcFid, ogcFid))
    .limit(1);

  return (results[0] as unknown as Species) || null;
}

/**
 * Fetches multiple species by their IDs (excludes geometry).
 */
export async function getSpeciesByIds(ids: number[]): Promise<Species[]> {
  await requireIcaaView();
  const results = await db
    .select(speciesColumns)
    .from(icaaView)
    .where(inArray(icaaView.ogcFid, ids))
    .orderBy(asc(icaaView.commonName));

  return results as unknown as Species[];
}

/**
 * Searches species by common or scientific name.
 * Case-insensitive partial matching.
 */
export async function searchSpecies(query: string) {
  await requireIcaaView();
  const searchTerm = `%${query}%`;

  return db
    .select({
      ogc_fid: icaaView.ogcFid,
      common_name: icaaView.commonName,
      scientific_name: icaaView.scientificName,
      category: icaaView.category,
      realm: icaaView.realm,
    })
    .from(icaaView)
    .where(
      or(
        ilike(icaaView.commonName, searchTerm),
        ilike(icaaView.scientificName, searchTerm)
      )
    )
    .orderBy(asc(icaaView.commonName))
    .limit(20);
}

/**
 * Filters species by conservation status (IUCN category).
 */
export async function getSpeciesByConservationStatus(categories: string[]): Promise<Species[]> {
  await requireIcaaView();
  const results = await db
    .select(speciesColumns)
    .from(icaaView)
    .where(inArray(icaaView.category, categories))
    .orderBy(asc(icaaView.commonName));

  return results as unknown as Species[];
}

/**
 * Filters species by realm (biogeographic region).
 */
export async function getSpeciesByRealm(realm: string): Promise<Species[]> {
  await requireIcaaView();
  const results = await db
    .select(speciesColumns)
    .from(icaaView)
    .where(eq(icaaView.realm, realm))
    .orderBy(asc(icaaView.commonName));

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
  await requireIcaaView();
  const results = await db.execute<SpatialSpeciesRow>(sql`
    SELECT *
    FROM icaa_view
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
  await requireIcaaView();
  const results = await db.execute<SpatialSpeciesRow>(sql`
    SELECT *
    FROM icaa_view
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
  await requireIcaaView();
  const results = await db.execute<SpatialSpeciesRow>(sql`
    SELECT *
    FROM icaa_view
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
  await requireIcaaView();
  if (speciesIds.length === 0) return [];

  const species = await db
    .select({
      ogc_fid: icaaView.ogcFid,
      bioregion: icaaView.bioregion,
      realm: icaaView.realm,
      subrealm: icaaView.subrealm,
      biome: icaaView.biome,
    })
    .from(icaaView)
    .where(inArray(icaaView.ogcFid, speciesIds));

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
  await requireIcaaView();
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
  await requireIcaaView();
  const results = await db
    .select({
      category: icaaView.category,
      count: count(icaaView.ogcFid),
    })
    .from(icaaView)
    .groupBy(icaaView.category)
    .orderBy(desc(count(icaaView.ogcFid)));

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
  await requireIcaaView();
  const results = await db
    .select({
      realm: icaaView.realm,
      count: count(icaaView.ogcFid),
    })
    .from(icaaView)
    .groupBy(icaaView.realm)
    .orderBy(desc(count(icaaView.ogcFid)));

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
  await requireIcaaView();
  const results = await db
    .select({ count: count(icaaView.ogcFid) })
    .from(icaaView);

  return results[0]?.count ?? 0;
}
