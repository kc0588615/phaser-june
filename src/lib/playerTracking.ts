// =============================================================================
// PLAYER TRACKING SERVICE - Drizzle Version
// =============================================================================
// Syncs game events to Postgres with offline queue and proper session management.
// Migrated from Prisma to Drizzle.
// =============================================================================

import { eq, and, isNull, desc, inArray, count } from 'drizzle-orm';
import { db, playerGameSessions, playerClueUnlocks, playerSpeciesDiscoveries } from '@/db';

// Session tracking
interface SessionState {
  id: string;
  startTime: number;
  speciesStartTime: number; // Reset per species for time-to-discover
  pendingClueIds: string[]; // Clue IDs waiting for discovery_id
}

let currentSession: SessionState | null = null;

// Offline queue for failed writes
interface QueuedWrite {
  type: 'clue' | 'discovery' | 'session_update';
  payload: Record<string, unknown>;
  timestamp: number;
}

const offlineQueue: QueuedWrite[] = [];
const QUEUE_STORAGE_KEY = 'player_tracking_queue';

// Debounce timer for session updates
let sessionUpdateTimer: NodeJS.Timeout | null = null;
const SESSION_UPDATE_DEBOUNCE = 10000; // 10 seconds

/**
 * Load offline queue from localStorage
 */
function loadOfflineQueue(): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) {
      const items = JSON.parse(stored);
      offlineQueue.push(...items);
    }
  } catch (err) {
    console.error('Failed to load offline queue:', err);
  }
}

/**
 * Save offline queue to localStorage
 */
function saveOfflineQueue(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(offlineQueue));
  } catch (err) {
    console.error('Failed to save offline queue:', err);
  }
}

/**
 * Add item to offline queue
 */
function queueWrite(type: QueuedWrite['type'], payload: Record<string, unknown>): void {
  offlineQueue.push({
    type,
    payload,
    timestamp: Date.now(),
  });
  saveOfflineQueue();
}

/**
 * Process offline queue
 * Retry failed writes when connectivity returns
 */
export async function processOfflineQueue(playerId: string): Promise<void> {
  if (offlineQueue.length === 0) return;

  const items = [...offlineQueue];
  offlineQueue.length = 0; // Clear queue

  for (const item of items) {
    try {
      switch (item.type) {
        case 'clue':
          await trackClueUnlock(
            playerId,
            item.payload.speciesId as number,
            typeof item.payload.clueCategory === 'string'
              ? item.payload.clueCategory
              : String(item.payload.clueCategory ?? 'unknown'),
            typeof item.payload.clueField === 'string' && item.payload.clueField.length > 0
              ? item.payload.clueField
              : 'detail',
            (item.payload.clueValue as string | null) ?? null,
            (item.payload.discoveryId as string | null) ?? null
          );
          break;
        case 'discovery':
          await trackSpeciesDiscovery(playerId, item.payload.speciesId as number, item.payload.options as {
            sessionId?: string;
            timeToDiscoverSeconds?: number;
            cluesUnlockedBeforeGuess: number;
            incorrectGuessesCount: number;
            scoreEarned: number;
          });
          break;
        case 'session_update':
          await updateSessionProgress(
            item.payload.sessionId as string,
            item.payload.moves as number,
            item.payload.score as number,
            item.payload.speciesDiscovered as number,
            item.payload.cluesUnlocked as number
          );
          break;
      }
    } catch (err) {
      // Re-queue if still failing
      offlineQueue.push(item);
    }
  }

  saveOfflineQueue();
}

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
      // Resume existing session
      currentSession = {
        id: existingSession.id,
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
  } catch (err) {
    console.error('Failed to end game session:', err);
    queueWrite('session_update', {
      sessionId,
      moves: finalMoves,
      score: finalScore,
      ended: true,
    });
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
  // Clear existing timer
  if (sessionUpdateTimer) {
    clearTimeout(sessionUpdateTimer);
  }

  // Debounce: wait 10 seconds before writing
  sessionUpdateTimer = setTimeout(async () => {
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
      queueWrite('session_update', {
        sessionId,
        moves,
        score,
        speciesDiscovered,
        cluesUnlocked,
      });
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
    queueWrite('session_update', {
      sessionId,
      moves,
      score,
      speciesDiscovered,
      cluesUnlocked,
    });
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
    queueWrite('clue', {
      speciesId,
      clueCategory,
      clueField,
      clueValue,
      discoveryId,
    });
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
  try {
    const sessionId = options.sessionId || currentSession?.id || null;
    const pendingClueIds = currentSession?.pendingClueIds || [];

    // Use transaction for atomic operation
    const result = await db.transaction(async (tx) => {
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

    return result.id;
  } catch (err) {
    console.error('Failed to track species discovery:', err);
    queueWrite('discovery', { speciesId, options });
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

// Initialize offline queue on module load (browser only)
if (typeof window !== 'undefined') {
  loadOfflineQueue();
}
