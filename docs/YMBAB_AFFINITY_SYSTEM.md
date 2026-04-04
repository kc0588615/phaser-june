# YMBAB to Critter Connect: Affinity & Obstacle System

This document outlines the architecture for porting the frantic, tactical pressure of *You Must Build A Boat (YMBAB)* into the pacifist, scientific expedition theme of *Critter Connect*. 

It is written to catalog the exact file touches, design concepts, and system architecture for any developer or AI taking over implementation.

---

## 1. Core Philosophy

*Critter Connect* replaces YMBAB’s violent combat with field research, but preserves the cognitive pressure. 
- **YMBAB Tiles = Action Gems:** The immediate tools used to solve lane blocks.
- **YMBAB Items = Consumables:** Single-tap emergency "panic buttons" to save a run.
- **YMBAB Dungeon Modifiers = Animal Family Affinities:** The meta-layer that makes certain gem answers "better" or "worse" depending on your build choices and route.

---

## 2. Core Systems & Design Blueprint

### A. The 5 Core Action Gems
*Related File:* `src/expedition/domain.ts`

The board relies on 5 primary tactical tools to respond to immediate lane threats:
1. **Observe (Sword):** Fast captures, answers to fleeting sighting windows.
2. **Scan (Staff):** The analytical answer. Pierces obscured vision, fog, and hidden paths.
3. **Camouflage (Shield):** Buys survival time. Slows/freezes the Spook Meter decay.
4. **Traverse (Key):** Clearing tools. Pushes past environmental blockers (swollen rivers, mud, brambles).
5. **Pack (Crate):** Preparedness. Digs for Consumable items to stock the panic tray.

*(Note: `power`, `thought`, and `multiplier` remain as background strategic/currency gems).*

### B. Obstacles & Clear Counters
*Related Files:* `src/lib/nodeScoring.ts`, `src/game/nodeObstacles.ts`

Instead of arrays of required gems, obstacles demand **one explicit counter**.

| Obstacle Family | Counter Gem Needed | Tactical Feel |
| :--- | :--- | :--- |
| **Visibility** (Fog, Dark) | **Scan** | Deciphering obscured terrain. |
| **Alert/Spook** (Skittish fauna) | **Camouflage** | Sneaking, remaining perfectly still. |
| **Terrain** (Mud, River, Slope)| **Traverse** | Physical movement through hard zones. |
| **Sighting** (Rare tracks) | **Observe** | Fast timing to capture data/photos. |
| **Panic** (Broken gear) | **Pack** | Resupplying or bypassing via inventory. |

### C. Animal Family Affinities (The Modifier Layer)
*Related Files:* `src/types/database.ts`, `src/types/expedition.ts`, `src/game/scenes/Game.ts`

Discovering species unlocks their broader taxonomic family buff. These run-modifiers influence the math inside the match pipeline:

1. **Birds / Raptors:** `Scan` matches count as x2 progress.
2. **Big Cats / Stealth:** `Camouflage` meter-recovery +25%.
3. **Amphibians / Frogs:** `Traverse` matches count as x2 in water nodes.
4. **Clever Mammals / Primates:** `Pack` matches drop higher-tier items.
5. **Insects / Fast Fauna:** `Observe` cascades generate massive combo boosts.
6. **Hoofed / Herds:** `Traverse` triggers minor background Camouflage.
7. **Reptiles / Snakes:** `Scan` grants thermal vision (reveals next 2 obstacles).
8. **Fish / Aquatic:** `Traverse` ignores baseline water decay penalties.
9. **Arachnids / Spiders:** `Pack` guarantees a trap/bait item.
10. **Burrowers / Rodents:** `Camouflage` base effectiveness x2.

### D. Consumables (Panic Buttons)
*Related Files:* `src/expedition/domain.ts`, `src/components/ConsumableTray.tsx`

Emergency buttons mapped to YMBAB spell equivalents:
- **Burst Camera (Arrow):** Instantly clears an `Observe` target.
- **Field Scope (Shock):** Instantly clears a `Scan` visibility obstacle.
- **Bridge Kit (Bash):** Instantly shreds a `Traverse` blocker.
- **Hide Cloak (Freeze):** Freezes the Spook Meter (`Camouflage` need) for 5s.
- **Supply Drop (Tile Bomb):** Clears the board of a specific gem or acts as a wild-card.

---

## 3. Implementation Blueprint & File Catalogue

To implement this system, the following files must be refactored or updated:

### 1. `src/expedition/domain.ts` (Data Definitions)
- **What to do:** Narrow focus to the 5 primary affinity gem roles.
- **What to do:** Overhaul the `CRATE_ITEM_BLUEPRINTS` array to match the 5 panic buttons (`Burst Camera`, `Hide Cloak`, `Field Scope`, etc.) with explicit `effectType`s designed to instantly clear Obstacle families.

### 2. `src/lib/nodeScoring.ts` & `src/game/nodeObstacles.ts` (Obstacles)
- **What to do:** Update `NODE_TEMPLATES`. Instead of `requiredGems: ['shield', 'power']`, obstacles should declare a single `counterGem` (e.g., `counterGem: 'key'`). 
- **What to do:** Categorize obstacles into the 5 families (Visibility, Alert, Terrain, Sighting, Panic).

### 3. `src/types/expedition.ts` (State Management)
- **What to do:** Expand `RunState` to include `activeAffinities: AffinityType[]`. 
- **What to do:** Define the `AffinityType` enum matching the animal families.

### 4. `src/game/scenes/Game.ts` (The Match Pipeline)
- **What to do:** This is the heaviest lift. In the match resolution loop (`processMatches`), intercept the output based on `RunState.activeAffinities`. 
- **What to do:** If a player matches `Traverse` (Key) and has the `Amphibian` affinity equipped, apply the x2 modifier to the target progress emitted via `node-objective-updated`.
- **What to do:** Update the item usage listeners (e.g. listening for `consumable-used` from React) to trigger immediate target-clearing or meter-freezing. 

### 5. `src/game/ui/ExpeditionRunnerStrip.ts` (Visual Delivery)
- **What to do:** When an obstacle is presented in the strip, display its distinct counter gem icon alongside it.
- **What to do:** Display active affinities in the UI, applying visual effects (e.g., a glow or "x2" text) over gem icons to visually communicate to the player that "Traverse is currently buffed by your Amphibian Affinity."

### 6. `src/components/ConsumableTray.tsx` (User Interface)
- **What to do:** Ensure consumables trigger immediate dispatches to the `Game.ts` scene without requiring a turn/move to pass, solidifying their role as twitch-reaction panic buttons. 

---
**End of Documentation.**
