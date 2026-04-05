# UI Redesign Spec — Mobile Field Research RPG

Target: portrait mobile (390×844 logical px, iPhone 14 baseline). All measurements in logical pixels. Dark theme throughout.

---

## Design Tokens

### Colors
- **background**: #0a0e1a (near-black navy)
- **surface**: #131a2e (dark navy card)
- **surface-elevated**: #1c2541 (raised panels)
- **border-subtle**: rgba(255,255,255,0.08)
- **border-accent**: rgba(34,211,238,0.3) (cyan glow)
- **text-primary**: #f1f5f9 (slate-100)
- **text-secondary**: #94a3b8 (slate-400)
- **text-muted**: #64748b (slate-500)
- **accent-cyan**: #22d3ee (Progression / Standard)
- **accent-amber**: #f59e0b (Warning / Rare)
- **accent-emerald**: #10b981 (Success / Discovery)
- **accent-rose**: #f43f5e (Spook/Escape Risk)

**Gem System Colors:**
- **gem-observe**: #ef4444 (red) — 📷 Camera
- **gem-scan**: #3b82f6 (blue) — 📡 Radar
- **gem-camouflage**: #22c55e (green) — 🌿 Leaves
- **gem-traverse**: #f59e0b (amber) — 🥾 Boot
- **gem-pack**: #fb923c (orange) — 🎒 Backpack
- **gem-focus**: #8b5cf6 (purple) — 🧠 Brain
- **gem-notes**: #cbd5e1 (silver) — 📝 Notebook
- **gem-burst**: #06b6d4 (cyan) — ✨ Sparkles

### Typography
- **font-family**: Inter or system-ui, -apple-system, sans-serif
- **heading-lg**: 20px / 600 weight / 1.2 line-height
- **heading-sm**: 14px / 600 weight / 1.3 line-height
- **body**: 13px / 400 weight / 1.4 line-height
- **caption**: 11px / 500 weight / 1.2 line-height
- **badge**: 10px / 700 weight / 1.0 line-height, uppercase, letter-spacing 0.5px

### Spacing & Radii
- **Spaces**: xs(4px), sm(8px), md(12px), lg(16px), xl(24px)
- **Radii**: sm(6px), md(10px), lg(16px), xl(24px), full(9999px)

### Effects
- **glow-cyan**: 0 0 12px rgba(34,211,238,0.4)
- **glow-amber**: 0 0 12px rgba(245,158,11,0.4)
- **glow-rose**: 0 0 12px rgba(244,63,94,0.4)
- **shadow-card**: 0 4px 16px rgba(0,0,0,0.5)
- **glass-bg**: rgba(19,26,46,0.85) with backdrop-filter: blur(12px)

---

## Global Shell (all screens)

### Safe area
- Top: 47px (iOS dynamic island region, no interactive elements)
- Bottom: 34px (home indicator region)

