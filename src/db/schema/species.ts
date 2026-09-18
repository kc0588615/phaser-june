// =============================================================================
// SPATIAL TABLES - Introspected from DB (import-owned, do not edit for migrations)
// Re-introspect after shapefile schema changes: npx drizzle-kit introspect
// =============================================================================

import { sql } from 'drizzle-orm';
import type { EvidenceFamily } from '@/expedition/evidenceFamilies';
import {
  bigint,
  boolean,
  check,
  doublePrecision,
  geometry,
  index,
  integer,
  numeric,
  primaryKey,
  pgTable,
  pgView,
  unique,
  pgSchema,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

const oneearthSchema = pgSchema('oneearth');

// Raw IUCN range shapefile import - source-owned field names, do not app-shape
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

// ---------------------------------------------------------------------------
// Curated game species (stable PK, decoupled from iucn raw import)
// joins to iucn via: species.iucn_id = iucn.id_no
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
  threats: text(),
  distributionComment: text('distribution_comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});


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
    geographyTags: text('geography_tags').array().notNull().default(sql`'{}'::text[]`),
    conservationTags: text('conservation_tags').array().notNull().default(sql`'{}'::text[]`),
    keyFactTags: text('key_fact_tags').array().notNull().default(sql`'{}'::text[]`),
    signatureTag: text('signature_tag'),
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
    index('ix_deduction_profiles_geography').using('gin', table.geographyTags),
    index('ix_deduction_profiles_conservation').using('gin', table.conservationTags),
    index('ix_deduction_profiles_key_fact').using('gin', table.keyFactTags),
  ]
);

export type DeductionClueCategory =
  | 'habitat' | 'morphology' | 'diet' | 'behavior' | 'reproduction'
  | 'taxonomy' | 'key_fact' | 'geography' | 'conservation';

export type DeductionUnlockMode = 'fragment' | 'score';

export const casePools = pgTable('case_pools', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  reviewStatus: text('review_status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  check('case_pools_slug_check', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  check('case_pools_review_status_check', sql`${table.reviewStatus} IN ('draft', 'reviewed')`),
]);

export const casePoolMembers = pgTable('case_pool_members', {
  poolId: bigint('pool_id', { mode: 'number' }).notNull().references(() => casePools.id, { onDelete: 'cascade' }),
  speciesId: integer('species_id').notNull().references(() => speciesTable.id, { onDelete: 'restrict' }),
}, table => [primaryKey({ columns: [table.poolId, table.speciesId] })]);

export const evidenceFamilyCards = pgTable(
  'evidence_family_cards',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    poolId: bigint('pool_id', { mode: 'number' }).notNull().references(() => casePools.id, { onDelete: 'cascade' }),
    speciesId: integer('species_id').notNull().references(() => speciesTable.id, { onDelete: 'cascade' }),
    family: text('family').notNull().$type<EvidenceFamily>(),
    observationText: text('observation_text').notNull(),
    inferenceText: text('inference_text').notNull(),
    traitCategory: text('trait_category').notNull().$type<DeductionClueCategory>(),
    compareTag: text('compare_tag').notNull(),
    traitPhrase: text('trait_phrase').notNull(),
    bonusFactText: text('bonus_fact_text').notNull(),
    source: text('source').notNull(),
    reviewStatus: text('review_status').notNull().default('reviewed'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_evidence_family_cards_pool_species_family').on(table.poolId, table.speciesId, table.family),
    check(
      'ck_evidence_family_cards_family',
      sql`${table.family} IN ('relatives', 'body', 'behavior', 'habits', 'place')`,
    ),
    check(
      'ck_evidence_family_cards_trait_category',
      sql`${table.traitCategory} IN ('habitat', 'morphology', 'diet', 'behavior', 'reproduction', 'taxonomy', 'key_fact', 'geography', 'conservation')`,
    ),
    check('ck_evidence_family_cards_review_status', sql`${table.reviewStatus} = 'reviewed'`),
    index('ix_evidence_family_cards_species').on(table.speciesId),
    index('ix_evidence_family_cards_family').on(table.family),
    index('ix_evidence_family_cards_compare_tag').on(table.compareTag),
  ],
);

