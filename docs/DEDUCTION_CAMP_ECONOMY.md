# Deduction Camp & Banked-Score Economy

Current expedition-economy doc for the shipped loop: banked score + clue fragments + Deduction Camp. It also notes a few typed hooks and planned expansions that are not fully realized yet.

Read after [YMBAB_CONVERSION.md](./YMBAB_CONVERSION.md) and [EXPEDITION_RUN_LOOP.md](./EXPEDITION_RUN_LOOP.md).

## Purpose

The old runtime revealed clues directly during board play when loot gems matched. This created urgency that conflicted with the intended low-stress explorer-science feel.

The new system:

- Loot gem matches during runs earn **clue fragments** (category-specific counters) instead of immediate clue reveals
- Match score is **banked** per node (never lost)
- After the route finishes, or after an early escape, a **Deduction Camp** phase opens where banked score buys clue reveals
- Fragments provide purchase discounts
- Player guesses the species when confident

## Design Position

Deduction Camp is no longer just a stopgap economy screen. It is the project's main answer to the question: "What replaces the boat?"

The intended role is:

- end-of-run evidence review
- score sink for additional clues
- confidence-testing guess phase
- soft landing for both successful and partially successful expeditions

This means the game should continue to evolve around Deduction Camp, not away from it.

## Run Phase Change

`RunPhase`: `idle` → `briefing` → `in-run` → `deduction` → `complete`

The `deduction` phase is new. It replaces the old direct transition from `in-run` → `complete`. The player must identify the species before the run ends.

## Relationship To YMBAB

This system is intentionally a divergence from YMBAB's original meta loop.

YMBAB uses:

- permanent upgrades
- quest gating
- multiple run currencies feeding long-term progression

Critter Connect now uses:

- banked run score
- clue fragments as category-specific discounts
- end-of-run clue purchases
- species identification as the win condition

The board still borrows YMBAB's action-board language, but Deduction Camp is the main mechanic that makes this project its own game.

## Board Visual (YMBAB Style)

### Grid dimensions

Changed from 7×7 to 6 columns × 8 rows.

**File:** `src/game/constants.ts`

```
GRID_COLS = 6
GRID_ROWS = 8
```

### Gem spacing

Gems now fill entire cells with no gap (was 10% gap).

**File:** `src/game/BoardView.ts` (line ~726)

- Scale factor changed from `0.9` to `1.0`

### Board height

Usable height factor adjusted from `0.7875` to `0.85` for the taller 8-row board.

**File:** `src/game/scenes/Game.ts` (line ~1426)

All consumers (BackendPuzzle, BoardView, nodeObstacles) reference `GRID_COLS`/`GRID_ROWS` from constants and auto-adjust.

## New Economy Data Model

**File:** `src/types/expedition.ts`

### New types

| Type | Purpose |
|------|---------|
| `ClueCategoryKey` | `'classification' \| 'habitat' \| 'geographic' \| 'morphology' \| 'behavior' \| 'life_cycle' \| 'conservation' \| 'key_facts'` |
| `ClueFragments` | `Record<ClueCategoryKey, number>` — fragment counts per category |
| `ClueShopEntry` | Per-category shop state: `{ category, purchased, fragmentCount }` |
| `DeductionCampState` | Full camp state: banked score, fragments, shop entries, guess result, bonuses |
| `NodeBonusState` | Decay timer state: `{ startPool, currentPool, decayRate, floorPct, shieldSlowActive }` |
| `NodeRewardLanes` | Per-node reward breakdown: base + bonus + trivia + fragments |

### Helper functions

| Function | Purpose |
|----------|---------|
| `createEmptyClueFragments()` | Init all fragment counts to 0 |
| `getClueShopCost(purchased, fragments, thoughtDiscountPct)` | Escalating cost with fragment discount and run-level thought discount |
| `getGuessBonuses(totalPaid, isCorrect)` | Guess bonus: +250 base; efficiency tiers: 0-2 clues = +200, 3-5 = +100, 6+ = +25 |

### RunState extensions

