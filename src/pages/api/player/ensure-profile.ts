import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth, clerkClient } from '@clerk/nextjs/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId: clerkUserId } = getAuth(req);
    if (!clerkUserId) return res.status(401).json({ error: 'Unauthorized' });

    const { db, profiles } = await import('@/db');
    const { eq } = await import('drizzle-orm');
    const { randomUUID } = await import('crypto');

    const [existing] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.clerkUserId, clerkUserId))
      .limit(1);

    if (existing) {
      return res.json({ playerId: existing.userId, isNew: false });
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkUserId);
    const newId = randomUUID();

    // Overlapping sign-in requests can both reach here; the unique clerk_user_id decides
    // the winner and the loser returns the winner's profile instead of a 500.
    const [created] = await db.insert(profiles).values({
      userId: newId,
      clerkUserId,
      username: clerkUser.username || clerkUser.firstName || 'Player',
      fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
      avatarUrl: clerkUser.imageUrl || null,
    }).onConflictDoNothing({ target: profiles.clerkUserId }).returning({ userId: profiles.userId });

    if (created) return res.json({ playerId: created.userId, isNew: true });

    const [winner] = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.clerkUserId, clerkUserId))
      .limit(1);
    if (!winner) return res.status(500).json({ error: 'Profile creation conflict' });
    return res.json({ playerId: winner.userId, isNew: false });
  } catch (err: any) {
    console.error('ensure-profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
