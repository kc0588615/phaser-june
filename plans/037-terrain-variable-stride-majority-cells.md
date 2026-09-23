# 037 — Terrain variety: variable stride with majority-class cells

Owner request, 2026-09-20. Follows [034](034-cog-terrain-phase-a.md). Implementer: Grok. Preserve unrelated tree changes; no commit until the owner asks.

## Problem

Phase A clips six source pixels at ~103 m each, so a board covers ~620 m of ground. At that scale most sites are one habitat class and the terrain is visually and mechanically flat. The owner wants real variety, not invented variety.

## Decision

Cover more real ground per cell. Each board cell represents a `stride × stride` block of source pixels and takes the **majority (mode) class** of that block. The stride is chosen per site from the habitat mix so boards land with several classes when the landscape has them. Nothing is perturbed or hand-authored; every cell is still derived from the raster.

Locks:

- Stride ∈ {1, 4, 8, 16}. Default 8 (~820 m cells, ~5 km board). Cap 16 (~1.65 km cells, ~10 km board) so the Local map still matches what the player sees.
- Cell class = mode of valid (nonzero, unmasked) pixels in the block. Ties → lowest code (deterministic). A cell is **invalid** only when fewer than half its pixels are valid.
- Block alignment: window column/row are floored to a multiple of the stride so cell ids are stable per (revision, stride, col, row).
- No LLM, no authored overrides, no habitat inference beyond the mode.

## Stride selection per site

1. Reuse the existing TiTiler `/cog/statistics` histogram used by `speciesService` (10 km bbox). Extract that call into a server helper returning `{ code, share }[]`; do not change the client-facing function's behavior.
2. Start at stride 8. If the dominant class share ≥ 0.70, step to 16. If the histogram is unavailable or malformed, use 8. Never exceed 16, never go below 4 for new runs (stride 1 stays only for legacy snapshots and the recorded fixture).
3. Record the chosen stride and the histogram share that drove it in the snapshot (`strideReason: { dominantShare, chosen }`) so playtests can audit boring boards.

## Extraction

Preferred: one request per site, `bbox` = `6 × stride` source pixels, output `6x6.npy`, `resampling=mode`, mask on, as today otherwise. Verify first that the deployed TiTiler honors `resampling=mode` (rasterio `Resampling.mode`): request the recorded Costa Rica window at stride 8 and confirm the returned codes equal a locally computed mode over the raw 48×48 block.

Fallback if `mode` is not honored: request the raw `(6·stride)×(6·stride)` block with `nearest` and compute the mode in the server decoder. Raise the response bound from 64 KiB to 256 KiB (stride 16 raw uint16 = 96×96×2 B ≈ 18 KiB values + mask; RGBA 4× that). Keep the 20 s budget and the ETag check before/after.

Colors: still fetched from `habitat_custom` for the **chosen** class per cell, never inferred. With mode resampling the RGBA request uses the same params; in fallback, derive per-cell color from the class via the colormap request on the 6×6 mode grid or the existing static/database colormap.

## Snapshot v2

`TerrainSnapshotV2`: same shape as v1 plus `sourceWindow.stride ∈ {1,4,8,16}`, `strideReason`, and cell ids `terrainCellId(revision, stride, col, row)` where col/row are the block's top-left source pixel. Parse v1 and v2; v1 keeps stride 1 semantics and its id format. Never rewrite saved snapshots. Malformed v2 fails explicitly, like v1.

Geometry: `terrainCellPolygon` scales by stride from the stored transform. Local map zoom bounds may need to widen (currently 12–20); pick the fit so a 10 km board fills the panel with 24 px padding, and keep Region as is. The board-side terrain graphics are unchanged (still 6×6).

## Fixtures and tests

