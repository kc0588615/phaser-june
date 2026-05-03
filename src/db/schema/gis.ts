/**
 * Drizzle definitions for org-scoped GIS tables.
 * These live in non-public schemas and are NOT managed by drizzle-kit migrations.
 * Type inference only; runtime queries use raw SQL with schema-qualified names.
 */
import {
  doublePrecision,
  geometry,
  index,
  integer,
  numeric,
  smallint,
  text,
  varchar,
} from 'drizzle-orm/pg-core';
import { pgSchema } from 'drizzle-orm/pg-core';

const unescoSchema = pgSchema('unesco');
const ramsarSchema = pgSchema('ramsar');
const wpdaSchema = pgSchema('wpda');
const wwfSchema = pgSchema('wwf');
const naturalEarthSchema = pgSchema('natural_earth');

// ---------------------------------------------------------------------------
// unesco.world_rivers — 5104 rows, MULTILINESTRING SRID 4326
// Replaces deleted public.hydro_rivers
// ---------------------------------------------------------------------------
export const worldRivers = unescoSchema.table(
  'world_rivers',
  {
    gid: integer('gid').primaryKey(),
    riverMap: varchar('river_map'),
    geom: geometry('geom', { type: 'multilinestring', srid: 4326 }).notNull(),
  },
  (table) => [
    index('world_rivers_geom_idx').using('gist', table.geom),
  ]
);

// ---------------------------------------------------------------------------
// ramsar.wetland — 449 rows, MULTIPOLYGON SRID 4326
// ---------------------------------------------------------------------------
export const ramsarWetland = ramsarSchema.table(
  'wetland',
  {
    gid: integer('gid').primaryKey(),
    ecoId: doublePrecision('eco_id'),
    ecoregion: varchar('ecoregion'),
    mhtTxt: varchar('mht_txt'),
    mhtNo: smallint('mht_no'),
    ecoIdU: integer('eco_id_u'),
    ramsar2014: doublePrecision('ramsar2014'),
    popupText: varchar('popup_text'),
    geom: geometry('geom', { type: 'multipolygon', srid: 4326 }).notNull(),
  },
  (table) => [
    index('ramsar_geom_idx').using('gist', table.geom),
  ]
);

// ---------------------------------------------------------------------------
// wpda.wdpa_points — 7663 rows, MULTIPOINT SRID 4326
// ---------------------------------------------------------------------------
export const wdpaPoints = wpdaSchema.table(
  'wdpa_points',
  {
    gid: integer('gid').primaryKey(),
    siteId: integer('site_id'),
    sitePid: text('site_pid'),
    siteType: text('site_type'),
    nameEng: text('name_eng'),
    name: text('name'),
    desig: text('desig'),
    desigEng: text('desig_eng'),
    desigType: text('desig_type'),
    iucnCat: text('iucn_cat'),
    intCrit: text('int_crit'),
    realm: text('realm'),
    repMArea: numeric('rep_m_area'),
    repArea: numeric('rep_area'),
    noTake: text('no_take'),
    noTkArea: numeric('no_tk_area'),
    status: text('status'),
    statusYr: integer('status_yr'),
    govType: text('gov_type'),
    govsubtype: text('govsubtype'),
    ownType: text('own_type'),
    ownsubtype: text('ownsubtype'),
    mangAuth: text('mang_auth'),
    mangPlan: text('mang_plan'),
    verif: text('verif'),
    metadataid: integer('metadataid'),
    prntIso3: text('prnt_iso3'),
    iso3: text('iso3'),
    suppInfo: text('supp_info'),
    consObj: text('cons_obj'),
    inlndWtrs: text('inlnd_wtrs'),
    oecmAsmt: text('oecm_asmt'),
    geom: geometry('geom', { type: 'multipoint', srid: 4326 }).notNull(),
  },
  (table) => [
    index('wdpa_points_geom_idx').using('gist', table.geom),
  ]
);

