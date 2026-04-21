import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';

/**
 * POST /api/player/track
 * Client-safe proxy for playerTracking server functions.
 * Body: { action, ...params }
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
      case 'trackClueUnlock': {
        const { speciesId, clueCategory, clueField, clueValue, discoveryId } = params;
        const wasNew = await pt.trackClueUnlock(
          profile.userId, speciesId, clueCategory, clueField, clueValue ?? null, discoveryId ?? null
        );
        return res.json({ wasNew });
      }

      case 'updateSessionProgress': {
        const { sessionId, moves, score, speciesDiscovered, cluesUnlocked } = params;
        await pt.updateSessionProgress(sessionId, moves, score, speciesDiscovered, cluesUnlocked);
        return res.json({ ok: true });
      }

      case 'forceSessionUpdate': {
        const { sessionId, moves, score, speciesDiscovered, cluesUnlocked } = params;
        await pt.forceSessionUpdate(sessionId, moves, score, speciesDiscovered, cluesUnlocked);
        return res.json({ ok: true });
      }

      case 'trackSpeciesDiscovery': {
        const { speciesId, sessionId, timeToDiscoverSeconds, cluesUnlockedBeforeGuess, incorrectGuessesCount, scoreEarned } = params;
        const discoveryId = await pt.trackSpeciesDiscovery(profile.userId, speciesId, {
          sessionId, timeToDiscoverSeconds, cluesUnlockedBeforeGuess, incorrectGuessesCount, scoreEarned,
        });
        return res.json({ discoveryId });
      }

      case 'endGameSession': {
        const { sessionId, finalMoves, finalScore } = params;
        await pt.endGameSession(sessionId, finalMoves, finalScore);
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
