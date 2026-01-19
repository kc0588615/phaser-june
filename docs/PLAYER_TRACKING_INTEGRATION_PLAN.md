# Player Tracking Integration Plan (Drizzle)

## Current State

- Tracking service lives in `src/lib/playerTracking.ts` and uses Drizzle + Postgres.
- `src/game/scenes/Game.ts` has tracking hooks, but auth is not configured, so `currentUserId` stays null and writes are skipped.
- Local discovery migration uses `src/services/discoveryMigrationService.ts` and `/api/discoveries/migrate`.

## Integration Steps (when auth is available)

### 1) Provide a Player ID to the Game Scene

- Set `currentUserId` from the auth provider (planned: Clerk).
- Call `startGameSession(currentUserId)` and store `currentSessionId`.

### 2) Wire EventBus Handlers to Drizzle Tracking

- `handleClueRevealed` → `trackClueUnlock(...)`
- `game-hud-updated` → `updateSessionProgress(...)` (debounced)
- `beforeunload` → `forceSessionUpdate(...)`

### 3) Record Discoveries

- On correct guess, call `trackSpeciesDiscovery(...)` with:
  - `sessionId`
  - `cluesUnlockedBeforeGuess`
  - `incorrectGuessesCount`
  - `scoreEarned`
- Reset per-species counters on new species.

### 4) Migrate Local Discoveries After Login

- Call `DiscoveryMigrationService.needsMigration()`.
- If true, run `DiscoveryMigrationService.migrateLocalDiscoveries(userId)`.

### 5) Close the Session

- On scene shutdown or logout, call `endGameSession(...)`.
- Session end triggers a stats refresh so aggregate totals stay current.

## Testing Checklist

- [ ] Authenticated user - session created on game start
- [ ] Authenticated user - clues tracked to database
- [ ] Authenticated user - species discovery tracked with metrics
- [ ] Authenticated user - session ends on page close
- [ ] Guest user - no tracking, no errors
- [ ] Guest user - data remains in localStorage
- [ ] Migration - guest discoveries moved to DB on login
- [ ] Migration - flag prevents duplicate migrations
- [ ] Session resume - existing open session resumed on reload
- [ ] Memory - no duplicate listeners after scene restart
- [ ] Backfill - run `npx tsx scripts/backfill-player-stats.ts` on existing DBs