// ---------------------------------------------------------------------------
// wpda.wdpa_polygons — 306950 rows, MULTIPOLYGON SRID 4326
// Replaces public.protected_planet_parcels (1177 Brazil-only rows)
// ---------------------------------------------------------------------------
export const wdpaPolygons = wpdaSchema.table(
  'wdpa_polygons',
  {
    gid: integer('gid').primaryKey(),
    siteId: integer('site_id'),
    sitePid: text('site_pid'),
    siteType: text('site_type'),
    nameEng: text('name_eng'),
    name: text('name'),
    desig: text('desig'),
    desigEng: text('desig_eng'),
    desigType: text('desig_type'),
    iucnCat: text('iucn_cat'),
    intCrit: text('int_crit'),
    realm: text('realm'),
    repMArea: numeric('rep_m_area'),
    gisMArea: numeric('gis_m_area'),
    repArea: numeric('rep_area'),
    gisArea: numeric('gis_area'),
    noTake: text('no_take'),
    noTkArea: numeric('no_tk_area'),
    status: text('status'),
    statusYr: integer('status_yr'),
    govType: text('gov_type'),
    govsubtype: text('govsubtype'),
    ownType: text('own_type'),
    ownsubtype: text('ownsubtype'),
    mangAuth: text('mang_auth'),
    mangPlan: text('mang_plan'),
    verif: text('verif'),
    metadataid: integer('metadataid'),
    prntIso3: text('prnt_iso3'),
    iso3: text('iso3'),
    suppInfo: text('supp_info'),
    consObj: text('cons_obj'),
    inlndWtrs: text('inlnd_wtrs'),
    oecmAsmt: text('oecm_asmt'),
    geom: geometry('geom', { type: 'multipolygon', srid: 4326 }).notNull(),
  },
  (table) => [
    index('wdpa_polygons_geom_idx').using('gist', table.geom),
  ]
);

// ---------------------------------------------------------------------------
// wwf.glwd_1 — 3721 rows, MULTIPOLYGON SRID 4326
// Global Lakes & Wetlands Database
// ---------------------------------------------------------------------------
export const glwd1 = wwfSchema.table(
  'glwd_1',
  {
    gid: integer('gid').primaryKey(),
    glwdId: integer('glwd_id'),
    type: varchar('type'),
    lakeName: varchar('lake_name'),
    damName: varchar('dam_name'),
    polySrc: varchar('poly_src'),
    areaSkm: doublePrecision('area_skm'),
    perimKm: doublePrecision('perim_km'),
    longDeg: doublePrecision('long_deg'),
    latDeg: doublePrecision('lat_deg'),
    elevM: doublePrecision('elev_m'),
    catchTskm: doublePrecision('catch_tskm'),
    inflowCms: doublePrecision('inflow_cms'),
    volumeCkm: doublePrecision('volume_ckm'),
    volSrc: varchar('vol_src'),
    country: varchar('country'),
    secCntry: varchar('sec_cntry'),
    river: varchar('river'),
    nearCity: varchar('near_city'),
    mgldType: varchar('mgld_type'),
    mgldArea: doublePrecision('mgld_area'),
    lrsArea: doublePrecision('lrs_area'),
    lrsArSrc: varchar('lrs_ar_src'),
    lrsCatch: doublePrecision('lrs_catch'),
    damHeight: doublePrecision('dam_height'),
    damYear: doublePrecision('dam_year'),
    use1: varchar('use_1'),
    use2: varchar('use_2'),
    use3: varchar('use_3'),
    geom: geometry('geom', { type: 'multipolygon', srid: 4326 }).notNull(),
  },
  (table) => [
    index('glwd_1_geom_idx').using('gist', table.geom),
  ]
);

// ---------------------------------------------------------------------------
// natural_earth.populated_places — POINT SRID 4326
// ---------------------------------------------------------------------------
export const naturalEarthPopulatedPlaces = naturalEarthSchema.table(
  'populated_places',
  {
    gid: integer('gid').primaryKey(),
    name: text('name'),
    nameascii: text('nameascii'),
    adm0name: text('adm0name'),
    adm0A3: varchar('adm0_a3', { length: 3 }),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    popMax: doublePrecision('pop_max'),
    popMin: doublePrecision('pop_min'),
    featurecla: text('featurecla'),
    scalerank: integer('scalerank'),
    natscale: integer('natscale'),
    capital: text('capital'),
    geom: geometry('geom', { type: 'point', srid: 4326 }).notNull(),
  },
  (table) => [
    index('natural_earth_populated_places_geom_idx').using('gist', table.geom),
    index('natural_earth_populated_places_pop_max_idx').on(table.popMax),
  ]
);

// ---------------------------------------------------------------------------
// natural_earth.countries — MULTIPOLYGON SRID 4326
// ---------------------------------------------------------------------------
export const naturalEarthCountries = naturalEarthSchema.table(
  'countries',
  {
    gid: integer('gid').primaryKey(),
    name: text('name'),
    nameLong: text('name_long'),
    admin: text('admin'),
    adm0A3: varchar('adm0_a3', { length: 3 }),
    isoA2: varchar('iso_a2', { length: 2 }),
    isoA3: varchar('iso_a3', { length: 3 }),
    continent: text('continent'),
    regionUn: text('region_un'),
    subregion: text('subregion'),
    popEst: doublePrecision('pop_est'),
    geom: geometry('geom', { type: 'multipolygon', srid: 4326 }).notNull(),
  },
  (table) => [
    index('natural_earth_countries_geom_idx').using('gist', table.geom),
  ]
);
