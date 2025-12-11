// =============================================================================
// PLAYER TRACKING SERVICE (Prisma Version)
// =============================================================================
// This service handles all player-related database operations using Prisma.
//
// FEATURES:
// - Type-safe database operations
// - Transaction support for atomic writes
// - Upsert operations for idempotent updates
// - Relation management (linking clues to discoveries)
//
// COMPARISON TO EXISTING SUPABASE VERSION:
// The original playerTracking.ts uses Supabase client with:
// - Debounced updates (10s batching)
// - Offline queue (localStorage backup)
// - Deferred clue-discovery linking
//
// This Prisma version is simpler for learning purposes.
// For production, you may want to add the offline queue back.
// =============================================================================

import { prisma } from '@/lib/prisma';

// Type for transaction client (same API as PrismaClient within transaction)
// This omits methods that aren't available within a transaction context
type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Starts a new game session for a player.
 * Creates a session record to track gameplay progress.
 *
 * @param playerId - UUID of the player (from Supabase auth)
 * @returns Session ID (UUID string)
 *
 * @example
 * ```typescript
 * const user = await supabase.auth.getUser();
 * const sessionId = await startSession(user.data.user.id);
 * // Store sessionId for use during gameplay
 * ```
 */
export async function startSession(playerId: string): Promise<string> {
  const session = await prisma.playerGameSession.create({
    data: {
      player_id: playerId,
      started_at: new Date(),
    },
  });

  console.log(`[playerTracking] Session started: ${session.id}`);
  return session.id;
}

/**
 * Updates session progress during gameplay.
 * Call this periodically to save progress.
 *
 * @param sessionId - UUID of the current session
 * @param progress - Partial update with new values
 *
 * @example
 * ```typescript
 * await updateSession(sessionId, {
 *   total_moves: gameState.moves,
 *   total_score: gameState.score,
 *   species_discovered_in_session: discoveries.length,
 * });
 * ```
 */
export async function updateSession(
  sessionId: string,
  progress: {
    total_moves?: number;
    total_score?: number;
    species_discovered_in_session?: number;
    clues_unlocked_in_session?: number;
  }
) {
  return prisma.playerGameSession.update({
    where: { id: sessionId },
    data: progress,
  });
}

/**
 * Ends a game session by setting the ended_at timestamp.
 *
 * @param sessionId - UUID of the session to end
 */
export async function endSession(sessionId: string) {
  return prisma.playerGameSession.update({
    where: { id: sessionId },
    data: { ended_at: new Date() },
  });
}

/**
 * Gets all sessions for a player, ordered by most recent first.
 *
 * @param playerId - UUID of the player
 * @param limit - Maximum number of sessions to return
 */
export async function getPlayerSessions(playerId: string, limit: number = 10) {
  return prisma.playerGameSession.findMany({
    where: { player_id: playerId },
    orderBy: { started_at: 'desc' },
    take: limit,
  });
}

// =============================================================================
// SPECIES DISCOVERY TRACKING
// =============================================================================

/**
 * Records a species discovery with related clue unlocks.
 *
 * Uses a Prisma TRANSACTION to ensure atomic operation:
 * - Creates discovery record
 * - Links pending clues to the discovery
 *
 * TRANSACTIONS EXPLAINED:
 * ----------------------
 * All operations inside prisma.$transaction() either succeed together
 * or fail together. If the discovery insert fails, the clue updates
 * are rolled back automatically. This prevents data inconsistency.
 *
 * @param params - Discovery details
 * @returns The created discovery record
 *
 * @example
 * ```typescript
 * const discovery = await recordDiscovery({
 *   playerId: userId,
 *   speciesId: 1,
 *   sessionId: currentSessionId,
 *   timeToDiscoverSeconds: 45,
 *   cluesUnlockedBeforeGuess: 3,
 *   incorrectGuessesCount: 1,
 *   scoreEarned: 150,
 *   pendingClueIds: ['uuid1', 'uuid2', 'uuid3'],
 * });
 * ```
 */
