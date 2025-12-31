// =============================================================================
// PLAYER TRACKING SERVICE - Prisma Version
// =============================================================================
// Syncs game events to Postgres with offline queue and proper session management.
// Migrated from Supabase client to Prisma.
// =============================================================================

import { prisma } from '@/lib/prisma';

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
  payload: any;
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
function queueWrite(type: QueuedWrite['type'], payload: any): void {
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
            item.payload.speciesId,
            typeof item.payload.clueCategory === 'string'
              ? item.payload.clueCategory
              : String(item.payload.clueCategory ?? 'unknown'),
            typeof item.payload.clueField === 'string' && item.payload.clueField.length > 0
              ? item.payload.clueField
              : 'detail',
            item.payload.clueValue ?? null,
            item.payload.discoveryId ?? null
          );
          break;
        case 'discovery':
          await trackSpeciesDiscovery(playerId, item.payload.speciesId, item.payload.options);
          break;
        case 'session_update':
          await updateSessionProgress(
            item.payload.sessionId,
            item.payload.moves,
            item.payload.score,
            item.payload.speciesDiscovered,
            item.payload.cluesUnlocked
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
    const existingSession = await prisma.playerGameSession.findFirst({
      where: {
        player_id: playerId,
        ended_at: null,
      },
      orderBy: { started_at: 'desc' },
    });

    if (existingSession) {
      // Resume existing session
      currentSession = {
        id: existingSession.id,
        startTime: existingSession.started_at
          ? new Date(existingSession.started_at).getTime()
          : Date.now(),
        speciesStartTime: Date.now(),
        pendingClueIds: [],
      };
      return existingSession.id;
    }

    // Create new session
    const session = await prisma.playerGameSession.create({
      data: {
        player_id: playerId,
        started_at: new Date(),
        total_moves: 0,
        total_score: 0,
        species_discovered_in_session: 0,
        clues_unlocked_in_session: 0,
      },
    });

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
    await prisma.playerGameSession.update({
      where: { id: sessionId },
      data: {
        ended_at: new Date(),
        total_moves: finalMoves,
        total_score: finalScore,
      },
    });

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
      await prisma.playerGameSession.update({
        where: { id: sessionId },
        data: {
          total_moves: moves,
          total_score: score,
          species_discovered_in_session: speciesDiscovered,
          clues_unlocked_in_session: cluesUnlocked,
        },
      });
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
    await prisma.playerGameSession.update({
      where: { id: sessionId },
      data: {
        total_moves: moves,
        total_score: score,
        species_discovered_in_session: speciesDiscovered,
        clues_unlocked_in_session: cluesUnlocked,
      },
    });
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
    // Use upsert to handle duplicates gracefully
    const clue = await prisma.playerClueUnlock.upsert({
      where: {
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
        discovery_id: discoveryId,
        clue_category: clueCategory,
        clue_field: clueField,
        clue_value: clueValue,
      },
      update: {
        // If already exists, just update discovery_id if provided
        ...(discoveryId ? { discovery_id: discoveryId } : {}),
      },
    });

    // Store clue ID for later discovery_id linking
    if (!discoveryId && currentSession) {
      currentSession.pendingClueIds.push(clue.id);
    }

    // Check if this was a create (new) or update (existing)
    // If unlocked_at matches within 1 second, it's likely new
    const isNew = clue.unlocked_at
      ? Date.now() - new Date(clue.unlocked_at).getTime() < 1000
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
    const result = await prisma.$transaction(async (tx) => {
      // Upsert discovery (idempotent)
      const discovery = await tx.playerSpeciesDiscovery.upsert({
        where: {
          player_species_unique: {
            player_id: playerId,
            species_id: speciesId,
          },
        },
        create: {
          player_id: playerId,
          species_id: speciesId,
          session_id: sessionId,
          time_to_discover_seconds: options.timeToDiscoverSeconds,
          clues_unlocked_before_guess: options.cluesUnlockedBeforeGuess,
          incorrect_guesses_count: options.incorrectGuessesCount,
          score_earned: options.scoreEarned,
        },
        update: {
          // If already discovered, update score
          score_earned: options.scoreEarned,
        },
      });

      // Link pending clues to this discovery
      if (pendingClueIds.length > 0) {
        await tx.playerClueUnlock.updateMany({
          where: {
            id: { in: pendingClueIds },
            discovery_id: null,
          },
          data: { discovery_id: discovery.id },
        });
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

    if (!discovered.find((d: any) => d.id === speciesId)) {
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
    const count = await prisma.playerClueUnlock.count({
      where: {
        player_id: playerId,
        species_id: speciesId,
      },
    });
    return count;
  } catch (err) {
    console.error('Failed to get clue count:', err);
    return 0;
  }
}

// Initialize offline queue on module load (browser only)
if (typeof window !== 'undefined') {
  loadOfflineQueue();
}
