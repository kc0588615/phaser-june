import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './player';

export const highScores = pgTable(
  'high_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Optional FK to profiles - allows linking to authenticated players while
    // preserving legacy anonymous scores (player_id NULL)
    playerId: uuid('player_id').references(() => profiles.userId),
    username: text('username').notNull(),
    score: integer('score').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ixHighScoresScore: index('ix_high_scores_score').on(table.score.desc()),
    ixHighScoresPlayerId: index('ix_high_scores_player_id').on(table.playerId),
  })
);

export const habitatColormap = pgTable('habitat_colormap', {
  value: integer('value').primaryKey(),
  label: text('label').notNull(),
});
