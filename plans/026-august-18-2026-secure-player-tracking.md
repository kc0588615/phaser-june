# Plan 026 — August 18, 2026: Make player tracking stateless and owner-scoped

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before continuing. If a
> STOP condition occurs, stop and report; do not improvise. When done, update
> this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 6fd038ee..HEAD -- src/pages/api/player/track.ts src/lib/playerTracking.ts src/game/scenes/Game.ts src/db/schema/player.ts tests/lib/playerTrackingSecurity.test.ts`
> If `track.ts` or `playerTracking.ts` changed, compare the live code with the
> excerpts below. Material mismatch is a STOP condition.

## Status

- **Priority**: P0
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security, bug
- **Planned at**: commit `6fd038ee`, 2026-08-18
- **Reviewed**: Grok tmux pane, 2026-08-18; simplification feedback incorporated

## Why this matters

`POST /api/player/track` authenticates a Clerk user, but three session mutation
calls discard the resolved player ID and update by client-supplied `sessionId`
alone. The service also stores one `currentSession` and one debounce timer at
module scope. A warm Vercel process can serve multiple players, so this state
can cross requests; a delayed write can also be frozen after the response.
Make every request stateless and every session mutation owner-scoped.

## Current state

- `src/pages/api/player/track.ts:38-47,75-78` resolves
  `profile.userId`, but calls session functions without it:

  ```ts
  await pt.updateSessionProgress(sessionId, moves, score, speciesDiscovered, cluesUnlocked);
  await pt.forceSessionUpdate(sessionId, moves, score, speciesDiscovered, cluesUnlocked);
  await pt.endGameSession(sessionId, finalMoves, finalScore);
  ```

- `src/lib/playerTracking.ts:49-62` defines process-global request state:

  ```ts
  interface SessionState { /* ... */ }
  let currentSession: SessionState | null = null;
  let sessionUpdateTimer: NodeJS.Timeout | null = null;
  const SESSION_UPDATE_DEBOUNCE = 10000;
  ```

- `src/lib/playerTracking.ts:206-217` schedules work after the HTTP request and
  filters only by session ID:

  ```ts
  sessionUpdateTimer = setTimeout(async () => {
    // ...
    await db.update(playerGameSessions)
      .set({ /* counters */ })
      .where(eq(playerGameSessions.id, sessionId));
  }, SESSION_UPDATE_DEBOUNCE);
  ```

- `src/lib/playerTracking.ts:273-349` accepts a client-provided `discoveryId`
  and otherwise remembers pending clue IDs in `currentSession`.
- `src/lib/playerTracking.ts:385-428` falls back to `currentSession?.id` and
  links pending clue IDs without a player/species predicate.
- `src/db/schema/player.ts:27-45` gives every game session both an `id` and
  `playerId`; no schema change is required.
- `src/game/scenes/Game.ts` already keeps `currentSessionId` client-side and
  sends it in each request. `Game.ts:798-819` already performs the 10-second
  debounce on the client, so the server can write immediately without
  increasing normal request frequency. Preserve request and response shapes.
- Auth/ownership exemplar: `src/app/api/runs/[runId]/route.ts:10-17` resolves
  the player, loads the resource, then rejects a mismatched owner.
- Repo rule: all database/external calls stay inside `try/catch`; use `@/`
  imports; prefer the smallest fix.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Focused test | `npm test -- --test-name-pattern="player tracking security"` | new tests pass |
| All tests | `npm test` | all test entry files pass |
| Build | `npm run build` | exit 0; production build completes |

## Scope

**In scope**:

- `src/pages/api/player/track.ts`
- `src/lib/playerTracking.ts`
- `tests/lib/playerTrackingSecurity.test.ts` (create one small regression file)

**Out of scope**:

- `src/game/scenes/Game.ts` — payloads already contain `sessionId`; do not
  redesign client tracking or add client debounce.
- `src/pages/api/player/start-session.ts` — its existing player ID call is
  already owner-scoped.
- `src/db/schema/player.ts` and all migrations — no schema change.
- Router migration, stats redesign, score anti-cheat, or new validation library.
- Any live database write or migration.

## Git workflow

- Branch: `advisor/026-player-tracking-security`
- One logical commit if asked: `fix player tracking ownership`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Pass the authenticated player ID into every session mutation

In `src/pages/api/player/track.ts`:

1. Pass `profile.userId` as the first argument to `updateSessionProgress`,
   `forceSessionUpdate`, and `endGameSession`.
2. Stop accepting/passing `discoveryId` in `trackClueUnlock`; the client cannot
   safely nominate a discovery row.
3. Make update/end failures explicit: a service return indicating that no
   owned session matched must produce a generic
   `404 { error: 'Session not found' }`. Thrown database failures continue to
   reach the handler catch and return 500.
4. Preserve successful JSON response shapes (`{ ok: true }`, `{ wasNew }`,
   `{ discoveryId }`) so `Game.ts` needs no edits.

**Verify**:

```bash
rg -n "updateSessionProgress\(profile\.userId|forceSessionUpdate\(profile\.userId|endGameSession\(profile\.userId" src/pages/api/player/track.ts
```

Expected: three matches. `rg -n "discoveryId.*params" src/pages/api/player/track.ts`
must return no matches.

### Step 2: Remove process-global request/session state

In `src/lib/playerTracking.ts`:

1. Delete `SessionState`, `currentSession`, `sessionUpdateTimer`, and
   `SESSION_UPDATE_DEBOUNCE`.
2. `startGameSession(playerId)` should only find/create and return a session ID;
   remove assignments to process-global state.
3. Reconfirm `calculateTimeToDiscover` and `getCurrentSessionId` have no callers,
   then delete both obsolete accessors because they depend on `currentSession`.
4. Replace delayed `updateSessionProgress` with an immediate database update.
   Make `forceSessionUpdate` delegate directly to `updateSessionProgress`; do
   not add a third helper or retain two copies of the query.
5. `updateSessionProgress` must accept `playerId` and use:

   ```ts
   where(and(
     eq(playerGameSessions.id, sessionId),
     eq(playerGameSessions.playerId, playerId),
   ))
   ```

   Use `.returning({ id: playerGameSessions.id })` so callers can distinguish
   no owned row (`false`) from success (`true`). Log and rethrow database errors
   so the route returns 500 rather than a false success.
6. Apply the same player-ID predicate and boolean result to `endGameSession`.
   Refresh stats only after an owned session was actually ended, and await that
   refresh before returning; do not leave DB work floating after the response.

**Verify**:

```bash
rg -n "currentSession|sessionUpdateTimer|SESSION_UPDATE_DEBOUNCE|setTimeout" src/lib/playerTracking.ts
```

Expected: no matches.

```bash
rg -n "eq\(playerGameSessions\.playerId, playerId\)" src/lib/playerTracking.ts
```

Expected: owner predicates in start/resume, progress update, session end, and
discovery session validation.

### Step 3: Link clues without in-memory pending IDs

In `src/lib/playerTracking.ts`:

1. Remove `discoveryId` from `trackClueUnlock` and delete its client-directed
   conflict-update branch. Keep the existing idempotent insert/fetch behavior.
2. In `trackSpeciesDiscovery`, use only `options.sessionId ?? null`; never fall
   back to module state.
3. Inside the existing transaction, when a session ID is present, verify a row
   exists for both that ID and `playerId`. If it does not, set the discovery's
   session ID to `null` and continue. Do not reject or lose a valid discovery
   merely because the client held a stale/foreign session ID; only prevent that
   foreign key from being persisted. The route must still return HTTP 200 with
   `{ discoveryId }` after the successful unowned-session fallback.
4. After the discovery upsert, link previously unlocked clues with one update:

   ```ts
   where(and(
     eq(playerClueUnlocks.playerId, playerId),
     eq(playerClueUnlocks.speciesId, speciesId),
     isNull(playerClueUnlocks.discoveryId),
   ))
   ```

   This replaces `pendingClueIds`; do not add a new cache, session map, queue,
   column, or migration.
5. Preserve the current unique constraint behavior and stats refresh.
   Await the existing refresh before returning the discovery result. Log and
   rethrow DB failures so the route returns 500.

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Add one small structural regression test file

Create `tests/lib/playerTrackingSecurity.test.ts` using `node:test`,
`node:assert/strict`, and `readFileSync`. Keep it to two named tests:

1. `player tracking security has no process-global session or delayed timer` —
   assert `playerTracking.ts` contains none of the four removed state/timer
   identifiers or the two obsolete state accessor names.
2. `player tracking security scopes mutations to authenticated player` — assert
   the route passes `profile.userId` to the three session calls and the service
   includes the session `playerId` predicate, nulls an unowned discovery session
   ID, and includes the player/species clue predicate.

This intentionally avoids a mock framework or database harness. Do not add more
tests in this plan.

**Verify**:
`npm test -- --test-name-pattern="player tracking security"` → both tests pass.

### Step 5: Run existing gates once

Run `npm test`, then `npm run build`.

**Verify**: both exit 0. `git status --short` lists only the three in-scope
paths plus the operator-owned `plans/README.md` status update.

## Test plan

- Exactly one new test file, two structural regression tests.
- Existing suite once after implementation.
- Production build once; no browser automation or database test harness.

## Done criteria

- [ ] No process-global session object, pending clue list, or debounce timer.
- [ ] Obsolete `calculateTimeToDiscover` and `getCurrentSessionId` exports gone.
- [ ] Every session update/end uses both session ID and authenticated player ID.
- [ ] Client-provided `discoveryId` is ignored/removed.
- [ ] Discovery session ownership is checked; unowned IDs become null without
      dropping the discovery.
- [ ] Pending clues link by player + species + null discovery.
- [ ] Focused tests, full tests, typecheck, and build pass.
- [ ] No schema, migration, Game scene, or router changes.
- [ ] `plans/README.md` row updated.

## STOP conditions

Stop and report if:

- `Game.ts` no longer sends `sessionId` for all three session actions.
- Correct behavior requires a new DB column or migration.
- Owner-scoped `.returning()` is unavailable with the installed Drizzle API.
- More than the one small regression file seems necessary to gain confidence.
- An in-scope file drifted materially from the excerpts.

## Maintenance notes

- Vercel request handlers must remain stateless. Do not reintroduce module-level
  player/session state, delayed server timers, or floating DB refresh promises.
- Reviewer should inspect every session mutation predicate, not just route auth.
- Client-side rate limiting/debounce can be considered only if immediate writes
  become measured load; it is not part of this fix.