export async function recordDiscovery(params: {
  playerId: string;
  speciesId: number;
  sessionId?: string;
  timeToDiscoverSeconds?: number;
  cluesUnlockedBeforeGuess: number;
  incorrectGuessesCount: number;
  scoreEarned: number;
  pendingClueIds?: string[]; // Clue IDs to link to this discovery
}) {
  const {
    playerId,
    speciesId,
    sessionId,
    timeToDiscoverSeconds,
    cluesUnlockedBeforeGuess,
    incorrectGuessesCount,
    scoreEarned,
    pendingClueIds = [],
  } = params;

  // Transaction ensures all-or-nothing behavior
  return prisma.$transaction(async (tx: TransactionClient) => {
    // 1. Create or update the discovery record
    //    upsert = insert if new, update if exists (idempotent)
    const discovery = await tx.playerSpeciesDiscovery.upsert({
      where: {
        // Unique constraint defined in schema: player_species_unique
        player_species_unique: {
          player_id: playerId,
          species_id: speciesId,
        },
      },
      create: {
        player_id: playerId,
        species_id: speciesId,
        session_id: sessionId,
        time_to_discover_seconds: timeToDiscoverSeconds,
        clues_unlocked_before_guess: cluesUnlockedBeforeGuess,
        incorrect_guesses_count: incorrectGuessesCount,
        score_earned: scoreEarned,
      },
      update: {
        // If already discovered, just update the score (idempotent)
        score_earned: scoreEarned,
      },
    });

    // 2. Link pending clues to this discovery
    //    Only updates clues that don't have a discovery_id yet
    if (pendingClueIds.length > 0) {
      await tx.playerClueUnlock.updateMany({
        where: {
          id: { in: pendingClueIds },
          discovery_id: null, // Only unlinked clues
        },
        data: { discovery_id: discovery.id },
      });

      console.log(
        `[playerTracking] Linked ${pendingClueIds.length} clues to discovery ${discovery.id}`
      );
    }

    return discovery;
  });
}

/**
 * Gets all discoveries for a player with species details.
 * Useful for showing player's collection/achievements.
 *
 * @param playerId - UUID of the player
 */
export async function getPlayerDiscoveries(playerId: string) {
  return prisma.playerSpeciesDiscovery.findMany({
    where: { player_id: playerId },
    include: {
      // Include related species data
      species: {
        select: {
          ogc_fid: true,
          comm_name: true,
          sci_name: true,
          category: true,
          realm: true,
          biome: true,
        },
      },
    },
    orderBy: { discovered_at: 'desc' },
  });
}

/**
 * Checks if a player has discovered a specific species.
 *
 * @param playerId - UUID of the player
 * @param speciesId - Species ogc_fid
 * @returns true if already discovered
 */
export async function hasPlayerDiscovered(
  playerId: string,
  speciesId: number
): Promise<boolean> {
  const discovery = await prisma.playerSpeciesDiscovery.findUnique({
    where: {
      player_species_unique: {
        player_id: playerId,
        species_id: speciesId,
      },
    },
    select: { id: true }, // Only need to know if it exists
  });

  return discovery !== null;
}

// =============================================================================
// CLUE TRACKING
// =============================================================================

/**
 * Records a clue unlock event.
 *
 * Uses upsert to be idempotent - safe to call multiple times for same clue.
 * Returns the clue ID for later linking to discovery.
 *
 * @param params - Clue details
 * @returns UUID of the clue unlock record
 *
 * @example
 * ```typescript
 * const clueId = await recordClueUnlock({
 *   playerId: userId,
 *   speciesId: 1,
 *   clueCategory: 'classification',
 *   clueField: 'order_',
 *   clueValue: 'Testudines',
 * });
 * // Store clueId to link when species is discovered
 * pendingClueIds.push(clueId);
 * ```
 */
export async function recordClueUnlock(params: {
  playerId: string;
  speciesId: number;
  clueCategory: string;
  clueField: string;
  clueValue?: string;
}): Promise<string> {
  const { playerId, speciesId, clueCategory, clueField, clueValue } = params;

  // Upsert: insert if new, no-op if exists (idempotent)
  const clue = await prisma.playerClueUnlock.upsert({
    where: {
      // Unique constraint: player_clue_unique
      player_clue_unique: {
        player_id: playerId,
        species_id: speciesId,
        clue_category: clueCategory,
        clue_field: clueField,
      },
    },
    create: {
      player_id: playerId,
      species_id: speciesId,
      clue_category: clueCategory,
      clue_field: clueField,
      clue_value: clueValue,
    },
    update: {}, // No update needed if already exists
  });

  return clue.id;
}

/**
 * Gets all clue unlocks for a player on a specific species.
 * Useful for restoring game state if player returns.
 *
 * @param playerId - UUID of the player
 * @param speciesId - Species ogc_fid
 */
export async function getPlayerCluesForSpecies(
  playerId: string,
  speciesId: number
) {
  return prisma.playerClueUnlock.findMany({
    where: {
      player_id: playerId,
      species_id: speciesId,
    },
    orderBy: { unlocked_at: 'asc' },
  });
}

/**
 * Gets count of clues unlocked by a player.
 *
 * @param playerId - UUID of the player
 */
export async function getPlayerClueCount(playerId: string): Promise<number> {
  return prisma.playerClueUnlock.count({
    where: { player_id: playerId },
  });
}

// =============================================================================
// PLAYER STATS
// =============================================================================

/**
 * Ensures a player_stats record exists for a player.
 * Uses upsert to create if not exists, no-op if exists.
 *
 * @param playerId - UUID of the player
 */
