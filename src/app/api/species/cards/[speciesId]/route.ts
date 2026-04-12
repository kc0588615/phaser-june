import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, speciesCards, runMemories } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';

/**
 * GET /api/species/cards/[speciesId]
 * Returns one species card with linked run memories for the authenticated player.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ speciesId: string }> }
) {
  try {
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { speciesId } = await params;
    const sid = parseInt(speciesId, 10);
    if (isNaN(sid)) {
      return NextResponse.json({ error: 'Invalid speciesId' }, { status: 400 });
    }

    const [card] = await db
      .select()
      .from(speciesCards)
      .where(and(eq(speciesCards.playerId, playerId), eq(speciesCards.speciesId, sid)))
      .limit(1);

    const memories = await db
      .select()
      .from(runMemories)
      .where(and(eq(runMemories.playerId, playerId), eq(runMemories.speciesId, sid)));

    return NextResponse.json({ card: card ?? null, memories });
  } catch (error) {
    console.error('[API GET /api/species/cards/[speciesId]] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch species card' }, { status: 500 });
  }
}
