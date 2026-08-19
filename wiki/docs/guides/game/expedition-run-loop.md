---
sidebar_position: 4
title: Expedition Run Loop
description: Current expedition progression
tags: [guide, game, expedition]
---

# Expedition Run Loop

Expeditions use the v3 loop: map -> six matches -> evidence-family choice -> automatic elimination -> species guess. Stored v1/v2 cases are rejected on resume.

## Flow

1. Player clicks a map location.
2. `MapLibreExploreMap` gathers nearby species, habitats, waypoints, GIS signals, and available affinities.
3. React shows `ExpeditionBriefing`.
4. Player starts the expedition.
5. `/api/runs` creates a v3 case and three board seeds.
6. At each site, six legal matches advance automatically. Directly cleared DNA/paw/eye/leaf-and-fang/map-pin gems charge Relatives/Body/Behavior/Habits/Place totals.
7. The HUD previews which top families the current totals would offer. Cascades score but do not charge evidence.
8. After move six, the player selects one offered family. The server applies its reviewed fixed-strength clue and removes incompatible candidates.
9. The chosen family locks and stops spawning; other totals carry to the next site.
10. A persistent field-radio ticker reports soft hints while the family rail shows charge and carry state.
11. The persistent six-species roster records clue families and elimination reasons.
12. After three clues, the player taps a live roster species. No interpretation prediction or citation is required in v3.

The three earned clues stay visible as Observation / Inference / Ruled out entries. Every candidate retains its portrait and gains a candidate-specific trait phrase for each played family, so the roster shows why the evidence separated the animals.

During the run, a MapLibre regional map shows the three research sites and route. Sites prefer 150–800 km spacing inside one contiguous One Earth region, with a 100 km non-failing fallback. MapLibre remains the region-selection and completed-run recap surface. Answer range geometry stays server-side until the correct verdict.

No energy or Insight currency exists. Score and guess bonuses are unchanged server-side; score is hidden in v3 until it has a visible reward.

## State

`RunState` in `src/types/expedition.ts` tracks:

- phase
- expedition payload
- current node index
- banked score
- family totals, likely choices, locked families, and exact board checkpoint
- fixed-strength observations and automatic eliminations
- route progress
- final score and completion reason

## Persistence

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/runs` | POST | Create run session and node rows. |
| `/api/runs/[runId]` | GET | Resume an owner’s v3 run. |
| `/api/runs/[runId]/evidence-progress` | POST | Commit a move and full board checkpoint. |
| `/api/runs/[runId]/evidence-choice` | POST | Apply a family clue and activate the next site. |
| `/api/runs/[runId]/guess` | POST | Check the final species guess. |
| `/api/runs/[runId]/range` | GET | Return answer range GeoJSON after an owner’s correct verdict. |

## Key Files

| File | Role |
|------|------|
| `src/types/expedition.ts` | Run state and clue economy types. |
| `src/lib/nodeScoring.ts` | GIS-driven node generation. |
| `src/game/scenes/Game.ts` | Board control, scoring, objective tracking. |
| `src/game/nodeObstacles.ts` | Obstacle typing and deterministic board-state seeding. |
| `src/contexts/ExpeditionContext.tsx` | Run phase state, persistence, node advancement. |
| `src/components/FieldHintTicker.tsx` | Queued deterministic field-radio hints. |
| `src/components/EvidenceFamilyRail.tsx` | Family totals, carries, locks, and choices. |
| `src/components/CandidateRoster.tsx` | Candidate journal and final guess surface. |
| `src/components/ExpeditionBriefing.tsx` | Start-run briefing. |
| `src/components/MapLibreExploreMap.tsx` | Map selection and route trail. |

## EventBus Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `expedition-data-ready` | React to React | Expedition generated, show briefing. |
| `expedition-start` | React to React | Player starts run. |
| `map-location-selected` | React to Phaser | Initialize puzzle with node params. |
| `node-objective-updated` | Phaser to React | Progress bar update. |
| `evidence-move-resolved` | Phaser to React | Persist the move and board checkpoint. |
| `evidence-progress-committed` | React to Phaser | Resume input after persistence. |
| `node-complete` | React to Phaser/MapLibre/UI | Evidence selected; advance to the next board. |
