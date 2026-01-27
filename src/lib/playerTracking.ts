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
let icaaView: any;
let ensureIcaaViewReady: any;
let eq: any, and: any, isNull: any, desc: any, inArray: any, count: any, sum: any, sql: any;

async function ensureServerDeps() {
  if (!isServer) return false;
  if (!db) {
    const drizzleOps = await import('drizzle-orm');
    eq = drizzleOps.eq;
    and = drizzleOps.and;
    isNull = drizzleOps.isNull;
    desc = drizzleOps.desc;
    inArray = drizzleOps.inArray;
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
    icaaView = dbModule.icaaView;
    ensureIcaaViewReady = dbModule.ensureIcaaViewReady;
  }
  return true;
}

// Session tracking
interface SessionState {
  id: string;
  playerId: string;
  startTime: number;
  speciesStartTime: number; // Reset per species for time-to-discover
  pendingClueIds: string[]; // Clue IDs waiting for discovery_id
}

let currentSession: SessionState | null = null;

// Debounce timer for session updates
let sessionUpdateTimer: NodeJS.Timeout | null = null;
const SESSION_UPDATE_DEBOUNCE = 10000; // 10 seconds

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
      // Resume existing session
      currentSession = {
        id: existingSession.id,
        playerId,
        startTime: existingSession.startedAt
          ? new Date(existingSession.startedAt).getTime()
          : Date.now(),
        speciesStartTime: Date.now(),
        pendingClueIds: [],
      };
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

    currentSession = {
      id: session.id,
      playerId,
      startTime: Date.now(),
      speciesStartTime: Date.now(),
      pendingClueIds: [],
    };

    return session.id;
  } catch (err) {
    console.error('Failed to start game session:', err);
    return null;
  }
}

/**
 * End the current game session
 */
export async function endGameSession(
  sessionId: string,
  finalMoves: number,
  finalScore: number
): Promise<void> {
  if (!(await ensureServerDeps())) return; // Client-side no-op

  const playerId = currentSession?.playerId;
  let resolvedPlayerId = playerId;

  // DB fallback if session state missing (do not queue on lookup failure)
  if (!resolvedPlayerId) {
    try {
      const rows = await db
        .select({ playerId: playerGameSessions.playerId })
        .from(playerGameSessions)
        .where(eq(playerGameSessions.id, sessionId))
        .limit(1);
      resolvedPlayerId = rows[0]?.playerId ?? null;
    } catch (err) {
      console.error('Failed to resolve playerId for session end:', err);
    }
  }

  try {
    await db
      .update(playerGameSessions)
      .set({
        endedAt: new Date(),
        totalMoves: finalMoves,
        totalScore: finalScore,
      })
      .where(eq(playerGameSessions.id, sessionId));

    currentSession = null;

    // Clear debounce timer
    if (sessionUpdateTimer) {
      clearTimeout(sessionUpdateTimer);
      sessionUpdateTimer = null;
    }

    // Refresh stats on session end (non-blocking)
    if (resolvedPlayerId) {
      refreshPlayerStats(resolvedPlayerId).catch((err) => {
        console.error('Failed to refresh player stats on session end:', err);
      });
    }
  } catch (err) {
    console.error('Failed to end game session:', err);
  }
}

/**
 * Update session progress (DEBOUNCED)
 * Batches rapid updates to reduce database load
 */
export async function updateSessionProgress(
  sessionId: string,
  moves: number,
  score: number,
  speciesDiscovered: number,
  cluesUnlocked: number
): Promise<void> {
  if (!isServer) return; // Client-side no-op

  // Clear existing timer
  if (sessionUpdateTimer) {
    clearTimeout(sessionUpdateTimer);
  }

  // Debounce: wait 10 seconds before writing
  sessionUpdateTimer = setTimeout(async () => {
    if (!(await ensureServerDeps())) return;
    try {
      await db
        .update(playerGameSessions)
        .set({
          totalMoves: moves,
          totalScore: score,
          speciesDiscoveredInSession: speciesDiscovered,
          cluesUnlockedInSession: cluesUnlocked,
        })
        .where(eq(playerGameSessions.id, sessionId));
    } catch (err) {
      console.error('Failed to update session progress:', err);
    }
  }, SESSION_UPDATE_DEBOUNCE);
}

/**
 * Force immediate session update (for critical events like species discovery)
 */
