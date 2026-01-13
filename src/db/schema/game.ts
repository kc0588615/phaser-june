import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const highScores = pgTable(
  'high_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username').notNull(),
    score: integer('score').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    ixHighScoresScore: index('ix_high_scores_score').on(table.score.desc()),
  })
);

export const habitatColormap = pgTable('habitat_colormap', {
  value: integer('value').primaryKey(),
  label: text('label').notNull(),
});
