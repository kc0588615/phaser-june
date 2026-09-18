# Plan 032 — September 18, 2026: Land the Open Increment and Reset Player Tracking

Created 2026-09-18. Author: Claude (working-tree and production audit after plan 031). Executor: Grok.

## Goal

Two pieces of leftover work remain after plan 031.

1. **The working tree holds an unmerged feature increment.** Thirty-two modified files and nine untracked files implement incident acknowledgement, diagnosis-panel locking, a UUID fallback for HTTP origins, an evidence-copy revision, and documentation housekeeping. Grok reviewed the diagnosis-panel part on 2026-09-17 and called it ship-worthy. It passes typecheck and all 156 tests but has never been committed, and the revised evidence copy has never been written to the database.
2. **Player tracking still carries the retired per-gem clue system.** Ten columns across five tables count "clues unlocked", and the profile page, stats dashboard, and album card still display them. Nothing writes them any more. The game is in testing and the owner has said player data does not need to be preserved, so the reset is a truncate, not a migration of values.

Both are cleanup. Neither changes the match-3 rules, the run compiler, the GIS harvest, or run snapshot v4.

## Verified state (2026-09-18)

Working tree, relative to `HEAD` = `9069acff`:

| Area | Files | What it is |
|---|---|---|
| Incident acknowledgement | `src/expedition/caseFlow.ts`, `src/contexts/ExpeditionContext.tsx`, `src/app/api/runs/[runId]/incident/route.ts` (untracked), `src/lib/runProjection.ts`, `src/lib/mysteryCase.ts`, `src/lib/caseCompilerV3.ts`, `tests/expedition/caseFlow.test.ts` | New `incident` flow step before site one; `POST /api/runs/:id/incident` persists `incidentAcknowledged` in run metadata; older runs infer it from board progress |
| Diagnosis panel locking | `src/components/CaseDiagnosisPanel.tsx`, `src/components/RunCompleteSummary.tsx` | Species and explanation claims lock independently after a supported verdict; Revise clears only the rejected claim; focus management and aria-live guidance |
| Move verification | `src/lib/evidenceMoveVerification.ts`, `src/app/api/runs/[runId]/evidence-progress/route.ts`, `src/game/scenes/Game.ts`, `tests/lib/evidenceMoveVerification.test.ts` | Conflict handling for a commit that lands while the board is paused |
| UUID fallback | `src/lib/clientUuid.ts`, `tests/lib/clientUuid.test.ts` (untracked) | `crypto.randomUUID` polyfill for insecure origins |
| Evidence copy revision | `db/seeds/pools/prototype-six/evidence/*.json` (six files, 20 lines each) | Rewritten `observation_text` and `inference_text` on all 30 cards. **Not in the database**: `seed:evidence-family --dry-run` reports 5 card updates per species and 0 hint changes |
| Docs and plans housekeeping | `AGENTS.md` (database-access section), `docs/archive/CODEX.md` (rotated password removed), `docs/DATABASE_ACCESS.md`, `docs/EVIDENCE_FAMILY_COPY_BRIEF.md`, `plans/026`–`029` (untracked but already listed as DONE in `plans/README.md`), small doc edits | Housekeeping from the August sessions |

Production database, clue-era columns with no remaining writer:

| Table | Columns | Rows in table |
|---|---|---|
| `player_stats` | `total_clues_unlocked`, `average_clues_per_discovery`, `fastest_discovery_clues`, `slowest_discovery_clues`, `clues_by_category`, `favorite_clue_category` | 4 |
| `player_game_sessions` | `clues_unlocked_in_session` | 7 |
| `player_species_discoveries` | `clues_unlocked_before_guess` | 32 |
| `eco_node_attempts` | `clues_unlocked` | 0 |
| `species_cards` | `clue_categories_unlocked` | 16 |

