# Plan 006: Auth-guard /api/discoveries/migrate and /api/player/profile

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c798752..HEAD -- src/app/api/discoveries/migrate/route.ts src/pages/api/player/profile.ts`
> Note: this repo has substantial *uncommitted* work in the working tree; the
> excerpts below were taken from the working tree on 2026-06-11, not from the
> commit. Compare excerpts against live code; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c798752`, 2026-06-11

## Why this matters

Two endpoints accept a client-supplied user identity with no authentication:

1. `POST /api/discoveries/migrate` trusts `userId` from the request body and
   bulk-inserts species-discovery rows for that user. Anyone who knows (or
   intercepts) a player UUID can inject discovery history into any account.
2. `GET /api/player/profile?userId=<uuid>` returns username, stats, playtime,
   and top play locations for any UUID with no auth. The audience of this game
   is grades 6–12 (minors); usernames plus "top locations" is sensitive data
   that should at minimum require a signed-in viewer.

## Current state

- `src/app/api/discoveries/migrate/route.ts` — app-router POST handler.
  Lines 13–23 (working tree):

  ```ts
  export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      const { userId, discoveries } = body;

      if (!userId || !discoveries || !Array.isArray(discoveries)) {
        return NextResponse.json(
          { error: 'Missing userId or discoveries array' },
          { status: 400 }
        );
      }
  ```

  Later (lines 62–69) it inserts rows with `playerId: userId` straight from
  the body. There is NO auth check anywhere in the file.

- `src/pages/api/player/profile.ts` — pages-router GET handler.
  Lines 20–36 (working tree): resolves `req.query.userId` first; only falls
  back to Clerk auth when no query param is given:

  ```ts
  let resolvedUserId = typeof req.query.userId === 'string' ? req.query.userId : null;

  if (!resolvedUserId) {
    const { userId: clerkUserId } = getAuth(req);
    ...
  }
  ```

- Repo auth convention (the exemplar to match): `src/lib/authHelpers.ts`
  exports `getPlayerIdFromClerk(): Promise<string | null>` which calls Clerk's
  `auth()` (app router) and maps `clerkUserId → profiles.userId`. App-router
  routes such as `src/app/api/runs/[runId]/route.ts` call it and compare
  against the resource's `playerId` (see its lines ~45–47).

- Known callers (must keep working):
  - migrate: `src/services/discoveryMigrationService.ts:38` and
    `src/hooks/useAuthBridge.ts:33` — both client-side, same-origin `fetch`
    after sign-in, so Clerk session cookies are present. Both send
    `{ userId, discoveries }` in the body.
  - profile: `src/components/ProfileContent.tsx:197–199`. When the `userId`
    prop is set (public viewer page `src/pages/stats.tsx:27`,
    `/stats?userId=<uuid>`) it calls `?userId=`; otherwise it calls the
    bare endpoint for the signed-in user's own profile.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Typecheck | `npm run typecheck` | exit 0, no output after the tsc banner |

(No test runner exists yet — plan 008 adds one. Verification here is
typecheck + code inspection.)

## Scope

**In scope** (the only files you may modify):
- `src/app/api/discoveries/migrate/route.ts`
- `src/pages/api/player/profile.ts`

**Out of scope** (do NOT touch, even though they look related):
- `src/services/discoveryMigrationService.ts`, `src/hooks/useAuthBridge.ts` —
  callers already send cookies; no client change needed.
- `src/components/ProfileContent.tsx`, `src/pages/stats.tsx` — the viewer page
  keeps working for signed-in users; do not add client-side gating here.
- `src/lib/authHelpers.ts` — use it, don't change it.
- All other API routes.

## Git workflow

- Repo commits directly to `main` with short lowercase messages (e.g.
  "changed screen layout"). Make one commit only if the operator asks;
  otherwise leave changes uncommitted like the rest of the working tree.

## Steps

### Step 1: Require auth + ownership on the migrate route

In `src/app/api/discoveries/migrate/route.ts`:

1. Add import: `import { getPlayerIdFromClerk } from '@/lib/authHelpers';`
2. At the top of the `try` block in `POST`, before reading the body:

   ```ts
   const playerId = await getPlayerIdFromClerk();
   if (!playerId) {
     return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
   }
   ```

3. After parsing the body, reject identity mismatch:

   ```ts
   if (userId !== playerId) {
     return NextResponse.json({ error: 'Cannot migrate another player\'s discoveries' }, { status: 403 });
   }
   ```

4. Leave the rest of the handler unchanged (it already validates species IDs
   and uses `onConflictDoNothing`).

**Verify**: `npm run typecheck` → exit 0.
**Verify**: `grep -n "getPlayerIdFromClerk" src/app/api/discoveries/migrate/route.ts` → two matches (import + call).

### Step 2: Require a signed-in viewer for profile lookups by userId

In `src/pages/api/player/profile.ts`, restructure the resolution block
(currently lines 20–36) so Clerk auth is checked FIRST and is required in all
cases. This is a pages-router file — keep using `getAuth(req)` from
`@clerk/nextjs/server` (already imported), NOT the app-router `auth()` helper:

```ts
// Viewer must be signed in for any profile lookup.
const { userId: clerkUserId } = getAuth(req);
if (!clerkUserId) {
  return res.status(401).json({ error: 'Sign in required' });
}

let resolvedUserId = typeof req.query.userId === 'string' ? req.query.userId : null;

if (!resolvedUserId) {
  const [p] = await db.select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.clerkUserId, clerkUserId))
    .limit(1);
  resolvedUserId = p?.userId ?? null;
}

if (!resolvedUserId || !UUID_RE.test(resolvedUserId)) {
  return res.status(400).json({ error: 'valid UUID userId required' });
}
```

Behavioral result: own-profile flow unchanged; viewing another player's
profile via `?userId=` now requires the viewer to be signed in (the
`/stats?userId=` page still works for signed-in users; anonymous visitors get
401 and ProfileContent surfaces the error string — acceptable).

**Verify**: `npm run typecheck` → exit 0.
**Verify**: `grep -n "getAuth(req)" src/pages/api/player/profile.ts` → the call appears BEFORE any use of `req.query.userId` (check line numbers).

## Test plan

No test infrastructure exists yet (plan 008 introduces vitest). Manual
verification if a dev server is available (`npm run dev`, port 8080):

- `curl -s -X POST localhost:8080/api/discoveries/migrate -H 'Content-Type: application/json' -d '{"userId":"00000000-0000-4000-8000-000000000000","discoveries":[]}'` → `{"error":"Sign in required"}` with HTTP 401.
- `curl -s "localhost:8080/api/player/profile?userId=00000000-0000-4000-8000-000000000000"` → HTTP 401.

If no dev server can be started, typecheck + code inspection is sufficient.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] Both routes return 401 before any DB write/read when unauthenticated (verified by curl or by reading the control flow)
- [ ] Migrate route returns 403 when body `userId` ≠ authenticated playerId
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- Either file's code no longer matches the excerpts above.
- `getPlayerIdFromClerk` cannot be used in the app-router route (import or
  runtime error) — do not hand-roll a replacement.
- You find evidence that anonymous (signed-out) players are *expected* to call
  the migrate endpoint (e.g. a caller that fires before sign-in) — the fix
  would then need a product decision.

## Maintenance notes

- Any future "claim anonymous progress" feature (see plans/README.md
  direction notes about localStorage↔DB split-brain) must go through this
  authenticated route, not a new open one.
- Reviewer should scrutinize: the 401 must be returned before `request.json()`
  side effects matter little, but before any DB call, definitely.
- Deferred: per-profile visibility settings (public/private flag) — product
  decision, not planned.
