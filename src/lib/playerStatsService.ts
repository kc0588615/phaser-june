import { supabaseBrowser } from '@/lib/supabase-browser';
import type { PlayerStats } from '@/components/PlayerStatsDashboard/types';

/**
 * Player Stats Service
 * Fetches aggregated player statistics from the player_stats table
 */

export interface FetchPlayerStatsOptions {
  includeRankings?: boolean; // Whether to include leaderboard rankings
}

/**
 * Fetch player stats for the current authenticated user
 * @param options - Fetch options
 * @returns PlayerStats or null if not found
 */
export async function fetchPlayerStats(
  options: FetchPlayerStatsOptions = { includeRankings: true }
): Promise<PlayerStats | null> {
  try {
    const supabase = supabaseBrowser();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Not authenticated:', authError);
      return null;
    }

    // Fetch player stats
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_id', user.id)
      .single();

    if (error) {
      // If no stats found (new player), return null
      if (error.code === 'PGRST116') {
        console.log('No stats found for player - likely new user');
        return null;
      }

      console.error('Error fetching player stats:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Transform database snake_case to camelCase for component
    const stats: PlayerStats = {
      playerId: data.player_id,
      totalSpeciesDiscovered: data.total_species_discovered || 0,
      totalCluesUnlocked: data.total_clues_unlocked || 0,
      totalScore: data.total_score || 0,
      totalMovesMade: data.total_moves_made || 0,
      totalGamesPlayed: data.total_games_played || 0,
      totalPlayTimeSeconds: data.total_play_time_seconds || 0,
      averageCluesPerDiscovery: data.average_clues_per_discovery || 0,
      fastestDiscoveryClues: data.fastest_discovery_clues ?? undefined,
      slowestDiscoveryClues: data.slowest_discovery_clues ?? undefined,
      averageTimePerDiscoverySeconds: data.average_time_per_discovery_seconds ?? undefined,
      speciesByOrder: data.species_by_order || {},
      speciesByFamily: data.species_by_family || {},
      speciesByGenus: data.species_by_genus || {},
      speciesByRealm: data.species_by_realm || {},
      speciesByBiome: data.species_by_biome || {},
      speciesByBioregion: data.species_by_bioregion || {},
      marineSpeciesCount: data.marine_species_count || 0,
      terrestrialSpeciesCount: data.terrestrial_species_count || 0,
      freshwaterSpeciesCount: data.freshwater_species_count || 0,
      aquaticSpeciesCount: data.aquatic_species_count || 0,
      speciesByIucnStatus: data.species_by_iucn_status || {},
      cluesByCategory: data.clues_by_category || {},
      favoriteClueCategory: data.favorite_clue_category ?? undefined,
      firstDiscoveryAt: data.first_discovery_at ?? undefined,
      lastDiscoveryAt: data.last_discovery_at ?? undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      rankByDiscoveries: options.includeRankings ? data.rank_by_discoveries ?? undefined : undefined,
      rankByScore: options.includeRankings ? data.rank_by_score ?? undefined : undefined,
      rankByEfficiency: options.includeRankings ? data.rank_by_efficiency ?? undefined : undefined,
    };

    return stats;
  } catch (err) {
    console.error('Unexpected error fetching player stats:', err);
    return null;
  }
}

/**
 * Fetch player stats by player ID (for viewing other players)
 * @param playerId - The player ID to fetch stats for
 * @param options - Fetch options
 * @returns PlayerStats or null if not found
 */
export async function fetchPlayerStatsByPlayerId(
  playerId: string,
  options: FetchPlayerStatsOptions = { includeRankings: true }
): Promise<PlayerStats | null> {
  try {
    const supabase = supabaseBrowser();

    // Fetch player stats
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('No stats found for player:', playerId);
        return null;
      }

      console.error('Error fetching player stats:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Transform database snake_case to camelCase
    const stats: PlayerStats = {
      playerId: data.player_id,
      totalSpeciesDiscovered: data.total_species_discovered || 0,
      totalCluesUnlocked: data.total_clues_unlocked || 0,
      totalScore: data.total_score || 0,
      totalMovesMade: data.total_moves_made || 0,
      totalGamesPlayed: data.total_games_played || 0,
      totalPlayTimeSeconds: data.total_play_time_seconds || 0,
      averageCluesPerDiscovery: data.average_clues_per_discovery || 0,
      fastestDiscoveryClues: data.fastest_discovery_clues ?? undefined,
      slowestDiscoveryClues: data.slowest_discovery_clues ?? undefined,
      averageTimePerDiscoverySeconds: data.average_time_per_discovery_seconds ?? undefined,
      speciesByOrder: data.species_by_order || {},
      speciesByFamily: data.species_by_family || {},
      speciesByGenus: data.species_by_genus || {},
      speciesByRealm: data.species_by_realm || {},
      speciesByBiome: data.species_by_biome || {},
      speciesByBioregion: data.species_by_bioregion || {},
      marineSpeciesCount: data.marine_species_count || 0,
      terrestrialSpeciesCount: data.terrestrial_species_count || 0,
      freshwaterSpeciesCount: data.freshwater_species_count || 0,
      aquaticSpeciesCount: data.aquatic_species_count || 0,
      speciesByIucnStatus: data.species_by_iucn_status || {},
      cluesByCategory: data.clues_by_category || {},
      favoriteClueCategory: data.favorite_clue_category ?? undefined,
      firstDiscoveryAt: data.first_discovery_at ?? undefined,
      lastDiscoveryAt: data.last_discovery_at ?? undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      rankByDiscoveries: options.includeRankings ? data.rank_by_discoveries ?? undefined : undefined,
      rankByScore: options.includeRankings ? data.rank_by_score ?? undefined : undefined,
      rankByEfficiency: options.includeRankings ? data.rank_by_efficiency ?? undefined : undefined,
    };

    return stats;
  } catch (err) {
    console.error('Unexpected error fetching player stats:', err);
    return null;
  }
}

/**
 * Get player display name from profile
 * @param playerId - The player ID
 * @returns Display name or email or "Player"
 */
export async function getPlayerDisplayName(playerId?: string): Promise<string> {
  try {
    const supabase = supabaseBrowser();

    // If no playerId provided, get current user
    if (!playerId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'Player';
      playerId = user.id;
    }

    // Try to get profile display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', playerId)
      .single();

    if (profile?.username) {
      return profile.username;
    }

    // Fallback to email
    if (profile?.email) {
      return profile.email.split('@')[0]; // Use email prefix
    }

    // Ultimate fallback
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      return user.email.split('@')[0];
    }

    return 'Player';
  } catch (err) {
    console.error('Error getting player display name:', err);
    return 'Player';
  }
}
