import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** One row per signed-in player, keyed to their Clerk user (src/lib/player.ts). */
export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey(),
  clerkUserId: text('clerk_user_id').unique('uq_profiles_clerk_user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