export async function ensurePlayerStatsExists(playerId: string) {
  return prisma.playerStats.upsert({
    where: { player_id: playerId },
    create: { player_id: playerId },
    update: {}, // No update if already exists
  });
}

/**
 * Gets player stats with rank information.
 *
 * @param playerId - UUID of the player
 */
export async function getPlayerStats(playerId: string) {
  return prisma.playerStats.findUnique({
    where: { player_id: playerId },
  });
}

/**
 * Updates player stats after a discovery.
 * Increments counters and updates JSONB aggregation fields.
 *
 * @param playerId - UUID of the player
 * @param speciesData - Species details for categorization
 * @param cluesUsed - Number of clues unlocked for this discovery
 * @param scoreEarned - Points earned
 *
 * NOTE: JSONB updates require raw SQL or the jsonb_set function.
 * This simplified version uses Prisma's update with a transaction.
 */
export async function updatePlayerStatsAfterDiscovery(
  playerId: string,
  speciesData: {
    order_?: string | null;
    family?: string | null;
    genus?: string | null;
    realm?: string | null;
    biome?: string | null;
    bioregio_1?: string | null;
    category?: string | null;
    marine?: string | null;
    terrestria?: string | null;
    freshwater?: string | null;
    aquatic?: string | null;
  },
  cluesUsed: number,
  scoreEarned: number
) {
  // First, get current stats
  const currentStats = await prisma.playerStats.findUnique({
    where: { player_id: playerId },
  });

  if (!currentStats) {
    // Create initial stats record
    await ensurePlayerStatsExists(playerId);
    return updatePlayerStatsAfterDiscovery(playerId, speciesData, cluesUsed, scoreEarned);
  }

  // Helper to increment JSONB count
  const incrementJsonbCount = (
    jsonb: Record<string, number> | null,
    key: string | null | undefined
  ): Record<string, number> => {
    const result = { ...(jsonb || {}) } as Record<string, number>;
    if (key) {
      result[key] = (result[key] || 0) + 1;
    }
    return result;
  };

  // Update stats with incremented values
  return prisma.playerStats.update({
    where: { player_id: playerId },
    data: {
      total_species_discovered: { increment: 1 },
      total_clues_unlocked: { increment: cluesUsed },
      total_score: { increment: scoreEarned },

      // Taxonomic coverage
      species_by_order: incrementJsonbCount(
        currentStats.species_by_order as Record<string, number> | null,
        speciesData.order_
      ),
      species_by_family: incrementJsonbCount(
        currentStats.species_by_family as Record<string, number> | null,
        speciesData.family
      ),
      species_by_genus: incrementJsonbCount(
        currentStats.species_by_genus as Record<string, number> | null,
        speciesData.genus
      ),

      // Geographic coverage
      species_by_realm: incrementJsonbCount(
        currentStats.species_by_realm as Record<string, number> | null,
        speciesData.realm
      ),
      species_by_biome: incrementJsonbCount(
        currentStats.species_by_biome as Record<string, number> | null,
        speciesData.biome
      ),
      species_by_bioregion: incrementJsonbCount(
        currentStats.species_by_bioregion as Record<string, number> | null,
        speciesData.bioregio_1
      ),

      // Conservation status
      species_by_iucn_status: incrementJsonbCount(
        currentStats.species_by_iucn_status as Record<string, number> | null,
        speciesData.category
      ),

      // Habitat counts
      marine_species_count:
        speciesData.marine === 'true' ? { increment: 1 } : undefined,
      terrestrial_species_count:
        speciesData.terrestria === 'true' ? { increment: 1 } : undefined,
      freshwater_species_count:
        speciesData.freshwater === 'true' ? { increment: 1 } : undefined,
      aquatic_species_count:
        speciesData.aquatic === 'true' ? { increment: 1 } : undefined,

      // Timestamps
      last_discovery_at: new Date(),
      first_discovery_at:
        currentStats.first_discovery_at || new Date(),
      updated_at: new Date(),
    },
  });
}

// =============================================================================
// LEADERBOARD
// =============================================================================

/**
 * Gets top players by total score.
 *
 * @param limit - Number of players to return
 */
export async function getLeaderboardByScore(limit: number = 10) {
  return prisma.playerStats.findMany({
    where: {
      total_score: { gt: 0 },
    },
    orderBy: { total_score: 'desc' },
    take: limit,
    include: {
      player: {
        select: {
          username: true,
          avatar_url: true,
        },
      },
    },
  });
}

/**
 * Gets top players by species discovered.
 *
 * @param limit - Number of players to return
 */
export async function getLeaderboardByDiscoveries(limit: number = 10) {
  return prisma.playerStats.findMany({
    where: {
      total_species_discovered: { gt: 0 },
    },
    orderBy: { total_species_discovered: 'desc' },
    take: limit,
    include: {
      player: {
        select: {
          username: true,
          avatar_url: true,
        },
      },
    },
  });
}
