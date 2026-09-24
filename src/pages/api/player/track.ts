import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { isUuid } from '@/lib/runCaseState';

// Fits a PostgreSQL integer column.
const isCount = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 2_147_483_647;

/**
 * POST /api/player/track
 * Ends the caller's own game session (sent by Game.ts on shutdown).
 * Body: { action: 'endGameSession', sessionId, finalMoves, finalScore }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId: clerkUserId } = getAuth(req);
    if (!clerkUserId) return res.status(401).json({ error: 'Unauthorized' });

    const { db, profiles } = await import('@/db');
    const { eq } = await import('drizzle-orm');

    const [profile] = await db.select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.clerkUserId, clerkUserId))
      .limit(1);

    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const { action, ...params } = req.body;
    const pt = await import('@/lib/playerTracking');

    switch (action) {
      case 'endGameSession': {
        const { sessionId, finalMoves, finalScore } = params;
        if (!isUuid(sessionId) || !isCount(finalMoves) || !isCount(finalScore)) {
          return res.status(400).json({ error: 'Invalid session totals' });
        }
        const ended = await pt.endGameSession(profile.userId, sessionId, finalMoves, finalScore);
        if (!ended) return res.status(404).json({ error: 'Session not found' });
        return res.json({ ok: true });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[API POST /api/player/track] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
