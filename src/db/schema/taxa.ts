import { sql } from 'drizzle-orm';
import {
  bigserial,
  bigint,
  boolean,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  geometry,
} from 'drizzle-orm/pg-core';

import { oneearthBioregion } from './species';

export const sourceDatasets = pgTable(
  'source_datasets',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: text('name').notNull(),
    version: text('version'),
    doi: text('doi'),
    license: text('license'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqSourceDatasetsName: uniqueIndex('uq_source_datasets_name').on(table.name),
  })
);

export const taxonNames = pgTable(
  'taxon_names',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    scientificName: text('scientific_name').notNull(),
    authorship: text('authorship'),
    rank: text('rank').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTaxonNamesScientificNameRank: uniqueIndex('uq_taxon_names_scientific_name_rank').on(
      table.scientificName,
      table.rank
    ),
  })
);

export const taxa = pgTable(
  'taxa',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    parentId: bigint('parent_id', { mode: 'number' }),
    acceptedNameId: bigint('accepted_name_id', { mode: 'number' })
      .notNull()
      .references(() => taxonNames.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTaxaAcceptedNameId: uniqueIndex('uq_taxa_accepted_name_id').on(table.acceptedNameId),
    ixTaxaParentId: index('ix_taxa_parent_id').on(table.parentId),
    fkTaxaParentId: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
    }),
  })
);

export const taxonNameUsages = pgTable(
  'taxon_name_usages',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taxonId: bigint('taxon_id', { mode: 'number' })
      .notNull()
      .references(() => taxa.id, { onDelete: 'cascade' }),
    taxonNameId: bigint('taxon_name_id', { mode: 'number' })
      .notNull()
      .references(() => taxonNames.id),
    sourceId: bigint('source_id', { mode: 'number' })
      .notNull()
      .references(() => sourceDatasets.id),
    isAccepted: boolean('is_accepted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTaxonNameUsagesTaxonNameSource: uniqueIndex(
      'uq_taxon_name_usages_taxon_name_source'
    ).on(table.taxonId, table.taxonNameId, table.sourceId),
    uxTaxonNameUsagesAccepted: uniqueIndex('ux_taxon_name_usages_accepted')
      .on(table.taxonId, table.sourceId)
      .where(sql`is_accepted`),
  })
);

export const taxonExternalIds = pgTable(
  'taxon_external_ids',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taxonId: bigint('taxon_id', { mode: 'number' })
      .notNull()
      .references(() => taxa.id, { onDelete: 'cascade' }),
    sourceId: bigint('source_id', { mode: 'number' })
      .notNull()
      .references(() => sourceDatasets.id),
    externalRefId: text('external_ref_id').notNull(),
    sourceUrl: text('source_url'),
    isPrimary: boolean('is_primary').notNull().default(false),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTaxonExternalIdsSourceExternal: uniqueIndex('uq_taxon_external_ids_source_external').on(
      table.sourceId,
      table.externalRefId
    ),
    ixTaxonExternalIdsTaxonId: index('ix_taxon_external_ids_taxon_id').on(table.taxonId),
  })
);

export const conservationStatuses = pgTable(
  'conservation_statuses',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    code: text('code').notNull(),
    label: text('label').notNull(),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqConservationStatusesCode: uniqueIndex('uq_conservation_statuses_code').on(table.code),
  })
);

export const taxonConservationAssessments = pgTable(
  'taxon_conservation_assessments',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taxonId: bigint('taxon_id', { mode: 'number' })
      .notNull()
      .references(() => taxa.id, { onDelete: 'cascade' }),
    sourceId: bigint('source_id', { mode: 'number' })
      .notNull()
      .references(() => sourceDatasets.id),
    conservationStatusId: bigint('conservation_status_id', { mode: 'number' })
      .notNull()
      .references(() => conservationStatuses.id),
    assessmentDate: date('assessment_date'),
    assessmentText: text('assessment_text'),
    isCurrent: boolean('is_current').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uxTaxonConservationAssessmentsCurrent: uniqueIndex(
      'ux_taxon_conservation_assessments_current'
    )
      .on(table.taxonId, table.sourceId)
      .where(sql`is_current`),
    ixTaxonConservationAssessmentsDate: index('ix_taxon_conservation_assessments_date').on(
      table.taxonId,
      table.sourceId,
      table.assessmentDate
    ),
  })
);

export const taxonProfiles = pgTable(
  'taxon_profiles',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taxonId: bigint('taxon_id', { mode: 'number' })
      .notNull()
      .references(() => taxa.id, { onDelete: 'cascade' }),
    sourceId: bigint('source_id', { mode: 'number' }).references(() => sourceDatasets.id),
    iucnUrl: text('iucn_url'),
    habitatDescription: text('habitat_description'),
    geographicDescription: text('geographic_description'),
    distributionComment: text('distribution_comment'),
    taxonomicComment: text('taxonomic_comment'),
    marine: boolean('marine'),
    terrestrial: boolean('terrestrial'),
    freshwater: boolean('freshwater'),
    aquatic: boolean('aquatic'),
    island: boolean('island'),
    colorPrimary: text('color_primary'),
    colorSecondary: text('color_secondary'),
    pattern: text('pattern'),
    shapeDescription: text('shape_description'),
    sizeMinCm: numeric('size_min_cm'),
    sizeMaxCm: numeric('size_max_cm'),
    weightKg: numeric('weight_kg'),
    dietType: text('diet_type'),
    lifespan: numeric('lifespan'),
    maturity: text('maturity'),
    reproductionType: text('reproduction_type'),
    clutchSize: text('clutch_size'),
    origin: numeric('origin'),
    presence: numeric('presence'),
    seasonal: numeric('seasonal'),
    legend: text('legend'),
    generalised: numeric('generalised'),
    compiler: text('compiler'),
    yearCompiled: numeric('year_compiled'),
    citation: text('citation'),
    source: text('source'),
    subspecies: text('subspecies'),
    subpop: text('subpop'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTaxonProfilesTaxonId: uniqueIndex('uq_taxon_profiles_taxon_id').on(table.taxonId),
  })
);

