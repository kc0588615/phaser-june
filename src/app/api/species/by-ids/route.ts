import { NextRequest, NextResponse } from 'next/server';
import { asc, inArray } from 'drizzle-orm';
import { db, icaaView, ensureIcaaViewReady } from '@/db';

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

/**
 * GET /api/species/by-ids?ids=1,2,3
 * POST /api/species/by-ids { ids: [1, 2, 3] }
 *
 * Batch fetch species by their ogc_fid values
 */
export async function GET(request: NextRequest) {
  await ensureIcaaViewReady();
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
      .from(icaaView)
      .where(inArray(icaaView.ogcFid, ids))
      .orderBy(asc(icaaView.ogcFid));

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
  await ensureIcaaViewReady();
  try {
    const body = await request.json();
    const ids: number[] = body.ids || [];

    if (ids.length === 0) {
      return NextResponse.json({ species: [] });
    }

    const species = await db
      .select(speciesColumns)
      .from(icaaView)
      .where(inArray(icaaView.ogcFid, ids))
      .orderBy(asc(icaaView.ogcFid));

    return NextResponse.json({ species });
  } catch (error) {
    console.error('[API /species/by-ids] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch species' },
      { status: 500 }
    );
  }
}
