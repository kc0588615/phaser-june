import { supabaseBrowser } from '@/lib/supabase-browser';
import type {
  PlayerGameSession,
  PlayerSpeciesDiscovery,
  PlayerClueUnlock
} from '@/types/database';

/**
 * Player Tracking Service V2
 * Syncs game events to Supabase with offline queue and proper session management
 * Fixes based on Codex review
 */

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
    const supabase = supabaseBrowser();

    // Check for existing open session (prevent duplicates)
    const { data: existingSession } = await supabase
      .from('player_game_sessions')
      .select('*')
      .eq('player_id', playerId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSession) {
      // Resume existing session
      currentSession = {
        id: existingSession.id,
        startTime: new Date(existingSession.started_at).getTime(),
        speciesStartTime: Date.now(),
        pendingClueIds: [],
      };
      return existingSession.id;
    }

    // Create new session
    const { data, error } = await supabase
      .from('player_game_sessions')
      .insert({
        player_id: playerId,
        started_at: new Date().toISOString(),
        total_moves: 0,
        total_score: 0,
        species_discovered_in_session: 0,
        clues_unlocked_in_session: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting game session:', error);
      return null;
    }

    currentSession = {
      id: data.id,
      startTime: Date.now(),
      speciesStartTime: Date.now(),
      pendingClueIds: [],
    };

    return data.id;
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
    const supabase = supabaseBrowser();

    await supabase
      .from('player_game_sessions')
      .update({
        ended_at: new Date().toISOString(),
        total_moves: finalMoves,
        total_score: finalScore,
      })
      .eq('id', sessionId);

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
      const supabase = supabaseBrowser();

      await supabase
        .from('player_game_sessions')
        .update({
          total_moves: moves,
          total_score: score,
          species_discovered_in_session: speciesDiscovered,
          clues_unlocked_in_session: cluesUnlocked,
        })
        .eq('id', sessionId);
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
    const supabase = supabaseBrowser();

    await supabase
      .from('player_game_sessions')
      .update({
        total_moves: moves,
        total_score: score,
        species_discovered_in_session: speciesDiscovered,
        clues_unlocked_in_session: cluesUnlocked,
      })
      .eq('id', sessionId);
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
    const supabase = supabaseBrowser();

    const { data, error } = await supabase
      .from('player_clue_unlocks')
      .insert({
        player_id: playerId,
        species_id: speciesId,
        discovery_id: discoveryId,
        clue_category: clueCategory,
        clue_field: clueField,
        clue_value: clueValue,
      })
      .select()
      .single();

    if (error) {
      // Duplicate key = clue already unlocked
      if (error.message.includes('duplicate key')) {
        return false;
      }

      console.error('Error tracking clue unlock:', error);

      // Queue for retry
      queueWrite('clue', {
        speciesId,
        clueCategory,
        clueField,
        clueValue,
        discoveryId,
      });

      return null;
    }

    // Store clue ID for later discovery_id linking
    if (!discoveryId && currentSession) {
      currentSession.pendingClueIds.push(data.id);
    }

    return true;
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
const UNIQUE_CONSTRAINT_VIOLATION = '23505';

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
    const supabase = supabaseBrowser();

    const payload = {
      player_id: playerId,
      species_id: speciesId,
      session_id: options.sessionId || currentSession?.id || null,
      time_to_discover_seconds: options.timeToDiscoverSeconds,
      clues_unlocked_before_guess: options.cluesUnlockedBeforeGuess,
      incorrect_guesses_count: options.incorrectGuessesCount,
      score_earned: options.scoreEarned,
    };

    type DiscoveryRecord = Pick<PlayerSpeciesDiscovery, 'id' | 'session_id'>;

    const {
      data: inserted,
      error: insertError,
    } = await supabase
      .from('player_species_discoveries')
      .insert(payload)
      .select()
      .single();

    let discovery = inserted as DiscoveryRecord | null;

    if (insertError) {
      if ((insertError as any).code === UNIQUE_CONSTRAINT_VIOLATION) {
        console.info('Species discovery already recorded, using existing entry.', {
          playerId,
          speciesId,
        });

        const {
          data: existing,
          error: fetchError,
        } = await supabase
          .from('player_species_discoveries')
          .select('id, session_id')
          .eq('player_id', playerId)
          .eq('species_id', speciesId)
          .maybeSingle();

        if (fetchError) {
          console.error('Failed to fetch existing species discovery after unique constraint violation.', fetchError);
          queueWrite('discovery', { speciesId, options });
          return null;
        }

        if (!existing) {
          console.warn('Unique constraint violation occurred but existing discovery was not found. Queuing for retry.', {
            playerId,
            speciesId,
          });
          queueWrite('discovery', { speciesId, options });
          return null;
        }

        discovery = existing as DiscoveryRecord;
      } else {
        console.error('Error tracking species discovery:', insertError);
        queueWrite('discovery', { speciesId, options });
        return null;
      }
    }

    if (!discovery) {
      return null;
    }

    // Link pending clues to this discovery
    if (currentSession && currentSession.pendingClueIds.length > 0) {
      await linkCluesToDiscovery(discovery.id, currentSession.pendingClueIds);
      currentSession.pendingClueIds = [];
    }

    // Reset species timer for next species
    if (currentSession) {
      currentSession.speciesStartTime = Date.now();
    }

    // Update localStorage for offline support
    if (typeof window !== 'undefined') {
      updateLocalStorageDiscovery(speciesId);
    }

    return discovery.id;
  } catch (err) {
    console.error('Failed to track species discovery:', err);
    queueWrite('discovery', { speciesId, options });
    return null;
  }
}

/**
 * Link pending clues to a discovery
 */
async function linkCluesToDiscovery(
  discoveryId: string,
  clueIds: string[]
): Promise<void> {
  try {
    const supabase = supabaseBrowser();

    await supabase
      .from('player_clue_unlocks')
      .update({ discovery_id: discoveryId })
      .in('id', clueIds);
  } catch (err) {
    console.error('Failed to link clues to discovery:', err);
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
    const supabase = supabaseBrowser();

    const { count, error } = await supabase
      .from('player_clue_unlocks')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .eq('species_id', speciesId);

    if (error) {
      console.error('Error getting clue count:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Failed to get clue count:', err);
    return 0;
  }
}

// Initialize offline queue on module load
if (typeof window !== 'undefined') {
  loadOfflineQueue();

  // Process queue on visibility change (tab focus)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && offlineQueue.length > 0) {
      // Get current user and process queue
      const supabase = supabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await processOfflineQueue(user.id);
      }
    }
  });
}
