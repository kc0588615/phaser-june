import { sql } from 'drizzle-orm';
import { bigint, bigserial, boolean, index, integer, jsonb, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './player';
import { speciesTable } from './species';

export const clueMatchSolves = pgTable(
  'clue_match_solves',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    playerId: uuid('player_id').references(() => profiles.userId, { onDelete: 'set null' }),
    sessionSeed: bigint('session_seed', { mode: 'number' }).notNull(),
    round: smallint('round').notNull(),
    speciesId: integer('species_id').notNull().references(() => speciesTable.id, { onDelete: 'cascade' }),
    moves: smallint('moves').notNull(),
    wrongGuesses: smallint('wrong_guesses').notNull(),
    cluesSeen: smallint('clues_seen').notNull(),
    relatives: smallint('relatives').notNull(),
    points: integer('points').notNull(),
    /** clue_match_places.key when played from the globe. */
    placeKey: text('place_key'),
    revealedByGem: jsonb('revealed_by_gem').$type<Record<string, number>>().notNull().default({}),
    /** When the round ended (solved or lost). */
    solvedAt: timestamp('solved_at', { withTimezone: true }).notNull().defaultNow(),
    // Plan 041: every round is saved; readers of discoveries count only outcome = 'solved'.
    outcome: text('outcome').$type<'solved' | 'lost'>().notNull().default('solved'),
    /** Solved (or lost) on a last chance; NULL for rounds saved before 2026-09-28. */
    lastChance: boolean('last_chance'),
    rulesVersion: text('rules_version'),
    movesLeft: smallint('moves_left'),
    standingAtGuess: smallint('standing_at_guess'),
    notesSaved: smallint('notes_saved'),
    treeSteps: smallint('tree_steps'),
    questions: jsonb('questions').$type<Array<{ tag: string; answer: string }>>(),
  },
  table => [
    index('ix_clue_match_solves_species').on(table.speciesId),
    index('ix_clue_match_solves_player').on(table.playerId).where(sql`${table.playerId} IS NOT NULL`),
  ],
);
