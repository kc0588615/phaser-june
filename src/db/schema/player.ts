import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** One row per signed-in player, keyed to their Clerk user (created by /api/player/ensure-profile). */
export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey(),
  clerkUserId: text('clerk_user_id').unique('uq_profiles_clerk_user_id'),
  username: text('username').unique('uq_profiles_username'),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
