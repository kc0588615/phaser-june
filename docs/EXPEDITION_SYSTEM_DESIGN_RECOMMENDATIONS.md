# Expedition System Design Recommendations

Recommendations based on the recent 12-gem / resource-wallet / board-pool work.

This is not a bug list. It is a design memo for improving the system architecture before battle, store, and crisis features add more state and event complexity.

---

## Current Shape

The recent work moved the project in a good direction:

- board gems now have two families: knowledge and resource
- resource gem matches now update a real `resourceWallet`
- board pool weighting can vary by node
- the HUD and run-complete flow now read the player-facing wallet from `resourceWallet`

The remaining design issue is that the new model sits on top of older expedition assumptions instead of fully replacing them. The code still spreads expedition rules across several files and layers:

- `src/types/expedition.ts`
- `src/game/gemSemantics.ts`
- `src/lib/nodeScoring.ts`
- `src/MainAppLayout.tsx`
- `src/game/scenes/Game.ts`
- `src/components/ExpeditionBriefing.tsx`
- `src/components/ActiveEncounterPanel.tsx`

That will make battle/store/crisis work harder to add cleanly.

---

## Recommendation 1: Create One Canonical Expedition Domain Module

### Problem

The project still has multiple partial sources of truth for the same concepts:

- gem display metadata in `src/types/expedition.ts`
- gem family and semantic meaning in `src/game/gemSemantics.ts`
- node-type behavior assumptions in `src/lib/nodeScoring.ts`
- board resource weighting in `src/MainAppLayout.tsx`
- UI labels in `src/components/ExpeditionBriefing.tsx`

This causes drift. A new gem, node type, or board rule currently requires touching multiple unrelated files.

### Recommendation

Create a dedicated module, for example:

- `src/expedition/domain.ts`

It should own:

- gem definitions
- resource definitions
- knowledge-category definitions
- node-mode definitions
- node-type display metadata
- default board config per node mode/type

Example structure:

```ts
export const RESOURCE_KEYS = ['nature', 'water', 'knowledge', 'craft'] as const;

export const GEM_REGISTRY = {
  red: { family: 'knowledge', clueCategory: 'classification', color: '#ef4444', icon: '🧬' },
  green: { family: 'knowledge', clueCategory: 'habitat', color: '#22c55e', icon: '🌿' },
  nature: { family: 'resource', resourceKey: 'nature', color: '#34d399', icon: '🍃' },
  water: { family: 'resource', resourceKey: 'water', color: '#38bdf8', icon: '💧' },
} as const;

export const NODE_TYPE_REGISTRY = {
  riverbank_sweep: {
    label: 'River',
    mode: 'collection',
    boardConfig: { resourceWeight: 0.35 },
  },
  storm_window: {
    label: 'Storm',
    mode: 'collection',
    boardConfig: { resourceWeight: 0.40 },
  },
  analysis: {
    label: 'Analysis',
    mode: 'analysis',
    boardConfig: { resourceWeight: 0.0 },
  },
} as const;
```

### Benefits

- removes duplicated label/color/icon mappings
- removes hand-maintained `resourceWeightForNode()`
- makes UI and runtime read the same registry
- makes future standoff/store/crisis node types much safer to add

---

## Recommendation 2: Move Expedition Run Logic Out of `MainAppLayout`

### Problem

`src/MainAppLayout.tsx` currently owns too much gameplay orchestration:

- expedition initialization
- node advancement
- wallet updates
- persistence
- event subscriptions
- board boot payload construction

That is acceptable for an early prototype, but it becomes fragile as soon as battle/store/crisis add more branching run state.

### Recommendation

Extract expedition state transitions into one dedicated unit:

- `src/expedition/useExpeditionRun.ts`
- or `src/expedition/controller.ts`
- or reducer + side-effect helpers

That controller should own:

- `RunState`
- transition functions
- event handlers for expedition events
- persistence side effects
- node boot payload generation

`MainAppLayout` should become mostly a renderer and wiring layer.

### Target Shape

```ts
const {
  runState,
  startExpedition,
  resolveNodeAdvance,
  applyResourceReward,
  applyStorePurchase,
  applyCrisisChoice,
} = useExpeditionRun();
```

### Benefits

- makes run behavior testable without rendering
- removes heavy game rules from layout code
- gives battle/store/crisis one place to integrate with run state
- reduces accidental coupling between UI concerns and run progression

---

## Recommendation 3: Remove Legacy Wallet Structures Soon

### Problem

`RunState` still contains:

- `gemWallet`
- `resourceWallet`

Only one should survive. The old wallet is now mostly a compatibility shell, but leaving it around invites future mistakes.

There is similar leftover duplication elsewhere:

- `GEM_DEFS` still uses legacy `nature_gem`-style keys
- `resourceBias` still uses `nature_gem` / `water_gem` / etc.

### Recommendation

Do a cleanup pass soon, before store/battle logic depends on the wrong structure.

### Suggested cleanup

1. Remove `gemWallet` from `RunState`.
2. Rename `resourceBias` keys from:
   - `nature_gem`
   - `water_gem`
   - `knowledge_gem`
   - `craft_gem`
   to:
   - `nature`
   - `water`
   - `knowledge`
   - `craft`
3. Delete `GEM_DEFS` and replace it with canonical resource defs from the domain module.
4. Update any persistence/API payloads to use only the new wallet shape.

### Benefits

- less translation code
- fewer naming mismatches
- easier UI work
- easier save/load behavior

---