export const evidenceFamilyHints = pgTable(
  'evidence_family_hints',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    poolId: bigint('pool_id', { mode: 'number' }).notNull().references(() => casePools.id, { onDelete: 'cascade' }),
    speciesId: integer('species_id').notNull().references(() => speciesTable.id, { onDelete: 'cascade' }),
    family: text('family').notNull().$type<EvidenceFamily>(),
    sequenceIndex: smallint('sequence_index').notNull(),
    hintText: text('hint_text').notNull(),
    weakTag: text('weak_tag').notNull(),
    reviewStatus: text('review_status').notNull().default('reviewed'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_evidence_family_hints_pool_species_family_sequence').on(table.poolId, table.speciesId, table.family, table.sequenceIndex),
    check('ck_evidence_family_hints_family', sql`${table.family} IN ('relatives', 'body', 'behavior', 'habits', 'place')`),
    check('ck_evidence_family_hints_sequence', sql`${table.sequenceIndex} BETWEEN 0 AND 9`),
    check('ck_evidence_family_hints_review_status', sql`${table.reviewStatus} = 'reviewed'`),
    index('ix_evidence_family_hints_species_family').on(table.speciesId, table.family),
  ],
);

export const cascadeHints = pgTable(
  'cascade_hints',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    sequenceIndex: smallint('sequence_index').notNull().unique(),
    hintText: text('hint_text').notNull(),
    reviewStatus: text('review_status').notNull().default('reviewed'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('ck_cascade_hints_sequence', sql`${table.sequenceIndex} BETWEEN 0 AND 99`),
    check('ck_cascade_hints_review_status', sql`${table.reviewStatus} = 'reviewed'`),
  ],
);


export const oneearthBioregion = oneearthSchema.table(
  'oneearth_bioregion',
  {
    ogcFid: serial('ogc_fid').primaryKey().notNull(),
    objectid1: numeric('objectid_1', { precision: 65, scale: 30 }),
    objectid2: numeric('objectid_2', { precision: 65, scale: 30 }),
    bioregions: varchar(),
    bioregion: varchar(),
    realm: varchar(),
    subrealm: varchar('sub_realm'),
    biome: varchar(),
    shapeLength: doublePrecision('shape_length'),
    shapeLengthAlt: numeric('shape_length_alt', { precision: 65, scale: 30 }),
    shapeArea: doublePrecision('shape_area'),
    wkbGeometry: geometry('wkb_geometry', { type: 'multipolygon', srid: 4326 }),
    ecoId: integer('eco_id'),
    ecoSym: integer('eco_sym'),
    ecoCode: text('eco_code'),
  },
  (table) => [
    index('ix_oneearth_bioregion_wkb_geometry').using(
      'gist',
      table.wkbGeometry.asc().nullsLast().op('gist_geometry_ops_2d')
    ),
  ]
);

export const speciesEcoregions = pgTable(
  'species_ecoregions',
  {
    speciesId: integer('species_id').notNull().references(() => speciesTable.id, { onDelete: 'cascade' }),
    ecoregionId: integer('ecoregion_id').notNull().references(() => oneearthBioregion.ogcFid, { onDelete: 'cascade' }),
    overlapKm2: doublePrecision('overlap_km2').notNull().default(0),
    speciesOverlapPct: doublePrecision('species_overlap_pct').notNull().default(0),
    ecoregionOverlapPct: doublePrecision('ecoregion_overlap_pct').notNull().default(0),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.speciesId, table.ecoregionId] }),
    index('ix_species_ecoregions_ecoregion').on(table.ecoregionId),
    index('ix_species_ecoregions_species').on(table.speciesId),
    index('ix_species_ecoregions_primary').on(table.speciesId).where(sql`${table.isPrimary} = true`),
  ]
);