New fields added to `RunState`:

- `bankedScore: number` — accumulated research score across nodes
- `clueFragments: ClueFragments` — category-specific fragment counts
- `triviaUnlocked: string[]` — typed placeholder for future trivia content; currently remains empty in the expedition loop
- `deductionCamp: DeductionCampState | null` — populated when entering deduction phase
- `currentNodeBonus: NodeBonusState | null` — typed placeholder for persisted spook state; current React UI reads live `node-bonus-tick` events instead
- `lastNodeRewards: NodeRewardLanes | null` — most recent node reward breakdown
- `finalScore: number | null` — populated after a correct deduction
- `totalThoughtDiscount: number` — accumulated end-of-run clue-shop discount from thought matches

## Active Economy Events

**File:** `src/game/EventBus.ts`

| Event | Payload | Source → Consumer |
|-------|---------|-------------------|
| `node-bonus-tick` | `{ currentPool, startPool, pct, tier }` | Game.ts → ActiveEncounterPanel |
| `clue-fragment-earned` | `{ category, amount, source }` | Game.ts → MainAppLayout |
| `clue-discount-earned` | `{ amount, source }` | Game.ts → MainAppLayout |
| `node-rewards-summary` | `NodeRewardLanes` | Game.ts → MainAppLayout |
| `deduction-camp-purchase` | `{ category, cost }` | MainAppLayout → Game.ts |

Typed in the EventBus but not active end-to-end in the current expedition runtime:

- `trivia-unlocked`
- `deduction-camp-guess`

## Gem Effect System

**File:** `src/expedition/gemEffects.ts` (new)

Pure function `getGemEffects(gemType, matchSize) → GemEffect[]`:

| Gem (code) | Label | Effect | Description |
|------------|-------|--------|-------------|
| sword | Observe | `direct_score` | Adds score directly |
| staff | Scan | `trivia_boost` | Increases trivia roll chance |
| shield | Camouflage | `decay_slow` | Halves spook meter decay for 5s |
| key | Traverse | `open_cache` | Rolls score/trivia/fragment |
| power | Focus | `score_multiply` | Multiplies node score payout |
| thought | Field Notes | `clue_discount` | Reduces end-run clue costs |
| crate | Backpack | `grant_consumable` | Rolls a consumable item |
| multiplier | Burst | `combo_enhance` | Temporary combo boost |
| loot gems (8) | (by color) | `clue_fragment` | Category-specific fragment by `LOOT_CATEGORY_MAP` |

### Loot → Category mapping

```
red → classification
green → habitat
blue → geographic
orange → morphology
yellow → behavior
black → life_cycle
white → conservation
purple → key_facts
```

## Match Pipeline Change

**File:** `src/game/scenes/Game.ts`

During expeditions (`inExpeditionRun === true`):

- `emitMatchEconomyRewards` routes through `emitExpeditionGemEffects()` instead of the legacy wallet system
- `processMatchedGemsWithOriginalTypes` and `processMatchedGemsForClues` are skipped (guarded with `if (this.inExpeditionRun) return;`)
- Loot gem matches emit `clue-fragment-earned` instead of `clue-revealed`
- Free-play retains the old direct-reveal behavior unchanged

## Spook Meter

**File:** `src/game/scenes/Game.ts`

