import { NextResponse, type NextRequest } from 'next/server';
import { db, clueMatchSolves } from '@/db';
import { currentPlayerId } from '@/lib/player';
import { parseSolveReport } from '@/clueGame/solveReport';

/**
 * POST /api/clue-game/solves
 * Records one finished round, solved or lost (table clue_match_solves, db/schema.sql),
 * for analyzing play with SQL. Anonymous play is recorded without a player; a
 * signed-in player's profile is created on their first saved round.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }
  const report = parseSolveReport(body);
  if (!report) return NextResponse.json({ error: 'Invalid solve report' }, { status: 400 });

  try {
    const playerId = await currentPlayerId();
    await db.insert(clueMatchSolves).values({
      playerId,
      sessionSeed: report.seed,
      round: report.round,
      speciesId: report.speciesId,
      moves: report.moves,
      wrongGuesses: report.wrongGuesses,
      cluesSeen: report.cluesSeen,
      relatives: report.relatives,
      points: report.points,
      revealedByGem: report.revealedByGem,
      placeKey: report.placeKey ?? null,
      outcome: report.outcome ?? 'solved',
      lastChance: report.lastChance ?? null,
      rulesVersion: report.rulesVersion ?? null,
      movesLeft: report.movesLeft ?? null,
      standingAtGuess: report.standingAtGuess ?? null,
      notesSaved: report.notesSaved ?? null,
      treeSteps: report.treeSteps ?? null,
      questions: report.questions ?? null,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    // 23503: the species id doesn't exist.
    const code = (error as { cause?: { code?: string }; code?: string }).cause?.code ?? (error as { code?: string }).code;
    if (code === '23503') return NextResponse.json({ error: 'Unknown species' }, { status: 400 });
    console.error('[API /clue-game/solves] Error:', error);
    return NextResponse.json({ error: 'Failed to record the round' }, { status: 500 });
  }
}
