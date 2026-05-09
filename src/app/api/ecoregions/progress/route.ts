import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';

interface EcoregionRow {
  ecoregion_id: number;
  dbEcoregionId: number;
  bioregion: string | null;
  realm: string | null;
  subrealm: string | null;
  biome: string | null;
  collectionRegion: string | null;
  total_species: number;
  found_species: number;
  [key: string]: unknown;
}

interface GroupRow {
  animal_type: string;
  animal_icon: string;
  total_species: number;
  found_species: number;
  [key: string]: unknown;
}

interface FoundPointRow {
  discovery_id: string;
  species_id: number;
  common_name: string | null;
  scientific_name: string | null;
  animal_type: string;
  animal_icon: string;
  lon: number;
  lat: number;
  discovered_at: string;
  [key: string]: unknown;
}

const animalTypeSql = sql`
  CASE lower(COALESCE(NULLIF(s.class, ''), 'unknown'))
    WHEN 'amphibia' THEN 'Amphibians'
    WHEN 'mammalia' THEN 'Mammals'
    WHEN 'reptilia' THEN 'Reptiles'
    WHEN 'aves' THEN 'Birds'
    WHEN 'actinopterygii' THEN 'Fish'
    WHEN 'chondrichthyes' THEN 'Fish'
    ELSE COALESCE(NULLIF(s.class, ''), 'Unknown')
  END
`;

