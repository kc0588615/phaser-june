import { NextResponse } from 'next/server';
import { asc, inArray } from 'drizzle-orm';
import { db, speciesDeductionClues, speciesFacts, speciesTable } from '@/db';
import type { CluePool } from '@/clueGame/pool';

/**
 * GET /api/clue-game/pool
 * Every species that has clues, with its clues and facts, for the clue-category game.
 * The pool is public; the client picks each round's mystery species.
 */
export async function GET() {
  try {
    const clues = await db.select().from(speciesDeductionClues)
      .orderBy(asc(speciesDeductionClues.speciesId), asc(speciesDeductionClues.revealOrder));
    const speciesIds = [...new Set(clues.map(clue => clue.speciesId))];
    if (speciesIds.length === 0) return NextResponse.json({ species: [], clues: [], facts: [] } satisfies CluePool);

    const species = await db.select({
      id: speciesTable.id,
      commonName: speciesTable.commonName,
      scientificName: speciesTable.scientificName,
      className: speciesTable.class,
      taxonOrder: speciesTable.taxonOrder,
    }).from(speciesTable).where(inArray(speciesTable.id, speciesIds)).orderBy(asc(speciesTable.commonName));
    const facts = await db.select().from(speciesFacts)
      .where(inArray(speciesFacts.speciesId, speciesIds))
      .orderBy(asc(speciesFacts.speciesId), asc(speciesFacts.sortOrder));

    const pool: CluePool = {
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
    return NextResponse.json(pool);
  } catch (error) {
    console.error('[API /clue-game/pool] Error:', error);
    return NextResponse.json({ error: 'Failed to load the clue pool' }, { status: 500 });
  }
}