export async function forceSessionUpdate(
  sessionId: string,
  moves: number,
  score: number,
  speciesDiscovered: number,
  cluesUnlocked: number
): Promise<void> {
  if (!(await ensureServerDeps())) return; // Client-side no-op

  if (sessionUpdateTimer) {
    clearTimeout(sessionUpdateTimer);
    sessionUpdateTimer = null;
  }

  try {
    await db
      .update(playerGameSessions)
      .set({
        totalMoves: moves,
        totalScore: score,
        speciesDiscoveredInSession: speciesDiscovered,
        cluesUnlockedInSession: cluesUnlocked,
      })
      .where(eq(playerGameSessions.id, sessionId));
  } catch (err) {
    console.error('Failed to force session update:', err);
  }
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
  clueValue: string | null = null,
  discoveryId: string | null = null
): Promise<boolean | null> {
  if (!(await ensureServerDeps())) return null; // Client-side no-op

  try {
    let clue: { id: string; unlockedAt: Date | null };

    if (discoveryId) {
      // If discoveryId provided, use onConflictDoUpdate to link it
      const result = await db
        .insert(playerClueUnlocks)
        .values({
          playerId,
          speciesId,
          discoveryId,
          clueCategory,
          clueField,
          clueValue,
        })
        .onConflictDoUpdate({
          target: [
            playerClueUnlocks.playerId,
            playerClueUnlocks.speciesId,
            playerClueUnlocks.clueCategory,
            playerClueUnlocks.clueField,
          ],
          set: { discoveryId },
        })
        .returning({
          id: playerClueUnlocks.id,
          unlockedAt: playerClueUnlocks.unlockedAt,
        });
      clue = result[0];
    } else {
      // No discoveryId - use onConflictDoNothing, then fetch existing if needed
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
        // Insert succeeded (new clue)
        clue = result[0];
      } else {
        // Conflict - fetch existing clue
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
    }

    // Store clue ID for later discovery_id linking
    if (!discoveryId && currentSession) {
      currentSession.pendingClueIds.push(clue.id);
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
 * Links all pending clues to this discovery
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
  }
): Promise<string | null> {
  if (!(await ensureServerDeps())) return null; // Client-side no-op

  try {
    const sessionId = options.sessionId || currentSession?.id || null;
    const pendingClueIds = currentSession?.pendingClueIds || [];

    // Use transaction for atomic operation
    const result = await db.transaction(async (tx: any) => {
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
        })
        .onConflictDoUpdate({
          target: [playerSpeciesDiscoveries.playerId, playerSpeciesDiscoveries.speciesId],
          set: {
            // If already discovered, update score
            scoreEarned: options.scoreEarned,
          },
        })
        .returning({ id: playerSpeciesDiscoveries.id });

      const discovery = discoveryResult[0];

      // Link pending clues to this discovery
      if (pendingClueIds.length > 0) {
        await tx
          .update(playerClueUnlocks)
          .set({ discoveryId: discovery.id })
          .where(
            and(
              inArray(playerClueUnlocks.id, pendingClueIds),
              isNull(playerClueUnlocks.discoveryId)
            )
          );
      }

      return discovery;
    });

    // Clear pending clues
    if (currentSession) {
      currentSession.pendingClueIds = [];
      currentSession.speciesStartTime = Date.now();
    }

    // Update localStorage for offline support
    if (typeof window !== 'undefined') {
      updateLocalStorageDiscovery(speciesId);
    }

    // Refresh player_stats asynchronously (don't block return)
    refreshPlayerStats(playerId).catch((err) => {
      console.error('Failed to refresh player stats after discovery:', err);
    });

    return result.id;
  } catch (err) {
    console.error('Failed to track species discovery:', err);
    return null;
  }
}

/**
 * Calculate time to discover in seconds (per species)
 */
export function calculateTimeToDiscover(): number | null {
  if (!currentSession) return null;
  return Math.floor((Date.now() - currentSession.speciesStartTime) / 1000);
}

/**
 * Get current session ID
 */
export function getCurrentSessionId(): string | null {
  return currentSession?.id || null;
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
        discoveredAt: new Date().toISOString(),
      });
      localStorage.setItem('discoveredSpecies', JSON.stringify(discovered));
      window.dispatchEvent(new Event('species-discovered'));
    }
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

  await ensureIcaaViewReady();

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
        taxonOrder: icaaView.taxonOrder,
        family: icaaView.family,
        genus: icaaView.genus,
        realm: icaaView.realm,
        biome: icaaView.biome,
        bioregion: icaaView.bioregion,
        marine: icaaView.marine,
        terrestrial: icaaView.terrestrial,
        freshwater: icaaView.freshwater,
        aquatic: icaaView.aquatic,
        conservationCode: icaaView.conservationCode,
      })
      .from(playerSpeciesDiscoveries)
      .leftJoin(icaaView, eq(playerSpeciesDiscoveries.speciesId, icaaView.ogcFid))
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
      if (d.aquatic) aquaticSpeciesCount++;
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
