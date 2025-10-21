# Player Tracking Integration Plan - REVISED

## Issues Found by Codex Review

### Critical Bugs
1. ❌ **Wrong property references** - Plan referenced non-existent properties (`this.currentSpeciesId`, `this.guessedSpecies`, `this.score`)
2. ❌ **Memory leaks** - Inline arrow functions have no stable reference for `EventBus.off()`
3. ❌ **Performance issues** - Calling `supabaseBrowser()` and `getUser()` in every event listener
4. ❌ **Missing session cleanup** - No `endGameSession()` call, leaving sessions open indefinitely
5. ❌ **Migration service broken** - References undefined `supabase` variable, no SSR guards
6. ❌ **Data loss risk** - 10s debounce without unload hook will drop final updates
7. ❌ **Set treated as array** - `this.revealedClues.length` fails (it's a Set)

---

## Revised Implementation

### Step 1: Add Player Tracking State to Game.ts

```typescript
// Add to Game.ts class properties (around line 95)

// --- Player Tracking ---
private supabaseClient: any | null = null; // Cache client
private currentUserId: string | null = null; // Cache user ID
private currentSessionId: string | null = null; // Active session
private clueCountThisSpecies: number = 0; // Track clues for current species
private incorrectGuessesThisSpecies: number = 0; // Track wrong guesses
private speciesStartTime: number = 0; // Time when species started

// Event handler references (for proper cleanup)
private handleClueRevealed = this.onClueRevealed.bind(this);
private handleHudUpdate = this.onHudUpdate.bind(this);
private handleBeforeUnload = this.onBeforeUnload.bind(this);
```

### Step 2: Initialize Tracking in create()

```typescript
// In create() method, after line 351

async create() {
  // ... existing code ...

  EventBus.emit('current-scene-ready', this);

  // Initialize player tracking
  await this.initializePlayerTracking();

  console.log("Game Scene: Create method finished. Waiting for Cesium data.");
}

private async initializePlayerTracking(): Promise<void> {
  try {
    // Import at top of file
    const { supabaseBrowser } = await import('@/lib/supabase-browser');
    const {
      startGameSession,
      getCurrentSessionId
    } = await import('@/lib/playerTracking');

    // Cache Supabase client (reuse for all calls)
    this.supabaseClient = supabaseBrowser();

    // Get current user and cache ID
    const { data: { user } } = await this.supabaseClient.auth.getUser();
    if (user) {
      this.currentUserId = user.id;

      // Start or resume session
      const sessionId = await startGameSession(user.id);
      this.currentSessionId = sessionId;

      console.log('Player tracking initialized:', { userId: user.id, sessionId });
    } else {
      console.log('Guest user - tracking disabled');
    }

    // Register EventBus listeners (method references, not arrows)
    EventBus.on('clue-revealed', this.handleClueRevealed, this);
    EventBus.on(EVT_GAME_HUD_UPDATED, this.handleHudUpdate, this);

    // Register beforeunload handler (flush session on page close)
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

  } catch (error) {
    console.error('Failed to initialize player tracking:', error);
  }
}
```

### Step 3: Add Event Handler Methods

```typescript
// Add these methods to Game class

private async onClueRevealed(payload: CluePayload): Promise<void> {
  if (!this.currentUserId || !this.selectedSpecies) return;

  try {
    const { trackClueUnlock } = await import('@/lib/playerTracking');

    const wasNew = await trackClueUnlock(
      this.currentUserId,
      this.selectedSpecies.ogc_fid,
      payload.category,
      payload.field,
      payload.value,
      null // discovery_id will be linked later
    );

    if (wasNew) {
      this.clueCountThisSpecies++;
    }
  } catch (error) {
    console.error('Failed to track clue unlock:', error);
  }
}

private async onHudUpdate(data: EventPayloads['game-hud-updated']): Promise<void> {
  if (!this.currentSessionId || !this.backendPuzzle) return;

  try {
    const { updateSessionProgress } = await import('@/lib/playerTracking');

    // Count total species discovered in this session
    const speciesDiscovered = this.currentSpeciesIndex; // Species completed before current

    // Count total clues unlocked in session (all categories revealed)
    const cluesUnlocked = this.revealedClues.size;

    // Debounced update (10s delay, auto-batched)
    await updateSessionProgress(
      this.currentSessionId,
      data.movesUsed,
      data.score,
      speciesDiscovered,
      cluesUnlocked
    );
  } catch (error) {
    console.error('Failed to update session progress:', error);
  }
}

private async onBeforeUnload(): Promise<void> {
  if (!this.currentSessionId || !this.backendPuzzle) return;

  try {
    const { forceSessionUpdate } = await import('@/lib/playerTracking');

    // Force immediate flush (bypass debounce)
    await forceSessionUpdate(
      this.currentSessionId,
      this.backendPuzzle.getMovesUsed(),
      this.backendPuzzle.getScore(),
      this.currentSpeciesIndex,
      this.revealedClues.size
    );
  } catch (error) {
    console.error('Failed to flush session on unload:', error);
  }
}
```

### Step 4: Track Species Discovery in handleSpeciesGuess()

```typescript
// Modify existing handleSpeciesGuess() method (find it around line 1300-1400)

private async handleSpeciesGuess(data: { speciesId: number; isCorrect: boolean }): Promise<void> {
  if (!this.selectedSpecies) return;

  if (data.isCorrect && data.speciesId === this.selectedSpecies.ogc_fid) {
    console.log(`Correct guess for ${this.selectedSpecies.comm_name}`);

    // Track discovery if authenticated
    if (this.currentUserId && this.backendPuzzle) {
      await this.trackDiscovery(data.speciesId);
    }

    // ... rest of existing code (advance species, etc.)
  } else {
    // Wrong guess
    this.incorrectGuessesThisSpecies++;
  }
}

private async trackDiscovery(speciesId: number): Promise<void> {
  try {
    const {
      trackSpeciesDiscovery,
      calculateTimeToDiscover,
      forceSessionUpdate
    } = await import('@/lib/playerTracking');

    const timeToDiscover = calculateTimeToDiscover();

    const discoveryId = await trackSpeciesDiscovery(
      this.currentUserId!,
      speciesId,
      {
        sessionId: this.currentSessionId || undefined,
        timeToDiscoverSeconds: timeToDiscover || undefined,
        cluesUnlockedBeforeGuess: this.clueCountThisSpecies,
        incorrectGuessesCount: this.incorrectGuessesThisSpecies,
        scoreEarned: this.backendPuzzle!.getScore()
      }
    );

    if (discoveryId) {
      console.log('Species discovery tracked:', discoveryId);

      // Force immediate session update (critical event)
      if (this.currentSessionId) {
        await forceSessionUpdate(
          this.currentSessionId,
          this.backendPuzzle!.getMovesUsed(),
          this.backendPuzzle!.getScore(),
          this.currentSpeciesIndex + 1, // +1 because we just discovered one
          this.revealedClues.size
        );
      }
    }

    // Reset per-species counters
    this.clueCountThisSpecies = 0;
    this.incorrectGuessesThisSpecies = 0;
    this.speciesStartTime = Date.now();

  } catch (error) {
    console.error('Failed to track species discovery:', error);
  }
}
```

### Step 5: Reset Counters When Starting New Species

```typescript
// In initializeBoardFromCesium() and advanceToNextSpecies()

private initializeBoardFromCesium(data: {...}): void {
  // ... existing code ...

  // Reset species tracking counters
  this.clueCountThisSpecies = 0;
  this.incorrectGuessesThisSpecies = 0;
  this.speciesStartTime = Date.now();

  // ... rest of existing code
}

private advanceToNextSpecies(): void {
  // ... existing code ...

  // Reset counters for new species
  this.clueCountThisSpecies = 0;
  this.incorrectGuessesThisSpecies = 0;
  this.speciesStartTime = Date.now();

  // ... rest of existing code
}
```

### Step 6: Clean Up in shutdown()

```typescript
// Modify existing shutdown() method (around line 1522)

shutdown(): void {
  console.log("Game Scene: Shutting down...");

  // End session if active
  if (this.currentSessionId && this.backendPuzzle) {
    this.endSessionSync();
  }

  // Remove EventBus listeners (use cached method references)
  EventBus.off('cesium-location-selected', this.initializeBoardFromCesium, this);
  EventBus.off('species-guess-submitted', this.handleSpeciesGuess, this);
  EventBus.off(EVT_GAME_RESTART, this.handleRestart, this);
  EventBus.off('clue-revealed', this.handleClueRevealed, this);
  EventBus.off(EVT_GAME_HUD_UPDATED, this.handleHudUpdate, this);

  // Remove beforeunload handler
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  // ... rest of existing shutdown code

  // Clear tracking state
  this.supabaseClient = null;
  this.currentUserId = null;
  this.currentSessionId = null;
  this.clueCountThisSpecies = 0;
  this.incorrectGuessesThisSpecies = 0;
  this.speciesStartTime = 0;
}

private endSessionSync(): void {
  // Fire-and-forget session end (don't await in shutdown)
  import('@/lib/playerTracking').then(({ endGameSession }) => {
    if (this.currentSessionId && this.backendPuzzle) {
      endGameSession(
        this.currentSessionId,
        this.backendPuzzle.getMovesUsed(),
        this.backendPuzzle.getScore()
      ).catch(error => {
        console.error('Failed to end session:', error);
      });
    }
  });
}
```

---

## Step 7: Create localStorage Migration Service

```typescript
// Create src/services/discoveryMigrationService.ts

import { supabaseBrowser } from '@/lib/supabase-browser';

export class DiscoveryMigrationService {
  /**
   * Migrate localStorage discoveries to database on first login
   * Call this after successful authentication
   */
  static async migrateLocalDiscoveries(userId: string): Promise<void> {
    // SSR safety guard
    if (typeof window === 'undefined') return;

    try {
      // Check if already migrated
      const migrationFlag = localStorage.getItem('discoveries_migrated');
      if (migrationFlag === 'true') {
        console.log('Discoveries already migrated, skipping');
        return;
      }

      // Get local discoveries
      const localStorageData = localStorage.getItem('discoveredSpecies');
      if (!localStorageData) {
        console.log('No local discoveries to migrate');
        localStorage.setItem('discoveries_migrated', 'true');
        return;
      }

      const localDiscoveries = JSON.parse(localStorageData);
      if (!Array.isArray(localDiscoveries) || localDiscoveries.length === 0) {
        console.log('No valid local discoveries to migrate');
        localStorage.setItem('discoveries_migrated', 'true');
        return;
      }

      console.log(`Migrating ${localDiscoveries.length} local discoveries...`);

      // Prepare batch insert
      const discoveries = localDiscoveries.map((d: any) => ({
        user_id: userId,
        species_id: d.id,
        discovered_at: d.discoveredAt || new Date().toISOString(),
        clues_unlocked_before_guess: 0, // Unknown for migrated data
        incorrect_guesses_count: 0,      // Unknown for migrated data
        score_earned: 0                   // Unknown for migrated data
      }));

      // Create Supabase client
      const supabase = supabaseBrowser();

      // Insert to database (UPSERT to handle duplicates)
      const { error } = await supabase
        .from('player_species_discoveries')
        .upsert(discoveries, {
          onConflict: 'player_id,species_id',
          ignoreDuplicates: true
        });

      if (error) {
        console.error('Migration failed:', error);
        throw error;
      }

      console.log(`Successfully migrated ${localDiscoveries.length} discoveries`);

      // Mark as migrated
      localStorage.setItem('discoveries_migrated', 'true');

      // Optional: Keep localStorage data for backward compatibility
      // Or clear it: localStorage.removeItem('discoveredSpecies');

    } catch (error) {
      console.error('Failed to migrate local discoveries:', error);
      // Don't set migration flag so we can retry
    }
  }

  /**
   * Check if migration is needed (has local data + not yet migrated)
   */
  static needsMigration(): boolean {
    if (typeof window === 'undefined') return false;

    const migrationFlag = localStorage.getItem('discoveries_migrated');
    const localData = localStorage.getItem('discoveredSpecies');

    return migrationFlag !== 'true' && !!localData;
  }
}
```

### Step 8: Trigger Migration After Login

```typescript
// In src/pages/auth/callback.tsx (around line 30, after successful auth)

useEffect(() => {
  const handleCallback = async () => {
    // ... existing PKCE exchange code ...

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Trigger migration if needed
      const { DiscoveryMigrationService } = await import('@/services/discoveryMigrationService');

      if (DiscoveryMigrationService.needsMigration()) {
        console.log('Migrating guest discoveries to database...');
        await DiscoveryMigrationService.migrateLocalDiscoveries(user.id);
      }

      router.push('/');
    }
  };

  handleCallback();
}, [router]);
```

---

## Summary of Fixes

✅ **Memory leaks fixed** - Using method references (`this.handleClueRevealed`) instead of inline arrows
✅ **Performance optimized** - Caching Supabase client and user ID once per scene
✅ **Session lifecycle complete** - Calling `endGameSession()` in shutdown + beforeunload
✅ **Correct property references** - Using `this.selectedSpecies.ogc_fid`, `this.revealedClues.size`, etc.
✅ **Migration service fixed** - Added SSR guards and proper Supabase client creation
✅ **Data loss prevented** - Force flush on critical events (discovery, unload)
✅ **Type safety** - Using Set.size instead of Set.length

## Testing Checklist

- [ ] Test as authenticated user (session created, clues tracked)
- [ ] Test as guest user (no tracking, no errors)
- [ ] Test session resume on page reload
- [ ] Test migration after guest → login flow
- [ ] Test beforeunload session flush
- [ ] Test memory cleanup (no duplicate listeners after scene restart)
- [ ] Test offline queue retry on reconnect
- [ ] Verify leaderboard updates after discoveries
