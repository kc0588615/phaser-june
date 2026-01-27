import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
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
 * GET /api/species/catalog
 * Returns all species for the species list/catalog view.
 */
export async function GET() {
  await ensureIcaaViewReady();
  try {
    const species = await db
      .select(speciesColumns)
      .from(icaaView)
      .orderBy(asc(icaaView.commonName));

    return NextResponse.json({
      species,
      count: species.length,
    });
  } catch (error) {
    console.error('[API /species/catalog] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch species catalog' },
      { status: 500 }
    );
  }
}
