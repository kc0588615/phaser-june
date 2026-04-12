import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db, profiles } from '@/db';

/**
 * Resolve the internal playerId from Clerk session.
 * Returns null if not authenticated or profile not found.
 */
export async function getPlayerIdFromClerk(): Promise<string | null> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return null;

    const [profile] = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.clerkUserId, clerkUserId))
      .limit(1);

    return profile?.userId ?? null;
  } catch {
    return null;
  }
}
