// =============================================================================
// PLAYER TRACKING SERVICE - Drizzle Version
// =============================================================================
// Syncs game events to Postgres with proper session management.
// Server-only: imported by API routes and scripts.
// =============================================================================

import { and, desc, eq, isNull } from 'drizzle-orm';
import { db, playerGameSessions, playerSpeciesDiscoveries, playerStats, speciesTable } from '@/db';

/**
 * Start or resume a game session
 * Handles React Strict Mode double-mounting
 */
export async function startGameSession(playerId: string): Promise<string | null> {

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
 * End an owned, still-open game session. Totals are client-reported (free
 * play has no server-side move record), so a session can only be closed once.
 */
export async function endGameSession(
  playerId: string,
  sessionId: string,
  finalMoves: number,
  finalScore: number
): Promise<boolean> {

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
          isNull(playerGameSessions.endedAt),
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

// =============================================================================
// PLAYER STATS REFRESH
// =============================================================================
// Refreshes aggregated player_stats from source tables.
// Called when a session ends and by scripts/backfill-player-stats.ts.
// =============================================================================

/**
 * Uses upsert to create or update the stats row.
 */
export async function refreshPlayerStats(playerId: string): Promise<boolean> {

  try {
    // Get discovery stats with species details
    const discoveries = await db
      .select({
        speciesId: playerSpeciesDiscoveries.speciesId,
        scoreEarned: playerSpeciesDiscoveries.scoreEarned,
        timeToDiscoverSeconds: playerSpeciesDiscoveries.timeToDiscoverSeconds,
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
    const totalScore = discoveries.reduce((sum, d) => sum + (d.scoreEarned || 0), 0);
    const totalMovesMade = sessions.reduce((sum, s) => sum + (s.totalMoves || 0), 0);
    const totalGamesPlayed = sessions.length;

    // Calculate play time
    const totalPlayTimeSeconds = sessions.reduce((sum, s) => {
      if (s.startedAt && s.endedAt) {
        return sum + Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000);
      }
      return sum;
    }, 0);

    // Calculate time stats
    const discoverTimes = discoveries
      .map((d) => d.timeToDiscoverSeconds)
      .filter((t) => t != null) as number[];
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

    // Get first/last discovery timestamps
    const discoveryDates = discoveries
      .map((d) => d.discoveredAt)
      .filter((d) => d != null)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const firstDiscoveryAt = discoveryDates[0] || null;
    const lastDiscoveryAt = discoveryDates[discoveryDates.length - 1] || null;

    // Upsert player_stats
    await db
      .insert(playerStats)
      .values({
        playerId,
        totalSpeciesDiscovered,
        totalScore,
        totalMovesMade,
        totalGamesPlayed,
        totalPlayTimeSeconds,
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
        speciesByIucnStatus,
        firstDiscoveryAt,
        lastDiscoveryAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: playerStats.playerId,
        set: {
          totalSpeciesDiscovered,
          totalScore,
          totalMovesMade,
          totalGamesPlayed,
          totalPlayTimeSeconds,
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
          speciesByIucnStatus,
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
