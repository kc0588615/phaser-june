// =============================================================================
// PLAYER STATS SERVICE - Drizzle Version
// =============================================================================
// Fetches aggregated player statistics from the player_stats table.
// NOTE: Auth is not wired yet. Clerk integration will provide user context.
// =============================================================================

import { eq } from 'drizzle-orm';
import { db, playerStats, profiles } from '@/db';
import type { PlayerStats } from '@/components/PlayerStatsDashboard/types';
import type { PlayerStats as PlayerStatsRow } from '@/db';

export interface FetchPlayerStatsOptions {
  includeRankings?: boolean;
}

// Helper to transform Drizzle result to PlayerStats type
function transformToPlayerStats(data: PlayerStatsRow): PlayerStats {
  return {
    playerId: data.playerId,
    totalSpeciesDiscovered: data.totalSpeciesDiscovered || 0,
    totalCluesUnlocked: data.totalCluesUnlocked || 0,
    totalScore: data.totalScore || 0,
    totalMovesMade: data.totalMovesMade || 0,
    totalGamesPlayed: data.totalGamesPlayed || 0,
    totalPlayTimeSeconds: data.totalPlayTimeSeconds || 0,
    averageCluesPerDiscovery: data.averageCluesPerDiscovery
      ? Number(data.averageCluesPerDiscovery)
      : 0,
    fastestDiscoveryClues: data.fastestDiscoveryClues ?? undefined,
    slowestDiscoveryClues: data.slowestDiscoveryClues ?? undefined,
    averageTimePerDiscoverySeconds: data.averageTimePerDiscoverySeconds
      ? Number(data.averageTimePerDiscoverySeconds)
      : undefined,
    speciesByOrder: (data.speciesByOrder as Record<string, number>) || {},
    speciesByFamily: (data.speciesByFamily as Record<string, number>) || {},
    speciesByGenus: (data.speciesByGenus as Record<string, number>) || {},
    speciesByRealm: (data.speciesByRealm as Record<string, number>) || {},
    speciesByBiome: (data.speciesByBiome as Record<string, number>) || {},
    speciesByBioregion: (data.speciesByBioregion as Record<string, number>) || {},
    marineSpeciesCount: data.marineSpeciesCount || 0,
    terrestrialSpeciesCount: data.terrestrialSpeciesCount || 0,
    freshwaterSpeciesCount: data.freshwaterSpeciesCount || 0,
    aquaticSpeciesCount: data.aquaticSpeciesCount || 0,
    speciesByIucnStatus: (data.speciesByIucnStatus as Record<string, number>) || {},
    cluesByCategory: (data.cluesByCategory as Record<string, number>) || {},
    favoriteClueCategory: data.favoriteClueCategory ?? undefined,
    firstDiscoveryAt: data.firstDiscoveryAt?.toISOString() ?? undefined,
    lastDiscoveryAt: data.lastDiscoveryAt?.toISOString() ?? undefined,
    createdAt: data.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: data.updatedAt?.toISOString() ?? new Date().toISOString(),
    // Rank fields require separate queries - TODO: implement if needed
    rankByDiscoveries: undefined,
    rankByScore: undefined,
    rankByEfficiency: undefined,
  };
}

/**
 * Fetch player stats for the current authenticated user.
 * Auth is not configured yet, so this returns null.
 */
export async function fetchPlayerStats(
  options: FetchPlayerStatsOptions = { includeRankings: true }
): Promise<PlayerStats | null> {
  console.warn('fetchPlayerStats: auth not configured (Clerk planned).');
  return null;
}

/**
 * Fetch player stats by player ID (for viewing other players)
 */
export async function fetchPlayerStatsByPlayerId(
  playerId: string,
  options: FetchPlayerStatsOptions = { includeRankings: true }
): Promise<PlayerStats | null> {
  try {
    const results = await db
      .select()
      .from(playerStats)
      .where(eq(playerStats.playerId, playerId))
      .limit(1);

    const data = results[0];
    if (!data) {
      console.log('No stats found for player:', playerId);
      return null;
    }

    return transformToPlayerStats(data);
  } catch (err) {
    console.error('Unexpected error fetching player stats:', err);
    return null;
  }
}

/**
 * Get player display name from profile.
 * When playerId is not provided, returns a generic label until auth is wired.
 */
export async function getPlayerDisplayName(playerId?: string): Promise<string> {
  try {
    if (!playerId) return 'Player';

    // Try to get profile display name
    const results = await db
      .select({ username: profiles.username })
      .from(profiles)
      .where(eq(profiles.userId, playerId))
      .limit(1);

    const profile = results[0];
    if (profile?.username) {
      return profile.username;
    }

    return 'Player';
  } catch (err) {
    console.error('Error getting player display name:', err);
    return 'Player';
  }
}
