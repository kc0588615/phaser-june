import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import type { ServerJournalEntry } from '@/clueGame/journal';

type Row = {
  species_id: number; scientific_name: string; common_name: string; class: string | null;
  times_solved: number; best_moves: number; first_solved_at: Date; last_solved_at: Date; place_keys: string[];
};

/**
 * GET /api/clue-game/journal
 * The signed-in player's Field Journal from their saved solves (clue_match_solves, solved rounds only),
 * so it follows them to another device. Signed out: no entries.
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ entries: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    const rows = await db.execute<Row>(sql`
      SELECT s.id AS species_id, s.scientific_name, s.common_name, s.class,
             count(*)::int AS times_solved, min(c.moves)::int AS best_moves,
             min(c.solved_at) AS first_solved_at, max(c.solved_at) AS last_solved_at,
             coalesce(array_agg(DISTINCT c.place_key) FILTER (WHERE c.place_key IS NOT NULL), '{}') AS place_keys
      FROM clue_match_solves c
      JOIN profiles p ON p.user_id = c.player_id
      JOIN species s ON s.id = c.species_id
      WHERE p.clerk_user_id = ${clerkUserId} AND c.outcome = 'solved'
      GROUP BY s.id
      ORDER BY s.id`);
    const entries: ServerJournalEntry[] = [...rows].map(row => ({
      speciesId: row.species_id, scientificName: row.scientific_name, commonName: row.common_name, className: row.class,
      timesSolved: row.times_solved, bestMoves: row.best_moves,
      firstSolvedAt: new Date(row.first_solved_at).toISOString(), lastSolvedAt: new Date(row.last_solved_at).toISOString(),
      placeKeys: row.place_keys,
    }));
    return NextResponse.json({ entries }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[API /clue-game/journal] Error:', error);
    return NextResponse.json({ error: 'Failed to load the journal' }, { status: 500 });
  }
}
