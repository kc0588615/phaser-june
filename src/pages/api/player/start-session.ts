import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId: clerkUserId } = getAuth(req);
    if (!clerkUserId) return res.status(401).json({ error: 'Unauthorized' });

    const { db, profiles } = await import('@/db');
    const { eq } = await import('drizzle-orm');
    const { startGameSession } = await import('@/lib/playerTracking');

    const [profile] = await db.select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.clerkUserId, clerkUserId))
      .limit(1);

    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const sessionId = await startGameSession(profile.userId);
    return res.json({ sessionId });
  } catch (err: any) {
    console.error('start-session error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
