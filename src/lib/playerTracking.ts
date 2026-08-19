// =============================================================================
// PLAYER TRACKING SERVICE - Drizzle Version
// =============================================================================
// Syncs game events to Postgres with proper session management.
// Server-only: client imports get no-op stubs to prevent build errors.
// =============================================================================

// Client-side guard: export no-op functions to prevent postgres import in browser
const isServer = typeof window === 'undefined';

// Lazy-load server dependencies only when needed
let db: any;
let playerGameSessions: any;
let playerClueUnlocks: any;
let playerSpeciesDiscoveries: any;
let playerStats: any;
let speciesTable: any;
let eq: any, and: any, isNull: any, desc: any, count: any, sum: any, sql: any;

async function ensureServerDeps() {
  if (!isServer) return false;
  if (!db) {
    const drizzleOps = await import('drizzle-orm');
    eq = drizzleOps.eq;
    and = drizzleOps.and;
    isNull = drizzleOps.isNull;
    desc = drizzleOps.desc;
    count = drizzleOps.count;
    sum = drizzleOps.sum;
    sql = drizzleOps.sql;

    let dbModule: any;
    try {
      dbModule = await import('@/db');
    } catch (err) {
      dbModule = await import('../db');
    }
    db = dbModule.db;
    playerGameSessions = dbModule.playerGameSessions;
    playerClueUnlocks = dbModule.playerClueUnlocks;
    playerSpeciesDiscoveries = dbModule.playerSpeciesDiscoveries;
    playerStats = dbModule.playerStats;
    speciesTable = dbModule.speciesTable;
  }
  return true;
}

/**
 * Start or resume a game session
 * Handles React Strict Mode double-mounting
 */
export async function startGameSession(playerId: string): Promise<string | null> {
  if (!(await ensureServerDeps())) return null; // Client-side no-op

  try {
    // Check for existing open session (prevent duplicates)
    const existingSessions = await db
      .select()
      .from(playerGameSessions)
      .where(
        and(
          eq(playerGameSessions.playerId, playerId),
          isNull(playerGameSessions.endedAt)
        )
      )
      .orderBy(desc(playerGameSessions.startedAt))
      .limit(1);

    const existingSession = existingSessions[0];

    if (existingSession) {
      return existingSession.id;
    }

    // Create new session
    const result = await db
      .insert(playerGameSessions)
      .values({
        playerId,
        startedAt: new Date(),
        totalMoves: 0,
        totalScore: 0,
        speciesDiscoveredInSession: 0,
        cluesUnlockedInSession: 0,
      })
      .returning({ id: playerGameSessions.id });

    const session = result[0];

    return session.id;
  } catch (err) {
    console.error('Failed to start game session:', err);
    return null;
  }
}

/**
 * End an owned game session
 */
export async function endGameSession(
  playerId: string,
  sessionId: string,
  finalMoves: number,
  finalScore: number
): Promise<boolean> {
  if (!(await ensureServerDeps())) return false; // Client-side no-op

  try {
    const result = await db
      .update(playerGameSessions)
      .set({
        endedAt: new Date(),
        totalMoves: finalMoves,
        totalScore: finalScore,
      })
      .where(
        and(
          eq(playerGameSessions.id, sessionId),
          eq(playerGameSessions.playerId, playerId),
        )
      )
      .returning({ id: playerGameSessions.id });

    if (result.length === 0) return false;

    await refreshPlayerStats(playerId);
    return true;
  } catch (err) {
    console.error('Failed to end game session:', err);
    throw err;
  }
}

/**
 * Update progress for an owned game session
 */
export async function updateSessionProgress(
  playerId: string,
  sessionId: string,
  moves: number,
  score: number,
  speciesDiscovered: number,
  cluesUnlocked: number
): Promise<boolean> {
  if (!(await ensureServerDeps())) return false; // Client-side no-op

  try {
    const result = await db
      .update(playerGameSessions)
      .set({
        totalMoves: moves,
        totalScore: score,
        speciesDiscoveredInSession: speciesDiscovered,
        cluesUnlockedInSession: cluesUnlocked,
      })
      .where(
        and(
          eq(playerGameSessions.id, sessionId),
          eq(playerGameSessions.playerId, playerId),
        )
      )
      .returning({ id: playerGameSessions.id });
    return result.length > 0;
  } catch (err) {
    console.error('Failed to update session progress:', err);
    throw err;
  }
}