Code that still reads or passes them: `src/lib/playerTracking.ts` (session progress, discovery stats, the clue-efficiency block around line 361), `src/pages/api/player/track.ts`, `src/pages/api/player/profile.ts`, `src/lib/playerStatsService.ts`, `src/components/PlayerStatsDashboard/*` (mounted from `src/pages/stats.tsx`), `src/components/ProfileContent.tsx` (the "Clue Categories" section around line 409, mounted from `src/MainAppLayout.tsx`), `src/components/album/SpeciesTCGCard.tsx`, `src/components/album/AlbumHeroSwiper.tsx`, `src/lib/speciesCardProgression.ts` and `.server.ts`, `src/game/scenes/Game.ts` (passes `cluesUnlocked: 0` in three tracking calls).

Two more tables have zero readers in `src/` or `scripts/`: `species_combat_traits` (22 rows) and `conservation_statuses` (9 rows).

Player-progress tables and their row counts, all disposable: `profiles` 5, `player_stats` 4, `player_game_sessions` 7, `player_species_discoveries` 32, `high_scores` 5, `eco_run_sessions` 225, `eco_run_nodes` 1090, `eco_node_attempts` 0, `eco_node_gis_samples` 0, `eco_location_mastery` 20, `run_memories` 28, `species_cards` 16, `species_card_unlocks` 62.

## Firm decisions (do not redesign)

1. **Commit the increment as the owner's work, in three commits, without rewriting it.** It has passed review and tests. Fix only what typecheck or tests force. Do not refactor the diagnosis panel, and do not act on the two optional polish notes from Grok's review (keyboard focus on the confirmed button, muting locked siblings). Those stay in the backlog.
2. **Write the revised evidence copy to the database** with the existing loader, and gate it on the case-compiler verifier. If the verifier rejects any card, print `BLOCKED` with the card and the verifier message. Do not edit card copy to make it pass.
3. **Drop the ten clue-era columns.** No renamed replacement, no backfill. The evidence-family system already records what matters in run snapshots.
4. **Card completion is re-weighted, not re-sourced.** In `speciesCardProgression.ts` the 25 clue points move to facts and stamps: encounter 25, facts 45, stamps 30. Do not invent an evidence-family progression.
5. **Truncate player progress.** `TRUNCATE ... RESTART IDENTITY CASCADE` on `player_stats`, `player_game_sessions`, `player_species_discoveries`, `high_scores`, `eco_run_sessions`, `eco_run_nodes`, `eco_node_attempts`, `eco_node_gis_samples`, `eco_location_mastery`, `run_memories`, `species_cards`, `species_card_unlocks`. **Keep `profiles`**: it maps Clerk users to player ids and the ensure-profile route would only recreate the same rows.
6. **Drop `species_combat_traits` and `conservation_statuses`** after a CSV archive into `db/archive/`, same format as plan 031.
7. **Remove the clue displays**, do not hide them: the "Clue Categories" section in `ProfileContent.tsx`, the average / fastest / slowest clue tiles in the stats dashboard, the clue-category row on the album card, and the `clueCategoriesUnlocked` prop threading through `AlbumHeroSwiper.tsx` and `RunCompleteSummary.tsx`.
8. **The four player docs become one paragraph each.** `docs/PLAYER_STATS_DASHBOARD_FINAL_REVIEW.md`, `docs/PLAYER_STATS_DASHBOARD_INTEGRATION.md`, `docs/PLAYER_TRACKING_IMPLEMENTATION_SUMMARY.md`, `docs/PLAYER_TRACKING_INTEGRATION_PLAN.md`: trim to a pointer that says what the tracking tables hold today. Do not write a new document.
9. **No new tests.** Extend an existing test only when a change breaks it. Delete assertions that only exercised clue fields.
10. **Rehearse on a fresh same-server copy first.** Recreate `phaser_june_rehearsal` with `CREATE DATABASE phaser_june_rehearsal TEMPLATE phaser_june` through the raw tunnel (it needs zero other connections to `phaser_june`; retry once if refused; the copy takes about 25 seconds). Apply every migration and the evidence write there before production. Drop the rehearsal copy at the end.

## Execution rules

