// =============================================================================
// SPECIES QUERIES - Drizzle ORM + Raw SQL for PostGIS
// =============================================================================

import { eq, inArray, ilike, or, asc, desc, count, sql } from 'drizzle-orm';
import { db, speciesTable } from '@/db';
import type { Species } from '@/types/database';

// Explicit snake_case column aliases (non-spatial fields from species table)
const speciesColumns = {
  id: speciesTable.id,
  iucn_id: speciesTable.iucnId,
  common_name: speciesTable.commonName,
  scientific_name: speciesTable.scientificName,
  kingdom: speciesTable.kingdom,
  phylum: speciesTable.phylum,
  class: speciesTable.class,
  taxon_order: speciesTable.taxonOrder,
  family: speciesTable.family,
  genus: speciesTable.genus,
  conservation_code: speciesTable.conservationCode,
  conservation_text: speciesTable.conservationText,
  habitat_description: speciesTable.habitatDescription,
  habitat_tags: speciesTable.habitatTags,
  marine: speciesTable.marine,
  terrestrial: speciesTable.terrestrial,
  freshwater: speciesTable.freshwater,
  geographic_description: speciesTable.geographicDescription,
  bioregion: speciesTable.bioregion,
  realm: speciesTable.realm,
  subrealm: speciesTable.subrealm,
  biome: speciesTable.biome,
  color_primary: speciesTable.colorPrimary,
  color_secondary: speciesTable.colorSecondary,
  pattern: speciesTable.pattern,
  shape_description: speciesTable.shapeDescription,
  size_min_cm: speciesTable.sizeMinCm,
  size_max_cm: speciesTable.sizeMaxCm,
  weight_kg: speciesTable.weightKg,
  diet_type: speciesTable.dietType,
  lifespan: speciesTable.lifespan,
  maturity: speciesTable.maturity,
  reproduction_type: speciesTable.reproductionType,
  clutch_size: speciesTable.clutchSize,
};

// Minimal columns for catalog listing
const catalogColumns = {
  id: speciesTable.id,
  common_name: speciesTable.commonName,
  scientific_name: speciesTable.scientificName,
  taxon_order: speciesTable.taxonOrder,
  family: speciesTable.family,
  genus: speciesTable.genus,
  kingdom: speciesTable.kingdom,
  phylum: speciesTable.phylum,
  class: speciesTable.class,
  realm: speciesTable.realm,
  biome: speciesTable.biome,
  bioregion: speciesTable.bioregion,
  conservation_code: speciesTable.conservationCode,
  marine: speciesTable.marine,
  terrestrial: speciesTable.terrestrial,
  freshwater: speciesTable.freshwater,
};

// =============================================================================
// DRIZZLE QUERIES - Non-spatial operations with type safety
// =============================================================================

/**
 * Fetches species catalog for SpeciesList component.
 */
export async function getSpeciesCatalog() {
  return db
    .select(catalogColumns)
    .from(speciesTable)
    .orderBy(asc(speciesTable.commonName));
}

export type SpeciesCatalogItem = Awaited<ReturnType<typeof getSpeciesCatalog>>[number];

/**
 * Fetches full species details by ID (excludes geometry).
 */
export async function getSpeciesById(speciesId: number): Promise<Species | null> {
  const results = await db
    .select(speciesColumns)
    .from(speciesTable)
    .where(eq(speciesTable.id, speciesId))
    .limit(1);

  return (results[0] as unknown as Species) || null;
}

/**
 * Fetches multiple species by their IDs (excludes geometry).
 */
export async function getSpeciesByIds(ids: number[]): Promise<Species[]> {
  const results = await db
    .select(speciesColumns)
    .from(speciesTable)
    .where(inArray(speciesTable.id, ids))
    .orderBy(asc(speciesTable.commonName));

  return results as unknown as Species[];
}

/**
 * Searches species by common or scientific name.
 */
export async function searchSpecies(query: string) {
  const searchTerm = `%${query}%`;

  return db
    .select({
      id: speciesTable.id,
      common_name: speciesTable.commonName,
      scientific_name: speciesTable.scientificName,
      conservation_code: speciesTable.conservationCode,
      realm: speciesTable.realm,
    })
    .from(speciesTable)
    .where(
      or(
        ilike(speciesTable.commonName, searchTerm),
        ilike(speciesTable.scientificName, searchTerm)
      )
    )
    .orderBy(asc(speciesTable.commonName))
    .limit(20);
}

/**
 * Filters species by conservation status.
 */