/**
 * Force immediate session update (for critical events like species discovery)
 */
export async function forceSessionUpdate(
  playerId: string,
  sessionId: string,
  moves: number,
  score: number,
  speciesDiscovered: number,
  cluesUnlocked: number
): Promise<boolean> {
  return updateSessionProgress(
    playerId, sessionId, moves, score, speciesDiscovered, cluesUnlocked
  );
}

/**
 * Track a clue unlock event
 * Returns: true if newly unlocked, false if duplicate, null if error
 */
export async function trackClueUnlock(
  playerId: string,
  speciesId: number,
  clueCategory: string,
  clueField: string,
  clueValue: string | null = null
): Promise<boolean | null> {
  if (!(await ensureServerDeps())) return null; // Client-side no-op

  try {
    let clue: { id: string; unlockedAt: Date | null };

    const result = await db
      .insert(playerClueUnlocks)
      .values({
        playerId,
        speciesId,
        clueCategory,
        clueField,
        clueValue,
      })
      .onConflictDoNothing({
        target: [
          playerClueUnlocks.playerId,
          playerClueUnlocks.speciesId,
          playerClueUnlocks.clueCategory,
          playerClueUnlocks.clueField,
        ],
      })
      .returning({
        id: playerClueUnlocks.id,
        unlockedAt: playerClueUnlocks.unlockedAt,
      });

    if (result.length > 0) {
      clue = result[0];
    } else {
      const existing = await db
        .select({
          id: playerClueUnlocks.id,
          unlockedAt: playerClueUnlocks.unlockedAt,
        })
        .from(playerClueUnlocks)
        .where(
          and(
            eq(playerClueUnlocks.playerId, playerId),
            eq(playerClueUnlocks.speciesId, speciesId),
            eq(playerClueUnlocks.clueCategory, clueCategory),
            eq(playerClueUnlocks.clueField, clueField)
          )
        )
        .limit(1);
      clue = existing[0];
    }

    // Check if this was a create (new) or update (existing)
    // If unlocked_at matches within 1 second, it's likely new
    const isNew = clue.unlockedAt
      ? Date.now() - new Date(clue.unlockedAt).getTime() < 1000
      : true;
    return isNew;
  } catch (err) {
    console.error('Failed to track clue unlock:', err);
    return null;
  }
}

/**
 * Track a species discovery
 * Links unlocked clues for this player and species to this discovery
 */
