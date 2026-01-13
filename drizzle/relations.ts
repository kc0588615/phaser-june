import { relations } from "drizzle-orm/relations";
import { profiles, playerSpeciesDiscoveries, icaa, playerGameSessions, playerClueUnlocks, playerStats } from "./schema";

export const playerSpeciesDiscoveriesRelations = relations(playerSpeciesDiscoveries, ({one, many}) => ({
	profile: one(profiles, {
		fields: [playerSpeciesDiscoveries.playerId],
		references: [profiles.userId]
	}),
	icaa: one(icaa, {
		fields: [playerSpeciesDiscoveries.speciesId],
		references: [icaa.ogcFid]
	}),
	playerGameSession: one(playerGameSessions, {
		fields: [playerSpeciesDiscoveries.sessionId],
		references: [playerGameSessions.id]
	}),
	playerClueUnlocks: many(playerClueUnlocks),
}));

export const profilesRelations = relations(profiles, ({many}) => ({
	playerSpeciesDiscoveries: many(playerSpeciesDiscoveries),
	playerClueUnlocks: many(playerClueUnlocks),
	playerStats: many(playerStats),
	playerGameSessions: many(playerGameSessions),
}));

export const icaaRelations = relations(icaa, ({many}) => ({
	playerSpeciesDiscoveries: many(playerSpeciesDiscoveries),
	playerClueUnlocks: many(playerClueUnlocks),
}));

export const playerGameSessionsRelations = relations(playerGameSessions, ({one, many}) => ({
	playerSpeciesDiscoveries: many(playerSpeciesDiscoveries),
	profile: one(profiles, {
		fields: [playerGameSessions.playerId],
		references: [profiles.userId]
	}),
}));

export const playerClueUnlocksRelations = relations(playerClueUnlocks, ({one}) => ({
	profile: one(profiles, {
		fields: [playerClueUnlocks.playerId],
		references: [profiles.userId]
	}),
	icaa: one(icaa, {
		fields: [playerClueUnlocks.speciesId],
		references: [icaa.ogcFid]
	}),
	playerSpeciesDiscovery: one(playerSpeciesDiscoveries, {
		fields: [playerClueUnlocks.discoveryId],
		references: [playerSpeciesDiscoveries.id]
	}),
}));

export const playerStatsRelations = relations(playerStats, ({one}) => ({
	profile: one(profiles, {
		fields: [playerStats.playerId],
		references: [profiles.userId]
	}),
}));