- Phases in order. Gate per phase: `npm run typecheck`, `npm test`, `npm run verify:case-compiler`, then `git commit` with a concise subject. Phase 4 also needs `npm run build`.
- Database access: the SSH tunnel is open on `127.0.0.1:55432`. For `CREATE DATABASE` and `DROP DATABASE` use `psql -h 127.0.0.1 -p 55432 -U postgres -d postgres` with credentials parsed from `DATABASE_URL` in `.env.local` (never print them). For everything else use `./scripts/db --rehearsal` and `./scripts/db --production`. Print row counts before and after each production write.
- Migration files are plain SQL in `src/db/migrations/`, numbered from `032`, wrapped in one transaction, safe to re-run. Update the Drizzle schema in `src/db/schema/*.ts` and `src/db/types.ts` to match. Do not use `drizzle-kit push`.
- Do not touch anything under `src/lib/waypointHarvesting.ts`, `src/lib/answerPrior.ts`, `src/lib/gisFeatureSampling.ts`, `src/lib/expeditionRoute.ts`, `src/components/MapLibreExploreMap.tsx`, the run compiler, or the board rules. Truncating `eco_*` run tables is the only permitted contact with those tables.
- No npm installs. No dev server or browser; the owner playtests. The `next dev` process on this machine is the owner's and must be left running.
- If a file cited here has moved or differs, adapt minimally and note it in the commit body. If blocked, print `BLOCKED: <reason>` and message pane `%0` through tmux-bridge.
- Message pane `%0` after each phase commit with the hash and subject, and at the end with the full commit list and final production row counts for every table named in this plan.

## Phase 1 — Land the increment

Commit the working tree in three commits. Stage by path so each commit is coherent:

1. `feat incident acknowledgement and diagnosis locking` — every modified or untracked file under `src/` and `tests/` listed in the table above, plus `plans/013-...`, `plans/codex-execution-rules.md`, `plans/gis-gem-integration.md`, `docs/EXPEDITION_RUN_LOOP.md`, `docs/ACTION_RUN_SCHEMA_AND_GIS_SOURCES.md`, `docs/DATABASE_ER_PLAY_PATH.md`, `docs/CODEBASE_TOUR.md`, `docs/DEVELOPER_ONBOARDING.md`, `docs/README.md`.
2. `content revise evidence card copy` — the six evidence JSON files and `docs/EVIDENCE_FAMILY_COPY_BRIEF.md`.
3. `docs database access and plan index` — `AGENTS.md`, `docs/archive/CODEX.md`, `docs/DATABASE_ACCESS.md`, `plans/026`–`029`, `plans/README.md`, and this plan file.

Before the first commit run `git diff --cached --stat` and confirm no `.env*` file is staged. Run the three gates once before committing; they pass today.

## Phase 2 — Write the evidence copy

```bash
./scripts/db --rehearsal --exec npm run seed:evidence-family -- --pool=prototype-six --check
./scripts/db --rehearsal --exec npm run seed:evidence-family -- --pool=prototype-six --write
./scripts/db --rehearsal --exec npm run verify:case-compiler -- --pool=prototype-six
```

Then the same three commands with `--production`, then `--dry-run` on production must report every card unchanged. No commit is needed unless the loader itself had to change; if it did, commit it as `fix evidence loader`.

## Phase 3 — Remove clue-era tracking

Migration `032_drop_clue_tracking.sql`:

```sql
BEGIN;
ALTER TABLE player_stats
  DROP COLUMN IF EXISTS total_clues_unlocked,
  DROP COLUMN IF EXISTS average_clues_per_discovery,
  DROP COLUMN IF EXISTS fastest_discovery_clues,
  DROP COLUMN IF EXISTS slowest_discovery_clues,
  DROP COLUMN IF EXISTS clues_by_category,
  DROP COLUMN IF EXISTS favorite_clue_category;
ALTER TABLE player_game_sessions      DROP COLUMN IF EXISTS clues_unlocked_in_session;
ALTER TABLE player_species_discoveries DROP COLUMN IF EXISTS clues_unlocked_before_guess;
ALTER TABLE eco_node_attempts         DROP COLUMN IF EXISTS clues_unlocked;
ALTER TABLE species_cards             DROP COLUMN IF EXISTS clue_categories_unlocked;
COMMIT;
```

