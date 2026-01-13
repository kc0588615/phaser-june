import { NextRequest, NextResponse } from 'next/server';
import { asc, inArray } from 'drizzle-orm';
import { db, icaa } from '@/db';

// Explicit snake_case column aliases (excludes wkb_geometry for payload size)
const speciesColumns = {
  ogc_fid: icaa.ogcFid,
  comm_name: icaa.commName,
  sci_name: icaa.sciName,
  tax_comm: icaa.taxComm,
  http_iucn: icaa.httpIucn,
  kingdom: icaa.kingdom,
  phylum: icaa.phylum,
  class: icaa.class,
  order_: icaa.order,
  family: icaa.family,
  genus: icaa.genus,
  category: icaa.category,
  cons_code: icaa.consCode,
  cons_text: icaa.consText,
  threats: icaa.threats,
  hab_desc: icaa.habDesc,
  hab_tags: icaa.habTags,
  marine: icaa.marine,
  terrestria: icaa.terrestria,
  freshwater: icaa.freshwater,
  aquatic: icaa.aquatic,
  geo_desc: icaa.geoDesc,
  dist_comm: icaa.distComm,
  island: icaa.island,
  origin: icaa.origin,
  bioregio_1: icaa.bioregio1,
  realm: icaa.realm,
  sub_realm: icaa.subRealm,
  biome: icaa.biome,
  color_prim: icaa.colorPrim,
  color_sec: icaa.colorSec,
  pattern: icaa.pattern,
  shape_desc: icaa.shapeDesc,
  size_min: icaa.sizeMin,
  size_max: icaa.sizeMax,
  weight_kg: icaa.weightKg,
  diet_type: icaa.dietType,
  diet_prey: icaa.dietPrey,
  diet_flora: icaa.dietFlora,
  behav_1: icaa.behav1,
  behav_2: icaa.behav2,
  lifespan: icaa.lifespan,
  maturity: icaa.maturity,
  repro_type: icaa.reproType,
  clutch_sz: icaa.clutchSz,
  life_desc1: icaa.lifeDesc1,
  life_desc2: icaa.lifeDesc2,
  key_fact1: icaa.keyFact1,
  key_fact2: icaa.keyFact2,
  key_fact3: icaa.keyFact3,
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
