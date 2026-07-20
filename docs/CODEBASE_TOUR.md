# Codebase Tour (start here if you're new)

A guided walk through how this game works, written for a solo developer or
beginner. Read it once top-to-bottom, then use the "common changes" table as
your day-to-day map. The deeper reference index lives in
`docs/DEVELOPER_ONBOARDING.md`.

## The game in one paragraph

The player clicks a point on a 3D globe. The game looks up the real
biodiversity there (species ranges, habitats, protected areas from a PostGIS
database), secretly picks a mystery species, and drops the player into a
match-3 board themed for that location. Matching colored "loot" gems earns
clue fragments in eight trivia categories (habitat, morphology, behavior, ...).
When the board node ends, the player uses those clues — plus comparisons
against species cards they already own — to deduce which species they were
tracking. Correct guesses grow their species album.

## The three worlds and the bridge

The app is three independent surfaces that stay mounted the whole session:

| World | Tech | Entry file |
|---|---|---|
| Globe | MapLibre (via maplibre) | `src/components/MapLibreExploreMap.tsx` |
| Board | Phaser 3 | `src/PhaserGame.tsx` → `src/game/main.ts` |
| UI/HUD | React + shadcn | `src/MainAppLayout.tsx` |

They never import each other's internals. Everything crosses through one
file: **`src/game/EventBus.ts`**, a typed event emitter. If you want to know
"how does X tell Y about Z?", the answer is always: search the event name in
EventBus's `EventPayloads` and grep for its `emit`/`on` calls.

## Life of a run (follow this in the code)

1. **Click the globe** — `MapLibreExploreMap.tsx` queries `/api/*` for what's at the
   point and emits `map-location-selected` with species + habitat data.
2. **Run is generated** — `/api/runs` (in `src/app/api/runs/route.ts`) scores
   the nearby GIS layers with `src/lib/nodeScoring.ts`, picks a node type
   (riverbank, canopy, ridge...), and persists an `eco_run_sessions` row.
3. **Briefing → mystery** — `src/contexts/ExpeditionContext.tsx` (the run
   state machine) moves `RunState.phase` from `idle` → `briefing` →
   `mystery` and tells the board to start via `expedition-start`.
4. **Board play** — `src/game/scenes/Game.ts` (Controller) reads input,
   `src/game/BackendPuzzle.ts` (Model, pure logic) resolves matches,
   `src/game/BoardView.ts` (View) animates. Loot-gem matches emit
   `deduction-clue-triggered`; the context converts them into clue fragments.
5. **Node complete** — the scene emits `node-advance-requested`; the context
   banks the score, checkpoints to `/api/runs/[runId]`, and enters the
   deduction phase.
6. **Deduction** — `src/lib/deductionEngine.ts` compares the mystery species'
   tag profile against reference cards the player slots in
   (`FieldNotebook.tsx` UI). A correct guess awards bonuses
   (`getDeductionFinalScore` in `src/types/expedition.ts`) and unlocks the
   species card.

## Directory map

```
src/
  MainAppLayout.tsx     app shell; switches visibility, never unmounts views
  PhaserGame.tsx        boots Phaser once, exposes game/scene ref
  game/                 everything Phaser
    EventBus.ts         THE React<->Phaser bridge (typed events)
    main.ts             Phaser config + scene list
    scenes/Game.ts      Controller: input, scoring, node flow
    BackendPuzzle.ts    Model: pure board rules (tested)
    BoardView.ts        View: sprites + animations
    boardTypes.ts       cell/grid types
    constants.ts        grid size, scoring multipliers, animation timings
    gemSemantics.ts     gem -> clue category helpers
    clueConfig.ts       clue categories + per-category clue payloads
    nodeObstacles.ts    deterministic board hazards per node (tested)
  expedition/
    domain.ts           gem registry + spawn-weight math (tested)
    affinities.ts       taxon affinity definitions (cosmetic bias)
  contexts/
    ExpeditionContext.tsx  run state machine (phases, banking, persistence)
    GameBridgeContext.tsx  HUD score snapshots from the board
  components/           React UI (MapLibreExploreMap, SpeciesPanel, FieldNotebook, ...)
  lib/                  server + shared logic (nodeScoring, deductionEngine,
                        speciesQueries, playerTracking, ...)
  app/api/              Next.js API routes (runs, species, layers, ...)
  db/schema/            Drizzle schema; db/migrations/ = SQL history
  types/                shared TS types (expedition RunState, waypoints, gis)
tests/                  characterization tests (mirrors src/ layout)
scripts/run-tests.mjs   offline test runner (esbuild + node:test)
```

## Key vocabulary

- **Run / expedition** — one play session started from a map click.
- **Node** — one board encounter within a run (currently runs have a single
  mystery node; the route/multi-node plumbing still exists).
- **Loot gems** — the 8 colored gems; each maps to a clue category.
- **Action gems** — sword/staff/shield/key/crate/power/thought/multiplier;
  used for objectives and countering obstacles.
- **Clue fragments** — per-category currency earned by matching loot gems.
- **Banked score** — board score carried into deduction and final scoring.
- **Deduction / field notebook** — the identify-the-species endgame.
- **Affinity** — a taxon "loadout" flavor that nudges gem spawn weights.

## Run, verify, test

```bash
npm run dev        # http://localhost:8080
npm run typecheck  # tsc, includes tests/
npm test           # offline unit tests (esbuild bundle + node --test)
```

`npm test` needs no network and no extra installs. When changing any pure
logic (board rules, scoring, spawn config), run it before and after — these
are characterization tests, so a failure means observable behavior changed.

## Where to make common changes

| I want to... | Start in |
|---|---|
| Change scoring/multipliers | `src/game/constants.ts` (+ `applyMoveBonuses` in `scenes/Game.ts`) |
| Change what a gem means | `src/expedition/domain.ts` (GEM_REGISTRY) |
| Add/adjust a node type | `src/lib/nodeScoring.ts` (NODE_TEMPLATES) + `domain.ts` (board meta) |
| Change board size | `GRID_COLS/GRID_ROWS` in `src/game/constants.ts` |
| Change clue text/categories | `src/game/clueConfig.ts`, seeds in `db/seeds/deduction/` |
| Change run phases/persistence | `src/contexts/ExpeditionContext.tsx`, `/api/runs/*` |
| Change the map behavior | `src/components/MapLibreExploreMap.tsx` |
| Change deduction rules | `src/lib/deductionEngine.ts` |
| Touch the database | `src/db/schema/*` + a NEW migration in `src/db/migrations/` (never edit applied ones) |