## Recommendation 4: Extract Match Resolution Into a Pure Rules Layer

### Problem

`src/game/scenes/Game.ts` still mixes several rule systems in one scene:

- objective progress
- clue reveal logic
- resource payout
- move bonus scoring
- future battle effect hooks

That is manageable now, but battle/store/crisis will increase the branching logic a lot.

### Recommendation

Introduce a pure match-resolution layer, for example:

- `src/expedition/resolveMatchResults.ts`

Inputs:

- matched coordinates
- `matchGridState`
- node objective
- run modifiers
- current battle context

Outputs:

- `objectiveDelta`
- `resourceRewards`
- `knowledgeReveals`
- `scoreDelta`
- `battleEffects`
- `statusEffects`

### Example shape

```ts
interface MatchResolution {
  objectiveProgressDelta: number;
  resourceRewards: Partial<ResourceWallet>;
  clueReveals: Array<{ category: GemCategory; count: number }>;
  scoreBonus: number;
  battleEffects: {
    damage?: number;
    armorBreak?: number;
    telegraphAdvance?: number;
  };
}
```

The Phaser scene should animate and dispatch results, not decide all rules inline.

### Benefits

- easier to test
- easier to add battle damage and skills
- easier to let passives/items modify outcomes
- keeps board animation code from becoming rules-heavy

---

## Recommendation 5: Make Node Mode and Board Config Explicit in `RunNode`

### Problem

A lot of current behavior is inferred indirectly:

- `analysis` means no objective because `requiredGems` is empty
- board resource mix comes from a helper based on `node_type`
- UI mode is partially inferred from node labels and required gems

That is workable for collection-only runs, but not for standoff/store/crisis.

### Recommendation

Extend `RunNode` so it carries explicit runtime intent.

### Suggested additions

```ts
type NodeMode = 'collection' | 'analysis' | 'standoff' | 'crisis' | 'store';

interface RunNode {
  node_type: string;
  mode: NodeMode;
  difficulty: 1 | 2 | 3 | 4 | 5;
  boardConfig?: {
    resourceWeight: number;
    allowKnowledgeGems: boolean;
    allowResourceGems: boolean;
  };
  objective: {
    kind: 'required_gem_match' | 'survive' | 'defeat_creature' | 'choice' | 'shop';
    target: number;
    requiredGems?: GemType[];
  };
  obstacles: NodeObstacle[];
  events: string[];
  rationale: string;
}
```

### Benefits

- no more inference from empty arrays
- easier store/crisis/standoff integration
- API persistence becomes clearer
- UI can switch modes without guessing

---

## Recommendation 6: Promote Resource Wallet Updates to Reducer Actions, Not Generic Events

### Problem

`resource-wallet-updated` currently works, but it is still a loosely structured push event. As the run system grows, generic events like “updated” become harder to reason about:

- was this earned from a match?
- was it spent in a store?
- was it refunded?
- was it loaded from persistence?

### Recommendation

Move toward explicit action-shaped events or reducer actions:

- `resource-earned`
- `resource-spent`
- `store-purchase-committed`
- `battle-skill-cast`
- `crisis-cost-paid`

Or keep EventBus as a transport, but make payloads action-like:

```ts
{
  type: 'resource-earned',
  source: 'match',
  delta: { water: 2 }
}
```

### Benefits

- easier audit trail
- clearer analytics later
- easier persistence/replay/debugging
- fewer ambiguous “set/update” semantics

---

## Recommendation 7: Align Generation, Runtime, and Persistence Around the Same Node Contract

### Problem

Node generation, runtime handling, and persistence are still partially disconnected:

- generation creates nodes in `src/lib/nodeScoring.ts`
- runtime derives board behavior elsewhere
- API persistence infers objective type from `requiredGems.length`

This means battle/store/crisis will force multiple updates in different layers every time a node concept changes.

### Recommendation

Treat node generation as producing a ready-to-run contract, not a partial template.

The node object emitted from generation should already contain:

- `mode`
- `objective`
- `boardConfig`
- `eventConfig`
- `displayLabel`

Then:

- the API persists it directly
- React renders it directly
- Phaser boots from it directly

### Benefits

- fewer adapter layers
- less inference
- fewer broken assumptions between systems

---

## Safe Refactor Order

### Safe To Do Now

1. Create canonical gem/resource/node registries.
2. Rename `resourceBias` keys to the new wallet keys.
3. Remove `gemWallet` and legacy gem metadata helpers.
4. Move `resourceWeightForNode()` into the canonical node registry.
5. Convert `GemWallet`, briefing, and node-label UI to use the registry.

### Next Good Step

6. Extract expedition run state into a reducer/controller.
7. Convert wallet updates from generic “updated” events into explicit actions.
8. Introduce explicit `mode` and `objective` objects on `RunNode`.

### Best Done Alongside Battle/Store Implementation

9. Extract match resolution into a pure rules layer.
10. Wire `currentBattleState`, `equippedPassives`, `consumables`, and `pendingNodeModifiers` into the reducer/controller.
11. Make store/crisis/standoff screens consume the same run/node contract instead of adding one-off UI logic.

---

## Recommended Near-Term Goal

If only one architectural improvement is chosen before implementing battle/store screens, it should be:

**Create a canonical expedition domain module, then move run orchestration into a reducer/controller.**

That gives the rest of the feature work a stable base:

- one place for definitions
- one place for transitions
- one place for persistence decisions

Without that, every new feature will keep adding more “temporary” glue in UI and scene code.