export const mysteryCases = pgTable('mystery_cases', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  poolId: bigint('pool_id', { mode: 'number' }).notNull().references(() => casePools.id, { onDelete: 'cascade' }),
  speciesId: integer('species_id').notNull().references(() => speciesTable.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  incident: text('incident').notNull(),
  atmosphere: text('atmosphere').notNull(),
  question: text('question').notNull(),
  reviewStatus: text('review_status').notNull().default('draft'),
}, table => [
  unique().on(table.poolId, table.speciesId),
  check('mystery_cases_slug_check', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  check('mystery_cases_review_status_check', sql`${table.reviewStatus} IN ('draft', 'reviewed')`),
]);

export const mysteryExplanations = pgTable('mystery_explanations', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  caseId: bigint('case_id', { mode: 'number' }).notNull().references(() => mysteryCases.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  label: text('label').notNull(),
  description: text('description').notNull(),
  feedback: text('feedback').notNull(),
  isAnswer: boolean('is_answer').notNull().default(false),
  sortOrder: smallint('sort_order').notNull(),
}, table => [
  unique().on(table.caseId, table.slug),
  unique().on(table.caseId, table.sortOrder),
  check('mystery_explanations_slug_check', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  uniqueIndex('uq_mystery_one_answer').on(table.caseId).where(sql`${table.isAnswer}`),
]);

export const mysteryResolutions = pgTable('mystery_resolutions', {
  caseId: bigint('case_id', { mode: 'number' }).primaryKey().references(() => mysteryCases.id, { onDelete: 'cascade' }),
  headline: text('headline').notNull(),
  diagnosis: text('diagnosis').notNull(),
  ecologicalRole: text('ecological_role').notNull(),
  taxonomy: text('taxonomy').notNull(),
  misconception: text('misconception').notNull(),
});

export const mysteryEvidenceSteps = pgTable('mystery_evidence_steps', {
  caseId: bigint('case_id', { mode: 'number' }).notNull().references(() => mysteryCases.id, { onDelete: 'cascade' }),
  sequenceIndex: smallint('sequence_index').notNull(),
  stepText: text('step_text').notNull(),
}, table => [
  primaryKey({ columns: [table.caseId, table.sequenceIndex] }),
  check('mystery_evidence_steps_sequence_index_check', sql`${table.sequenceIndex} BETWEEN 0 AND 9`),
]);

export const mysteryRejectedAlternatives = pgTable('mystery_rejected_alternatives', {
  caseId: bigint('case_id', { mode: 'number' }).notNull().references(() => mysteryCases.id, { onDelete: 'cascade' }),
  sequenceIndex: smallint('sequence_index').notNull(),
  alternativeText: text('alternative_text').notNull(),
}, table => [
  primaryKey({ columns: [table.caseId, table.sequenceIndex] }),
  check('mystery_rejected_alternatives_sequence_index_check', sql`${table.sequenceIndex} BETWEEN 0 AND 9`),
]);

export const mysterySources = pgTable('mystery_sources', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  caseId: bigint('case_id', { mode: 'number' }).notNull().references(() => mysteryCases.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  url: text('url').notNull(),
}, table => [check('mystery_sources_url_check', sql`${table.url} LIKE 'https://%'`)]);

export const mysteryCasesPublic = pgView('mystery_cases_public', {
  caseId: bigint('case_id', { mode: 'number' }),
  poolId: bigint('pool_id', { mode: 'number' }),
  speciesId: integer('species_id'),
  slug: text('slug'), title: text('title'), incident: text('incident'),
  atmosphere: text('atmosphere'), question: text('question'),
  explanationSlug: text('explanation_slug'), label: text('label'), description: text('description'),
  sortOrder: smallint('sort_order'),
}).as(sql`SELECT c.id AS case_id, c.pool_id, c.species_id, c.slug, c.title, c.incident, c.atmosphere, c.question,
  e.slug AS explanation_slug, e.label, e.description, e.sort_order
  FROM mystery_cases c JOIN mystery_explanations e ON e.case_id = c.id
  WHERE c.review_status = 'reviewed'`);

export const speciesNotes = pgTable('species_notes', {
  speciesId: integer('species_id').notNull().references(() => speciesTable.id, { onDelete: 'cascade' }),
  topic: text('topic').notNull().$type<'behavior' | 'life_cycle' | 'key_fact' | 'taxonomy' | 'distribution' | 'reproduction' | 'threats'>(),
  sortOrder: smallint('sort_order').notNull(),
  noteText: text('note_text').notNull(),
  sourceUrl: text('source_url'),
}, table => [
  primaryKey({ columns: [table.speciesId, table.topic, table.sortOrder] }),
  check('species_notes_topic_check', sql`${table.topic} IN ('behavior','life_cycle','key_fact','taxonomy','distribution','reproduction','threats')`),
  check('species_notes_sort_order_check', sql`${table.sortOrder} BETWEEN 1 AND 9`),
  check('species_notes_source_url_check', sql`${table.sourceUrl} IS NULL OR ${table.sourceUrl} LIKE 'https://%'`),
]);
