// Clue Match content. Only the columns the app reads are modelled; db/schema.sql
// has the full tables. The database also holds the old expedition game's
// tables, which are not modelled here.
import type { SpeciesClueCategory } from '@/clueGame/categories';
import { boolean, index, integer, pgTable, serial, smallint, text, unique, uniqueIndex } from 'drizzle-orm/pg-core';

export const speciesTable = pgTable('species', {
  id: serial('id').primaryKey(),
  scientificName: text('scientific_name').notNull(),
  commonName: text('common_name').notNull(),
  class: text(),
  taxonOrder: text('taxon_order'),
  family: text(),
  genus: text(),
  /** IUCN Red List category, e.g. 'EN'. */
  conservationCode: text('conservation_code'),
});

/** Clues shown by gem color. */
export const speciesDeductionClues = pgTable('species_deduction_clues', {
  id: serial('id').primaryKey(),
  speciesId: integer('species_id').notNull().references(() => speciesTable.id, { onDelete: 'cascade' }),
  category: text('category').notNull().$type<SpeciesClueCategory>(),
  label: text('label').notNull(),
  compareTags: text('compare_tags').array(),
  revealOrder: smallint('reveal_order').notNull().default(1),
  isFiltering: boolean('is_filtering').notNull().default(true),
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
