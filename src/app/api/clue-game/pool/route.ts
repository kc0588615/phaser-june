import { NextResponse } from 'next/server';
import { db } from '@/db';
import { buildCluePool } from '@/lib/cluePool';

/**
 * GET /api/clue-game/pool
 * Every species that has clues, with its clues and facts, for Clue Match.
 * The pool is public; the client picks each round's mystery species. Browsers
 * may reuse it for a minute, so content edits show up on the next visit.
 */
export async function GET() {
  try {
    return NextResponse.json(await buildCluePool(db), { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600' } });
  } catch (error) {
    console.error('[API /clue-game/pool] Error:', error);
    return NextResponse.json({ error: 'Failed to load the clue pool' }, { status: 500 });
  }
}
