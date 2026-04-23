// =============================================================================
// SPATIAL TABLES - Introspected from DB (import-owned, do not edit for migrations)
// Re-introspect after shapefile schema changes: npx drizzle-kit introspect
// =============================================================================

import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  doublePrecision,
  geometry,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const icaa = pgTable(
  'icaa',
  {
    ogcFid: serial('ogc_fid').primaryKey().notNull(),
    speciesId: numeric('species_id', { precision: 65, scale: 30 }),
    commonName: text('common_name'),
    scientificName: text('scientific_name'),
    taxonomicComment: text('taxonomic_comment'),
    iucnUrl: text('iucn_url'),
    kingdom: text(),
    phylum: text(),
    class: text(),
    taxonOrder: text('taxon_order'),
    family: text(),
    genus: text(),
    category: text(),
    marine: boolean(),
    terrestrial: boolean(),
    freshwater: boolean(),
    aquatic: boolean(),
    island: boolean(),
    origin: numeric({ precision: 65, scale: 30 }),
    presence: numeric({ precision: 65, scale: 30 }),
    seasonal: numeric({ precision: 65, scale: 30 }),
    compiler: text(),
    yearCompiled: numeric('year_compiled', { precision: 65, scale: 30 }),
    citation: text(),
    source: text(),
    subspecies: text(),
    subpop: text(),
    legend: text(),
    generalised: numeric({ precision: 65, scale: 30 }),
    shapeLength: numeric('shape_length', { precision: 65, scale: 30 }),
    shapeLengthAlt: numeric('shape_length_alt', { precision: 65, scale: 30 }),
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

// ---------------------------------------------------------------------------
// Curated game species (stable PK, decoupled from icaa import)
// ---------------------------------------------------------------------------

export const speciesTable = pgTable('species', {
  id: serial('id').primaryKey(),
  iucnId: bigint('iucn_id', { mode: 'number' }).notNull().unique(),
  scientificName: text('scientific_name').notNull(),
  commonName: text('common_name').notNull(),
  kingdom: text(),
  phylum: text(),
  class: text(),
  taxonOrder: text('taxon_order'),
  family: text(),
  genus: text(),
  conservationCode: text('conservation_code'),
  conservationText: text('conservation_text'),
  realm: text(),
  subrealm: text(),
  biome: text(),
  bioregion: text(),
  habitatDescription: text('habitat_description'),
  habitatTags: text('habitat_tags').array(),
  geographicDescription: text('geographic_description'),
  marine: boolean().default(false),
  terrestrial: boolean().default(false),
  freshwater: boolean().default(false),
  colorPrimary: text('color_primary'),
  colorSecondary: text('color_secondary'),
  pattern: text(),
  shapeDescription: text('shape_description'),
  sizeMinCm: numeric('size_min_cm'),
  sizeMaxCm: numeric('size_max_cm'),
  weightKg: numeric('weight_kg'),
  dietType: text('diet_type'),
  dietPrey: text('diet_prey'),
  dietFlora: text('diet_flora'),
  behavior1: text('behavior_1'),
  behavior2: text('behavior_2'),
  lifeDescription1: text('life_description_1'),
  lifeDescription2: text('life_description_2'),
  keyFact1: text('key_fact_1'),
  keyFact2: text('key_fact_2'),
  keyFact3: text('key_fact_3'),
  threats: text(),
  taxonomicComment: text('taxonomic_comment'),
  distributionComment: text('distribution_comment'),
  lifespan: numeric(),
  maturity: text(),
  reproductionType: text('reproduction_type'),
  clutchSize: text('clutch_size'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const speciesFacts = pgTable(
  'species_facts',
  {
    id: serial('id').primaryKey(),
    speciesId: integer('species_id').notNull().references(() => speciesTable.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    factText: text('fact_text').notNull(),
    sortOrder: smallint('sort_order').notNull().default(1),
  },
  (table) => [
    uniqueIndex('uq_species_facts_species_cat_order').on(table.speciesId, table.category, table.sortOrder),
    index('ix_species_facts_species').on(table.speciesId),
    index('ix_species_facts_category').on(table.speciesId, table.category),
  ]
);

// ---------------------------------------------------------------------------
// Comparative deduction tables
// ---------------------------------------------------------------------------

export const speciesDeductionProfiles = pgTable(
  'species_deduction_profiles',
  {
    speciesId: integer('species_id')
      .primaryKey()
      .references(() => speciesTable.id, { onDelete: 'cascade' }),
    habitatTags: text('habitat_tags').array().notNull().default(sql`'{}'::text[]`),
    morphologyTags: text('morphology_tags').array().notNull().default(sql`'{}'::text[]`),
    dietTags: text('diet_tags').array().notNull().default(sql`'{}'::text[]`),
    behaviorTags: text('behavior_tags').array().notNull().default(sql`'{}'::text[]`),
    reproductionTags: text('reproduction_tags').array().notNull().default(sql`'{}'::text[]`),
    taxonomyTags: text('taxonomy_tags').array().notNull().default(sql`'{}'::text[]`),
    habitatNote: text('habitat_note'),
    morphologyNote: text('morphology_note'),
    dietNote: text('diet_note'),
    behaviorNote: text('behavior_note'),
    reproductionNote: text('reproduction_note'),
    referenceSummary: text('reference_summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ix_deduction_profiles_habitat').using('gin', table.habitatTags),
    index('ix_deduction_profiles_morphology').using('gin', table.morphologyTags),
    index('ix_deduction_profiles_diet').using('gin', table.dietTags),
    index('ix_deduction_profiles_behavior').using('gin', table.behaviorTags),
    index('ix_deduction_profiles_reproduction').using('gin', table.reproductionTags),
    index('ix_deduction_profiles_taxonomy').using('gin', table.taxonomyTags),
  ]
);

export type DeductionClueCategory =
  | 'habitat' | 'morphology' | 'diet' | 'behavior' | 'reproduction'
  | 'taxonomy' | 'key_fact' | 'geography' | 'conservation';

export type DeductionUnlockMode = 'fragment' | 'score';

export const speciesDeductionClues = pgTable(
  'species_deduction_clues',
  {
    id: serial('id').primaryKey(),
    speciesId: integer('species_id')
      .notNull()
      .references(() => speciesTable.id, { onDelete: 'cascade' }),
    category: text('category').notNull().$type<DeductionClueCategory>(),
    label: text('label').notNull(),
    compareTags: text('compare_tags').array(),
    revealOrder: smallint('reveal_order').notNull().default(1),
    unlockMode: text('unlock_mode').notNull().default('fragment').$type<DeductionUnlockMode>(),
    baseCost: smallint('base_cost').notNull().default(2),
    isFiltering: boolean('is_filtering').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_deduction_clues_species_cat_order').on(table.speciesId, table.category, table.revealOrder),
    index('ix_deduction_clues_species').on(table.speciesId),
    index('ix_deduction_clues_category').on(table.speciesId, table.category),
    index('ix_deduction_clues_compare').using('gin', table.compareTags),
  ]
);

export const oneearthBioregion = pgTable(
  'oneearth_bioregion',
  {
    ogcFid: serial('ogc_fid').primaryKey().notNull(),
    objectid1: numeric('objectid_1', { precision: 65, scale: 30 }),
    objectid2: numeric('objectid_2', { precision: 65, scale: 30 }),
    bioregions: varchar(),
    bioregion: varchar(),
    realm: varchar(),
    subrealm: varchar(),
    biome: varchar(),
    shapeLength: doublePrecision('shape_length'),
    shapeLengthAlt: numeric('shape_length_alt', { precision: 65, scale: 30 }),
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
