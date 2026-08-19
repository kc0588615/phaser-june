# Game System Architecture

Current source of truth for React + Phaser gameplay.

## Runtime Ownership

- React owns app layout, expedition phase state, run persistence, deduction state, and node advancement.
- Phaser owns board state, input, matching, scoring, HUD events, clue events, and node objective progress.
- MapLibre owns map clicks, field-site selection, route trail rendering, and habitat/species overlays.
- Species/clue UI listens to typed events but does not own puzzle state.

## Active Loop

1. `MapLibreExploreMap` emits `expedition-data-ready` after a valid map click.
2. `ExpeditionContext` stores the payload and shows `ExpeditionBriefing`.
3. `expedition-start` creates a v3 case and starts a six-move research site.
4. Phaser reports each accepted move with exact board state and direct-clear family counts.
5. After move six, the server offers the highest-charged unused evidence families.
6. The player chooses a family; the server applies its fixed-strength clue and eliminates incompatible candidates.
7. The selected family locks, the next board excludes it, and remaining charge carries forward.
8. After three clues, the player guesses among the surviving candidates.

Stored v1/v2 cases are not playable and are rejected on resume.

## Active Events

- `expedition-data-ready`
- `expedition-start`
- `map-location-selected`
- `game-hud-updated`
- `evidence-move-resolved`
- `evidence-progress-committed`
- `node-objective-updated`
- `node-complete`
- `route-progress-updated`
- `clue-revealed`
- `show-species-list`
- `game-reset`
- `auth-user-ready`

Keep the event catalog small. Add new run events only when current UI or persistence needs them.

## Board Model

V3 maps five silhouette gems to evidence families: Relatives, Body, Behavior, Habits, and Place. Only direct clears charge families; cascades add flavor but do not charge evidence. Locked families stop spawning.

`BackendPuzzle.exportCheckpoint()` stores the exact grid, blockers, score, move count, refill queue, allowed gems, and RNG state after each accepted move. `ExplodeAndReplacePhase.matchGridState` is the snapshot used to count direct clears before cascade replacement.

## Run State

`RunState` in `src/types/expedition.ts` tracks:

- phase
- expedition payload
- current node index
- banked score
- versioned case stage, offers, selected methods/families, evidence, and v3 charge/checkpoint state
- route progress
- final score and completion reason

Run persistence is stored in `eco_run_sessions` and `eco_run_nodes`. Current writes should stay limited to active run, node, score, objective, clue, and route fields.

## Files

- `src/MainAppLayout.tsx` - layout and completion UI
- `src/contexts/ExpeditionContext.tsx` - run state, persistence, deduction state
- `src/game/EventBus.ts` - typed event contract
- `src/game/scenes/Game.ts` - Phaser board controller
- `src/game/BackendPuzzle.ts` - board model
- `src/game/BoardView.ts` - board rendering
- `src/game/nodeObstacles.ts` - obstacle/cell seed types
- `src/expedition/domain.ts` - gem registry and board spawn config
- `src/lib/nodeScoring.ts` - GIS-driven node generation
- `src/components/MapLibreExploreMap.tsx` - field-site selection and route trail
- `src/components/ExpeditionBriefing.tsx` - pre-run briefing
- `src/components/FieldHintTicker.tsx` - v3 live field-radio feed
- `src/components/EvidenceFamilyRail.tsx` - v3 totals, carry state, and inline choices
- `src/components/ExpeditionMapHud.tsx` - v3 MapLibre route map and travel/evidence readout
- `src/components/EvidenceLog.tsx` - persistent three-slot observation/inference/elimination trail
- `src/components/CandidateRoster.tsx` - persistent journal and final guess surface
- `src/components/FieldNotebook.tsx` - v1/v2 deduction UI
