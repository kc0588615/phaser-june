import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/highscores
 * Returns top 50 high scores.
 */
export async function GET() {
  try {
    const scores = await prisma.highScore.findMany({
      orderBy: { score: 'desc' },
      take: 50,
    });

    return NextResponse.json({ scores });
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

    const newScore = await prisma.highScore.create({
      data: {
        username: trimmedUsername,
        score,
      },
    });

    return NextResponse.json({ score: newScore });
  } catch (error) {
    console.error('[API /highscores POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save high score' },
      { status: 500 }
    );
  }
}
