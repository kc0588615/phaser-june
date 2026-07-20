# Plan 014: July 11, 2026 — Mystery-Loop Integration Fixes (post-review)

> **Executor instructions**: Follow phases in order; run every gate; stop at every STOP. Written 2026-07-11 from an xhigh code review of `origin/main...working-tree` (commit `7e6da48` + uncommitted changes). All `file:line` refs verified against the working tree on 2026-07-11 — re-verify before editing if the tree has moved.

## Status

- **Priority**: P0 (blocks playable v0 of the mystery loop)
- **Effort**: M–L (~1–2 days)
- **Depends on**: nothing; **feeds into** Plan 013 (do NOT build what 013 Phases 2–3 will replace — each fix below is marked `interim` or `durable`)
- **Source**: 2026-07-11 review, 14 findings. This plan fixes the 10 that matter for the loop + 4 hygiene items.

## Relationship to Plan 013

The working tree is mid-013: Phase 0.5 content ✅, Phase 1 schema/vocab ✅, Phase 4 partially landed (`setSeed`, `ACTIVE_GEM_TYPES`), Phase 5 client rewrite landed **with integration bugs**. This plan repairs the landed slice so v0 is playable and measurable. It does not touch the case compiler (013 Phase 2), server-side finalization (013 Phase 3), or the deletion sweep (013 Phase 7). Where a fix will be superseded by those phases it is the smallest coherent patch, marked `interim`.

## Verified defects being fixed

| # | Defect | Anchor | Class |
|---|---|---|---|
| F1 | FieldNotebook guesses no-op: `handleComparativeGuessResult` requires `deductionCamp`, null during `mystery` | `src/contexts/ExpeditionContext.tsx:621` | P0 |
| F2 | Method objective can never progress: requires action gems (`counterGem`/`requiredGems`) that no longer spawn | `src/game/scenes/Game.ts:900` | P0 |
| F3 | reproduction/conservation/key_fact clues unreachable; 3 dead GemSignalStrip dots; dead `buildHabitatLootWeights` boosts | `src/game/BackendPuzzle.ts:157`, `src/components/GemSignalStrip.tsx:8` | P0 |
| F4 | Client plays 1 board; server creates + validates 3 method nodes → nodes 2–3 pending forever | `src/contexts/ExpeditionContext.tsx:351` vs `src/app/api/runs/route.ts:57-70` | P0 |
| F5 | `boardSeed` validated + persisted but never emitted to the board; boards still `Math.random` | `src/contexts/ExpeditionContext.tsx:913` (emit sites) | P1 |
| F6 | Map-click start silently no-ops when at-point returns no `generated_nodes` (fallback emit removed) | `src/components/CesiumMap.tsx:277` | P1 |
| F7 | `toast()`/`EventBus.emit()` inside `setRunState` updaters → StrictMode double-fire | `src/contexts/ExpeditionContext.tsx:397-398,412,452` | P1 |
| F8 | Journal card scans `order_`/`genus_` prefixes; vocabulary is `genus:`/`family:`, no `order:` | `src/MainAppLayout.tsx:356-357` | P2 |
| F9 | Evidence-confirmed categories share `clueId=-1`; `addConfirmedClue` dedups by clueId → last category wins (latent) | `src/contexts/ExpeditionContext.tsx:549` | P2 |
| F10 | Stale `flashLabel` if notebook expanded mid-flash | `src/components/FieldNotebook.tsx:61` | P2 |
| F11 | `seed:deduction` uses `npx tsx`; tsx not a dep; repo is network-restricted | `package.json:44` | P2 |
| F12 | Leak validator bans every ≥4-char token of every pool species name from all labels | `scripts/seed-deduction.ts:318` | P2 |
| F13 | Gem→category mapping duplicated (GemSignalStrip vs domain registry); `WAYPOINT_COLORS` copy-pasted ×2 | `src/components/GemSignalStrip.tsx:8` | P2 |
| F14 | Briefing hardcodes "You have 12 moves"; legacy/resumed nodes use 50/40/30 | `src/components/ExpeditionBriefing.tsx:53` | P2 |

---

## Phase A — Guess finalization + 3-board loop (F1, F4) `interim, one changeset`

These two interlock: fixing F1 naively (dropping the `deductionCamp` guard) creates a race — a correct guess sets `phase: 'complete'`, then Game.ts's `finishNodeObjective('victory')` fires ~800ms later and `handleNodeAdvanceRequested` bails on `phase !== 'mystery'`, so the hud score is never banked and `/complete` is never POSTed. Fix with **one finalization point**:

