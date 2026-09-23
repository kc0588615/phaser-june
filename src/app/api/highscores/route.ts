import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db, highScores } from '@/db';
import { drizzleToSnake } from '@/lib/drizzleToSnake';

/**
 * GET /api/highscores
 * Returns top 50 high scores.
 */
export async function GET() {
  try {
    const scores = await db
      .select()
      .from(highScores)
      .orderBy(desc(highScores.score))
      .limit(50);

    const scoresSnake = scores.map(drizzleToSnake);
    return NextResponse.json({ scores: scoresSnake });
  } catch (error) {
    console.error('[API /highscores GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch high scores' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/highscores
 * Save a new high score.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const username: unknown = body?.username;
    const score: unknown = body?.score;

    // Validate
    const trimmedUsername = typeof username === 'string' ? username.trim() : '';
    if (trimmedUsername.length < 2 || trimmedUsername.length > 25) {
      return NextResponse.json(
        { error: 'Username must be between 2 and 25 characters' },
        { status: 400 }
      );
    }

    if (!Number.isSafeInteger(score) || (score as number) < 0) {
      return NextResponse.json(
        { error: 'Invalid score' },
        { status: 400 }
      );
    }

    const [newScore] = await db
      .insert(highScores)
      .values({ username: trimmedUsername, score: score as number })
      .returning();

    return NextResponse.json({ score: drizzleToSnake(newScore) });
  } catch (error) {
    console.error('[API /highscores POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save high score' },
      { status: 500 }
    );
  }
}
