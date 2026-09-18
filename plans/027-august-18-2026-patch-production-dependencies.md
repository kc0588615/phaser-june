# Plan 027 — August 18, 2026: Patch vulnerable production dependencies

> **Executor instructions**: Follow this plan exactly. Keep upgrades narrow;
> do not refactor working APIs preemptively. Run each verification gate. Stop
> and report on any STOP condition. Update this plan's row in
> `plans/README.md` when done.
>
> **Drift check (run first)**:
> `git diff --stat 6fd038ee..HEAD -- package.json package-lock.json src/proxy.ts src/components/FamilyCardStack.tsx src/components/SpeciesCarousel.tsx src/components/album/AlbumHeroSwiper.tsx`
> Re-run the production audit because advisories are time-sensitive.

## Status

- **Priority**: P0
- **Effort**: S-M
- **Risk**: MED
- **Depends on**: none
- **Category**: security, dependencies
- **Planned at**: commit `6fd038ee`, 2026-08-18
- **Reviewed**: Grok tmux pane, 2026-08-18; simplification feedback incorporated
- **Implemented**: merged as `2ac7de7d`
- **Audit residue**: 4 moderate dev-only `esbuild` findings through
  `drizzle-kit`; force/breaking fix remains out of scope

## Why this matters

`npm audit --omit=dev` reports 12 production vulnerabilities: 4 critical and
8 high. Direct affected packages include Clerk, Next.js, Drizzle ORM, and
Swiper. Patch them without `npm audit fix --force`, schema work, router work,
or broad source changes.

## Current state

- Installed versions from `package-lock.json`:
  - `@clerk/nextjs` 7.0.8
  - `next` 16.1.0
  - `drizzle-orm` 0.44.7
  - `swiper` 11.2.10
- Advisory-safe direct dependency floors verified on 2026-08-18:
  - `@clerk/nextjs` beyond 7.2.3; remain on 7.x (latest verified: 7.7.8)
  - `drizzle-orm` 0.45.2
  - `swiper` 12.1.2
- Next.js advisory-safe floor is 16.1.7. Let `npm audit fix` select a patched
  16.x release; do not require the latest verified release (16.3.1).
- `package.json:48,63,66,72` allows those versions.
- Audit on 2026-08-18 reports:
  - Clerk middleware/auth advisories; patched `@clerk/nextjs` is beyond 7.2.3.
  - Drizzle identifier-injection advisory below 0.45.2.
  - Swiper prototype-pollution advisory GHSA-hmx5-qpq5-p643 is fixed in
    12.1.2. npm proposes 14.1.0 because it is latest, not because v14 is
    required.
  - Next.js and its transitive PostCSS/Sharp advisories; `npm audit fix` reports
    a compatible fix.
- Clerk current docs retain `getAuth(req)` for Pages API routes and
  `clerkMiddleware` for both routers. Do not migrate auth APIs merely because
  versions changed.
- Swiper v11→v12 removes LESS/SCSS. This repo's three importers already use
  only `swiper/css*`, `swiper/react`, and `swiper/modules`; v14's TypeScript
  rewrite and higher browser baseline are unnecessary here.
- No DB schema is changing. A Drizzle package bump must not generate/apply a
  migration or run `db:introspect`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Audit | `npm audit --omit=dev` | targeted advisories absent at end |
