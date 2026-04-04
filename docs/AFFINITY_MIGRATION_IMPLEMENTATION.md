# Affinity Migration Implementation Notes

This document records what has been implemented for the expedition affinity migration, what remains to be tracked next, and which files are part of the current system.

## Scope Implemented

The expedition run flow now supports:

- A single `counterGem` per node as the primary objective tool
- `requiredGems` retained as a derived compatibility field of `[counterGem]`
- One selected active affinity per run, chosen during the expedition briefing
- Affinity-aware objective contribution in the Phaser scene
- Panic-button consumables with explicit scene effects
- Additive run persistence of `activeAffinities` in run metadata and node tool profile

## Implemented Behavior

### Node Objective Model

- Nodes now carry `counterGem` and `obstacleFamily`
- `requiredGems` is still emitted for compatibility with existing UI and API readers
- Objective progress is strict: only matches of the node `counterGem` count
- Affinity math is applied in a detached resolver instead of inline match counting

### Affinity Model

- Available affinities are derived from species taxonomy and habitat hints
- The expedition briefing lets the player select one primary affinity
- The selected affinity is threaded into run state, node initialization, board spawn bias, and run persistence
- Current concrete affinity behavior includes:
  - `avian`: doubles `staff` objective contribution
  - `amphibian`: doubles `key` contribution on water nodes
  - `feline` and `burrower`: strengthen camouflage / spook slow effects
  - `primate` and `arachnid`: improve crate consumable quality
  - `reptile`: `staff` queues extra counter gems
  - `ungulate`: `key` grants minor spook relief
  - `fish`: ignores extra water-node spook pressure
  - `insect`: gives extra combo score on observe cascades

### Consumables

- Generic consumables were replaced with explicit tactical effects:
  - `Burst Camera`
  - `Field Scope`
  - `Bridge Kit`
  - `Hide Cloak`
  - `Supply Drop`
- Consumables now dispatch node-level scene commands instead of generic score or move modifiers
- Completed-node guardrails were added so items do not keep affecting a resolved node

### Persistence

- Run session metadata stores `activeAffinities`
- Node `hazardProfile` stores:
  - `obstacles`
  - `events`
  - `requiredGems`
  - `counterGem`
  - `obstacleFamily`
- Node `toolProfile` stores `activeAffinities`
- `counterGem` was intentionally removed from `toolProfile` to avoid duplicate sources of truth

## Files Involved

### Core Domain

- [src/expedition/domain.ts](/home/danby/phaser-june/src/expedition/domain.ts)
- [src/expedition/affinities.ts](/home/danby/phaser-june/src/expedition/affinities.ts)
- [src/expedition/gemEffects.ts](/home/danby/phaser-june/src/expedition/gemEffects.ts)

### Node and Resolver Logic

- [src/lib/nodeScoring.ts](/home/danby/phaser-june/src/lib/nodeScoring.ts)
- [src/game/nodeObstacles.ts](/home/danby/phaser-june/src/game/nodeObstacles.ts)
- [src/game/objectiveResolver.ts](/home/danby/phaser-june/src/game/objectiveResolver.ts)

### Phaser Scene and Event Flow

- [src/game/scenes/Game.ts](/home/danby/phaser-june/src/game/scenes/Game.ts)
- [src/game/EventBus.ts](/home/danby/phaser-june/src/game/EventBus.ts)
- [src/game/ui/ExpeditionRunnerStrip.ts](/home/danby/phaser-june/src/game/ui/ExpeditionRunnerStrip.ts)

### React Run Flow and UI

- [src/MainAppLayout.tsx](/home/danby/phaser-june/src/MainAppLayout.tsx)
- [src/components/CesiumMap.tsx](/home/danby/phaser-june/src/components/CesiumMap.tsx)
- [src/components/ExpeditionBriefing.tsx](/home/danby/phaser-june/src/components/ExpeditionBriefing.tsx)
- [src/components/ActiveEncounterPanel.tsx](/home/danby/phaser-june/src/components/ActiveEncounterPanel.tsx)
- [src/components/RunTrack.tsx](/home/danby/phaser-june/src/components/RunTrack.tsx)
- [src/components/ConsumableTray.tsx](/home/danby/phaser-june/src/components/ConsumableTray.tsx)

### Types and API Persistence

- [src/types/expedition.ts](/home/danby/phaser-june/src/types/expedition.ts)
- [src/app/api/runs/route.ts](/home/danby/phaser-june/src/app/api/runs/route.ts)
- [src/app/api/runs/[runId]/route.ts](/home/danby/phaser-june/src/app/api/runs/[runId]/route.ts)
- [src/components/CesiumMap.tsx](/home/danby/phaser-june/src/components/CesiumMap.tsx)

## Current Follow-Up Work

### High Priority

- Add automated tests for:
  - node generation and derived `requiredGems`
  - objective resolver affinity math
  - consumable side effects
- Decide whether `objectiveType` should be normalized for old and new rows or just tolerated as mixed historical values
- Review current affinity taxonomy mapping coverage and close obvious family gaps

### Medium Priority

- Improve UI language so not every highlighted gem implies "x2 progress"
- Add explicit UI text for affinity effect type:
  - progress boost
  - spook slow
  - crate quality
  - queue assist
- Consider moving affinity mapping data out to a more maintainable curated registry if the list grows
- Review filler-node variety rules for desired design behavior once unique counter gems are exhausted

### Lower Priority

- Persist permanent affinity unlocks at player/account scope
- Introduce route-earned temporary affinities if the design still wants them
- Revisit whether node-level obstacles should become a true ordered obstacle queue later

## Known Design Debt

- `requiredGems` still exists only for compatibility and should eventually be removed from downstream consumers
- Affinity UI currently shows a gem as "buffed" even when the mechanic is not specifically a progress multiplier
- Water-node detection is still heuristic and tied to obstacle IDs
- Affinity unlock progression is not yet persisted independently from run selection

## Verification Completed

- `npm run typecheck`

No dedicated automated test harness was added in this pass.