1. `handleComparativeGuessResult` (`ExpeditionContext.tsx:619-660`):
   - Drop the `!prev.deductionCamp` guard.
   - **Correct guess**: record only `comparativeDeduction.guessResult = 'correct'` + `guessBonusAwarded` inputs; do NOT set phase, do NOT compute finalScore, do NOT fetch. Keep eliminations/feedback logic for wrong guesses (works without camp; replace the camp `scoreSpent + 25` penalty with `comp.scoreSpent + 25` — Game.ts already charges 2 moves at `Game.ts:2880-2887`, so decide one penalty and delete the other. **Recommend: keep the move penalty, drop the score penalty.**)
2. `handleNodeAdvanceRequested` (`ExpeditionContext.tsx:310-357`) becomes the single finalizer:
   - Bank `earnedScore` (existing logic).
   - If `data.reason === 'escaped'` → `phase: 'complete'`, `completionReason: 'slipped'`.
   - If `reason === 'victory'` and `comp.guessResult === 'correct'` → build camp, compute `finalScore` (banked − spent + `getGuessBonuses`), PATCH `/api/runs/:id` with deductionSummary + speciesId + routePolyline, call `unlockSpeciesCardDiscovery`, set `phase: 'complete'`, `completionReason: 'captured'`. (`interim` — 013 Phase 3 moves this server-side; keep it in one function so Phase 3 deletes one block.)
   - If `reason === 'victory'`, no correct guess, and `nextIndex < expedition.nodes.length` → stay in `mystery`, `currentNodeIndex: nextIndex`, reset `objectiveProgressRef`, and `emitBoardForNode(payload, nextIndex, …)` after 100ms (restore the pre-revert advance pattern; `emitBoardForNode` already exists at `ExpeditionContext.tsx:895+`).
   - If last node and no correct guess → `phase: 'complete'`, `completionReason: 'slipped'`.
   - Move ALL fetch/emit/toast side effects out of the updater (see Phase C3 pattern).
3. Checkpoint status: only pass `'deduction'` to `persistRunCheckpoint` on the run-ending branches, not on node 1→2 advance.
4. **STOP (design confirmation)**: the above makes "guess anytime during any of the 3 boards; capture ends the run at that node's completion" the v0 contract. If the owner instead wants guessing gated to post-board-3, say so before coding — the diff is different.

**Gate**: `npm run typecheck && npm test`. Manual: fresh run → play board 1 to objective → board 2 spawns; guess correctly on board 2 → complete screen shows Captured, `eco_run_sessions.metadata.deductionSummary` + `run_memories` row written, nodes 1–2 completed in `eco_run_nodes`; wrong guess → 2-move penalty, suspect eliminated, feedback panel renders.

## Phase B — Make objectives + clues reachable (F2, F3) `durable`

1. **F2 — method gems drive objectives.**
   - `src/lib/nodeScoring.ts` `generateRunNodes` (~line 380): for method nodes set `requiredGems: [METHOD_GEM_MAP[method]]` and `counterGem: null` (import from `@/expedition/domain`).
   - `applyWaypointsToRunNodes` (~line 356): the `...template` spread clobbers `requiredGems`/`counterGem` from the node. After the spread, re-assert them for `objectiveType === 'method_match'` nodes (same pattern already used for `moveBudget`/`objectiveTarget`).
   - `src/game/scenes/Game.ts:895-903`: keep `requiredMatch` logic (now satisfiable — `nodeRequiredGems` will contain a loot color). Verify `Game.ts:1187-1190` (`data.requiredGems ?? counterGem fallback`) doesn't resurrect an action gem when `counterGem` is null.
   - Add a `tests/lib/nodeScoring` case: every generated method node has `requiredGems = [METHOD_GEM_MAP[method]]` ⊂ `ACTIVE_GEM_TYPES`.
2. **F3 — clue-category reachability.** All 9 deduction categories must map to a spawning gem. In `src/lib/deductionEngine.ts:210-219` extend `WALLET_KEY_TO_DEDUCTION_CATEGORIES` (default proposal — owner may re-flavor):
   - `morphology` (orange/track) → `['morphology', 'reproduction']` (tracks/dens/nests)
   - `classification` (red/observe) → `['taxonomy', 'conservation']`
   - `geographic` (blue/analyze) → `['geography', 'habitat', 'key_fact']`
   - `behavior` (yellow/listen) → `['behavior', 'diet']` (unchanged)
   - `interim` note: 013 Phase 2's case compiler assigns cards per method and obsoletes this table; this keeps the 15-row seed decks playable until then.
3. **F3 — UI/weights cleanup**: `GemSignalStrip.tsx` renders only `ACTIVE_GEM_TYPES` (no permanently-dark black/white/purple dots); delete the `black`/`white` boost lines in `buildHabitatLootWeights` (`ExpeditionContext.tsx:733+`) or remap them onto spawning colors.

**Gate**: `npm test` (new nodeScoring case). Manual: play a track board — orange matches tick the objective to target and `finishNodeObjective('victory')` fires; over a full 3-board run at least one reproduction/conservation/key_fact clue can appear in the notebook.

