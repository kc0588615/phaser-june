// =============================================================================
// SPATIAL TABLES - Introspected from DB (import-owned, do not edit for migrations)
// Re-introspect after shapefile schema changes: npx drizzle-kit introspect
// =============================================================================

import {
  doublePrecision,
  geometry,
  index,
  numeric,
  pgTable,
  serial,
  text,
  varchar,
} from 'drizzle-orm/pg-core';

export const icaa = pgTable(
  'icaa',
  {
    ogcFid: serial('ogc_fid').primaryKey().notNull(),
    idNo: numeric('id_no', { precision: 65, scale: 30 }),
    commName: text('comm_name'),
    sciName: text('sci_name'),
    taxComm: text('tax_comm'),
    httpIucn: text('http_iucn'),
    kingdom: text(),
    phylum: text(),
    class: text(),
    order: text('order_'),
    family: text(),
    genus: text(),
    category: text(),
    consCode: text('cons_code'),
    consText: text('cons_text'),
    threats: text(),
    habDesc: text('hab_desc'),
    habTags: text('hab_tags'),
    marine: text(),
    terrestria: text(),
    freshwater: text(),
    aquatic: text(),
    geoDesc: text('geo_desc'),
    distComm: text('dist_comm'),
    island: text(),
    origin: numeric({ precision: 65, scale: 30 }),
    presence: numeric({ precision: 65, scale: 30 }),
    seasonal: numeric({ precision: 65, scale: 30 }),
    bioregio1: text('bioregio_1'),
    realm: text(),
    subRealm: text('sub_realm'),
    biome: text(),
    colorPrim: text('color_prim'),
    colorSec: text('color_sec'),
    pattern: text(),
    shapeDesc: text('shape_desc'),
    sizeMin: numeric('size_min', { precision: 65, scale: 30 }),
    sizeMax: numeric('size_max', { precision: 65, scale: 30 }),
    weightKg: numeric('weight_kg', { precision: 65, scale: 30 }),
    dietType: text('diet_type'),
    dietPrey: text('diet_prey'),
    dietFlora: text('diet_flora'),
    behav1: text('behav_1'),
    behav2: text('behav_2'),
    lifespan: numeric({ precision: 65, scale: 30 }),
    maturity: text(),
    reproType: text('repro_type'),
    clutchSz: text('clutch_sz'),
    lifeDesc1: text('life_desc1'),
    lifeDesc2: text('life_desc2'),
    keyFact1: text('key_fact1'),
    keyFact2: text('key_fact2'),
    keyFact3: text('key_fact3'),
    compiler: text(),
    yrcompiled: numeric({ precision: 65, scale: 30 }),
    citation: text(),
    source: text(),
    subspecies: text(),
    subpop: text(),
    legend: text(),
    generalisd: numeric({ precision: 65, scale: 30 }),
    shapeLeng: numeric('shape_leng', { precision: 65, scale: 30 }),
    shapeLe1: numeric('shape_le_1', { precision: 65, scale: 30 }),
    shapeArea: numeric('shape_area', { precision: 65, scale: 30 }),
    wkbGeometry: geometry('wkb_geometry', { type: 'geometry', srid: 4326 }),
  },
  (table) => [
    index('ix_icaa_wkb_geometry').using(
      'gist',
      table.wkbGeometry.asc().nullsLast().op('gist_geometry_ops_2d')
    ),
  ]
);

export const oneearthBioregion = pgTable(
  'oneearth_bioregion',
  {
    ogcFid: serial('ogc_fid').primaryKey().notNull(),
    objectid1: numeric('objectid_1', { precision: 65, scale: 30 }),
    objectid2: numeric('objectid_2', { precision: 65, scale: 30 }),
    bioregions: varchar(),
    bioregio1: varchar('bioregio_1'),
    realm: varchar(),
    subRealm: varchar('sub_realm'),
    biome: varchar(),
    shapeLeng: doublePrecision('shape_leng'),
    shapeLe1: numeric('shape_le_1', { precision: 65, scale: 30 }),
    shapeArea: doublePrecision('shape_area'),
    wkbGeometry: geometry('wkb_geometry', { type: 'multipolygon', srid: 4326 }),
  },
  (table) => [
    index('ix_oneearth_bioregion_wkb_geometry').using(
      'gist',
      table.wkbGeometry.asc().nullsLast().op('gist_geometry_ops_2d')
    ),
  ]
);
