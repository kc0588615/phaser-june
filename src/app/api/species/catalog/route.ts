import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db, speciesTable } from '@/db';
import { drizzleToSnake } from '@/lib/drizzleToSnake';

/**
 * GET /api/species/catalog
 * Returns all species for the species list/catalog view.
 */
export async function GET() {
  try {
    const species = await db
      .select()
      .from(speciesTable)
      .orderBy(asc(speciesTable.commonName));

    return NextResponse.json({
      species: species.map(drizzleToSnake),
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
