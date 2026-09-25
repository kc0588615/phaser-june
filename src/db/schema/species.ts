// Species content for Clue Match. The database also holds the old expedition
// game's tables; they are left in place but not modelled here.
import type { SpeciesClueCategory } from '@/types/speciesClues';
import {
  bigint,
  boolean,
  geometry,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/** Raw IUCN range shapefile import (source-owned field names). Joins to species.iucn_id = iucn.id_no. */
export const iucn = pgTable(
  'iucn',
  {
    ogcFid: serial('ogc_fid').primaryKey().notNull(),
    idNo: numeric('id_no', { precision: 65, scale: 30 }),        // IUCN species id_no; joins to species.iucn_id
    sciName: text('sci_name'),
    taxComm: text('tax_comm'),
    kingdom: text(),
    phylum: text(),
    class: text(),
    order: text('order_'),
    family: text(),
    genus: text(),
    category: text(),
    marine: boolean(),
    terrestria: boolean(),
    freshwater: boolean(),
    island: text(),
    origin: numeric({ precision: 65, scale: 30 }),
    presence: numeric({ precision: 65, scale: 30 }),
    seasonal: numeric({ precision: 65, scale: 30 }),
    compiler: text(),
    yrcompiled: numeric({ precision: 65, scale: 30 }),
    citation: text(),
    source: text(),
    distComm: text('dist_comm'),
    subspecies: text(),
    subpop: text(),
    legend: text(),
    generalisd: numeric({ precision: 65, scale: 30 }),
    shapeLeng: numeric('shape_leng', { precision: 65, scale: 30 }),
    shapeArea: numeric('shape_area', { precision: 65, scale: 30 }),
    wkbGeometry: geometry('wkb_geometry', { type: 'geometry', srid: 4326 }),
  },
  (table) => [
    index('ix_iucn_wkb_geometry').using(
      'gist',
      table.wkbGeometry.asc().nullsLast().op('gist_geometry_ops_2d')
    ),
  ]
);

/** Game species (stable id, decoupled from the raw import). */
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
  threats: text(),
  distributionComment: text('distribution_comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Clues shown by gem color. */
export const speciesDeductionClues = pgTable('species_deduction_clues', {
  id: serial('id').primaryKey(),
  category: text('category').notNull().$type<SpeciesClueCategory>(),
  label: text('label').notNull(),
  compareTags: text('compare_tags').array(),
  revealOrder: smallint('reveal_order').notNull().default(1),
  unlockMode: text('unlock_mode').notNull().default('fragment'),
  baseCost: smallint('base_cost').notNull().default(2),
  isFiltering: boolean('is_filtering').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  speciesId: integer('species_id').notNull().references(() => speciesTable.id, { onDelete: 'cascade' }),
}, table => [
  index('ix_deduction_clues_category').on(table.speciesId, table.category),
  index('ix_deduction_clues_species').on(table.speciesId),
  uniqueIndex('uq_deduction_clues_species_cat_order').on(table.speciesId, table.category, table.revealOrder),
]);

/** Notes shown once a color's clues run out. */
export const speciesFacts = pgTable('species_facts', {
  id: serial('id').primaryKey(),
  speciesId: integer('species_id').notNull().references(() => speciesTable.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  factText: text('fact_text').notNull(),
  sortOrder: smallint('sort_order').notNull().default(1),
}, table => [
  index('ix_species_facts_category').on(table.speciesId, table.category),
  index('ix_species_facts_species').on(table.speciesId),
  unique('species_facts_species_id_category_sort_order_key').on(table.speciesId, table.category, table.sortOrder),
]);