- Re-record the Costa Rica fixture at stride 8 (and keep the stride-1 raw fixture for v1 parsing tests). Store raw block + expected mode grid + provenance (ETag, window, stride, histogram used).
- Unit: mode with ties, half-invalid rule, alignment flooring, stride choice from histogram thresholds, v1/v2 parse, id stability, polygon scaling.
- Integration (mocked fetch): three sites concurrently at mixed strides; ETag mismatch aborts; oversize response aborts; fallback path when `mode` is rejected.
- Regression: legacy v1 runs still resume and render; 034 tests keep passing.
- Report the class-count distribution over 20 real coordinates (read-only TiTiler calls, no run creation): how many boards have ≥3 classes at stride 8 vs 16. That number is the acceptance signal for "variety", not a screenshot.

## Out of scope

Routing/Phase B sockets on the new scale, presence records, spawn bias, any change to gems, moves, ladders or evidence. Do not alter the Phase B prototype fixture; it stays on the stride-1 recording until B is rebased onto this.

## Gates

`npm run typecheck`, `npm test`, `npm run build`; React Doctor `--diff` no new findings; browser check at 1280×800 and 390×844 showing a multi-class board on at least one real site with the Local map matching cell for cell. Record actual results in this file. No commit.

## Implementation and verification record

Implemented in the working tree 2026-09-20. No commit, no schema/case-version change, no production data write. Routing prototype stays on the stride-1 Costa Rica recording.

- Snapshot v2: `src/terrain/terrain.ts`. v1 still parses with the old id format and stride 1. v2 ids are `revision:stride:col:row`. Geometry scales by stored stride. Local min zoom is 8 for stride ≥ 8, 12 for v1.
- Extraction: `src/terrain/extract.server.ts`, histogram helper `src/lib/habitatHistogram.ts`. New runs choose stride 8, or 16 when the 10 km histogram dominant share ≥ 0.70; missing histogram → 8. Window origin floors to a multiple of stride. Cell class is the mode of valid pixels; ties take the lowest code; a cell is invalid only when fewer than half its pixels are valid.
- Deployed TiTiler **does not** honor `resampling=mode` on the Costa Rica stride-8 window (6×6 mode grid ≠ local mode of the raw 48×48 nearest block). Production uses the raw-block fallback. Response bound is 256 KiB. `TITILER_HONORS_MODE_RESAMPLING = false`.
- Fixtures: stride-1 `costa-rica-raw.npy` / `costa-rica-rgba.npy` unchanged. New stride-8 block + RGBA + Titiler mode npy + `provenance-stride8.json` + `costa-rica-stride8.json`. Recorder: `node scripts/run-typescript.mjs scripts/record-terrain-stride.ts` (`variety` and `site` subcommands).
- Costa Rica −84.1, 10.4 at stride 8: 2 classes (106, 306), histogram dominantShare 0.400, chosen 8. Window `(103600, 183168)`.
- Variety signal, 20 real coordinates, read-only TiTiler, no run creation. Boards with ≥3 valid classes: **stride 8 = 9/20**, **stride 16 = 10/20**. Peru −76, −10 is 5 classes at stride 8 (1401, 1402, 307, 407, 109) and is the browser fixture (`tests/fixtures/terrain/variety-peru-stride8.json`, `/terrain-variety-fixture`).
- Automated: `npm run typecheck` pass; `npm test` 201 pass; `npm run build` pass (includes `/terrain-variety-fixture`).
- React Doctor `--diff` (vs origin/main): **49/100**. No findings on 037 files (`habitatHistogram.ts`, `extract.server.ts` majority path, `terrain.ts` v2, `TerrainVarietyFixture.tsx`). Remaining issues predate this slice (034 map-init cleanup false positive, 035/036 files, supply-chain).
- Browser, production `next start :8081` (owner `:8080` left running). Desktop 1280×800: Phaser 6×6 and Local map both select; board grid yielded five habitat labels matching the Peru snapshot; map clicks returned Pastureland, high-altitude shrubland, and high-altitude grassland on the shared readout. Mobile 390×844: Local map and board both select; map showed Forest / Pastureland; board taps showed Arable land, Pastureland, Grassland. Cell identity is the shared `terrain-cell-selected` event. Glyph 404s are the demotiles font, unrelated. Field-plate 401 is unsigned fixture, unrelated.
- Not done: authenticated live `POST /api/runs` three-clip playtest (unsigned 401). No commit.
