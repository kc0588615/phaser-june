import { randomUUID } from 'node:crypto';
import { auth } from '@clerk/nextjs/server';
import { db, profiles } from '@/db';

/**
 * The signed-in player's profiles.user_id, creating the row on their first
 * solve. Null when signed out, or when the profile can't be read (the solve is
 * then saved without a player).
 */
export async function currentPlayerId(): Promise<string | null> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return null;
    // The no-op update on conflict makes RETURNING give an existing row's id too.
    const [profile] = await db.insert(profiles)
      .values({ userId: randomUUID(), clerkUserId })
      .onConflictDoUpdate({ target: profiles.clerkUserId, set: { clerkUserId } })
      .returning({ userId: profiles.userId });
    return profile?.userId ?? null;
  } catch (error) {
    console.error('[player] Could not read or create the profile:', error);
    return null;
  }
}