| Direct fixes | `npm install @clerk/nextjs@^7.2.4 drizzle-orm@^0.45.2 swiper@^12.1.2` | exit 0 |
| Compatible transitive/Next fix | `npm audit fix` | exit 0; no `--force` |
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test` | all pass |
| Build | `npm run build` | exit 0 |

## Suggested executor toolkit

- Use Context7 current docs if an actual compile error requires checking Clerk,
  Drizzle, Next.js, or Swiper APIs. Do not browse for speculative migrations.
- Official references consulted for this plan:
  - Clerk Pages API `getAuth`: https://clerk.com/docs/reference/nextjs/get-auth
  - Swiper changelog: https://github.com/nolimits4web/swiper/blob/master/CHANGELOG.md
  - Drizzle docs: https://orm.drizzle.team/docs/overview

## Scope

**In scope**:

- `package.json`
- `package-lock.json`
- Only if Swiper's tighter types require it:
  - `src/components/FamilyCardStack.tsx`
  - `src/components/SpeciesCarousel.tsx`
  - `src/components/album/AlbumHeroSwiper.tsx`

**Out of scope**:

- `npm audit fix --force`.
- Wiki dependencies and `wiki/package-lock.json`.
- Drizzle schema files, migrations, database introspection, or live DB writes.
- Router/auth refactors, React major upgrade, or package removals.
- Any Clerk/Next/Drizzle source compatibility edit: STOP and report if one is
  required rather than broadening this plan.

## Git workflow

- Branch: `advisor/027-production-dependency-security`
- One logical commit if asked: `chore patch dependencies`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Capture the live baseline

Run:

```bash
npm audit --omit=dev
npm run typecheck
```

Record only package names, severities, and advisory IDs; never copy secrets or
environment values. If the advisory set no longer includes the four direct
packages above, remove already-fixed work rather than forcing listed versions.

**Verify**: typecheck exits 0.

### Step 2: Raise only the three force-only/direct security floors

Run:

```bash
npm install @clerk/nextjs@^7.2.4 drizzle-orm@^0.45.2 swiper@^12.1.2
```

These are the narrow advisory-safe ranges. Swiper must remain on 12.x; do not
accept npm's v14 suggestion. npm may resolve newer patches within the requested
majors. Their peer ranges accept this repo's React 18.3.1 and Postgres.js 3.4.5.
Inspect `git diff -- package.json package-lock.json`; the three direct versions
and their transitive graph may change, but no unexpected major or other direct
dependency should.

**Verify**:

- `npm run typecheck` exits 0.
- `npm audit --omit=dev` no longer reports Clerk, Drizzle, or Swiper.

### Step 3: Apply npm's compatible Next/transitive fixes

Run `npm audit fix` without `--force`. This lets npm choose the patched Next.js
16.x release allowed by the existing range instead of requiring a specific
latest patch. Inspect the manifest and lockfile. Updated transitives may be
added or removed; do not accept a Next major, removal of a direct dependency
from `package.json`, or an unrelated direct dependency change.

**Verify**: `npm run typecheck` exits 0 and `npm audit --omit=dev` no longer
reports Next.js or its fixable production transitives.

### Step 4: Handle only local Swiper type tightening, if present

Current imports are supported. If typecheck reports a small Swiper-only type
error, make the minimal correction in the three listed components. Do not
redesign carousel behavior or styles. Do not edit source when typecheck passes.

**Verify**:

- `rg -n "swiper/(less|scss)" src` returns no matches.
- `npm run typecheck` exits 0.

### Step 5: Run the gates once and report residue

Run `npm test`, then `npm run build`, then `npm audit --omit=dev`.

**Verify**: tests and build exit 0. Targeted Clerk, Next.js, Drizzle, and Swiper
advisories are absent. List any unrelated residue in the plan status; do not
use `--force` or expand scope.

## Test plan

- No new tests.
- Existing suite once.
- Production build once to catch framework/auth integration drift.
- Optional manual glance at one carousel only if a Swiper source edit was
  necessary; no browser automation.

## Done criteria

- [ ] No audit advisory remains for direct Clerk, Next.js, Drizzle, or Swiper.
- [ ] No `--force`, migration, introspection, or DB write occurred.
- [ ] Typecheck, existing tests, and production build pass.
- [ ] Source is unchanged unless a small Swiper type correction was required.
- [ ] Lockfile diff contains expected dependency graph changes only.
- [ ] `plans/README.md` row updated with any unrelated audit residue.

## STOP conditions

Stop and report if:

- Registry/network access is unavailable after one approved retry.
- `npm audit fix` proposes a Next.js major change or removes a direct dependency
  from `package.json`; normal transitive lockfile replacement is allowed.
- Clerk/Next/Drizzle requires source API migration.
- Drizzle reports schema/type failures requiring schema edits.
- Swiper requires changes outside the three listed components.
- Audit cannot reach zero for a direct package at an available patched version.

## Maintenance notes

- Re-run `npm audit --omit=dev` in CI or dependency maintenance; advisories age.
- Reviewer should focus on unexpected lockfile majors and any auth/runtime edit.
- Existing Plan 007 is stale and superseded by this dated plan.
