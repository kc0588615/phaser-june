# EventBus → Context Migration Plan

## Problem Statement

The `EventBus` (a Phaser `EventEmitter` singleton) is used for two fundamentally different purposes:

1. **Phaser ↔ React bridge** — legitimate: the game engine and React can't share state natively
2. **React ↔ React communication** — problematic: React components talk to each other through invisible pub/sub channels instead of props, context, or callbacks

This makes data flow impossible to trace from component signatures, creates duplicate listener registrations, and prevents React's rendering optimizations from working.

---

## Current EventBus Usage Map

### Events emitted by Phaser (Game.ts) → consumed by React

These are the **legitimate bridge** events that must stay on EventBus:

| Event | Emitter | React Consumers |
|-------|---------|-----------------|
| `current-scene-ready` | Game.ts:654 | PhaserGame.tsx |
| `game-hud-updated` | Game.ts:389 | useExpeditionRun, useSpeciesPanelState |
| `node-objective-updated` | Game.ts:288 | useExpeditionRun, ActiveEncounterPanel |
| `node-advance-requested` | Game.ts:303,317,364,1300 | useExpeditionRun |
| `encounter-triggered` | Game.ts:497 | ActiveEncounterPanel |
| `souvenir-dropped` | Game.ts:499 | useExpeditionRun |
| `resource-wallet-updated` | Game.ts:1084 | useExpeditionRun |
| `consumable-found` | Game.ts:1069,1131,1143 | useExpeditionRun |
| `clue-fragment-earned` | Game.ts:1131,1153 | useExpeditionRun |
| `clue-discount-earned` | Game.ts:1139 | useExpeditionRun |
| `node-bonus-tick` | Game.ts:1194 | useExpeditionRun, SpookMeter, ActiveEncounterPanel |
| `node-rewards-summary` | Game.ts:1224 | useExpeditionRun |
| `clue-revealed` | Game.ts:1356,1389,1419,1449,1479 | useExpeditionRun, useSpeciesPanelState |
| `all-clues-revealed` | Game.ts:1500 | useSpeciesPanelState |
| `new-game-started` | Game.ts:1620,2176 | useSpeciesPanelState, ClueSheetWrapper, SpeciesGuessSelector |
| `no-species-found` | Game.ts:1630 | useSpeciesPanelState |
| `all-species-completed` | Game.ts:2236 | useSpeciesPanelState |
| `crisis-choice-requested` | Game.ts:1590 | CrisisOverlay |
| `game-reset` | Game.ts:2424,2633 | useExpeditionRun, useSpeciesPanelState, useCesiumTrail |

### Events emitted by Phaser → consumed by Phaser

| Event | Emitter | Phaser Consumer |
|-------|---------|-----------------|
| `node-complete` | useExpeditionRun:171 | Game.ts:643, useCesiumTrail |
| `consumable-used` | useExpeditionRun:311 | Game.ts:646 |
| `deduction-camp-purchase` | useExpeditionRun:325 | Game.ts:647 |

These are React→Phaser commands. Legitimate bridge usage.

### Events emitted by React → consumed by React (MIGRATION TARGETS)

| Event | Emitter | React Consumer | Notes |
|-------|---------|----------------|-------|
| `expedition-data-ready` | CesiumMap.tsx:297,372 | useExpeditionRun, useCesiumTrail | Map → layout state. Pure React path. |
| `expedition-start` | MainAppLayout.tsx:209 | useExpeditionRun, useCesiumTrail, Game.ts | Mixed: also consumed by Phaser |
| `cesium-location-selected` | CesiumMap.tsx:320,395; useExpeditionRun:110,196 | Game.ts | React→Phaser command. Legitimate. |
| `game-reset` | useExpeditionRun:231; MainAppLayout:205 | Multiple React + Phaser | Mixed: both React and Phaser consume |
| `show-species-list` | useSpeciesPanelState:122 | MainAppLayout:62 | Pure React→React |
| `consumable-use-requested` | MainAppLayout:156 | useExpeditionRun:376 | Pure React→React (button click → state update) |
| `species-guess-submitted` | SpeciesGuessSelector:145 | useSpeciesPanelState, ClueSheetWrapper, Game.ts | Mixed: Phaser also consumes |
| `game-restart` | SpeciesPanel:30 | Game.ts | React→Phaser command. Legitimate. |
| `crisis-choice-resolved` | CrisisOverlay:76 | Game.ts | React→Phaser command. Legitimate. |

### Summary: What Can Move to Context

**Pure React→React (safe to migrate):**
- `show-species-list` — 1 emitter, 1 consumer
- `consumable-use-requested` — 1 emitter, 1 consumer
- `expedition-data-ready` — 1 emitter (CesiumMap), 2 consumers (useExpeditionRun, useCesiumTrail)

