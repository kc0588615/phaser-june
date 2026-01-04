// =============================================================================
// PLAYER STATS SERVICE - Prisma Version
// =============================================================================
// Fetches aggregated player statistics from the player_stats table.
// NOTE: Auth is not wired yet. Clerk integration will provide user context.
// =============================================================================

import { prisma } from '@/lib/prisma';
import type { PlayerStats } from '@/components/PlayerStatsDashboard/types';

export interface FetchPlayerStatsOptions {
  includeRankings?: boolean;
}

// Helper to transform Prisma result to PlayerStats type
function transformToPlayerStats(
  data: NonNullable<Awaited<ReturnType<typeof prisma.playerStats.findUnique>>>
): PlayerStats {
  return {
    playerId: data.player_id,
    totalSpeciesDiscovered: data.total_species_discovered || 0,
    totalCluesUnlocked: data.total_clues_unlocked || 0,
    totalScore: data.total_score || 0,
    totalMovesMade: data.total_moves_made || 0,
    totalGamesPlayed: data.total_games_played || 0,
    totalPlayTimeSeconds: data.total_play_time_seconds || 0,
    averageCluesPerDiscovery: data.average_clues_per_discovery
      ? Number(data.average_clues_per_discovery)
      : 0,
    fastestDiscoveryClues: data.fastest_discovery_clues ?? undefined,
    slowestDiscoveryClues: data.slowest_discovery_clues ?? undefined,
    averageTimePerDiscoverySeconds: data.average_time_per_discovery_seconds
      ? Number(data.average_time_per_discovery_seconds)
      : undefined,
    speciesByOrder: (data.species_by_order as Record<string, number>) || {},
    speciesByFamily: (data.species_by_family as Record<string, number>) || {},
    speciesByGenus: (data.species_by_genus as Record<string, number>) || {},
    speciesByRealm: (data.species_by_realm as Record<string, number>) || {},
    speciesByBiome: (data.species_by_biome as Record<string, number>) || {},
    speciesByBioregion: (data.species_by_bioregion as Record<string, number>) || {},
    marineSpeciesCount: data.marine_species_count || 0,
    terrestrialSpeciesCount: data.terrestrial_species_count || 0,
    freshwaterSpeciesCount: data.freshwater_species_count || 0,
    aquaticSpeciesCount: data.aquatic_species_count || 0,
    speciesByIucnStatus: (data.species_by_iucn_status as Record<string, number>) || {},
    cluesByCategory: (data.clues_by_category as Record<string, number>) || {},
    favoriteClueCategory: data.favorite_clue_category ?? undefined,
    firstDiscoveryAt: data.first_discovery_at?.toISOString() ?? undefined,
    lastDiscoveryAt: data.last_discovery_at?.toISOString() ?? undefined,
    createdAt: data.created_at?.toISOString() ?? new Date().toISOString(),
    updatedAt: data.updated_at?.toISOString() ?? new Date().toISOString(),
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
    const data = await prisma.playerStats.findUnique({
      where: { player_id: playerId },
    });

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
    const profile = await prisma.profile.findUnique({
      where: { user_id: playerId },
      select: { username: true },
    });

    if (profile?.username) {
      return profile.username;
    }

    return 'Player';
  } catch (err) {
    console.error('Error getting player display name:', err);
    return 'Player';
  }
}
