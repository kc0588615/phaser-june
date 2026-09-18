# Plan 028 — August 18, 2026: Remove only confirmed dead code

> **Executor instructions**: Re-run every importer check before deleting. If a
> new importer exists, stop for that file; do not delete live code. Keep this a
> deletion-only cleanup except for the one stale comment and manifest/lockfile
> removals. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**:
> `git diff --stat 2ac7de7d..HEAD -- src/components/ClueDisplay.tsx src/components/GemLegend.tsx src/components/GemLegendDialog.tsx src/components/HabitatLegend.tsx src/config/habitatColors.ts src/components/SpeciesCardSlide.tsx src/components/SpeciesGuessSelector.tsx src/components/SpeciesTree.tsx src/components/UserMenu.tsx src/services/discoveryMigrationService.ts src/lib/speciesService.ts package.json package-lock.json`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/027-august-18-2026-patch-production-dependencies.md`
- **Category**: tech-debt
- **Planned at**: commit `2ac7de7d`, 2026-08-18
- **Reviewed**: Grok tmux pane, 2026-08-18; deletion scope approved
- **Implemented**: merged as `7c64b142`

## Why this matters

Seven components and the discovery migration service have no importers.
Deleting two of those components also makes `GemLegend` and `habitatColors`
unreachable. This is 1,265 lines that can mislead future work. Remove only the
confirmed set; do not turn this into a broad React Doctor cleanup.

## Current state

At commit `6fd038ee`, `rg` finds each public symbol only in its own file:

- `src/components/ClueDisplay.tsx` (232 lines)
- `src/components/GemLegendDialog.tsx` (76)
- `src/components/HabitatLegend.tsx` (265)
- `src/components/SpeciesCardSlide.tsx` (55)
- `src/components/SpeciesGuessSelector.tsx` (79)
- `src/components/SpeciesTree.tsx` (245)
- `src/components/UserMenu.tsx` (33)
- `src/services/discoveryMigrationService.ts` (74)

Transitive dead files:

- `src/components/GemLegend.tsx` (88) is imported only by `ClueDisplay`.
- `src/config/habitatColors.ts` (118) is imported only by `HabitatLegend`.
- `src/lib/speciesService.ts:14` has a comment saying its static map must stay
  in sync with `habitatColors.ts`; that comment becomes false after deletion.
- `@headless-tree/core` and `@headless-tree/react` are imported only by the dead
  `SpeciesTree`; remove both packages after deleting it.

Do not follow React Doctor's larger unused-file list automatically. shadcn UI
primitives and other context/services may be intentionally retained or need a
separate usage decision.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Import check | `rg -n "<symbol>" src tests scripts` | only deletion-set matches |
| Remove deps | `npm uninstall @headless-tree/core @headless-tree/react` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test` | all pass |
| Build | `npm run build` | exit 0 |

## Scope

**In scope**:

- Delete the ten files listed in Current state.
- `src/lib/speciesService.ts` — remove only the stale `habitatColors.ts`
  comment reference; do not change behavior.
- `package.json`, `package-lock.json` — remove only the two headless-tree deps.

**Out of scope**:

- Any other React Doctor unused-file/export warning.
- `src/components/ui/*` and Radix packages.
- Surviving component refactors or import reorganization.
- Species-card module consolidation.
- Pages/App Router migration.

## Git workflow

- Branch: `advisor/028-confirmed-dead-code`
- One logical commit if asked: `chore remove dead components`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Reconfirm the direct orphan set

Run:

```bash
for symbol in ClueDisplay GemLegendDialog HabitatLegend SpeciesCardSlide SpeciesGuessSelector SpeciesTree UserMenu DiscoveryMigrationService; do
  rg -n "\\b${symbol}\\b" src tests scripts || true
done
```

Expected: each symbol appears only in its defining file. If any outside importer
exists, remove that file and its transitive dependencies from this plan's live
scope; do not delete it.

### Step 2: Reconfirm the transitive orphan set

Run:

```bash
rg -n "\\bGemLegend\\b|habitatColors|getHabitatColor|@headless-tree" src tests scripts package.json
```

Expected:

- `GemLegend` references only in `ClueDisplay.tsx` and `GemLegend.tsx`.
- Executable `getHabitatColor` reference only in `HabitatLegend.tsx` and its
  definition; `speciesService.ts` is comment-only.
- Headless-tree source imports only in `SpeciesTree.tsx`.

### Step 3: Delete the confirmed files and stale comment

Delete exactly:

```text
src/components/ClueDisplay.tsx
src/components/GemLegend.tsx
src/components/GemLegendDialog.tsx
src/components/HabitatLegend.tsx
src/config/habitatColors.ts
src/components/SpeciesCardSlide.tsx
src/components/SpeciesGuessSelector.tsx
src/components/SpeciesTree.tsx
src/components/UserMenu.tsx
src/services/discoveryMigrationService.ts
```

Remove only the stale `habitatColors.ts` synchronization comment at
`src/lib/speciesService.ts:14`.

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Remove the now-unused headless-tree packages

Run:

```bash
npm uninstall @headless-tree/core @headless-tree/react
```

**Verify**:

```bash
rg -n "@headless-tree" src tests scripts package.json
```

Expected: no matches. `npm run typecheck` exits 0.

### Step 5: Run existing gates once

Run `npm test`, then `npm run build`.

**Verify**: both exit 0. `git status --short` contains only the ten deletions,
the one comment edit, package files, and the plan status update.

## Test plan

- No new tests.
- Existing suite and build once after all deletions.
- No browser testing; no live entry point imports these files.

## Done criteria

- [ ] Ten confirmed dead files deleted.
- [ ] Headless-tree packages removed from manifest and lockfile.
- [ ] No stale `habitatColors.ts` comment remains.
- [ ] No broader unused-file cleanup or surviving-code refactor occurred.
- [ ] Typecheck, tests, and build pass.
- [ ] `plans/README.md` row updated.

## STOP conditions

Stop and report if:

- Any deletion candidate gained an importer.
- A runtime string/dynamic import references one of these file paths.
- Removing headless-tree breaks code outside `SpeciesTree`.
- More files appear deletable; do not expand this plan without review.

## Maintenance notes

- Re-add functionality from current product needs, not by restoring obsolete
  components wholesale.
- Reviewer should reject unrelated shadcn or export cleanup in this change.
- Existing Plan 011 describes a prior deletion set and is superseded here.