**Mixed React+Phaser (need dual approach):**
- `expedition-start` — emitted by React, consumed by both React hooks and Game.ts
- `game-reset` — emitted by both React and Game.ts, consumed by both
- `species-guess-submitted` — emitted by React, consumed by both React and Game.ts
- `new-game-started` — emitted by Game.ts, consumed by 3 React components independently

**Already legitimate bridge (no change):**
- All Phaser→React events (game-hud-updated, node-objective-updated, etc.)
- All React→Phaser commands (cesium-location-selected, game-restart, crisis-choice-resolved, consumable-used, deduction-camp-purchase)

---

## Duplicate Listener Problem

Several events have multiple independent React subscribers that maintain their own copy of the same state:

| Event | Subscribers | Duplicated State |
|-------|------------|------------------|
| `game-hud-updated` | useExpeditionRun, useSpeciesPanelState | HUD score, moves, multiplier |
| `clue-revealed` | useExpeditionRun, useSpeciesPanelState | Clue list |
| `node-bonus-tick` | useExpeditionRun, SpookMeter, ActiveEncounterPanel | Bonus pool / spook tier |
| `node-objective-updated` | useExpeditionRun, ActiveEncounterPanel | Progress toward objective |
| `game-reset` | useExpeditionRun, useSpeciesPanelState, useCesiumTrail | Reset state |
| `new-game-started` | useSpeciesPanelState, ClueSheetWrapper, SpeciesGuessSelector | Species name/id |
| `expedition-data-ready` | useExpeditionRun, useCesiumTrail | Expedition payload |

Each subscriber independently `on()`/`off()` the same event and maintains its own `useState`. With context, a single subscriber could hold the state and share it via provider.

---

## Implementation Plan

### Architecture: Two Contexts

```
GameBridgeContext          ExpeditionContext
├─ hudState                ├─ runState
├─ clues[]                 ├─ consumables[]
├─ speciesInfo             ├─ souvenirs[]
├─ bonusPool               ├─ wallet
├─ objectiveProgress       ├─ clueFragments
└─ currentNodeBoardCtx     └─ deductionCamp
```

**GameBridgeContext** — wraps the Phaser→React bridge. Single `useEffect` subscribes to all Phaser-emitted events, updates state, exposes it via context. All React components read from context instead of subscribing to EventBus individually.

**ExpeditionContext** — holds the run state machine (currently in useExpeditionRun). Consumes GameBridgeContext for Phaser data. Exposes run state + action callbacks to children.

### Step-by-Step Implementation

#### Step 1: Create GameBridgeProvider

New file: `src/contexts/GameBridgeContext.tsx`

- Single `useEffect` that subscribes to ALL Phaser→React events
- Stores derived state: `hud`, `clues[]`, `bonusPool`, `objectiveProgress`, `speciesInfo`, `encounterFlash`
- Exposes via `useGameBridge()` hook
- Components like SpookMeter, ActiveEncounterPanel, SpeciesPanel read from context instead of subscribing individually
- **EventBus listeners move from 6 files into 1 provider**

```tsx
// Pseudocode
const GameBridgeContext = createContext<GameBridgeState>(null!);

export function GameBridgeProvider({ children }) {
  const [hud, setHud] = useState<GameHudUpdatedEvent>(INITIAL_HUD);
  const [clues, setClues] = useState<CluePayload[]>([]);
  const [bonusPool, setBonusPool] = useState<BonusPoolState | null>(null);
  // ... etc

  useEffect(() => {
    EventBus.on('game-hud-updated', setHud);
    EventBus.on('clue-revealed', (clue) => setClues(prev => [clue, ...prev]));
    EventBus.on('node-bonus-tick', setBonusPool);
    // ... all Phaser→React events
    return () => { /* cleanup all */ };
  }, []);

  return <GameBridgeContext.Provider value={{ hud, clues, bonusPool, ... }}>{children}</GameBridgeContext.Provider>;
}
```

#### Step 2: Create ExpeditionProvider

New file: `src/contexts/ExpeditionContext.tsx`

- Refactor `useExpeditionRun` into a context provider
- Consumes `useGameBridge()` for HUD/clue data instead of its own EventBus subscriptions
- Exposes `runState`, `handleAffinitySelected`, `handleRunReset`, `handleCrisisToolSpend`, `handleDeductionPurchase`, `handleDeductionGuessResult`
- The `expedition-data-ready` event gets replaced with a direct callback from CesiumMap → ExpeditionProvider (via context setter or callback prop)

#### Step 3: Replace Pure React→React Events

| Event | Current Flow | New Flow |
|-------|-------------|----------|
| `show-species-list` | useSpeciesPanelState emits → MainAppLayout listens | Callback prop or shared context setter |
| `consumable-use-requested` | ConsumableTray emits → useExpeditionRun listens | Direct callback from ExpeditionContext |
| `expedition-data-ready` | CesiumMap emits → useExpeditionRun + useCesiumTrail listen | CesiumMap calls `expeditionCtx.startExpedition(data)` |

