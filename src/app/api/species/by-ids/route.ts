import { NextRequest, NextResponse } from 'next/server';
import { asc, inArray } from 'drizzle-orm';
import { db, icaa } from '@/db';

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

/**
 * GET /api/species/by-ids?ids=1,2,3
 * POST /api/species/by-ids { ids: [1, 2, 3] }
 *
 * Batch fetch species by their ogc_fid values
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { error: 'Missing ids parameter' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return NextResponse.json({ species: [] });
    }

    const species = await db
      .select(speciesColumns)
      .from(icaa)
      .where(inArray(icaa.ogcFid, ids))
      .orderBy(asc(icaa.ogcFid));

    return NextResponse.json({ species });
  } catch (error) {
    console.error('[API /species/by-ids] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch species' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: number[] = body.ids || [];

    if (ids.length === 0) {
      return NextResponse.json({ species: [] });
    }

    const species = await db
      .select(speciesColumns)
      .from(icaa)
      .where(inArray(icaa.ogcFid, ids))
      .orderBy(asc(icaa.ogcFid));

    return NextResponse.json({ species });
  } catch (error) {
    console.error('[API /species/by-ids] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch species' },
      { status: 500 }
    );
  }
}