The former "node bonus decay timer" is now a **spook meter** with three outcome tiers. See [EXPEDITION_RUN_LOOP.md](./EXPEDITION_RUN_LOOP.md#spook-meter-chase-pressure) for full details.

### Properties

- `nodeBonusPool` / `nodeBonusStart` / `nodeBonusDecayRate` / `nodeBonusFloorPct` (floor = 0.2)
- `nodeBonusShieldSlow` / `nodeBonusShieldExpiry`
- `nodeBonusTimer` — Phaser `time.addEvent` at 1s interval

### Tier multipliers

| Tier | % Range | Base reward | Bonus multiplier | Run effect |
|------|---------|-------------|------------------|------------|
| Stabilized | > 60% | 1.0x | 1.0x | Continue |
| Spooked | 20–60% | 0.75x | 0.5x | Continue |
| Escaped | ≤ 20% | 0.5x | 0x | Skip to Deduction Camp |

### UI

**File:** `src/components/ActiveEncounterPanel.tsx`

- Listens for `node-bonus-tick` (now includes `tier: SpookTier`)
- Displays "Tracking" label with tier-specific text: Stabilized / Spooked! / Escaping...
- Color-coded bar: green > 60%, amber 20-60%, red ≤ 20%

### Escape → Deduction Camp

When the meter hits escaped (or moves are exhausted during an expedition), MainAppLayout skips remaining nodes and transitions directly to `phase: 'deduction'`. The player enters Deduction Camp with partial evidence — fewer fragments and less banked score, but still playable.

## Score Banking

On node completion (`node-advance-requested` or `handleNodeComplete`):

1. `stopNodeBonusDecayAndEmitRewards()` computes: `baseClearReward + preservedNodeBonus + triviaReward`
2. Emits `node-rewards-summary`
3. MainAppLayout adds total to `bankedScore`

All 3 `node-advance-requested` emission sites + the panel-completed path (`handleNodeComplete`) call the stop/emit method.

## Why Banking Stays

Banked score is a core pillar of the new identity and should remain even if the live pressure loop becomes more dynamic.

Reasons:

- it preserves a feeling of progress during exploratory play
- it avoids the punitive feel of score loss
- it gives the player a clear resource to weigh against clue certainty
- it makes early expedition termination still productive rather than empty

## Deduction Camp

### Component

**File:** `src/components/DeductionCamp.tsx` (new)

Renders inside the bottom 40% area (same slot as CesiumMap/briefing):

1. **Score bar** — banked / spent / available
2. **Clue Market** — 2×4 grid of 8 categories with:
   - Category icon + name
   - Fragment count + purchase count
   - Escalating cost button (disabled if insufficient score or already guessed correctly)
3. **Purchased clues display** — `DenseClueGrid` showing clues revealed via purchases from run state
4. **Species guess** — `SpeciesGuessSelector` (10-choice dropdown: 9 random + 1 correct)
5. **Result display** — correct/wrong feedback with bonus breakdown
6. **On correct guess** — transition to the completion summary, which offers reset/new expedition

### Planned expansion

As the run loop becomes more chase-driven, Deduction Camp should absorb more of the strategic depth instead of forcing all tension into live node play.

Candidate expansion areas:

- category-specific clue bundles
- habitat-aware clue pricing modifiers
- trivia entries that give non-binary confidence signals
- partial-run summaries when the animal escapes before the full route is cleared
- explicit "guess now vs buy more evidence" presentation

### Clue purchase flow

```
User clicks "Buy" button in DeductionCamp
  → onPurchase(category, cost)
  → MainAppLayout.handleDeductionPurchase:
      - Deducts cost from camp.scoreSpent
      - Increments camp.clueShop[category].purchased
      - Resets 'wrong' guessResult to null (allows re-guess)
      - Emits 'deduction-camp-purchase' event
  → Game.ts.handleDeductionCampPurchase:
      - Maps ClueCategoryKey → GemCategory via static lookup
      - Calls revealCluesForCategory(gemCat, 1)
      - This uses the existing progressive clue system (WeakMap-based)
      - Emits 'clue-revealed' with full CluePayload
  → Two listeners receive 'clue-revealed':
      1. SpeciesPanel (always mounted, display:none) → receives the event, but clue toasts are suppressed during Deduction Camp
      2. MainAppLayout → appends clue to deductionCamp.revealedClues for DeductionCamp rendering
```

### Guess flow

```
User selects species from SpeciesGuessSelector dropdown
  → onGuessResult(isCorrect)
  → MainAppLayout.handleDeductionGuessResult:
      - Correct: sets guessResult='correct', computes bonus, persists final score, transitions to `complete`
      - Wrong: sets guessResult='wrong', adds 25pt penalty
  → Complete summary renders with the final deduction score
```

### Scoring formula

- `finalScore = bankedScore - scoreSpent + guessBonus + efficiencyBonus`
- Wrong penalty: -25 pts per wrong guess
- Guess bonus: +250 (flat)
- Efficiency bonus: based on total clues purchased — 0-2 clues: +200, 3-5: +100, 6+: +25

### Planned tuning direction

Keep the overall shape of the formula even if exact numbers change:

- **banked score** should remain the stable base
- **clue spend** should remain the key tradeoff
- **guess bonus** should reward confidence
- **efficiency bonus** should reward solving with less purchased certainty

Avoid:

- direct loss of already banked progress during the run
- overly punishing wrong-guess penalties
- clue pricing that forces perfect play to participate in deduction

## Clue List Page Removal

The old clue list toggle (PiListMagnifyingGlass icon that switched between map and clue list views) has been removed.

**File:** `src/MainAppLayout.tsx`

- Removed `PiListMagnifyingGlass` and `PiGlobeHemisphereWestThin` icon imports
- Removed the clue list toggle button
- `viewMode` type narrowed from `'map' | 'clues' | 'species'` to `'map' | 'species'`
- `SpeciesPanel` remains mounted but always `display: none` — it still listens for `clue-revealed`, but clue toasts are disabled during Deduction Camp
- `toastsEnabled={viewMode === 'map' && !showDeduction}` so gameplay/map toasts still fire, while Deduction Camp purchases render directly in the clue grid without toast spam

## CesiumMap Guard

**File:** `src/components/CesiumMap.tsx`

Added `'deduction'` to the guard that blocks map clicks during runs.

## Files Changed

### Created

| File | Purpose |
|------|---------|
| `src/expedition/gemEffects.ts` | Pure gem effect definitions |
| `src/components/DeductionCamp.tsx` | End-of-run clue market + guess UI |

### Edited

| File | Changes |
|------|---------|
| `src/game/constants.ts` | Grid 7×7 → 6×8 |
| `src/game/BoardView.ts` | Gem gap removed (0.9 → 1.0 scale) |
| `src/game/scenes/Game.ts` | Board calc, gem effects pipeline, bonus decay timer, node rewards, deduction purchase handler, expedition guards on clue reveal |
| `src/types/expedition.ts` | New types, RunPhase extended with 'deduction', RunState extended |
| `src/game/EventBus.ts` | Typed expedition economy events (only a subset are active end-to-end today) |
| `src/MainAppLayout.tsx` | RunState extensions, deduction phase, new handlers, clue list removal |
| `src/components/ActiveEncounterPanel.tsx` | Node bonus decay bar |
| `src/components/CesiumMap.tsx` | Deduction phase click guard |

## Verification

- `npm run typecheck` — passes

## Current Limitations

- Spook meter decay rates and tier thresholds (60%/20%) are first-pass estimates — need playtesting
- Clue shop costs (40/70/110 escalation, fragment discount formula) need tuning
- Guess bonuses (250 base, 200/100/25 efficiency tiers) need balancing
- Scan/trivia hooks exist, but there is no real trivia content pipeline yet
- `score_multiply` and `clue_discount` gem effects accumulate per-node but reset between nodes
- Free-play mode retains the old direct-clue-reveal behavior unchanged
- Escaped expeditions do not yet show a partial-run summary before Deduction Camp

## Planned Next Steps

1. Keep Deduction Camp as the stable meta loop while experimentation happens in the live node pressure model.
2. ~~Re-theme the existing action-gem effects around field observation, stealth, traversal, notes, and supplies.~~ — done
3. ~~Prototype an "animal spook" or "tracking window" readout by reusing the current node bonus channel.~~ — done
4. ~~Support early expedition termination by carrying partial score and clue fragments into Deduction Camp.~~ — done
5. Tune clue pricing and wrong-guess penalties around low-stress play, not around YMBAB-level panic pacing.
6. Add partial-run summary UI for escaped expeditions entering Deduction Camp.
7. Playtest spook meter decay rates to find the right balance of urgency vs. accessibility.