## Phase C — Wiring + hygiene on the run path (F5, F6, F7)

1. **F5 — thread `boardSeed`** `durable`: include `boardSeed: node.boardSeed` in both emit sites — `handleExpeditionStart` (`ExpeditionContext.tsx:~215`) and `emitBoardForNode` (`:913` block). Resume already reconstructs `boardSeed` (`api/runs/[runId]/route.ts:100`) — confirm it survives `reconstructRunNode` → `emitBoardForNode`. Game.ts consumption exists (`Game.ts:1229-1230`). Manual gate: same location clicked twice → identical opening board.
2. **F6 — fail loudly on missing nodes** `durable`: in `startPendingSelection` (`CesiumMap.tsx:275-279`), when `emitExpeditionReadyFromMapClick` returns `false`, show a toast ("No expedition data here — try another spot") and clear `pendingSelection`. Do not resurrect the legacy `cesium-location-selected` fallback (013 deleted that path deliberately).
3. **F7 — purify updaters** `durable`: in `handleDeductionClueTriggered` (`ExpeditionContext.tsx:380-460`), compute the next state in the updater but carry side effects out: collect `{toasts, emits}` into a local captured via the updater, then run them after `setRunState` returns via `setTimeout(…, 0)` (the file's own existing pattern at `:348`). Same treatment for the fetches inside `handleNodeAdvanceRequested` while editing it in Phase A. Gate: with StrictMode dev, one match → exactly one toast, one `route-progress-updated`.

## Phase D — Small correctness (F8, F9, F10)

1. **F8**: `MainAppLayout.tsx:356-357` — parse colon form: `taxonomyTags.find(t => t.startsWith('genus:'))?.slice(6)`; drop the `order_` scan entirely (no such prefix exists) — order comes only from the species fetch.
2. **F9**: give evidence-confirmed clues distinct ids per category (`clueId: EVIDENCE_CONFIRMED_CLUE_ID - index` or key `addConfirmedClue` dedup on `clueId + category`). One-line test in `tests/types/expedition` or engine tests: two categories in → two confirmed clues out.
3. **F10**: `FieldNotebook.tsx:55-70` — also `setFlashLabel(null)` when `expanded` becomes true (or render `flashLabel` only if a live timer ref exists).

## Phase E — Hygiene (F11–F14) `durable`

1. **F11**: add `tsx` to `devDependencies` (pin; install requires network — **STOP: run `npm install tsx --save-dev` only with owner ok per repo network policy**), or switch `seed:deduction` to the esbuild-bundle pattern of `scripts/run-tests.mjs` (no new dep — **recommended**).
2. **F12**: `findLeakedTerms` (`seed-deduction.ts:295-320`) — ban only the seed's own name tokens + genus + pool species' genus/scientific epithets; drop pool common-name tokens, or subtract an English stopword/descriptor list (`giant`, `spotted`, `lesser`, colors…). Keep the seed's own common name banned.
3. **F13**: derive GemSignalStrip's mapping from `GEM_REGISTRY` (`getClueCategoryForGemType` + the existing GemCategory→wallet key mapping) instead of the hand map at `GemSignalStrip.tsx:8`; export one `WAYPOINT_COLORS` from `src/types/waypoints.ts` (or a small `src/lib/waypointColors.ts`) and import in `CesiumMap.tsx` + `ExpeditionRouteRecap.tsx`. While there: fix `GemLegend.tsx` white row ("Behavior & Diet" → Conservation) or drop non-spawning rows.
4. **F14**: `ExpeditionBriefing.tsx:53` — interpolate the budget: `expedition.nodes[0]?.moveBudget ?? MYSTERY_MOVE_BUDGET` (export `MYSTERY_MOVE_BUDGET` from `nodeScoring`); phrase per-board ("12 moves per site").

## Verification (whole plan)

1. `npm run typecheck && npm test` after every phase.
2. `npm run verify:waypoint-run` (script already updated for the new contract).
3. Full manual run (dev, StrictMode): click land → briefing → 3 boards with seeded layouts → clues across ≥6 categories reachable → wrong guess penalty → correct guess → Captured screen with finalScore; DB shows session completed, 3 node rows resolved, run_memories row, no duplicate toasts.
4. `/verify` skill pass on the changeset before commit.

## Out of scope (owned by Plan 013)

- Case compiler, evidence_cards runtime, `CASE_COMPILER_SECRET` HMAC seeds (Phase 2–3)
- Server-side finalization replacing Phase A's client PATCH (Phase 3 — Phase A comments must mark the block `// 013-P3: replace with server finalize`)
- Deletion sweep incl. free-play clue mode decision (Phase 7)
- Production DB writes of any kind (approval-gated)
