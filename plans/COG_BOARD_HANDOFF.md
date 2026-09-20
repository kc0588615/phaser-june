# New-chat handoff: integrate the COG GeoTIFF with the game board

Saved 2026-09-19. Workspace: `/home/danby/phaser-june`.

## Implementation update

Phase A is implemented under [034](034-cog-terrain-phase-a.md). Isolated Phase B routing is [036](036-cog-terrain-phase-b-routing.md): a separate harness, production evidence unchanged. C remains deferred. Implementation records supersede the historical planning-only instructions below.

## User request and immediate task

The user wants the full **COG GeoTIFF → match-3 board → map/traversal → evidence** integration considered together. The next task is to **write a detailed, self-contained implementation plan for phase A**, grounded in current code and verified extraction capabilities. B/C remain deferred until terrain extraction/alignment and then routing are proven. Do not treat the full vision as authorization to implement B/C now.

Read `AGENTS.md`, `plans/033-cog-board-integration-review.md`, and `plans/README.md` first. Plan 033 is the reviewed design brief, not an executable implementation plan. Both Codex and Grok reviewed it against the current runtime. The review is complete; do not restart the historical design debate. Check drift before using its line references (review baseline `d0af36c2`).

Write the A implementation plan as the next unused numbered plan (034 if still available), and index it. Include exact scope, state ownership, ordered steps, behavioral tests, acceptance criteria, and unresolved prerequisites. Read-only investigation and a bounded deployed-raster extraction spike can resolve planning unknowns; do not claim an extraction succeeded without checking it. Source implementation is a subsequent task.

## Full direction to preserve

- **A — geographic foundation:** a fixed 6×6 terrain grid extracted from real habitat COG values; gems move above fixed ground; a local map displays the identical cells; the regional map displays a locator footprint. Snapshot survives reload.
- **B — deliberate traversal, deferred:** matched cells ink persistent terrain; camp-connected trails permit party movement; a direct 4+ match may grant one player-selected frontier extension; an authored crossing leads to a survey encounter. Server validates spatial actions and resume state.
- **C — investigation integration, deferred:** arrival establishes an authored in-game presence record; subsequent matching analyzes recorded evidence through the existing server pipeline. Show observation/source and supported candidate changes. Resolve the six-move/family-choice transition before this phase.

Design A's stable cell ids, immutable snapshot and map transforms so B can attach trail/party state and C can attach encounter/presence provenance. Do not build their mechanics prematurely. Keep the three regional research sites separate; the 6×6 clip is local to one site.

## Current runtime — retain as planning baseline

- v4 ecological mystery cases; five families: Relatives, Body, Behavior, Habits, Place.
- 6×6 puzzle; wrapping row/column shifts, not adjacent swaps.
- Six counted legal matching moves per site, then family choice. No four-energy/free-4 economy.
- Direct matches issue family hints from move one. Cascades do not earn family evidence; they may emit flavor and spawn Field Signal. Signal payout requires direct adjacent clearing; 3 → one hint, 4+ → two.
- Five reviewed family cards per species plus 3–5 weaker hints/family. No old three-positive-elimination chain or signature fallback.
- CandidateRoster already displays elimination. Charge totals determine offered families; hiding totals without explaining offers obscures the rules.
- Server replays moves and compares checkpoints; repeated submissions are deduplicated. Spatial state must ultimately participate in server validation.
- Plan 013 is historical; 024's clearing-match payout is implemented. Old drip and interpretation-prediction proposals do not describe shipped code.

## Phase A prerequisites and design locks