export async function trackSpeciesDiscovery(
  playerId: string,
  speciesId: number,
  options: {
    sessionId?: string;
    timeToDiscoverSeconds?: number;
    cluesUnlockedBeforeGuess: number;
    incorrectGuessesCount: number;
    scoreEarned: number;
    foundLon?: number;
    foundLat?: number;
    foundEcoregionId?: number | null;
  }
): Promise<string | null> {
  if (!(await ensureServerDeps())) return null; // Client-side no-op

  try {
    const requestedSessionId = options.sessionId ?? null;

    // Use transaction for atomic operation
    const result = await db.transaction(async (tx: any) => {
      let sessionId: string | null = null;

      if (requestedSessionId) {
        const ownedSession = await tx
          .select({ id: playerGameSessions.id })
          .from(playerGameSessions)
          .where(
            and(
              eq(playerGameSessions.id, requestedSessionId),
              eq(playerGameSessions.playerId, playerId),
            )
          )
          .limit(1);
        sessionId = ownedSession[0] ? requestedSessionId : null;
      }

      // Upsert discovery (idempotent)
      const discoveryResult = await tx
        .insert(playerSpeciesDiscoveries)
        .values({
          playerId,
          speciesId,
          sessionId,
          timeToDiscoverSeconds: options.timeToDiscoverSeconds,
          cluesUnlockedBeforeGuess: options.cluesUnlockedBeforeGuess,
          incorrectGuessesCount: options.incorrectGuessesCount,
          scoreEarned: options.scoreEarned,
          foundLon: options.foundLon,
          foundLat: options.foundLat,
          foundEcoregionId: options.foundEcoregionId ?? null,
        })
        .onConflictDoUpdate({
          target: [playerSpeciesDiscoveries.playerId, playerSpeciesDiscoveries.speciesId],
          set: {
            // If already discovered, update score and fill first known location.
            scoreEarned: options.scoreEarned,
            foundLon: sql`COALESCE(${playerSpeciesDiscoveries.foundLon}, ${options.foundLon ?? null})`,
            foundLat: sql`COALESCE(${playerSpeciesDiscoveries.foundLat}, ${options.foundLat ?? null})`,
            foundEcoregionId: sql`COALESCE(${playerSpeciesDiscoveries.foundEcoregionId}, ${options.foundEcoregionId ?? null})`,
          },
        })
        .returning({ id: playerSpeciesDiscoveries.id });

      const discovery = discoveryResult[0];

      await tx
        .update(playerClueUnlocks)
        .set({ discoveryId: discovery.id })
        .where(
          and(
            eq(playerClueUnlocks.playerId, playerId),
            eq(playerClueUnlocks.speciesId, speciesId),
            isNull(playerClueUnlocks.discoveryId),
          )
        );

      return discovery;
    });

    // Update localStorage for offline support
    if (typeof window !== 'undefined') {
      updateLocalStorageDiscovery(speciesId);
    }

    await refreshPlayerStats(playerId);

    return result.id;
  } catch (err) {
    console.error('Failed to track species discovery:', err);
    throw err;
  }
}

/**
 * Update localStorage with discovered species
 */