Code, in this order so typecheck guides you:

- Remove the five columns from the Drizzle schema files and `src/db/types.ts`.
- `src/lib/playerTracking.ts`: drop the `cluesUnlocked` parameters from `updateSessionProgress` and `forceSessionUpdate`, the `cluesUnlockedBeforeGuess` option from the discovery recorder, and the clue-efficiency block in the stats aggregation.
- `src/pages/api/player/track.ts` and `src/pages/api/player/profile.ts`: stop reading and forwarding those fields.
- `src/game/scenes/Game.ts`: remove `cluesUnlocked: 0` and `cluesUnlockedBeforeGuess: 0` from the three tracking payloads.
- `src/lib/playerStatsService.ts`, `src/components/PlayerStatsDashboard/types.ts` and `PlayerStatsDashboard.tsx`: remove the clue fields and the three clue tiles. Replace the empty-state sentence "unlock clues" with "gather evidence".
- `src/components/ProfileContent.tsx`: delete the "Clue Categories" section and its state.
- `src/lib/speciesCardProgression.ts`: delete `CLUE_CATEGORY_COUNT` and `clueCategoriesUnlocked`; set weights encounter 25, facts 45, stamps 30. Update `.server.ts`, the guess route's card writes, `SpeciesTCGCard.tsx`, `AlbumHeroSwiper.tsx`, `RunCompleteSummary.tsx` to stop passing the prop.
- Fix any test that referenced the removed fields by deleting the assertion, not by rewriting it.

Apply the migration to rehearsal, run gates, apply to production, commit `chore drop clue-era tracking columns`.

## Phase 4 — Reset progress and drop dead tables

Archive first:

```bash
./scripts/db --production "\copy public.species_combat_traits TO 'db/archive/2026-09-18-species_combat_traits.csv' WITH (FORMAT csv, HEADER true)"
./scripts/db --production "\copy public.conservation_statuses TO 'db/archive/2026-09-18-conservation_statuses.csv' WITH (FORMAT csv, HEADER true)"
```

Add both to the table in `db/archive/README.md` with row counts.

Migration `033_reset_player_progress.sql`:

```sql
BEGIN;
TRUNCATE TABLE
  player_stats, player_game_sessions, player_species_discoveries, high_scores,
  eco_run_sessions, eco_run_nodes, eco_node_attempts, eco_node_gis_samples,
  eco_location_mastery, run_memories, species_cards, species_card_unlocks
  RESTART IDENTITY CASCADE;
DROP TABLE IF EXISTS species_combat_traits;
DROP TABLE IF EXISTS conservation_statuses;
COMMIT;
```

Remove the two dropped tables from the Drizzle schema and `src/db/types.ts` if they appear there. Trim the four player docs per firm decision 8. Run all gates plus `npm run build`. Apply to rehearsal, then production, then commit `chore reset player progress and drop dead tables`.

Finally drop `phaser_june_rehearsal` and confirm `SELECT datname FROM pg_database` lists only `postgres` and `phaser_june`.

## Non-goals

- No evidence-family progression on album cards.
- No new dashboard, chart, or stat.
- No change to the diagnosis panel beyond what compiles.
- No change to `profiles`, Clerk, or auth.
- No touch of content tables (`species*`, `case_pools*`, `evidence_family_*`, `mystery_*`, `trait_tags`, `cascade_hints`) except the Phase 2 card copy write.

## Done state

- Working tree clean except files the owner creates after this plan starts.
- Production has the revised evidence copy, verified by the compiler and a zero-change dry run.
- Ten clue-era columns and two dead tables gone; player-progress tables empty; `profiles` untouched.
- Rehearsal database dropped.
- `npm run typecheck`, `npm test`, `npm run verify:case-compiler`, `npm run build` pass.
- Final message to pane `%0`: commit list, production row counts.
