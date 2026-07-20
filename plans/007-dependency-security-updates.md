# Plan 007: Patch vulnerable dependencies (Clerk, drizzle-orm, protobufjs, dompurify, next)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c798752..HEAD -- package.json package-lock.json`
> Also re-run `npm audit --omit=dev` first — if the advisory list differs
> materially from "Current state" below, adjust targets accordingly but keep
> the same constraints (no major bumps except where listed).

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (dependency bumps; auth stack involved)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c798752`, 2026-06-11

## Why this matters

`npm audit --omit=dev` (run 2026-06-11) reports vulnerable production deps,
including the auth stack: `@clerk/nextjs 7.0.0–7.2.3` (middleware route-
protection bypass + authorization bypass advisories), `drizzle-orm <0.45.2`
(SQL-identifier injection), `protobufjs <=7.5.7` (multiple critical
advisories), `dompurify <=3.3.3`, `js-cookie <=3.0.5`, and `next` itself.
This app uses Clerk for auth guards and Drizzle for all DB access, so the
Clerk and Drizzle advisories are directly on the attack surface.

## Current state

- `package.json` (root): `"@clerk/nextjs": "^7.0.8"`, `"drizzle-orm": "^0.44.0"`,
  `"next": "^16.1.0"`, `"swiper": "^11.2.10"`; devDeps include
  `"drizzle-kit": "^0.30.0"`.
- `npm audit --omit=dev` flags (fix available via `npm audit fix` unless noted):
  - `@clerk/backend 3.0.0–3.2.13`, `@clerk/nextjs 7.0.0–7.2.3`,
    `@clerk/react 6.0.0–6.4.2`, `@clerk/shared` (range)
  - `protobufjs <=7.5.7` + `@protobufjs/utf8 <=1.1.0` (transitive)
  - `dompurify <=3.3.3`, `js-cookie <=3.0.5`, `postcss <8.5.10` (transitive under next)
  - `next 9.3.4-canary.0 – 16.3.0-canary.5`
  - `drizzle-orm <0.45.2` — npm says "fix available via `npm audit fix --force`"
    because 0.45.2 is outside the `^0.44.0` range; handle it as an explicit
    version bump instead of `--force`.
  - `swiper` — fix requires major bump to 12.x; **explicitly out of scope**
    (breaking change, 4 importers: DeductionCamp, SpeciesCarousel,
    FamilyCardStack, AlbumHeroSwiper).
- Drizzle compat note: drizzle-kit 0.30.x pairs with drizzle-orm 0.44.x;
  bumping orm to 0.45.x likely requires drizzle-kit ^0.31. Verify with
  `npm info drizzle-kit@latest peerDependencies` before choosing.
- CLAUDE.md says "Avoid network installs (restricted)". If `npm install`
  cannot reach the registry in your environment, that is a STOP condition —
  report instead of retrying.
- DB access goes through `src/db/index.ts` (postgres.js driver, PgBouncer,
  TLS). The Drizzle queries live in `src/lib/speciesQueries.ts` and the API
  routes; none build SQL identifiers from user input (checked 2026-06-11),
  so the drizzle advisory is defense-in-depth, not an active exploit.

## Commands you will need

| Purpose   | Command                                  | Expected on success |
|-----------|------------------------------------------|---------------------|
| Audit     | `npm audit --omit=dev`                   | shrinking advisory list |
| Install   | `npm install <pkg>@<ver>`                | exit 0              |
| Safe fixes| `npm audit fix`                          | exit 0              |
| Typecheck | `npm run typecheck`                      | exit 0              |
| Build     | `npm run build`                          | exit 0 ("Compiled successfully") |

## Scope

**In scope**:
- `package.json`, `package-lock.json`
- Minimal source edits ONLY if a bumped package renamed an API used here
  (record each in your report).

**Out of scope**:
- `swiper` major upgrade (separate decision; record as deferred).
- `wiki/` (separate Docusaurus project with its own lockfile).
- Any `npm audit fix --force`.
- Removing packages (plan 011 handles dead deps — do not duplicate).

## Git workflow

- Short lowercase commit message if asked to commit (repo style: "fixed database").
- Do not push.

## Steps

### Step 1: Baseline

Run `npm audit --omit=dev > /tmp/audit-before.txt` and `npm run typecheck`.

**Verify**: typecheck exit 0 (it passes today — if it doesn't, STOP).

### Step 2: Apply safe semver-compatible fixes

Run `npm audit fix` (NO `--force`). This should resolve Clerk packages,
protobufjs, dompurify, js-cookie, postcss, and next within their ranges.

**Verify**: `npm audit --omit=dev` → Clerk/protobufjs/dompurify advisories gone.
**Verify**: `npm run typecheck` → exit 0.

### Step 3: Bump drizzle-orm + drizzle-kit explicitly

1. Check pairing: `npm info drizzle-orm@0.45.2 peerDependencies` and
   `npm info drizzle-kit versions --json | tail -5`.
2. `npm install drizzle-orm@^0.45.2 && npm install -D drizzle-kit@^0.31.0`
   (adjust kit version to the documented pair for orm 0.45.x).

**Verify**: `npm run typecheck` → exit 0. Drizzle 0.44→0.45 had minor API
changes; if typecheck fails, read the error — small renames are in scope,
schema rewrites are a STOP.
**Verify**: `npm audit --omit=dev` → no drizzle-orm advisory.

### Step 4: Full build

`npm run build` → must compile. This catches Clerk runtime API drift
(middleware/`auth()` signatures) that typecheck can miss in `.next` glue.

**Verify**: exit 0.

### Step 5: Report residue

Diff `/tmp/audit-before.txt` against a fresh `npm audit --omit=dev`. List any
remaining advisories (expected: swiper, possibly some `next` canary-range
noise) in your completion report and in the plans/README.md status cell.

## Test plan

No unit tests exist yet. The build in step 4 is the gate. If a dev server is
available, boot `npm run dev` and load `http://localhost:8080` — page renders,
sign-in widget mounts (Clerk smoke test).

## Done criteria

- [ ] `npm audit --omit=dev` shows no advisories for @clerk/*, drizzle-orm, protobufjs, dompurify, js-cookie
- [ ] `npm run typecheck` exits 0
- [ ] `npm run build` exits 0
- [ ] `git diff package.json` shows only version changes (plus any recorded source renames)
- [ ] `plans/README.md` status row updated, with remaining advisories noted

## STOP conditions

Stop and report back if:

- `npm install`/`npm audit fix` fails with a network/registry error (this
  environment may block installs).
- Typecheck after step 3 shows more than ~10 errors or any error inside
  `src/db/schema/*` (drizzle 0.45 may have changed schema typings — needs a
  human look).
- `npm audit fix` wants to change `next` across a major version.
- Clerk bump changes middleware/proxy behavior (`src/proxy.ts` errors at build).

## Maintenance notes

- Swiper 12 upgrade deferred: prototype-pollution advisory remains until done;
  4 components import swiper.
- After this lands, re-run `npm run db:introspect` next time schema work
  happens, to confirm drizzle-kit 0.31 generates identical types.
- Reviewer: check `package-lock.json` diff for unexpected major bumps.