### Bottom Tab Bar
- **Position**: fixed bottom, full width
- **Height**: 56px + 34px safe area = 90px total, 56px usable
- **Background**: surface (#131a2e), top border 1px border-subtle
- **Inactive**: text-muted icon and label
- **Active**: accent-cyan icon and label, plus a 3px wide × 20px tall rounded pill indicator above

#### Tab items (left to right):
1. **Explore** — globe/earth icon — opens Cesium Map Selection
2. **Field Guide** — open book icon — opens Species Catalog
3. **Expedition** — compass icon — starts/resumes expedition flow
4. **Inventory** — backpack icon — opens gathered souvenirs/gear
5. **Profile** — person silhouette icon — opens stats and Affinity Badges

---

## Action Board System — 8-Tile Pacifist Economy

The board uses **8 gem types**. Five are primary **Affinity Action Gems** used to counter specific field obstacles, and three are **Utility Gems** used for general efficiency and economy building.

### The 8 Gem Types

| Role | Name | Icon | Color | Combat/Field Purpose |
|---|---|---|---|---|
| Tactics | **Observe** | 📷 | gem-observe | Quick captures, rare track spotting |
| Tactics | **Scan** | 📡 | gem-scan | Navigating fog, obscured visibility |
| Tactics | **Camouflage** | 🌿 | gem-camouflage| Slipping past skittish animals; slow Spook decay |
| Tactics | **Traverse** | 🥾 | gem-traverse | Clearing rivers, mud, and steep slopes |
| Tactics | **Pack** | 🎒 | gem-pack | Digging for emergency consumables |
| Utility | **Focus** | 🧠 | gem-focus | Point multiplier |
| Utility | **Notes** | 📝 | gem-notes | Clue shop discounts |
| Utility | **Burst** | ✨ | gem-burst | Combo enhancer |

### Match Outcomes
- **Matching the Node's Counter Gem**: Advances the primary node objective (e.g. matching `Traverse` on a River obstacle).
- **Matching Affinities**: If the player has the `Avian` affinity equipped, matching `Scan` grants x2 progress.
- **Matching Pack gems**: Grants a chance to drop a consumable item into the tray.
- **Matching Utility gems**: Generates banked score/discounts for the end-of-run Deduction Camp.

---

## Node Types & Gameplay Modes

### Standard Nodes
- Field navigation and environment tracking.
- Driven by a single obvious Obstacle Counter (e.g. "Dense Fog" requiring `Scan`).
- Spook Meter acts as a standard timer tracking exposure.

### Animal Encounter Nodes
- A highly reactive wildlife encounter.
- Rapid Spook Meter drop depending on the animal's skittishness.
- Player must balance matching `Camouflage` to stabilize the Spook Meter, and matching `Observe` to gather data before the animal escapes.
- See **Screen 3d: Animal Encounter** below.

### Crisis Events 
- Non-board narrative decisions.
- Spend gathered consumable tools or choose between two mechanical tradeoffs for the upcoming nodes.

---

## Screen 1: Expedition Globe (Home Screen)

### Map Viewport
- Full-bleed 3D globe (CesiumJS).
- Map layers display biomes, protected areas, and GIS paths.
- **Location markers**: Pulsing cyan circles indicating viable entry points.

### Location Tooltip (on tap)
- Glass-bg tooltip appears above marker.
- Displays: "Biome: Valdivian Rainforest", "Difficulty: ★★★☆☆".
- "Start Expedition" primary cyan pill button.

---

## Screen 2: Expedition Briefing (Modal Overlay)

- **Layout**: Bottom 75% sliding glass-sheet over the globe.
- **Header**: Region name and difficulty badge.
- **Affinity Loadout**: A row allowing the user to select 1 primary Animal Affinity to buff a specific gem class for this run (e.g. "Equip Avian Affinity: Scan x2").
- **Obstacle Preview**: Horizontal bar indicating what obstacles exist in the route (e.g. 50% Visibility Hazards, 20% Terrain).
- **Route Tracking**: Connected 36px circles previewing the node layout (Standard vs Encounters).
- **Start Button**: Pinned to bottom, gradient cyan.

---

## Screen 3: Board Screen (Active Gameplay)

### Top Section — Glance Zone (84px total)
- **Node Progress Track**: Horizontal track showing completion status of the current 6-node route. 
- **Encounter Objective Bar**: 
  - Left: Obstacle Type + Icon (e.g. 🌊 Swollen River). "Requires: Traverse".
  - Right: Banked Score & Fragment Counts.

### Middle Section — Play Zone 
- **Gem Grid (6×8)**: Centered in a frosted glass board. 
- Gems render with radial gradient washes, thick interactive borders on drag, and explode particles matching their color themes upon match.
- **Obstacle Overlays**:
  - *Fog*: Blocks gem visibility. Cleared by `Scan`.
  - *Brambles*: Locks physical movement of gems. Cleared by `Traverse`.

### Bottom Section — Thumb Zone (80px + safe area)
- **Consumable Tray**: Holds up to 3 single-use Panic Buttons (e.g. `Hide Cloak`, `Trail Bridge`). 
- **Spook Meter**: Large pill in the center showing current stability (Stabilized, Alert, Escaping). Glows red when approaching escape thresholds.
- **Banked Score**: Live tracking of deduction points.

---

## Screen 3a: Clue Market & Deduction Camp (Post-Run)

Replaces the "Game Over / Victory" screen. 
- A full-screen glass sheet overlay.
- Top: Total Banked Score.
- Middle: Horizontal scrolling list of purchased clues vs hidden clues. 
- Action: "Buy Clue (Cost: 1000pts)".
- Bottom: Dropdown to "Guess Species". Correct guesses award massive bonus points and unlock the Animal Affinity in the meta-profile. Incorrect guesses deduct points.

---

## Screen 3d: Animal Encounter Modal (Board Variant)

When a node is an Encounter, the top Glance Zone swaps to the Encounter HUD.

### Encounter Banner
- **Left**: Creature silhouette or emoji (if revealed).
- **Center**: The **Spook Meter**. A horizontal bar that constantly depletes. 
  - If it drops below 20%, the card flashes red (Flight Risk). 
  - Matching `Camouflage` manually recovers the bar.
  - If the bar hits 0%, the encounter ends in an "Escape" (partial rewards, skips rest of run).
- **Right**: Encounter Progress. (e.g. "Data Gathered: 45/100"). Fills as `Observe` gems are matched.

### Panic Button Consumables (The Ability Belt)
- Replaces violent abilities with tactical pacing.
- **Burst Camera**: Instantly fills 25% of the gather progress.
- **Hide Cloak**: Freezes Spook Meter decay for 5 seconds.
- **Trail Kit**: Instantly shreds any physical blockers clogging the layout.
- Cost: Automatically consumed from the tray stock (earned via `Pack` gems).

### Dynamic Behaviors
- **Flight Instinct**: If Spook Meter drops, creature "fades" (board opacity drops, simulating hiding).
- **Skittishness**: Harder creatures have faster Spook Meter decay ceilings, requiring heavy Camouflage focus rather than just rapid observation.

---

## Screen 4: Run Complete (Summary Overlay)

### Background
- Board fades to 30% opacity. Subtle congratulatory particle confetti.

### Content
- **Main Heading**: "Expedition Complete" OR "Specimen Escaped" (if spook meter drained).
- **Stats Grid**:
  - "Banked Score Generated"
  - "Discoveries Made" (if deduced correctly in camp)
  - "Obstacles Handled"
  - "Consumables Used"
- **Meta-Unlocks**: If a new species was guessed, a glowing Badge appears indicating the newly unlocked Animal Affinity.
- **Actions**: "Return to Globe" (Navigates back to Explore tab).

---

## Screen 5: Profile & Achievements (`/stats`)

Route: `/stats?userId=<id>` — will switch to Clerk session once auth is wired.

### Header
- Back chevron + "Field Profile" title.
- Avatar circle (initial fallback), username, "Field Researcher" role badge, "Since" date.

### Hero Stats Row (4 cards)
`Species Discovered` (emerald) | `Total Score` (cyan) | `Runs Completed` (amber) | `Play Time` (muted)

### Biomes Explored
Pill chips sourced from `player_stats.species_by_biome` (JSONB). Each chip: leaf icon + biome name + species count.

### Biogeographic Realms
2-col grid from `player_stats.species_by_realm`. Realm name + count per cell.

### Family Affinities (Circular Glowing Badges)
Up to 18 badges sourced from `player_stats.species_by_family`. Each badge:
- 48×48px circle with hue derived from family name, glow matching hue.
- 2-letter initials, family name (truncated), discovery count below.

### Top Genera
Ranked list from `player_stats.species_by_genus` (top 8), italic scientific names + count.

### Ecosystem Types (Progress Bars)
Horizontal bars for Terrestrial / Marine / Freshwater / Aquatic using `player_stats.*_species_count`.

### Conservation Status
Pill chips from `player_stats.species_by_iucn_status`. Code badge colored by IUCN tier (LC=emerald → CR=rose).

### Field Mastery (Top Locations)
Up to 6 location cards from `eco_location_mastery` ordered by `mastery_tier DESC, best_run_score DESC`.
Each card: mastery-tier colored pin icon, biome/realm label, runs + species count, best score.
Mastery tiers: Uncharted(0) → Master(5), colors escalate slate→cyan→emerald→amber→orange→rose.

---

## Responsive Breakpoints

### Small phone (< 375px width)
- Gem grid cells: 38px
- Reduce board padding to xs
- Consumable Tray is compact mode (icons only).

### Standard phone (375–414px)
- As specified above.

### Large phone / Tablet (> 768px)
- Board and Clue Markets can exist side-by-side. 
- Map remains visible behind frosted panels instead of pure dark overlays.