#### Step 4: Refactor Consumers

| Component | Current | After |
|-----------|---------|-------|
| SpookMeter | `EventBus.on('node-bonus-tick')` → local state | `const { bonusPool } = useGameBridge()` |
| ActiveEncounterPanel | 3 EventBus subscriptions → 3 local states | `const { bonusPool, objectiveProgress, encounterFlash } = useGameBridge()` |
| useSpeciesPanelState | 8 EventBus subscriptions | `const { hud, clues, speciesInfo } = useGameBridge()` — most state comes from context |
| ClueSheetWrapper | 2 EventBus subscriptions | Props from parent (speciesInfo from context) |
| SpeciesGuessSelector | 1 EventBus subscription | Props from parent |

#### Step 5: Keep EventBus for True Bridge Events

EventBus remains for:
- React→Phaser commands: `cesium-location-selected`, `game-restart`, `consumable-used`, `deduction-camp-purchase`, `crisis-choice-resolved`, `expedition-start`, `node-complete`
- The single Phaser→React bootstrap: `current-scene-ready`

Mixed events (`game-reset`, `expedition-start`, `species-guess-submitted`) get dual treatment: the context provider subscribes to the EventBus for the Phaser-originated version, and React components use context/callbacks for the React-originated version.

### Provider Mounting

```tsx
// MainAppLayout.tsx (or _app.tsx)
<GameBridgeProvider>
  <ExpeditionProvider>
    <MainAppLayout />
  </ExpeditionProvider>
</GameBridgeProvider>
```

### Migration Order (Safest Path)

1. **GameBridgeProvider** + migrate SpookMeter and ActiveEncounterPanel (smallest consumers, 1-3 listeners each)
2. **Migrate useSpeciesPanelState** to read from GameBridgeContext (8 listeners → context reads)
3. **ExpeditionProvider** from useExpeditionRun (14 listeners → context reads + Phaser bridge subset)
4. **Replace pure React→React events** (show-species-list, consumable-use-requested, expedition-data-ready)
5. **Clean up duplicate state** (hud, clues, bonusPool stored in 1 place instead of 3)

### Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stale closure in context value | High | Use `useRef` + `useSyncExternalStore` pattern, or ensure context value is stable via `useMemo` |
| Re-render cascade from context changes | Medium | Split context into multiple (GameBridge vs Expedition), use `useMemo` on provider value, consider `use` selector pattern |
| Phaser timing: events fire before provider mounts | Medium | GameBridgeProvider must mount before PhaserGame; EventBus queues are fire-and-forget so early events are lost — same as current behavior |
| Breaking ClueDisplay.tsx / SpeciesPanel.old.tsx | Low | These are legacy/unused components — can be deleted |
| Event ordering changes | Medium | EventBus is synchronous (Phaser emitter). Context `setState` is async (batched). Handlers that depend on synchronous ordering may break. Test node-advance flow carefully. |

### Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| EventBus listeners in React | ~45 | ~12 (bridge-only) |
| Components subscribing to EventBus | 10 | 3 (GameBridgeProvider, ExpeditionProvider, PhaserGame) |
| Duplicate state copies (hud, clues, etc.) | 3-4 per datum | 1 per datum |
| Data flow traceability | Invisible (pub/sub) | Explicit (props/context) |
| Files touched | — | ~12 (2 new providers, 8 refactored consumers, 2 layout files) |

### Files to Create

- `src/contexts/GameBridgeContext.tsx` — Phaser→React event subscriber + state provider
- `src/contexts/ExpeditionContext.tsx` — Run state machine + action callbacks

### Files to Modify

- `src/MainAppLayout.tsx` — Wrap with providers, remove EventBus listener for show-species-list
- `src/components/SpookMeter.tsx` — Replace EventBus.on with useGameBridge()
- `src/components/ActiveEncounterPanel.tsx` — Replace 3 EventBus.on with useGameBridge()
- `src/components/CrisisOverlay.tsx` — Replace 2 EventBus.on with useGameBridge()
- `src/components/ClueSheetWrapper.tsx` — Replace 2 EventBus.on with props from context
- `src/components/SpeciesGuessSelector.tsx` — Replace EventBus.on with props
- `src/hooks/useSpeciesPanelState.tsx` — Rewrite to consume GameBridgeContext
- `src/hooks/useExpeditionRun.ts` — Refactor into ExpeditionProvider
- `src/hooks/useCesiumTrail.ts` — Consume ExpeditionContext for expedition-data-ready
- `src/components/CesiumMap.tsx` — Call context setter instead of EventBus.emit for expedition-data-ready

### Files to Delete

- `src/components/SpeciesPanel.old.tsx` — Legacy duplicate, unused
- `src/components/ClueDisplay.tsx` — Legacy duplicate with 6 EventBus subscriptions, replaced by DenseClueGrid + ClueSheetWrapper
