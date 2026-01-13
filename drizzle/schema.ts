import { pgTable, index, uniqueIndex, foreignKey, uuid, integer, timestamp, text, numeric, jsonb, pgSequence } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


export const icaaOgcFidSeq = pgSequence("icaa_ogc_fid_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const oneearthBioregionOgcFidSeq = pgSequence("oneearth_bioregion_ogc_fid_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })

export const playerSpeciesDiscoveries = pgTable("player_species_discoveries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id"),
	speciesId: integer("species_id"),
	sessionId: uuid("session_id"),
	discoveredAt: timestamp("discovered_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	timeToDiscoverSeconds: integer("time_to_discover_seconds"),
	cluesUnlockedBeforeGuess: integer("clues_unlocked_before_guess").default(0),
	incorrectGuessesCount: integer("incorrect_guesses_count").default(0),
	scoreEarned: integer("score_earned").default(0),
}, (table) => [
	index("ix_player_species_discoveries_session_id").using("btree", table.sessionId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uq_player_species_discoveries_player_species").using("btree", table.playerId.asc().nullsLast().op("int4_ops"), table.speciesId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [profiles.userId],
			name: "fk_player_species_discoveries_player_id"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.speciesId],
			foreignColumns: [icaa.ogcFid],
			name: "fk_player_species_discoveries_species_id"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [playerGameSessions.id],
			name: "fk_player_species_discoveries_session_id"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const playerClueUnlocks = pgTable("player_clue_unlocks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id"),
	speciesId: integer("species_id"),
	discoveryId: uuid("discovery_id"),
	clueCategory: text("clue_category").notNull(),
	clueField: text("clue_field").notNull(),
	clueValue: text("clue_value"),
	unlockedAt: timestamp("unlocked_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("ix_player_clue_unlocks_discovery_id").using("btree", table.discoveryId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uq_player_clue_unlocks_player_species_category_field").using("btree", table.playerId.asc().nullsLast().op("text_ops"), table.speciesId.asc().nullsLast().op("text_ops"), table.clueCategory.asc().nullsLast().op("text_ops"), table.clueField.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [profiles.userId],
			name: "fk_player_clue_unlocks_player_id"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.speciesId],
			foreignColumns: [icaa.ogcFid],
			name: "fk_player_clue_unlocks_species_id"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.discoveryId],
			foreignColumns: [playerSpeciesDiscoveries.id],
			name: "fk_player_clue_unlocks_discovery_id"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const playerStats = pgTable("player_stats", {
	playerId: uuid("player_id").primaryKey().notNull(),
	totalSpeciesDiscovered: integer("total_species_discovered").default(0),
	totalCluesUnlocked: integer("total_clues_unlocked").default(0),
	totalScore: integer("total_score").default(0),
	totalMovesMade: integer("total_moves_made").default(0),
	totalGamesPlayed: integer("total_games_played").default(0),
	totalPlayTimeSeconds: integer("total_play_time_seconds").default(0),
	averageCluesPerDiscovery: numeric("average_clues_per_discovery", { precision: 65, scale:  30 }),
	fastestDiscoveryClues: integer("fastest_discovery_clues"),
	slowestDiscoveryClues: integer("slowest_discovery_clues"),
	averageTimePerDiscoverySeconds: integer("average_time_per_discovery_seconds"),
	speciesByOrder: jsonb("species_by_order").default({}),
	speciesByFamily: jsonb("species_by_family").default({}),
	speciesByGenus: jsonb("species_by_genus").default({}),
	speciesByRealm: jsonb("species_by_realm").default({}),
	speciesByBiome: jsonb("species_by_biome").default({}),
	speciesByBioregion: jsonb("species_by_bioregion").default({}),
	marineSpeciesCount: integer("marine_species_count").default(0),
	terrestrialSpeciesCount: integer("terrestrial_species_count").default(0),
	freshwaterSpeciesCount: integer("freshwater_species_count").default(0),
	aquaticSpeciesCount: integer("aquatic_species_count").default(0),
	speciesByIucnStatus: jsonb("species_by_iucn_status").default({}),
	cluesByCategory: jsonb("clues_by_category").default({}),
	favoriteClueCategory: text("favorite_clue_category"),
	firstDiscoveryAt: timestamp("first_discovery_at", { withTimezone: true, mode: 'string' }),
	lastDiscoveryAt: timestamp("last_discovery_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [profiles.userId],
			name: "fk_player_stats_player_id"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const habitatColormap = pgTable("habitat_colormap", {
	value: integer().primaryKey().notNull(),
	label: text().notNull(),
});

export const playerGameSessions = pgTable("player_game_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	totalMoves: integer("total_moves").default(0),
	totalScore: integer("total_score").default(0),
	speciesDiscoveredInSession: integer("species_discovered_in_session").default(0),
	cluesUnlockedInSession: integer("clues_unlocked_in_session").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("ix_player_game_sessions_player_id").using("btree", table.playerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [profiles.userId],
			name: "fk_player_game_sessions_player_id"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const profiles = pgTable("profiles", {
	userId: uuid("user_id").primaryKey().notNull(),
	username: text(),
	fullName: text("full_name"),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	uniqueIndex("uq_profiles_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
]);

export const highScores = pgTable("high_scores", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	username: text().notNull(),
	score: integer().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("ix_high_scores_score").using("btree", table.score.desc().nullsFirst().op("int4_ops")),
]);