function updateLocalStorageDiscovery(speciesId: number): void {
  if (typeof window === 'undefined') return;

  try {
    const discovered = JSON.parse(localStorage.getItem('discoveredSpecies') || '[]');

    if (!discovered.find((d: { id: number }) => d.id === speciesId)) {
      discovered.push({
        id: speciesId,
        idSource: 'species.id',
        discoveredAt: new Date().toISOString(),
      });
      localStorage.setItem('discoveredSpecies', JSON.stringify(discovered));
      window.dispatchEvent(new Event('species-discovered'));
    }
    // Sync to DB-backed species cards (fire-and-forget)
    fetch(`/api/species/cards/${speciesId}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unlockType: 'discover' }),
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to update localStorage:', err);
  }
}

/**
 * Get count of clues unlocked for a specific species
 */
export async function getClueCountForSpecies(
  playerId: string,
  speciesId: number
): Promise<number> {
  if (!(await ensureServerDeps())) return 0; // Client-side no-op

  try {
    const result = await db
      .select({ count: count() })
      .from(playerClueUnlocks)
      .where(
        and(
          eq(playerClueUnlocks.playerId, playerId),
          eq(playerClueUnlocks.speciesId, speciesId)
        )
      );
    return result[0]?.count ?? 0;
  } catch (err) {
    console.error('Failed to get clue count:', err);
    return 0;
  }
}

// =============================================================================
// PLAYER STATS REFRESH
// =============================================================================
// Refreshes aggregated player_stats from source tables.
// Called after discoveries to keep stats in sync.
// =============================================================================

/**
 * Refresh player_stats from source tables (player_species_discoveries, player_clue_unlocks)
 * Uses upsert to create or update the stats row.
 */
export async function refreshPlayerStats(playerId: string): Promise<boolean> {
  if (!(await ensureServerDeps())) return false;

  try {
    // Get discovery stats with species details
    const discoveries = await db
      .select({
        speciesId: playerSpeciesDiscoveries.speciesId,
        scoreEarned: playerSpeciesDiscoveries.scoreEarned,
        timeToDiscoverSeconds: playerSpeciesDiscoveries.timeToDiscoverSeconds,
        cluesUnlockedBeforeGuess: playerSpeciesDiscoveries.cluesUnlockedBeforeGuess,
        discoveredAt: playerSpeciesDiscoveries.discoveredAt,
        // Join species data
        taxonOrder: speciesTable.taxonOrder,
        family: speciesTable.family,
        genus: speciesTable.genus,
        realm: speciesTable.realm,
        biome: speciesTable.biome,
        bioregion: speciesTable.bioregion,
        marine: speciesTable.marine,
        terrestrial: speciesTable.terrestrial,
        freshwater: speciesTable.freshwater,
        conservationCode: speciesTable.conservationCode,
      })
      .from(playerSpeciesDiscoveries)
      .leftJoin(speciesTable, eq(playerSpeciesDiscoveries.speciesId, speciesTable.id))
      .where(eq(playerSpeciesDiscoveries.playerId, playerId));

    // Get clue stats
    const clues = await db
      .select({
        clueCategory: playerClueUnlocks.clueCategory,
      })
      .from(playerClueUnlocks)
      .where(eq(playerClueUnlocks.playerId, playerId));

    // Get session stats
    const sessions = await db
      .select({
        totalMoves: playerGameSessions.totalMoves,
        startedAt: playerGameSessions.startedAt,
        endedAt: playerGameSessions.endedAt,
      })
      .from(playerGameSessions)
      .where(eq(playerGameSessions.playerId, playerId));

    // Calculate aggregates
    const totalSpeciesDiscovered = discoveries.length;
    const totalCluesUnlocked = clues.length;
    const totalScore = discoveries.reduce((sum: number, d: any) => sum + (d.scoreEarned || 0), 0);
    const totalMovesMade = sessions.reduce((sum: number, s: any) => sum + (s.totalMoves || 0), 0);
    const totalGamesPlayed = sessions.length;

    // Calculate play time
    const totalPlayTimeSeconds = sessions.reduce((sum: number, s: any) => {
      if (s.startedAt && s.endedAt) {
        return sum + Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000);
      }
      return sum;
    }, 0);

    // Calculate clue efficiency
    const cluesPerDiscovery = discoveries.map((d: any) => d.cluesUnlockedBeforeGuess || 0);
    const averageCluesPerDiscovery = totalSpeciesDiscovered > 0
      ? cluesPerDiscovery.reduce((a: number, b: number) => a + b, 0) / totalSpeciesDiscovered
      : null;
    const fastestDiscoveryClues = cluesPerDiscovery.length > 0 ? Math.min(...cluesPerDiscovery) : null;
    const slowestDiscoveryClues = cluesPerDiscovery.length > 0 ? Math.max(...cluesPerDiscovery) : null;

    // Calculate time stats
    const discoverTimes = discoveries
      .map((d: any) => d.timeToDiscoverSeconds)
      .filter((t: any) => t != null) as number[];
    const averageTimePerDiscoverySeconds = discoverTimes.length > 0
      ? Math.floor(discoverTimes.reduce((a, b) => a + b, 0) / discoverTimes.length)
      : null;

    // Build taxonomy/geography breakdowns
    const speciesByOrder: Record<string, number> = {};
    const speciesByFamily: Record<string, number> = {};
    const speciesByGenus: Record<string, number> = {};
    const speciesByRealm: Record<string, number> = {};
    const speciesByBiome: Record<string, number> = {};
    const speciesByBioregion: Record<string, number> = {};
    const speciesByIucnStatus: Record<string, number> = {};

    let marineSpeciesCount = 0;
    let terrestrialSpeciesCount = 0;
    let freshwaterSpeciesCount = 0;
    let aquaticSpeciesCount = 0;

    const UNKNOWN_BUCKET = 'Unknown';
    const normalizeBucket = (value: unknown): string => {
      if (value === null || value === undefined) return UNKNOWN_BUCKET;
      const text = String(value).trim();
      if (!text) return UNKNOWN_BUCKET;
      const lowered = text.toLowerCase();
      if (lowered === 'null' || lowered === 'n/a' || lowered === 'na' || lowered === 'unknown') {
        return UNKNOWN_BUCKET;
      }
      return text;
    };

    for (const d of discoveries) {
      const taxonOrder = normalizeBucket(d.taxonOrder);
      const family = normalizeBucket(d.family);
      const genus = normalizeBucket(d.genus);
      const realm = normalizeBucket(d.realm);
      const biome = normalizeBucket(d.biome);
      const bioregion = normalizeBucket(d.bioregion);
      const conservationCode = normalizeBucket(d.conservationCode);

      speciesByOrder[taxonOrder] = (speciesByOrder[taxonOrder] || 0) + 1;
      speciesByFamily[family] = (speciesByFamily[family] || 0) + 1;
      speciesByGenus[genus] = (speciesByGenus[genus] || 0) + 1;
      speciesByRealm[realm] = (speciesByRealm[realm] || 0) + 1;
      speciesByBiome[biome] = (speciesByBiome[biome] || 0) + 1;
      speciesByBioregion[bioregion] = (speciesByBioregion[bioregion] || 0) + 1;
      speciesByIucnStatus[conservationCode] =
        (speciesByIucnStatus[conservationCode] || 0) + 1;
      if (d.marine) marineSpeciesCount++;
      if (d.terrestrial) terrestrialSpeciesCount++;
      if (d.freshwater) freshwaterSpeciesCount++;
    }

    // Build clue category breakdown
    const cluesByCategory: Record<string, number> = {};
    for (const c of clues) {
      cluesByCategory[c.clueCategory] = (cluesByCategory[c.clueCategory] || 0) + 1;
    }

    // Determine favorite clue category
    const favoriteClueCategory = Object.entries(cluesByCategory).length > 0
      ? Object.entries(cluesByCategory).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // Get first/last discovery timestamps
    const discoveryDates = discoveries
      .map((d: any) => d.discoveredAt)
      .filter((d: any) => d != null)
      .sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());
    const firstDiscoveryAt = discoveryDates[0] || null;
    const lastDiscoveryAt = discoveryDates[discoveryDates.length - 1] || null;

    // Upsert player_stats
    await db
      .insert(playerStats)
      .values({
        playerId,
        totalSpeciesDiscovered,
        totalCluesUnlocked,
        totalScore,
        totalMovesMade,
        totalGamesPlayed,
        totalPlayTimeSeconds,
        averageCluesPerDiscovery: averageCluesPerDiscovery !== null ? averageCluesPerDiscovery.toString() : null,
        fastestDiscoveryClues,
        slowestDiscoveryClues,
        averageTimePerDiscoverySeconds,
        speciesByOrder,
        speciesByFamily,
        speciesByGenus,
        speciesByRealm,
        speciesByBiome,
        speciesByBioregion,
        marineSpeciesCount,
        terrestrialSpeciesCount,
        freshwaterSpeciesCount,
        aquaticSpeciesCount,
        speciesByIucnStatus,
        cluesByCategory,
        favoriteClueCategory,
        firstDiscoveryAt,
        lastDiscoveryAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: playerStats.playerId,
        set: {
          totalSpeciesDiscovered,
          totalCluesUnlocked,
          totalScore,
          totalMovesMade,
          totalGamesPlayed,
          totalPlayTimeSeconds,
          averageCluesPerDiscovery: averageCluesPerDiscovery !== null ? averageCluesPerDiscovery.toString() : null,
          fastestDiscoveryClues,
          slowestDiscoveryClues,
          averageTimePerDiscoverySeconds,
          speciesByOrder,
          speciesByFamily,
          speciesByGenus,
          speciesByRealm,
          speciesByBiome,
          speciesByBioregion,
          marineSpeciesCount,
          terrestrialSpeciesCount,
          freshwaterSpeciesCount,
          aquaticSpeciesCount,
          speciesByIucnStatus,
          cluesByCategory,
          favoriteClueCategory,
          firstDiscoveryAt,
          lastDiscoveryAt,
          updatedAt: new Date(),
        },
      });

    return true;
  } catch (err) {
    console.error('Failed to refresh player stats:', err);
    return false;
  }
}
