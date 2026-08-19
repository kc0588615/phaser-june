import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, speciesCards, speciesTable } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { readFieldPlatePortrait } from '@/lib/fieldPlatePortraits.server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ speciesId: string }> }) {
  try {
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { speciesId } = await params;
    const parsedSpeciesId = Number(speciesId);
    if (!Number.isSafeInteger(parsedSpeciesId) || parsedSpeciesId <= 0) {
      return NextResponse.json({ error: 'Invalid speciesId' }, { status: 400 });
    }
    const [card] = await db.select({ discovered: speciesCards.discovered, iucnId: speciesTable.iucnId })
      .from(speciesCards)
      .innerJoin(speciesTable, eq(speciesTable.id, speciesCards.speciesId))
      .where(and(eq(speciesCards.playerId, playerId), eq(speciesCards.speciesId, parsedSpeciesId)))
      .limit(1);
    if (!card?.discovered) return NextResponse.json({ error: 'Field plate not found' }, { status: 404 });
    const portrait = await readFieldPlatePortrait(card.iucnId);
    if (!portrait) return NextResponse.json({ error: 'Field plate not found' }, { status: 404 });
    return new Response(new Uint8Array(portrait), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, no-store',
        'Content-Length': String(portrait.byteLength),
      },
    });
  } catch (error) {
    console.error('[API GET /api/species/cards/[speciesId]/plate] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch field plate' }, { status: 500 });
  }
}
