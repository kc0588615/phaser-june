// Loads the Clue Match pool from Postgres: every species that has clues, with
// its clues and facts. Shared by GET /api/clue-game/pool and scripts/clue-pool.ts.
import { asc, inArray } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { speciesDeductionClues, speciesFacts, speciesTable } from '@/db/schema';
import type { CluePool } from '@/clueGame/pool';

// Any Drizzle Postgres database: the app singleton or a script's own client.
type Database = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export async function buildCluePool(db: Database): Promise<CluePool> {
  const clues = await db.select().from(speciesDeductionClues)
    .orderBy(asc(speciesDeductionClues.speciesId), asc(speciesDeductionClues.category), asc(speciesDeductionClues.revealOrder));
  const speciesIds = [...new Set(clues.map(clue => clue.speciesId))];
  if (speciesIds.length === 0) return { species: [], clues: [], facts: [] };

  const species = await db.select({
    id: speciesTable.id,
    commonName: speciesTable.commonName,
    scientificName: speciesTable.scientificName,
    className: speciesTable.class,
    taxonOrder: speciesTable.taxonOrder,
    family: speciesTable.family,
    genus: speciesTable.genus,
    conservationCode: speciesTable.conservationCode,
  }).from(speciesTable).where(inArray(speciesTable.id, speciesIds)).orderBy(asc(speciesTable.id));

  const facts = await db.select().from(speciesFacts)
    .where(inArray(speciesFacts.speciesId, speciesIds))
    .orderBy(asc(speciesFacts.speciesId), asc(speciesFacts.category), asc(speciesFacts.sortOrder));

  return {
    species,
    clues: clues.map(clue => ({
      id: clue.id,
      speciesId: clue.speciesId,
      category: clue.category,
      label: clue.label,
      compareTags: clue.compareTags ?? [],
      revealOrder: clue.revealOrder,
      isFiltering: clue.isFiltering,
    })),
    facts: facts.map(fact => ({ speciesId: fact.speciesId, category: fact.category, text: fact.factText, sortOrder: fact.sortOrder })),
  };
}
