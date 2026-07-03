---
sidebar_position: 2
title: Event Types Reference
description: Current EventBus event catalog with payload ownership
tags: [reference, eventbus, typescript]
---

# Event Types Reference

Source of truth: `src/game/EventBus.ts`.

The EventBus is a typed bridge between Phaser scenes and React UI/state. Phaser owns board runtime facts. React owns run phase, persistence, route/reward state, and most UI reactions.

## Summary

| Event | Direction | Purpose |
|-------|-----------|---------|
| `current-scene-ready` | Phaser -> React | Expose the live Phaser scene to `PhaserGame.tsx` |
| `cesium-location-selected` | React -> Phaser | Initialize a board from a map click, standard node, or Match Battle node |
| `game-score-updated` | Phaser -> React | Legacy score/move update |
| `game-over` | Phaser -> React | Legacy game-over fact |
| `new-game-started` | Phaser -> React | Start a species mystery |
| `clue-revealed` | Phaser -> React | Reveal one clue payload |
| `all-clues-revealed` | Phaser -> React | All clues for current species revealed |
| `species-guess-submitted` | React -> Phaser | Species guess result |
| `all-species-completed` | Phaser -> React | Location species queue complete |
| `game-reset` | Phaser/React -> React/Phaser | Reset board and UI state |
| `no-species-found` | Phaser -> React | Map click had no species data |
| `game-hud-updated` | Phaser -> React | Main score/move/streak HUD update |
| `game-restart` | React -> Phaser | Restart current board |
| `show-species-list` | React -> React | Switch to species catalog view |
| `expedition-data-ready` | React -> React | GIS expedition payload ready after map click |
| `expedition-start` | React -> React | Player accepted briefing |
| `battle-state-updated` | Phaser -> React | Legacy encounter battle HUD |
| `match-battle-combat-state-updated` | Phaser -> React | Match Battle combat HUD state |
| `match-battle-combat-ended` | Phaser -> React | Match Battle node won/lost |
| `match-battle-focus-skill-requested` | React -> Phaser | Spend stored Focus |
| `match-battle-reward-draft-opened` | React -> UI | Reward draft options ready |
| `match-battle-route-node-selected` | UI -> React | Player selected available route node |
| `match-battle-run-ended` | React/Phaser -> UI | Match Battle run outcome |
| `resource-wallet-updated` | React/Phaser -> React | Resource wallet changed |
| `consumable-found` | Phaser -> React | Consumable reward found |
| `consumable-use-requested` | React -> React/Phaser | Player requested item use |
| `consumable-used` | React/Phaser -> React | Consumable use resolved |
| `store-opened` | React/Phaser -> React | Store stock available |
| `store-purchase-requested` | React -> React | Player requested purchase |
| `store-purchase-resolved` | React -> React | Purchase result |
| `crisis-choice-requested` | React/Phaser -> React | Crisis options available |
| `crisis-choice-resolved` | React -> React | Crisis choice result |
| `node-advance-requested` | Phaser/UI -> React | Request to advance standard expedition node |
| `node-complete` | React -> Phaser/Cesium/UI | Node completion fact after React accepts advancement |
| `node-objective-updated` | Phaser -> React | Objective/spook/threat progress |
| `encounter-triggered` | Phaser -> React | Standard expedition encounter flash |
| `souvenir-dropped` | Phaser -> React | Standard expedition souvenir reward |
| `node-bonus-tick` | Phaser -> React | Spook/node bonus timer update |
| `clue-fragment-earned` | Phaser -> React | Deduction clue fragment gained |
| `clue-discount-earned` | Phaser -> React | Deduction clue discount gained |
| `trivia-unlocked` | Phaser -> React | Trivia reward unlocked |
| `node-rewards-summary` | Phaser -> React | Standard node reward lanes |
| `deduction-camp-purchase` | React -> React | Player bought a clue |
| `deduction-camp-guess` | React -> React | Player submitted final deduction guess |
| `auth-user-ready` | React -> React | Auth/session identity ready |

## Key Payloads

### cesium-location-selected

Initializes Phaser board state. The same event carries both standard expedition fields and Match Battle fields.