export async function getSpeciesByConservationStatus(codes: string[]): Promise<Species[]> {
  const results = await db
    .select(speciesColumns)
    .from(speciesTable)
    .where(inArray(speciesTable.conservationCode, codes))
    .orderBy(asc(speciesTable.commonName));

  return results as unknown as Species[];
}

/**
 * Filters species by realm.
 */
export async function getSpeciesByRealm(realm: string): Promise<Species[]> {
  const results = await db
    .select(speciesColumns)
    .from(speciesTable)
    .where(eq(speciesTable.realm, realm))
    .orderBy(asc(speciesTable.commonName));

  return results as unknown as Species[];
}

// =============================================================================
// POSTGIS SPATIAL QUERIES
// Join species table with icaa geometry via iucn_id = species_id
// =============================================================================

interface SpatialSpeciesRow {
  id: number;
  common_name: string | null;
  scientific_name: string | null;
  conservation_code: string | null;
  realm: string | null;
  biome: string | null;
  taxon_order: string | null;
  family: string | null;
  genus: string | null;
  [key: string]: unknown;
}

/**
 * Finds species within a radius of a geographic point.
 */
export async function getSpeciesInRadius(
  lon: number,
  lat: number,
  radiusMeters: number = 10000
) {
  const results = await db.execute<SpatialSpeciesRow>(sql`
    SELECT DISTINCT ON (s.id) s.*, i.wkb_geometry
    FROM species s
    JOIN icaa i ON i.species_id = s.iucn_id::numeric
    WHERE i.wkb_geometry IS NOT NULL
      AND ST_DWithin(
        i.wkb_geometry::geography,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
  `);

  return [...results];
}

/**
 * Finds species whose habitat polygon contains a specific point.
 */
export async function getSpeciesAtPoint(lon: number, lat: number) {
  const results = await db.execute<SpatialSpeciesRow>(sql`
    SELECT DISTINCT ON (s.id) s.*, i.wkb_geometry
    FROM species s
    JOIN icaa i ON i.species_id = s.iucn_id::numeric
    WHERE i.wkb_geometry IS NOT NULL
      AND ST_Contains(
        i.wkb_geometry,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
      )
  `);

  return [...results];
}

/**
 * Gets the closest species habitat to a point.
 */
export async function getClosestHabitat(lon: number, lat: number) {
  const results = await db.execute<SpatialSpeciesRow>(sql`
    SELECT DISTINCT ON (s.id) s.*, i.wkb_geometry
    FROM species s
    JOIN icaa i ON i.species_id = s.iucn_id::numeric
    WHERE i.wkb_geometry IS NOT NULL
    ORDER BY s.id, i.wkb_geometry::geography <-> ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
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

  const rows = await db
    .select({
      id: speciesTable.id,
      bioregion: speciesTable.bioregion,
      realm: speciesTable.realm,
      subrealm: speciesTable.subrealm,
      biome: speciesTable.biome,
    })
    .from(speciesTable)
    .where(inArray(speciesTable.id, speciesIds));

  return rows.map(s => ({
    species_id: s.id,
    bioregion: s.bioregion,
    realm: s.realm,
    subrealm: s.subrealm,
    biome: s.biome,
  }));
}

// =============================================================================
// RAW SQL ESCAPE HATCH
// =============================================================================

export async function executeRawQuery<T extends Record<string, unknown>>(
  query: ReturnType<typeof sql>
): Promise<T[]> {
  const results = await db.execute<T>(query);
  return [...results] as T[];
}

// =============================================================================
// AGGREGATION QUERIES
// =============================================================================

export async function getSpeciesCountByStatus() {
  const results = await db
    .select({
      conservation_code: speciesTable.conservationCode,
      count: count(speciesTable.id),
    })
    .from(speciesTable)
    .groupBy(speciesTable.conservationCode)
    .orderBy(desc(count(speciesTable.id)));

  return results.reduce<Record<string, number>>((acc, item) => {
    if (item.conservation_code) {
      acc[item.conservation_code] = item.count;
    }
    return acc;
  }, {});
}

export async function getSpeciesCountByRealm() {
  const results = await db
    .select({
      realm: speciesTable.realm,
      count: count(speciesTable.id),
    })
    .from(speciesTable)
    .groupBy(speciesTable.realm)
    .orderBy(desc(count(speciesTable.id)));

  return results.reduce<Record<string, number>>((acc, item) => {
    if (item.realm) {
      acc[item.realm] = item.count;
    }
    return acc;
  }, {});
}

export async function getTotalSpeciesCount(): Promise<number> {
  const results = await db
    .select({ count: count(speciesTable.id) })
    .from(speciesTable);

  return results[0]?.count ?? 0;
}