1. **Verify deployed numeric extraction and decoder.** Existing COG integration supplies tiles and histograms, not cell positions. No direct GeoTIFF/NumPy decoder is declared in package.json. Use the configured service; docs support raw outputs but deployed compatibility is not yet verified. Avoid installs without a concrete need.
2. **Align to source pixels.** Transform selected lon/lat to EPSG:3857; verify/invert the actual affine transform; snap to integer pixel boundaries. A `6x6` output request alone resamples. Explicit CRS, pixel-centre policy, row orientation and stride. Puzzle arrays are `[x][y]`.
3. **Mask before labels.** Live raster NoData is 0, yet `STATIC_HABITAT_CODE_TO_LABEL[0]` in `src/lib/speciesService.ts` says Water. Treat zero as invalid. Reconcile valid codes across static labels, database `habitat_colormap`, and deployed `habitat_custom`. Color/label never overrides validity.
4. **Record fixtures.** Pick and record an authored geographic coordinate and actual extracted values/mask; inspect class diversity before choosing stride. Add an asymmetric synthetic raster fixture. No suitable real clip has been validated. Do not invent a river or infer a ford from habitat.
5. **Freeze at run creation.** Persist source identity/revision, transform, window, dimensions/stride, codes/mask and mapping version before board moves. Resume must use that snapshot even if the source changes. Bound raster work; no per-cell or per-move fetches.
6. **Local camera plus regional locator.** ExpeditionMapHud currently caps panel zoom at 10 and fullscreen at 13, inadequate for picking this clip's cells. Prefer explicit local/regional modes on the mounted map. Preserve regional route framing separately.
7. **Terrain outside movable gem state.** `BoardCell.state` moves with row/column shifts. Keep immutable terrain separate from gem checkpoint. Later trail/party state is also separate. World adjacency must not wrap.

## Verified metadata versus remaining uncertainty

On 2026-09-19, configured TiTiler `/cog/info` returned HTTP 200: EPSG:3857, 388996×388996, one uint16 band, NoData 0, bounds approximately ±20037508.343, overviews 2…1024.

Bounds/dimensions imply ~103.02 projected metres per pixel, ~618.13 projected metres across six pixels. This is not a universal ground-resolution claim. Full affine/source provenance, numeric extraction/decoder, deployed colormap and local class diversity remain unverified. Use environment configuration without printing credentials or hardcoding connection strings.

## Later blockers to remember, not implement now

- On move six, Phaser stays input-disabled; move seven fails server parsing; caseFlow requires family choice. C must reconcile `Game.ts`, `caseFlow.ts`, move validation and evidence-choice together.
- B will still grant today's evidence unless its future playtest deliberately isolates routing. Do not silently mute current evidence.
- Replay has matched slots before reducing them to charges; B must retain spatial deltas and map to frozen terrain ids. Extension choice needs a subsequent validated command and durable pending state.
- Direct 4+ frequency and six-move reachability are unmeasured. Measure before changing budgets.
- Authored sockets supply crossing rules; the raster supplies habitat context. Neither establishes real animal presence or a safe crossing.
- Answer-independent availability/budgets are a constraint on future C. Server resolution alone cannot conceal secret-dependent exhaustion.

## Files and verification

Read relevant sources from plan 033, especially `src/lib/speciesService.ts`, `src/lib/maplibreLayers.ts`, `src/components/ExpeditionMapHud.tsx`, `src/game/boardTypes.ts`, `src/game/BackendPuzzle.ts`, `src/game/BoardView.ts`, `src/contexts/ExpeditionContext.tsx`, `src/lib/runProjection.ts`, `src/app/api/runs/route.ts`, and `src/lib/evidenceMoveVerification.ts`.

Repo gates: `npm run typecheck`, `npm test`, `npm run build`. Corpus verifier only when evidence semantics change: `npm run verify:case-compiler` (DB environment required). No tests were run for the documentation review. Existing `node:test` files establish behavioral test patterns.

The prior session changed only plan 033 and the plan index, plus this handoff. No game implementation, migrations, dependency installs, or commits were performed. The worktree also contains unrelated user/agent changes: inspect status and preserve them. Plans may still be untracked; do not assume they were committed or automatically visible in another checkout.

## New-chat starter

> Read `plans/COG_BOARD_HANDOFF.md` and `plans/033-cog-board-integration-review.md`. Continue the full COG GeoTIFF board-integration project. Create the detailed implementation plan for phase A, resolving extraction/fixture unknowns with focused investigation. Preserve the full A/B/C direction; keep B/C deferred until terrain extraction and routing are proven. Work from current v4 code, not historical plan 013. This turn is planning, not game-code implementation.
