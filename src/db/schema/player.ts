import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// NOTE: icaa is import-owned (shapefile). FKs assume icaa exists before app tables.
// This is true for our existing DB; fresh DBs must import shapefiles first.
import { icaa } from './species';

export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey(),
  username: text('username').unique('uq_profiles_username'),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const playerGameSessions = pgTable(
  'player_game_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id').references(() => profiles.userId),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    totalMoves: integer('total_moves').default(0),
    totalScore: integer('total_score').default(0),
    speciesDiscoveredInSession: integer('species_discovered_in_session').default(0),
    cluesUnlockedInSession: integer('clues_unlocked_in_session').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    ixPlayerGameSessionsPlayerId: index('ix_player_game_sessions_player_id').on(
      table.playerId
    ),
  })
);

export const playerSpeciesDiscoveries = pgTable(
  'player_species_discoveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id').references(() => profiles.userId),
    speciesId: integer('species_id').references(() => icaa.ogcFid),
    sessionId: uuid('session_id').references(() => playerGameSessions.id),
    discoveredAt: timestamp('discovered_at', { withTimezone: true }).defaultNow(),
    timeToDiscoverSeconds: integer('time_to_discover_seconds'),
    cluesUnlockedBeforeGuess: integer('clues_unlocked_before_guess').default(0),
    incorrectGuessesCount: integer('incorrect_guesses_count').default(0),
    scoreEarned: integer('score_earned').default(0),
  },
  (table) => ({
    uqPlayerSpeciesDiscoveriesPlayerSpecies: uniqueIndex(
      'uq_player_species_discoveries_player_species'
    ).on(table.playerId, table.speciesId),
    ixPlayerSpeciesDiscoveriesSessionId: index(
      'ix_player_species_discoveries_session_id'
    ).on(table.sessionId),
  })
);

export const playerClueUnlocks = pgTable(
  'player_clue_unlocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id').references(() => profiles.userId),
    speciesId: integer('species_id').references(() => icaa.ogcFid),
    discoveryId: uuid('discovery_id').references(() => playerSpeciesDiscoveries.id),
    clueCategory: text('clue_category').notNull(),
    clueField: text('clue_field').notNull(),
    clueValue: text('clue_value'),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uqPlayerClueUnlocksPlayerSpeciesCategoryField: uniqueIndex(
      'uq_player_clue_unlocks_player_species_category_field'
    ).on(table.playerId, table.speciesId, table.clueCategory, table.clueField),
    ixPlayerClueUnlocksDiscoveryId: index(
      'ix_player_clue_unlocks_discovery_id'
    ).on(table.discoveryId),
  })
);

export const playerStats = pgTable('player_stats', {
  playerId: uuid('player_id').primaryKey().references(() => profiles.userId),
  totalSpeciesDiscovered: integer('total_species_discovered').default(0),
  totalCluesUnlocked: integer('total_clues_unlocked').default(0),
  totalScore: integer('total_score').default(0),
  totalMovesMade: integer('total_moves_made').default(0),
  totalGamesPlayed: integer('total_games_played').default(0),
  totalPlayTimeSeconds: integer('total_play_time_seconds').default(0),
  averageCluesPerDiscovery: numeric('average_clues_per_discovery'),
  fastestDiscoveryClues: integer('fastest_discovery_clues'),
  slowestDiscoveryClues: integer('slowest_discovery_clues'),
  averageTimePerDiscoverySeconds: integer('average_time_per_discovery_seconds'),
  speciesByOrder: jsonb('species_by_order').default(sql`'{}'::jsonb`),
  speciesByFamily: jsonb('species_by_family').default(sql`'{}'::jsonb`),
  speciesByGenus: jsonb('species_by_genus').default(sql`'{}'::jsonb`),
  speciesByRealm: jsonb('species_by_realm').default(sql`'{}'::jsonb`),
  speciesByBiome: jsonb('species_by_biome').default(sql`'{}'::jsonb`),
  speciesByBioregion: jsonb('species_by_bioregion').default(sql`'{}'::jsonb`),
  marineSpeciesCount: integer('marine_species_count').default(0),
  terrestrialSpeciesCount: integer('terrestrial_species_count').default(0),
  freshwaterSpeciesCount: integer('freshwater_species_count').default(0),
  aquaticSpeciesCount: integer('aquatic_species_count').default(0),
  speciesByIucnStatus: jsonb('species_by_iucn_status').default(sql`'{}'::jsonb`),
  cluesByCategory: jsonb('clues_by_category').default(sql`'{}'::jsonb`),
  favoriteClueCategory: text('favorite_clue_category'),
  firstDiscoveryAt: timestamp('first_discovery_at', { withTimezone: true }),
  lastDiscoveryAt: timestamp('last_discovery_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
