# GIS Gem Integration + Anchor Mysteries

Two phases, each gated by `npm run typecheck` + commit. `npm run build` at the end.
Same rules as plans/codex-execution-rules.md (no installs, no destructive git except
the `git rm` named below, BLOCKED: protocol, verify-first on cited sites).

## Context — decode of the design request

The old 9-gem doc's target mapping is ALREADY live in `src/expedition/domain.ts`
LOOT_GEM_DEFINITIONS: red=classification, blue=geographic, green=habitat,
orange=morphology, yellow=behavior(+diet via WALLET_KEY_TO_DEDUCTION_CATEGORIES in
src/lib/deductionEngine.ts), black=life_cycle, white=conservation, purple=key_facts.
DO NOT shuffle colors. Pink exists only as unused PNGs (no code refs in src/).

What changes: the board still spawns mostly RPG "action" gems (sword/staff/shield/
key/crate/power/thought/multiplier) with loot (clue) gems at only ~12%
(`lootChance: 0.12`, branch at src/game/BackendPuzzle.ts:243). Deduction-first means
every match should feed the investigation.

## Phase A — all-clue gem board
Commit: `phase A: all-clue gem board`

1. **Spawn only the 8 clue color gems.** In `src/game/BackendPuzzle.ts` (~line 243),
   remove the action-gem branch — every spawned gem comes from LOOT_GEM_TYPES.
   Leave the ActionGemType definitions/types in place (avoid ripple); note the dead
   spawn-config machinery as backlog in the commit body. Verify Game.ts handles a
   board with zero action gems (score paths, 4+-match free-move rule must survive).
2. **Habitat-weighted color spawn.** Weight the 8 colors by the run location's
   raster habitat mix, per the old doc: forest→green, savanna→orange,
   shrubland→black, grassland→white, wetland→blue, urban→red. Match on
   habitat_type keywords (forest/savanna/shrub/grass/wetland|marsh|bog/urban).
   Weight = uniform baseline 1.0 + 3.0 × summed percentage (0..1) for that color's
   habitat classes — all 8 colors must always remain spawnable. Verify-first: find
   where the board spawn config is built for a run (Game.ts / node config event) and
   thread the run's `rasterHabitats: RasterHabitatResult[]` (habitat_type,
   percentage — lives in the expedition payload, see ExpeditionContext ~152/689)
   into it. If rasterHabitats can't reach that site cleanly, fall back to
   `HabitatSignals` ratios (water→blue, forest→green, urban→red) and say so in the
   commit body.
3. **Blue absorbs habitat table clues.** In `src/lib/deductionEngine.ts`
   WALLET_KEY_TO_DEDUCTION_CATEGORIES: `geographic: ['geography', 'habitat']`,
   `habitat: []` (green is special-cased next). Matching blue now reads out
   geo_desc-style AND hab_desc-style clues from species_deduction_clues.
4. **Green = habitat survey gem (location data, not species table).** Green matches
   emit the run location's raster habitat types, highest percentage first, one per
   match, until exhausted. Implementation: add
   `habitatSurvey: { habitatType: string; percentage: number; revealed: boolean }[]`
   to ComparativeDeductionState (src/types/expedition.ts), seeded at run init from
   rasterHabitats sorted by percentage desc. In `handleDeductionClueTriggered`
   (src/contexts/ExpeditionContext.tsx:380): when the wallet key resolves to
   'habitat', reveal the next unrevealed survey entry instead of calling
   getNextClueForWalletKey; toast `Habitat survey: {habitatType} ({percentage}%)`.
   When all revealed, toast `Habitat survey complete` once, then nothing.
   Do NOT push these into processedClues (they'd collide with the compare system) —
   render them in FieldNotebook as a compact "Habitat survey" strip in the Revealed
   clues column (chips: name + %; unrevealed entries hidden, show
   `{n} more — match green gems`).
5. **Remove pink assets.** Confirm no `pink_gem` references in src/ (Preloader
   included), then `git rm public/assets/pink_gem_*.png` (8 files).
6. **Legend copy.** Find the gem legend UI that survived phase 1 (GemLegendDialog or
   SpeciesPanel HUD) and update: blue = "Geography & Habitat", green = "Habitat
   Survey (this location)". If no legend renders anymore, note it and skip.

## Phase B — anchor mystery sites
Commit: `phase B: anchor mystery sites`

Today `/api/expedition/waypoints` returns basecamp + 5 GIS anchors that CesiumMap
draws as numbered pins with a route line, but only one mystery (at the click point)
is playable — pins are dead decoration. Make each anchor an independent 1-3 min
mystery entry point.

1. **Tappable anchors.** In `src/components/CesiumMap.tsx`, make each anchor pin
   pickable. Tapping one starts a mystery run anchored at that waypoint's lon/lat,
   reusing the existing click→`emitExpeditionReadyFromMapClick` flow (re-fetch
   at-point data for the anchor coords, or reuse the region payload with the
   anchor's coords + metadata — verify which is cheaper/cleaner). Clicking empty
   map keeps current behavior (mystery at click point).
2. **Drop the false sequence.** Remove the `2., 3., ...` numbering and the route
   polyline; label pins by type+name only ("River: Klamath", "Protected: Trinity").
   Track played anchors this session (in-memory set in ExpeditionContext keyed by
   waypoint id/slot); played pins render dimmed with a check.
3. **node_type from anchor type** (CHECK constraint: riverbank_sweep, dense_canopy,
   urban_fringe, elevation_ridge, storm_window, crisis, analysis, custom):
   river/lake/wetland→riverbank_sweep, basecamp/city→urban_fringe,
   protected_area→dense_canopy, bioregion_edge→custom. Wire through the single-node
   generator (src/lib/nodeScoring.ts generateRunNodes) — pass the anchor type in,
   override the habitat-derived template when present.
4. **Anchor facts feed the blue gem.** When a run starts from an anchor, prepend
   1-2 synthetic DeductionClue entries to comp.mysteryClues at init: negative ids
   (-1, -2), category 'geography', compareTags null, revealOrder -1, labels from the
   anchor, e.g. `Site: Klamath River — riverine corridor`,
   `Inside protected area: Trinity, California`. getNextClueForWalletKey already
   sorts by revealOrder, so blue matches serve anchor facts first, then species geo
   clues. Verify placeReference/compare paths ignore null-compareTags clues (they
   do — handlePlaceReference returns early), and notebook ClueRow renders them as
   non-comparable info rows.
5. **Species bias per anchor (best-effort).** Where the mystery species is chosen
   (ExpeditionContext ~line 134, `correct`), if the run is anchor-started, prefer a
   species whose payload fields fit the anchor: river/lake/wetland → aquatic/
   freshwater flags or hab_tags; urban → urban-tolerant; protected_area → iucn
   threatened (VU/EN/CR). Verify-first what fields the at-point species payload
   actually carries; bias only on what exists, random fallback. Note chosen fields
   in the commit body.

## Done state
Both phases committed, typecheck clean, `npm run build` passes. Print commit list.
