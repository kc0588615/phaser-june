import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, speciesCards } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';

/**
 * GET /api/species/cards
 * Returns all species cards for the authenticated player.
 */
export async function GET(_request: NextRequest) {
  try {
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cards = await db
      .select()
      .from(speciesCards)
      .where(eq(speciesCards.playerId, playerId));

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('[API GET /api/species/cards] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch species cards' }, { status: 500 });
  }
}
