# 034 — COG terrain in normal expeditions

User-approved implementation plan, 2026-09-19. Read 033 and COG_BOARD_HANDOFF for the full direction. Preserve unrelated changes.

## Scope and decisions

Integrate a fixed 6×6 habitat COG terrain clip into each of three normal expedition sites. Require successful terrain loading before creating a run. Phaser gems sit above fixed terrain; MapLibre shows identical cells locally and a locator footprint regionally. Preserve v4: five families, wrapping row/column shifts, six counted moves then evidence choice.

- A: geography, alignment, immutable persistence (this plan).
- B deferred: trails, party movement, player-directed crossings.
- C deferred: presence records and evidence analysis.

No traversal, crossing rewards, presence gates, evidence changes or spawn bias.

## Extraction and identity

Version the verified source descriptor: EPSG:3857, 388996×388996, north-up pixel-is-area, NoData 0, origin (-20037508.342789244, 20037508.342789248), pixel width 103.02166779498629, height -103.02166779498631. Expected ETag: `"975827817c839f73a5ee49d2791393a4-212"`. URLs come from existing environment configuration.

Transform final saved waypoints to EPSG:3857; floor source pixel coordinates, subtract three rows/columns, clamp the complete six-pixel window to source bounds, stride one. Request aligned bounds, coord_crs=epsg:3857, dst_crs=epsg:3857, band one, nearest sampling, mask enabled. Fetch raw values and habitat_custom RGBA separately; never infer codes from colors.

Server-only NumPy v1 decoder supports little-endian uint16 (2,6,6) values/mask and uint8 (4,6,6) RGBA. Validate magic, version, shape, ordering, dtype and exact length; no dependencies. Bound responses to 64 KiB and extraction to 20 seconds; three sites concurrently. Check source ETag before and after; mismatch requires verified descriptor update. No raster fetches during moves/resume.

Apply mask and code !== 0 before labels. Remove static 0=Water. Share nonzero static labels, retain database precedence and static fallback; compare database labels during implementation (tunnel unavailable during planning). Unknown valid labels: Habitat code ####; invalid: No habitat data. Snapshot resolved labels/colors; transparent or unmapped colors use neutral fill without changing validity.

## Immutable snapshots and creation

TerrainSnapshotV1 stores snapshot id, dataset revision, mapping version, extraction timestamp, source CRS/affine, source window, fixed dimensions, and 36 cells in column-major [x][y] order. Each cell stores source-pixel id, code, validity, label, display color. Identity derives from dataset revision and source column/row. Derive polygons from stored transform; do not duplicate coordinates.

Persist terrain in node boardContext JSON, separate from movable BoardCell.state and puzzle checkpoint. No DB migration or case-version change. Finish waypoint preparation, extract all three snapshots before transaction, insert run/nodes atomically. Duplicate create requests return original saved data. Extend public node projection, expedition node type and board-start event with optional terrain. Start/resume use the existing saved-run fetch.

Timeout, malformed extraction, source mismatch or bad configuration: 503 and no insert. Unsupported geographic coverage or wholly invalid clip: 422 asking for another location. Partial missing data remains playable and visibly marked. Legacy runs have no terrain/local view and retain rules; never backfill. Malformed saved terrain explicitly fails loading, never regenerates.

## Board and map

Dedicated Phaser terrain graphics beneath gems redraws on layout only; independent of shifts, gravity, clears, shuffles and RNG. Habitat fills, subtle boundaries; gems at 80% cell width with terrain. Cell dimensions/drag thresholds unchanged. Tap below drag threshold selects without spending a move; drags retain row/column behavior.

Keep MapLibre mounted with Local / Region controls. Terrain-backed play defaults Local: current site's 36 polygons, north-up, zero pitch, zoom 12–20, bounds padding 24 px. Region restores saved camera, route and three markers; adds clip footprint/locator. Fullscreen resizes without changing local zoom limits. Site change swaps snapshot and refits Local. Style reload recreates layers without terrain fetch.

One typed selection event carries snapshot id/cell id. Map/board highlight same ground cell and show saved label. Presentation-only selection resets on site changes and ignores other snapshots. Map animation never drives gameplay.

## Fixtures and verification

