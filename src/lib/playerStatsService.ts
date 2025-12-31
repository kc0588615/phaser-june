// =============================================================================
// PLAYER STATS SERVICE - Prisma Version
// =============================================================================
// Fetches aggregated player statistics from the player_stats table.
// NOTE: Auth calls use Supabase temporarily until Phase 4 (Clerk migration).
// =============================================================================

import { prisma } from '@/lib/prisma';
import { supabaseBrowser } from '@/lib/supabase-browser';
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
 * Fetch player stats for the current authenticated user
 * NOTE: Uses Supabase auth temporarily (will migrate to Clerk in Phase 4)
 */
export async function fetchPlayerStats(
  options: FetchPlayerStatsOptions = { includeRankings: true }
): Promise<PlayerStats | null> {
  try {
    // TODO: Replace with Clerk auth in Phase 4
    const supabase = supabaseBrowser();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Not authenticated:', authError);
      return null;
    }

    const data = await prisma.playerStats.findUnique({
      where: { player_id: user.id },
    });

    if (!data) {
      console.log('No stats found for player - likely new user');
      return null;
    }

    return transformToPlayerStats(data);
  } catch (err) {
    console.error('Unexpected error fetching player stats:', err);
    return null;
  }
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
 * Get player display name from profile
 * NOTE: Uses Supabase auth temporarily (will migrate to Clerk in Phase 4)
 */
export async function getPlayerDisplayName(playerId?: string): Promise<string> {
  try {
    // TODO: Replace with Clerk auth in Phase 4
    const supabase = supabaseBrowser();
    let fallbackEmail: string | undefined;

    // If no playerId provided, get current user
    if (!playerId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'Player';
      playerId = user.id;
      fallbackEmail = user.email ?? undefined;
    }

    // Try to get profile display name
    const profile = await prisma.profile.findUnique({
      where: { user_id: playerId },
      select: { username: true },
    });

    if (profile?.username) {
      return profile.username;
    }

    // Fallback to email
    if (!fallbackEmail) {
      const { data: { user } } = await supabase.auth.getUser();
      fallbackEmail = user?.email ?? undefined;
    }

    if (fallbackEmail) {
      return fallbackEmail.split('@')[0];
    }

    return 'Player';
  } catch (err) {
    console.error('Error getting player display name:', err);
    return 'Player';
  }
}
