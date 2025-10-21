# Player Stats Not Saving - Debugging Logs Added

## Problem
When logged in with a Google account, the game does not save any player data to Supabase. Stats remain blank even after correctly guessing species and unlocking clues.

## Investigation Summary

### Database Schema ✅ VERIFIED
- All required tables exist: `profiles`, `player_game_sessions`, `player_clue_unlocks`, `player_species_discoveries`, `player_stats`
- RLS policies are correctly configured for authenticated users
- Policies allow INSERT/SELECT/UPDATE for matching `player_id = auth.uid()`

### Code Flow Analysis

The current implementation has a potential race condition:

```typescript
// src/game/scenes/Game.ts:402-456
private async initializePlayerTracking(): Promise<void> {
    // Get user
    const { data: { user } } = await this.supabaseClient.auth.getUser();

    if (user) {
        this.currentUserId = user.id;  // Set user ID

        // Start session (async)
        const sessionId = await startGameSession(user.id);
        this.currentSessionId = sessionId;

        // Process offline queue (async)
        await processOfflineQueue(user.id);

        // ONLY NOW register listeners
        EventBus.on('clue-revealed', this.handleClueRevealed, this);
        EventBus.on(EVT_GAME_HUD_UPDATED, this.handleHudUpdate, this);
    }
}
```

**Potential Issues:**
1. `clue-revealed` events might fire BEFORE listeners are registered
2. If `initializePlayerTracking()` takes time, user can start playing before tracking is ready
3. EventBus listeners are only registered if `user` exists at init time
4. No fallback if auth state changes after initialization

### Logging Added

#### 1. Auth Initialization Logging (`Game.ts:414-418, 423, 429-433, 436, 440, 451`)

```typescript
console.log('🔐 Auth check complete:', {
    authenticated: !!user,
    userId: user?.id,
    email: user?.email
});

// After starting session
console.log('📊 Player tracking initialized:', {
    userId: user.id,
    sessionId,
    mode: 'Supabase'
});

console.log('🎧 Registering EventBus listeners for authenticated tracking');
```

#### 2. Clue Tracking Logging (`Game.ts:609-625, 632-638, 650-656`)

```typescript
private handleClueRevealed = async (payload: CluePayload): Promise<void> => {
    console.log('🔔 handleClueRevealed called:', {
        hasCurrentUserId: !!this.currentUserId,
        currentUserId: this.currentUserId,
        hasSelectedSpecies: !!this.selectedSpecies,
        speciesId: this.selectedSpecies?.ogc_fid,
        category: payload.category,
        clue: payload.clue
    });

    if (!this.currentUserId || !this.selectedSpecies) {
        console.warn('⚠️ Skipping clue tracking:', {
            reason: !this.currentUserId ? 'No currentUserId' : 'No selectedSpecies',
            currentUserId: this.currentUserId,
            selectedSpecies: this.selectedSpecies?.ogc_fid
        });
        return;
    }

    console.log('📝 Calling trackClueUnlock with:', {
        userId: this.currentUserId,
        speciesId: this.selectedSpecies.ogc_fid,
        category: clueCategory,
        field,
        value
    });

    // ... tracking call ...

    if (wasNew) {
        console.log(`✅ New clue tracked! Total for species: ${this.clueCountThisSpecies}`);
    } else if (wasNew === false) {
        console.log('ℹ️ Duplicate clue (already unlocked)');
    } else {
        console.warn('⚠️ trackClueUnlock returned null (error or queued)');
    }
};
```

## Testing Instructions

### Step 1: Clear Browser Data
1. Open DevTools (F12)
2. Go to Application tab
3. Clear all localStorage
4. Clear all cookies
5. Close and reopen browser

### Step 2: Sign In and Monitor Console
1. Sign in with Google account
2. Open browser console (F12)
3. Look for these logs in sequence:

**Expected log sequence for WORKING auth:**
```
🔐 Auth check complete: {authenticated: true, userId: "abc-123", email: "user@gmail.com"}
📝 Starting game session for user: abc-123
📊 Player tracking initialized: {userId: "abc-123", sessionId: "xyz-789", mode: "Supabase"}
🔄 Processing offline queue...
🎧 Registering EventBus listeners for authenticated tracking
```

4. Navigate to game and select a location
5. Make first match to reveal a clue
6. **Critical check**: Look for clue tracking logs:

**Expected log for WORKING clue tracking:**
```
🔔 handleClueRevealed called: {hasCurrentUserId: true, currentUserId: "abc-123", hasSelectedSpecies: true, speciesId: 42, category: 1, clue: "Chordata"}
📝 Calling trackClueUnlock with: {userId: "abc-123", speciesId: 42, category: "classification", field: "phylum", value: "Chordata"}
✅ New clue tracked! Total for species: 1
```

**Problem indicators:**
```
🔔 handleClueRevealed called: {hasCurrentUserId: false, currentUserId: null, ...}
⚠️ Skipping clue tracking: {reason: "No currentUserId", currentUserId: null, ...}
```

OR

```
(No 🔔 handleClueRevealed logs at all)
```
This means EventBus listener was never registered!

### Step 3: Check Database
1. Open Supabase dashboard
2. Go to Table Editor
3. Check `player_game_sessions` table → should have 1 row
4. Check `player_clue_unlocks` table → should have rows for each clue
5. Check `player_species_discoveries` table → should have row after correct guess

### Step 4: Report Findings

Please copy and paste the console logs and report:

1. **Did you see "🔐 Auth check complete" log?**
   - Yes/No
   - If yes, what were the values?

2. **Did you see "🎧 Registering EventBus listeners" log?**
   - Yes/No

3. **When you made a match, did you see "🔔 handleClueRevealed called" logs?**
   - Yes/No
   - If yes, what was `hasCurrentUserId`?

4. **Did you see any "⚠️ Skipping clue tracking" warnings?**
   - Yes/No
   - If yes, what was the reason?

5. **Did you see "✅ New clue tracked!" success logs?**
   - Yes/No

6. **Did you see any errors in console?**
   - Copy/paste the error

## Known Issues & Solutions

### Issue 1: EventBus listeners not registered
**Symptom**: No "🔔 handleClueRevealed" logs appear when clues are revealed

**Cause**: `initializePlayerTracking()` failed or user was not authenticated at init time

**Solution**: Check for "🔐 Auth check complete" log and verify `authenticated: true`

### Issue 2: `currentUserId` is null
**Symptom**: "⚠️ Skipping clue tracking: {reason: 'No currentUserId'}"

**Cause**: Auth state cleared or listener fired before `this.currentUserId` was set

**Solution**: Needs code fix to ensure userId is set before listeners fire

### Issue 3: RLS policy rejection
**Symptom**: Console shows SQL errors about "policy violation" or "permission denied"

**Cause**: The `player_id` being inserted doesn't match `auth.uid()`

**Solution**: Check that `this.currentUserId` matches the logged-in user's ID

### Issue 4: Network errors
**Symptom**: Console shows fetch/network errors when calling Supabase

**Cause**: Invalid Supabase URL or API key, or network connectivity issues

**Solution**: Check `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Next Steps

Based on console logs, we can determine:

1. **If auth check completes** → Problem is listener registration or timing
2. **If listeners never register** → `initializePlayerTracking()` failed or user not detected
3. **If listeners register but userId is null** → Race condition between init and clue reveal
4. **If tracking is called but fails** → Database/RLS policy issue

## Files Modified

- `src/game/scenes/Game.ts`
  - Lines 414-418: Auth check logging
  - Lines 423, 429-433, 436, 440, 451: Session initialization logging
  - Lines 609-660: Comprehensive clue tracking logging

---

**Status**: ✅ Debugging logs added, ready for testing
**Action Required**: User needs to test with Google account and report console logs