Record raw fixture/provenance at lon -84.1, lat 10.4, source column 103621, row 183195. Verified row-major codes (all masks 255); independent point request confirmed 1403:

```text
306 306 306 306 306 306
106 106 306 306 306 306
106 106 306 306 306 306
106 106 106 306 306 306
106 106 1403 106 106 106
306 306 106 106 106 106
```

Add asymmetric synthetic fixture with valid classes, zero and masked nonzero cells. Test decoder malformed/truncated/unsupported inputs; pixel alignment/corners/orientation; mask precedence; fixed terrain through shifts/cascades/refill/resize/shuffle; atomic failure/idempotency; resume with no raster fetch after revision change; legacy play; cameras and synchronized selection.

Run typecheck, npm test, build, React Doctor (fix introduced regressions). Browser checks at desktop/mobile: every cell selectable, ground visible, matching highlights, distinct clips per site, reload persistence, six moves/evidence behavior unchanged.

Implementation order: extraction/fixtures → persistence/projection → Phaser → local map/selection → regression/browser checks. Record actual verification results and outstanding environmental blockers; do not claim unperformed acceptance.

## Implementation and verification record

Implemented in working tree. No schema/case-version change, installed dependency, commit, or production data write. B/C remain deferred.

- Source/decoder/extractor: `src/terrain/{source,numpy.server,extract.server}.ts`. Creation fetches all final sites before the existing atomic transaction. Duplicate create paths preserve original nodes.
- Snapshot validation/projection and geometry: `src/terrain/terrain.ts`, `runProjection`, `ExpeditionContext`. Invalid persisted snapshots fail explicitly. Shared labels: `src/lib/habitatLabels.ts`.
- Phaser: separate fixed graphics, 80% gems, sub-threshold taps via the typed selection event. Scene background is below terrain. Map: saved GeoJSON, Local/Region cameras, resize/refit, style reload, clear selection on every site transition including revisits. Regional raster excluded from terrain-backed play/resume.
- Raw deployed fixture and provenance: `tests/fixtures/terrain/`; reproducible recorder: `node scripts/run-typescript.mjs scripts/record-terrain-fixture.ts`. All 36 supplied codes/masks matched, window `(103621,183195)`. Verified RGBA: 306=(240,166,37,255), 106=(42,244,52,255), 1403=(255,8,0,255). Both source HEADs matched the expected ETag.
- Read-only tunnel query compared all 82 database labels: nonzero labels match static lookup after trimming. Database's zero=Water row remains untouched and is excluded before lookup.
- Automated tests cover decoder rejection, bounds/orientation, asymmetric masks, size/time/revision failures, three-site extraction, actual creation-handler atomic/idempotent paths with external dependencies mocked, saved/legacy projection, camera/selection/style/resize lifecycle. Full suite: 35 test files pass. Typecheck and production build pass.
- React Doctor required diff run: 49/100; remaining findings predate this change. Comparable focused HEAD baseline 53/100 → implementation 74/100; new hook clean. Existing map-init cleanup warning is a false positive: teardown calls `map.remove()` and disconnects/cancels observers/timers. No suppressions added.
- Browser fixture uses production `Game`, `BoardView`, `ExpeditionMapHud`, EventBus, real MapLibre/WebGL, and the recorded snapshot. Desktop 1280×800 and mobile 390×844: all 36 map/board cells select with matching highlights; mobile cell centers are unobstructed; taps leave checkpoints unchanged; 80% gems and ground visible. Fullscreen retains 12–20. Region camera restores, site change/revisit clears selection and defaults Local, style reload rebuilds terrain, legacy has no Local view. Six real matching moves stop at six; cascades/Field Signal, refill, resize and shuffle preserve terrain. Snapshot survives fixture reload.
- Browser fixtures use mocked commit acknowledgements and synthetic shifted windows for additional sites; they do **not** establish authenticated server end-to-end acceptance. Browser was signed out. Live authenticated creation → three distinct fetched clips → evidence choice → reload remains the next manual acceptance check. No real run was created for testing.

For future dataset replacement, verify geometry/palette and regenerate fixtures before changing the source descriptor/ETag. Stored snapshots remain self-contained and are never reinterpreted against the new revision.