```typescript
interface Payload {
  lon: number;
  lat: number;
  ecoregionId?: number | null;
  habitats: string[];
  species: Species[];
  rasterHabitats: RasterHabitatResult[];
  difficulty?: number;
  obstacles?: NodeObstacle[];
  obstacleFamily?: ObstacleFamily | null;
  counterGem?: ActionGemType | null;
  requiredGems?: GemType[];
  activeAffinities?: AffinityType[];
  objectiveTarget?: number;
  objectiveProgress?: number;
  nodeIndex?: number;
  nodeType?: string;
  events?: string[];
  boardContext?: NodeBoardContext;
  boardConfig?: BoardSpawnConfig;
  encounterConfig?: EncounterConfig | null;
  matchBattleConfig?: MatchBattleBoardConfig;
  matchBattleNodeType?: MatchBattleNodeType;
  matchBattleCombat?: MatchBattleCombatState;
  matchBattleArmaments?: ArmamentDef[];
  matchBattleCombatants?: SpeciesCombatInput[];
}
```

### game-hud-updated

```typescript
interface Payload {
  score: number;
  movesRemaining: number;
  movesUsed: number;
  maxMoves: number;
  streak: number;
  multiplier: number;
  moveMultiplier?: number;
}
```

### expedition-data-ready

```typescript
interface Payload {
  lon: number;
  lat: number;
  ecoregionId?: number | null;
  expedition: ExpeditionData;
  species: Species[];
  rasterHabitats: RasterHabitatResult[];
  habitats: string[];
  featureFingerprints?: FeatureFingerprint[];
}
```

Emitted after `/api/protected-areas/at-point` returns GIS scoring, generated nodes, and species context.

### match-battle-combat-ended

```typescript
interface Payload {
  outcome: 'won' | 'lost';
  combat: MatchBattleCombatState;
  nodeIndex: number;
  cleanCapture: boolean;
  creditsDelta: number;
}
```

Phaser emits this when an enemy is defeated or player Stamina reaches 0. React then owns route completion, reward draft, final outcome, and checkpoint persistence.

### match-battle-route-node-selected

```typescript
interface Payload {
  routeNodeId: string;
}
```

Route map UI emits this. `ExpeditionContext.tsx` accepts only available nodes.

### node-advance-requested

```typescript
interface Payload {
  nodeIndex: number;
  reason:
    | 'objective_complete'
    | 'analysis_complete'
    | 'victory'
    | 'retreat'
    | 'store_closed'
    | 'crisis_resolved'
    | 'escaped';
  source: 'game' | 'panel';
  encounterOutcome?: {
    threats: Array<{
      id: string;
      threatType: string;
      progress: number;
      target: number;
      resolved: boolean;
    }>;
    finalSpookLevel: number;
    outcome: 'success' | 'escaped' | 'partial';
    chipDamageTotal: number;
  };
}
```

This is a request, not a completion fact. React validates it, mutates run state, persists as needed, then emits `node-complete`.

### node-objective-updated

```typescript
interface Payload {
  progress: number;
  target: number;
  requiredGems: GemType[];
  counterGem?: ActionGemType | null;
  activeAffinities?: AffinityType[];
  threats?: Array<{
    id: string;
    threatType: ThreatType;
    counterGem: ActionGemType;
    progress: number;
    target: number;
    resolved: boolean;
  }>;
  spookLevel?: number;
  chipDamagePool?: number;
  overallResolved?: boolean;
}
```

## Ownership Rules

- Phaser emits board facts: HUD changes, objective progress, combat state, combat end, encounters, rewards earned by board play.
- React emits user/navigation requests: route node selected, Focus skill requested, purchases, guesses, restarts.
- React owns persistence and phase transitions. `node-complete` should be emitted only after React accepts an advancement request.
- Keep React/Phaser surfaces mounted when they need EventBus listeners. Hide with CSS instead of unmounting.

## Related Docs

- [Match Battle](/docs/guides/game/match-battle)
- [Expedition Run Loop](/docs/guides/game/expedition-run-loop)
- [React-Phaser Bridge Tutorial](/docs/tutorials/react-phaser-bridge)