export const taxonRanges = pgTable(
  'taxon_ranges',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taxonId: bigint('taxon_id', { mode: 'number' })
      .notNull()
      .references(() => taxa.id, { onDelete: 'cascade' }),
    sourceId: bigint('source_id', { mode: 'number' }).references(() => sourceDatasets.id),
    wkbGeometry: geometry('wkb_geometry', { type: 'geometry', srid: 4326 }),
    shapeLength: numeric('shape_length'),
    shapeLengthAlt: numeric('shape_length_alt'),
    shapeArea: numeric('shape_area'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ixTaxonRangesTaxonId: index('ix_taxon_ranges_taxon_id').on(table.taxonId),
    ixTaxonRangesWkbGeometry: index('ix_taxon_ranges_wkb_geometry').using(
      'gist',
      table.wkbGeometry.asc().nullsLast().op('gist_geometry_ops_2d')
    ),
  })
);

export const taxonBioregions = pgTable(
  'taxon_bioregions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taxonId: bigint('taxon_id', { mode: 'number' })
      .notNull()
      .references(() => taxa.id, { onDelete: 'cascade' }),
    bioregion: varchar('bioregion').notNull().references(() => oneearthBioregion.bioregion),
    isPrimary: boolean('is_primary').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTaxonBioregionsTaxonBioregion: uniqueIndex('uq_taxon_bioregions_taxon_bioregion').on(
      table.taxonId,
      table.bioregion
    ),
    ixTaxonBioregionsBioregion: index('ix_taxon_bioregions_bioregion').on(table.bioregion),
  })
);

export const taxonCommonNames = pgTable(
  'taxon_common_names',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taxonId: bigint('taxon_id', { mode: 'number' })
      .notNull()
      .references(() => taxa.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    locale: text('locale'),
    sourceId: bigint('source_id', { mode: 'number' }).references(() => sourceDatasets.id),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTaxonCommonNamesTaxonNameLocale: uniqueIndex('uq_taxon_common_names_taxon_name_locale').on(
      table.taxonId,
      table.name,
      table.locale
    ),
    uxTaxonCommonNamesPrimary: uniqueIndex('ux_taxon_common_names_primary')
      .on(table.taxonId)
      .where(sql`is_primary`),
  })
);

export const taxonBehaviors = pgTable(
  'taxon_behaviors',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taxonId: bigint('taxon_id', { mode: 'number' })
      .notNull()
      .references(() => taxa.id, { onDelete: 'cascade' }),
    behaviorIndex: integer('behavior_index').notNull(),
    behaviorText: text('behavior_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTaxonBehaviorsTaxonIndex: uniqueIndex('uq_taxon_behaviors_taxon_index').on(
      table.taxonId,
      table.behaviorIndex
    ),
  })
);

export const taxonKeyFacts = pgTable(
  'taxon_key_facts',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taxonId: bigint('taxon_id', { mode: 'number' })
      .notNull()
      .references(() => taxa.id, { onDelete: 'cascade' }),
    factIndex: integer('fact_index').notNull(),
    factText: text('fact_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTaxonKeyFactsTaxonIndex: uniqueIndex('uq_taxon_key_facts_taxon_index').on(
      table.taxonId,
      table.factIndex
    ),
  })
);

export const taxonLifeDescriptions = pgTable(
  'taxon_life_descriptions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taxonId: bigint('taxon_id', { mode: 'number' })
      .notNull()
      .references(() => taxa.id, { onDelete: 'cascade' }),
    descriptionIndex: integer('description_index').notNull(),
    descriptionText: text('description_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTaxonLifeDescriptionsTaxonIndex: uniqueIndex('uq_taxon_life_descriptions_taxon_index').on(
      table.taxonId,
      table.descriptionIndex
    ),
  })
);

export const taxonHabitatTags = pgTable(
  'taxon_habitat_tags',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taxonId: bigint('taxon_id', { mode: 'number' })
      .notNull()
      .references(() => taxa.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTaxonHabitatTagsTaxonTag: uniqueIndex('uq_taxon_habitat_tags_taxon_tag').on(
      table.taxonId,
      table.tag
    ),
    ixTaxonHabitatTagsTag: index('ix_taxon_habitat_tags_tag').on(table.tag),
  })
);

export const taxonThreats = pgTable(
  'taxon_threats',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taxonId: bigint('taxon_id', { mode: 'number' })
      .notNull()
      .references(() => taxa.id, { onDelete: 'cascade' }),
    threatText: text('threat_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTaxonThreatsTaxonThreatText: uniqueIndex('uq_taxon_threats_taxon_threat_text').on(
      table.taxonId,
      table.threatText
    ),
    ixTaxonThreatsThreatText: index('ix_taxon_threats_threat_text').on(table.threatText),
  })
);

export const taxonDietItems = pgTable(
  'taxon_diet_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    taxonId: bigint('taxon_id', { mode: 'number' })
      .notNull()
      .references(() => taxa.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    itemText: text('item_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTaxonDietItemsTaxonCategoryItem: uniqueIndex('uq_taxon_diet_items_taxon_category_item').on(
      table.taxonId,
      table.category,
      table.itemText
    ),
    ixTaxonDietItemsItemText: index('ix_taxon_diet_items_item_text').on(table.itemText),
  })
);