const animalIconSql = sql`
  CASE lower(COALESCE(NULLIF(s.class, ''), 'unknown'))
    WHEN 'amphibia' THEN 'frog'
    WHEN 'mammalia' THEN 'paw'
    WHEN 'reptilia' THEN 'turtle'
    WHEN 'aves' THEN 'bird'
    WHEN 'actinopterygii' THEN 'fish'
    WHEN 'chondrichthyes' THEN 'fish'
    ELSE 'species'
  END
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = Number(searchParams.get('id'));
    const lon = Number(searchParams.get('lon'));
    const lat = Number(searchParams.get('lat'));

    if (!Number.isFinite(idParam) && (!Number.isFinite(lon) || !Number.isFinite(lat))) {
      return NextResponse.json({ error: 'Missing id or lon/lat' }, { status: 400 });
    }

    const ecoregion = Number.isFinite(idParam)
      ? await getEcoregionById(idParam)
      : await getEcoregionAtPoint(lon, lat);

    if (!ecoregion) {
      return NextResponse.json({ ecoregion: null, groups: [], foundPoints: [] });
    }

    const playerId = await getPlayerIdFromClerk();
    const groups = await getGroupProgress(ecoregion, playerId);
    const foundPoints = playerId ? await getFoundPoints(ecoregion, playerId) : [];
    const foundSpecies = groups.reduce((sum, group) => sum + group.found_species, 0);
    const totalSpecies = groups.reduce((sum, group) => sum + group.total_species, 0);

    return NextResponse.json({
      ecoregion: { ...ecoregion, total_species: totalSpecies, found_species: foundSpecies },
      groups,
      foundPoints,
    });
  } catch (error) {
    console.error('[API /ecoregions/progress] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch ecoregion progress' }, { status: 500 });
  }
}

async function getEcoregionById(id: number): Promise<EcoregionRow | null> {
  const rows = await db.execute<EcoregionRow>(sql`
    SELECT
      b.ogc_fid AS ecoregion_id,
      b.ogc_fid AS "dbEcoregionId",
      b.bioregion::text,
      b.realm::text,
      b.sub_realm::text AS subrealm,
      b.biome::text,
      COALESCE(NULLIF(BTRIM(b.sub_realm), ''), b.bioregion)::text AS "collectionRegion",
      COUNT(DISTINCT se.species_id)::int AS total_species,
      0::int AS found_species
    FROM oneearth.oneearth_bioregion b
    LEFT JOIN public.species_ecoregions se ON se.ecoregion_id = b.ogc_fid
    WHERE b.ogc_fid = ${id}
    GROUP BY b.ogc_fid, b.bioregion, b.realm, b.sub_realm, b.biome
    LIMIT 1
  `);
  return rows[0] ?? null;
}

async function getEcoregionAtPoint(lon: number, lat: number): Promise<EcoregionRow | null> {
  const rows = await db.execute<EcoregionRow>(sql`
    WITH pt AS (
      SELECT ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326) AS geom
    )
    SELECT
      b.ogc_fid AS ecoregion_id,
      b.ogc_fid AS "dbEcoregionId",
      b.bioregion::text,
      b.realm::text,
      b.sub_realm::text AS subrealm,
      b.biome::text,
      COALESCE(NULLIF(BTRIM(b.sub_realm), ''), b.bioregion)::text AS "collectionRegion",
      COUNT(DISTINCT se.species_id)::int AS total_species,
      0::int AS found_species
    FROM oneearth.oneearth_bioregion b
    CROSS JOIN pt
    LEFT JOIN public.species_ecoregions se ON se.ecoregion_id = b.ogc_fid
    WHERE ST_Intersects(b.wkb_geometry, pt.geom)
    GROUP BY b.ogc_fid, b.bioregion, b.realm, b.sub_realm, b.biome
    ORDER BY b.shape_area DESC NULLS LAST
    LIMIT 1
  `);
  return rows[0] ?? null;
}

function collectionWhere(ecoregion: EcoregionRow) {
  if (ecoregion.collectionRegion) {
    return sql`COALESCE(NULLIF(BTRIM(b.sub_realm), ''), b.bioregion) = ${ecoregion.collectionRegion}`;
  }
  return sql`b.ogc_fid = ${ecoregion.ecoregion_id}`;
}

async function getGroupProgress(ecoregion: EcoregionRow, playerId: string | null): Promise<GroupRow[]> {
  const discoveryJoin = playerId
    ? sql`LEFT JOIN public.player_species_discoveries d ON d.species_id = s.id AND d.player_id = ${playerId}::uuid`
    : sql`LEFT JOIN public.player_species_discoveries d ON false`;

  const rows = await db.execute<GroupRow>(sql`
    SELECT
      ${animalTypeSql} AS animal_type,
      ${animalIconSql} AS animal_icon,
      COUNT(DISTINCT s.id)::int AS total_species,
      COUNT(DISTINCT d.species_id)::int AS found_species
    FROM public.species_ecoregions se
    JOIN oneearth.oneearth_bioregion b ON b.ogc_fid = se.ecoregion_id
    JOIN public.species s ON s.id = se.species_id
    ${discoveryJoin}
    WHERE ${collectionWhere(ecoregion)}
    GROUP BY animal_type, animal_icon
    ORDER BY animal_type
  `);

  return [...rows];
}

async function getFoundPoints(ecoregion: EcoregionRow, playerId: string): Promise<FoundPointRow[]> {
  const rows = await db.execute<FoundPointRow>(sql`
    SELECT DISTINCT ON (d.species_id)
      d.id::text AS discovery_id,
      s.id AS species_id,
      s.common_name,
      s.scientific_name,
      ${animalTypeSql} AS animal_type,
      ${animalIconSql} AS animal_icon,
      d.found_lon AS lon,
      d.found_lat AS lat,
      d.discovered_at::text
    FROM public.species_ecoregions se
    JOIN oneearth.oneearth_bioregion b ON b.ogc_fid = se.ecoregion_id
    JOIN public.species s ON s.id = se.species_id
    JOIN public.player_species_discoveries d
      ON d.species_id = s.id
     AND d.player_id = ${playerId}::uuid
    WHERE ${collectionWhere(ecoregion)}
      AND d.found_lon IS NOT NULL
      AND d.found_lat IS NOT NULL
    ORDER BY d.species_id, d.discovered_at ASC
  `);

  return [...rows];
}
