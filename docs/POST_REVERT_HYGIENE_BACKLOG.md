# Post-Revert Hygiene Backlog

Game reverted to `c798752` (pre-Match-Battle baseline) 2026-07-03. These fixes were sitting
uncommitted in the working tree pre-revert, are combat-independent, and are still worth doing
against the reverted codebase. Original diffs are parked in `stash@{0}` ("bucket-3 hygiene WIP +
unfinished combat polish, pre-revert-to-c798752") but that stash mixes in combat-only hunks that
won't apply post-revert — treat this doc, not the stash, as the source of truth.

## Security — do first

- **`src/app/api/discoveries/migrate/route.ts`**: no auth check. Any caller can migrate/overwrite
  another player's discoveries by passing an arbitrary `userId` in the body. Fix: require a Clerk
  session, 401 if absent, 403 if `body.userId !== playerId`.
- **`src/pages/api/player/profile.ts`**: profile lookup had no sign-in requirement when a `userId`
  query param was supplied directly. Fix: call `getAuth(req)` and 401 if no `clerkUserId`,
  regardless of whether `userId` is present.
- **Dependency patches**: `drizzle-orm` 0.44.0→0.45.2, `drizzle-kit` 0.30.0→0.31.10. A prior audit
  (2026-06) also flagged Clerk/protobufjs/dompurify/next — re-run `npm audit` against the reverted
  lockfile first; some may already be fine at c798752's versions.

## Test/lint infra

- No Vitest baseline exists at c798752. Worth reinstalling: `vitest` devDep + `vitest.config.ts` +
  `"test": "vitest run"` script. Write fresh tests against whatever pure modules exist post-revert
  (`nodeScoring.ts`, `deductionEngine.ts`, expedition types) — the combat-era test files
  (combatResolver/speciesMapper/combatTraitDerivation) don't apply anymore.
- `eslint.config.mjs` still uses the legacy `FlatCompat` shim wrapping `next/core-web-vitals`.
  Migrate to native flat config (`eslint-config-next/core-web-vitals` + `/typescript` imports),
  add `ignores` for `wiki/`, `plans/`, `docs/`, `.understand-anything/`. Add a `"lint": "eslint src"`
  script (currently missing).
- Small lint-driven cleanups: `src/lib/playerTracking.ts` unused `let aquaticSpeciesCount` →
  `const`; `src/global.d.ts` `declare var CESIUM_BASE_URL` → `declare let`;
  `src/components/SpeciesSearchInput.tsx` `let filteredResults` → `const`.

## Dead code (verified zero importers in `src/`, independent of combat)

- Delete: `src/App.tsx.template-backup`, `src/components/CategoryGenusPicker.tsx`,
  `CategoryGenusPickerFixed.tsx`, `CategoryGenusPickerSimple.tsx`, `src/components/TestPopover.tsx`,
  `src/components/ui/command.tsx`.
- Remove deps (grepped, no importers): `@openai/codex`, `cmdk`, `react-icons`, `@types/swiper`.

## Dev environment

- `next.config.mjs`: add `allowedDevOrigins: ['172.26.21.38', '10.255.255.254']` if dev is hit from
  WSL/LAN and Next starts warning about cross-origin dev requests.

## Docs (lower priority, general staleness only — re-verify before reapplying literally)

- `docs/DEVELOPER_ONBOARDING.md`, `docs/DRIZZLE_ORM_GUIDE.md` had accuracy touch-ups (Clerk env var
  mention, `authHelpers.ts` reference) mixed with Match-Battle-specific additions — only port the
  non-combat parts.
- Archive reorg already sits untracked in the working tree (untouched by the revert, not stashed):
  `docs/archive/{BIOREGION_FEATURE_SUMMARY,CLUE_BOARD_IMPLEMENTATION,DATABASE_USER_GUIDE,EXPEDITION_SYSTEM_DESIGN_RECOMMENDATIONS,STYLE_MAPPING,TODO-2026-04-04,UI_AUDIT_CHANGELOG,YMBAB_AFFINITY_SYSTEM,YMBAB_CONVERSION}.md`.
  Just needs the old-path originals `git rm`'d once you're happy with it.

## Explicitly NOT carried forward — combat-specific, correctly died with the revert

- `species_combat_traits` table/migration + `getCombatTraitsByIds`, `combatResolver.ts` tweaks,
  and the `BoardView.ts`/`MoveAction.ts`/`boardTypes.ts` swap-mode + piece/trigger additions. All
  Match Battle internals; no standalone value without the combat system.
