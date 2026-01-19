import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db, highScores } from '@/db';

// Transform camelCase keys to snake_case for API response
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

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

    const scoresSnake = scores.map(s => toSnakeCase(s as Record<string, unknown>));
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
    const body = await request.json();
    const { username, score } = body;

    // Validate
    const trimmedUsername = (username || '').trim();
    if (trimmedUsername.length < 2 || trimmedUsername.length > 25) {
      return NextResponse.json(
        { error: 'Username must be between 2 and 25 characters' },
        { status: 400 }
      );
    }

    if (typeof score !== 'number' || score < 0) {
      return NextResponse.json(
        { error: 'Invalid score' },
        { status: 400 }
      );
    }

    const [newScore] = await db
      .insert(highScores)
      .values({ username: trimmedUsername, score })
      .returning();

    return NextResponse.json({ score: toSnakeCase(newScore as Record<string, unknown>) });
  } catch (error) {
    console.error('[API /highscores POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save high score' },
      { status: 500 }
    );
  }
}
