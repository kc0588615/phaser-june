# UI Redesign Spec — Mobile Match-3 RPG

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
- **accent-cyan**: #22d3ee
- **accent-amber**: #f59e0b
- **accent-emerald**: #10b981
- **accent-rose**: #f43f5e
- **gem-classification**: #ef4444 (red) — 🧬 DNA helix
- **gem-habitat**: #22c55e (green) — 🌿 Leaf/fern
- **gem-geographic**: #3b82f6 (blue) — 🌍 Globe
- **gem-morphology**: #f97316 (orange) — 🐾 Paw print
- **gem-behavior**: #eab308 (yellow) — 👁️ Eye
- **gem-lifecycle**: #6b7280 (gray) — 🥚 Egg
- **gem-conservation**: #f1f5f9 (white) — 🛡️ Shield
- **gem-keyfacts**: #a855f7 (purple) — ⭐ Star
- **resource-nature**: #34d399 (green-teal) — 🍃 Leaf cluster
- **resource-water**: #38bdf8 (cyan-blue) — 💧 Water droplet
- **resource-knowledge**: #cbd5e1 (silver) — 📘 Field journal
- **resource-craft**: #fb923c (orange) — 🔧 Tool
- **creature-hp**: #ef4444 (red — enemy health bar fill)
- **creature-hp-bg**: #1c2541 (enemy health bar track)
- **creature-shield**: #60a5fa (blue — when creature has armor)

### Typography
- **font-family**: Inter or system-ui, -apple-system, sans-serif
- **heading-lg**: 20px / 600 weight / 1.2 line-height
- **heading-sm**: 14px / 600 weight / 1.3 line-height
- **body**: 13px / 400 weight / 1.4 line-height
- **caption**: 11px / 500 weight / 1.2 line-height
- **badge**: 10px / 700 weight / 1.0 line-height, uppercase, letter-spacing 0.5px

### Spacing
- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 24px

### Radii
- **sm**: 6px
- **md**: 10px
- **lg**: 16px
- **xl**: 24px (pills, bottom sheet handle)
- **full**: 9999px (circles, badges)

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
- **Layout**: 5 equally-spaced tab items, horizontal
- **Each tab item**: centered column of icon (24px) + label (caption size, 4px gap)
- **Inactive**: text-muted icon and label
- **Active**: accent-cyan icon and label, plus a 3px wide × 20px tall rounded pill indicator above the icon (accent-cyan, glow-cyan)

#### Tab items (left to right):
1. **Explore** — globe/earth icon — opens Map Screen
2. **Field Guide** — open book icon — opens Species Catalog
3. **Expedition** — compass icon — starts/resumes expedition flow (this tab pulses gently with glow-cyan when an expedition is available)
4. **Inventory** — backpack icon — opens inventory/souvenirs
5. **Profile** — person silhouette icon — opens profile/settings/stats

### Status Bar Area
- 47px tall, transparent, system clock/signal/battery visible
- No app UI in this region

---

## Gem System — 12-Tile Dual Economy

The board uses **12 gem types** split into two families:

- **Knowledge gems (8)**: clue categories. Matching them reveals species information and drives enemy weaknesses/resistances.
- **Resource gems (4)**: run economy currency. Matching them fills the expedition wallet for store purchases, combat skills, and crisis costs.

This keeps clue collection legible while creating a real action-RPG economy layer.

### The 12 Gem Types

| Family | Category | Icon | Color | Shape at 36px | Board label | Primary use |
|---|---|---|---|---|---|---|
| Knowledge | Classification | 🧬 | gem-classification (red) | Double helix spiral — 2 intertwined curves | CLS | Reveal taxonomy clue |
| Knowledge | Habitat | 🌿 | gem-habitat (green) | Fern frond — curved stem with 4-5 leaflets | HAB | Reveal habitat clue |
| Knowledge | Geographic | 🌍 | gem-geographic (blue) | Globe — circle with 2 latitude + 1 longitude line | GEO | Reveal range clue |
| Knowledge | Morphology | 🐾 | gem-morphology (orange) | Paw print — 1 pad + 4 toes | MRP | Reveal body-form clue |
| Knowledge | Behavior | 👁️ | gem-behavior (yellow) | Eye — almond shape with circle pupil | BHV | Reveal behavior clue |
| Knowledge | Life Cycle | 🥚 | gem-lifecycle (gray) | Egg — oval, slightly tapered at top | LCY | Reveal life-stage clue |
| Knowledge | Conservation | 🛡️ | gem-conservation (white) | Shield — pointed-bottom heraldic shape | CON | Reveal threat/status clue |
| Knowledge | Key Facts | ⭐ | gem-keyfacts (purple) | Star — 5-point, slightly rounded tips | KEY | Reveal bonus fact clue |
| Resource | Nature | 🍃 | resource-nature | Three-leaf cluster | NTR | Healing, forage, shop currency |
| Resource | Water | 💧 | resource-water | Tall droplet | WTR | Cleansing, flow control, shop currency |
| Resource | Knowledge | 📘 | resource-knowledge | Closed field journal | KNO | Scan, telegraph, shop currency |
| Resource | Craft | 🔧 | resource-craft | Wrench/tool silhouette | CRF | Traps, armor break, shop currency |

### Board Mix

- **Collection nodes**: 65% knowledge gems, 35% resource gems
- **Standard standoffs**: 55% knowledge gems, 45% resource gems
- **Boss standoffs**: 50% knowledge gems, 50% resource gems
- **Node-specific modifiers** can temporarily bias a single resource type without changing the 12-gem taxonomy

### Gem Tile Rendering

Each gem tile is a **square cell** containing:

1. **Cell background**: rounded-md, surface-elevated at 50% opacity (the "slot")
2. **Color wash**: radial gradient of the gem's category color at 15% opacity, centered, fills the cell — gives quick color-scanning ability
3. **Icon**: centered within the cell, 28px rendered size
   - **Option A (emoji)**: the Unicode emoji character at 28px font-size. Simple, cross-platform, zero asset pipeline.
   - **Option B (SVG/PNG — production target)**: custom-drawn icon in a consistent style: 2px stroke weight, rounded joins, monochrome white with gem-color fill. Slight inner shadow (1px, darker shade) for depth. All 12 icons share the same visual weight and level of detail so no icon dominates the grid.
4. **Gem border ring**: 1px border in the gem's category color at 30% opacity, rounded-md, on the cell itself

### Gem States

- **Idle**: icon at 100% opacity, cell background at 50%
- **Selected (drag start)**: cell background brightens to 80%, border ring thickens to 2px at 60% opacity, subtle scale-up to 1.05x
- **Matched**: icon scales to 1.3x, color wash pulses to 40% opacity, then burst animation (see Animation section)
- **Falling**: icon and cell translate together, ease-out
- **Weakened by creature attack** (see Standoff): icon at 40% opacity, cell has a red-tinted overlay, "cracked" diagonal line across the cell. Cannot be matched until adjacent match clears the debuff.
- **Spoiled by creature** (see Standoff): icon replaced with a gray "?" at 50% opacity. Must be cleared by matching adjacent gems. Spoiled gems cannot be swapped.
- **Hidden by fog** (see Standoff): cell shows surface-elevated background only, no icon visible. Fog clears when an adjacent match occurs.

### Match Outcomes

- **Knowledge gem match**: advances clue progress for that category, contributes to collection objectives if relevant, and deals battle damage in standoffs
- **Resource gem match**: adds 1 resource to the run wallet, charges its matching combat skill, and contributes to resource objectives if relevant
- **4-match or larger**: grants +1 extra reward of that gem family before cascade bonuses
- **Cascade**: can reward both clue unlocks and resource income in the same turn

### Why Split Knowledge and Resource Gems

- **Keeps clue logic readable**: knowledge matches still map directly to species info.
- **Creates a real run economy**: resource gems can be spent in stores, crises, and abilities without hijacking clue progression.
- **Accessibility**: 12 colors on a dark board only work if shape and icon carry most of the meaning.
- **Scalable**: the same icon language works on the board, in the wallet, in the shop, and on clue cards.

---

## Node Types & Gameplay Modes

Expedition nodes are not all the same. There are four node types that alternate to create variety. The expedition briefing route preview shows which type each node is.

### Collection Nodes (default)
- Standard match-3 with a gem objective (e.g., "Collect 5 🌿" or "Collect 4 💧")
- Move-limited (15-25 moves depending on difficulty)
- Obstacle overlays apply per node config
- Knowledge gems reveal clues; resource gems stock the wallet

### Standoff Nodes (combat encounters)
- A wildlife creature appears with HP
- Match knowledge gems to exploit weaknesses; match resource gems to charge skills and purchases
- Move-limited; failing to defeat creature = node failed, can retry
- See **Screen 3d: Wildlife Standoff** below for full visual spec

### Crisis Events (between nodes)
- Not a board — a decision card between two nodes
- Player spends resource gems or accepts a tradeoff
- See **Screen 3e: Expedition Crisis** below for full visual spec

### Field Store Nodes (between major encounters)
- Non-board merchant/camp screen
- Spend resource gems on consumables, passives, or one-run upgrades
- Inspired by YMBAB pacing: small stock, meaningful choices, no permanent menu sprawl
- See **Screen 3f: Field Store** below for full visual spec

---

### Layout (top to bottom):
- **Status bar**: 47px (system)
- **Map viewport**: fills remaining space above tab bar. Full-bleed 3D globe.
- **Tab bar**: 90px (bottom)

### Map Viewport
- 3D globe (Cesium or similar) fills the entire area edge to edge, no margins
- Globe shows terrain with satellite imagery, slight blue atmospheric glow at edges
- **Location markers**: Pulsing circles (16px diameter, accent-cyan with glow-cyan) at explorable coordinates on the globe. Each marker has a faint expanding ring animation (1.5s loop, max 32px, fading opacity).
- Globe is interactive: pan, zoom, rotate via touch gestures

### Location Tooltip (appears on marker tap)
- **Position**: centered horizontally, appears 16px above the tapped marker
- **Size**: 260px wide, auto height
- **Background**: glass-bg, rounded-lg, border 1px border-accent
- **Shadow**: shadow-card
- **Caret**: 8px downward-pointing triangle centered on the bottom edge, same glass-bg fill
- **Content** (vertical stack, padding lg):
  - **Region name**: heading-sm, text-primary, 1 line truncated (e.g., "Valdivian Temperate Rainforest")
  - **Horizontal divider**: 1px border-subtle, margin-y sm
  - **Info rows** (3 rows, each is caption size, text-secondary, with a small icon 14px left-aligned):
    - "Difficulty: ★★★☆☆" — star icons, filled = accent-amber, empty = text-muted
    - "Biome: Temperate Broadleaf Forest" — leaf icon
    - "Primary Resource: 🍃 Nature" — small resource icon (12px) inline, tinted resource-nature
  - **"Start Expedition" button**: full width, height 40px, rounded-md, background linear-gradient(135deg, accent-cyan, #0ea5e9), text heading-sm white centered, margin-top md

### Empty state (no marker tapped)
- Bottom center, 32px above tab bar: translucent pill (glass-bg, rounded-xl, padding sm lg)
- Text: "Tap a location to explore" — caption, text-secondary
- Left of text: a small pulsing cyan dot (8px)

---

## Screen 2: Expedition Briefing (modal overlay)

### Layout
- Full screen overlay on top of Map Screen
- **Background**: semi-transparent black overlay rgba(0,0,0,0.6) covering the map
- **Card**: slides up from bottom, occupies bottom 75% of screen
  - Top: 24px rounded-xl corners (top-left, top-right only)
  - Background: surface
  - **Drag handle**: centered at top, 36px wide × 4px tall, rounded-full, surface-elevated, margin-top sm

### Card Content (scrollable, padding xl horizontal, lg vertical):

#### Header Row
- Left: "Expedition Briefing" — heading-lg, text-primary
- Right: difficulty badge — pill (rounded-full, border 1px accent-amber, padding 2px 10px), text: "Avg Lv.3" — badge size, accent-amber

#### Location Section (margin-top lg)
- Card (surface-elevated, rounded-lg, padding md):
  - "Region" — caption, text-muted
  - Region name — heading-sm, text-primary (e.g., "Valdivian Temperate Rainforest")
  - "Biome" — caption, text-muted, margin-top xs
  - Biome name — body, text-secondary

#### Protected Areas (margin-top md)
- Horizontal wrap row of pills (surface-elevated, rounded-full, padding 4px 12px):
  - Each pill: small shield icon (12px, accent-emerald) + body text-secondary (e.g., "Puyehue National Park")
  - Max 3 visible, "+N more" pill if additional

#### Resource Distribution (margin-top lg)
- "Resource Bias" — caption, text-muted, margin-bottom sm
- 4 horizontal bars stacked vertically (gap xs), one per resource gem:
  - Each bar: full width, 20px tall, rounded-sm
  - Left label (56px wide): resource gem icon (14px) + 3-letter code (caption): e.g., 🍃 NTR, 💧 WTR, 📘 KNO, 🔧 CRF
  - Bar track: surface-elevated background
  - Bar fill: resource color, width = percentage of distribution, rounded-sm
  - Right label: percentage text, caption, text-secondary (e.g., "18%")
  - All 4 rows are always shown so the player can plan wallet routing before the run

#### Node Preview (margin-top lg)
- "Route" — caption, text-muted, margin-bottom sm
- Horizontal row of connected nodes, centered:
  - Each node: 36px circle, surface-elevated, border 1px border-subtle
  - **Collection node**: circle with objective icon inside (16px): target reticle, clue icon, or resource icon depending on node objective
  - **Standoff node**: accent-rose border, creature silhouette icon inside (16px). Below circle: "⚔️" small indicator. Label shows creature name if known.
  - **Crisis node**: shown as a diamond shape (rotated 45° square, 28px) instead of circle, accent-amber border, "!" icon inside (14px, accent-amber)
  - **Field store node**: rounded square (28px), resource-knowledge border, backpack icon inside (14px), tiny coin sparkle at one corner
  - Below each circle/diamond: caption text-muted, node difficulty "Lv.2"
  - Connections: 20px horizontal line (2px, border-subtle) between each node
  - Last node: accent-rose border, boss creature icon inside (always a standoff)
  - First node: accent-cyan border (starting node)

#### Start Button (sticky at bottom of card)
- Pinned to bottom of the card with padding lg, background: linear gradient surface upward (to hide scroll content behind)
- Button: full width, 52px tall, rounded-lg
- Background: linear-gradient(135deg, accent-cyan, #0ea5e9)
- Text: "Start Expedition" — heading-sm, white, centered
- Shadow: glow-cyan

---

## Screen 3: Board Screen (active gameplay)

This is the primary screen. The entire viewport is dedicated to the match-3 board and essential HUD elements.

### Background
- Full-bleed illustration behind everything: a blurred, desaturated scene matching the biome (forest, ocean, desert, etc.)
- Overlaid with a dark gradient vignette: radial-gradient(ellipse at center, transparent 30%, rgba(10,14,26,0.8) 100%)
- The board area has an additional frosted glass panel behind the gem grid

### Layout (top to bottom):

#### Top Section — Glance Zone (84px total)

**Node Progress Track** (44px tall, full width, padding horizontal lg):
- Horizontal track centered, showing all nodes in the expedition
- Each node: 20px shape (circle for collection/standoff, diamond for crisis, square for store)
  - Completed: filled accent-emerald, white checkmark icon (10px) inside
  - Current: filled accent-cyan, glow-cyan, slightly larger (24px), white dot or pulsing ring
  - Current standoff: filled accent-rose, glow-rose, slightly larger (24px), creature silhouette inside
  - Future collection: surface-elevated fill, border 1px border-subtle
  - Future standoff: surface-elevated fill, border 1px accent-rose (faint red border signals combat ahead)
  - Future crisis: diamond shape (rotated square, 16px), surface-elevated fill, border 1px accent-amber
  - Future store: rounded square (16px), surface-elevated fill, border 1px resource-knowledge
  - Boss node (last): always a standoff, accent-rose fill at 30% opacity, creature icon, larger (28px)
- Connecting lines: 2px height, 16px wide between shapes
  - Before current: accent-emerald
  - After current: border-subtle
- **Player avatar**: a 28px circular portrait (or owl icon) with accent-cyan border, positioned directly above the current node, offset upward 8px. Shows a tiny bounce animation.

**Objective & Clue Bar** (36px tall, full width, padding horizontal lg):
- Left half: objective indicator (changes by node type)
  - **Collection node**: Node type icon (14px, text-secondary) + "Collect 5" + required gem icons (10px each, clue or resource color) + progress "3/5" (caption, text-primary). If objective met: text turns accent-emerald, checkmark replaces count.
  - **Standoff node**: Creature emoji/icon (14px) + creature name (caption, text-primary, truncated) + "❤️ 28/40" miniature HP readout (caption, accent-rose). See Screen 3d for the full standoff HUD.
- Right half: clue progress
  - Pill (glass-bg, rounded-full, padding 2px 10px): "Clues 3/8" — badge text, accent-amber
  - 8 tiny category icons (8px each, 3px gap) after the text: colored = revealed, gray = unrevealed

#### Middle Section — Play Zone (fills remaining space, centered)

**Board Container**:
- Centered horizontally and vertically within the play zone
- Board background: glass-bg panel, rounded-xl, padding sm
- Border: 1px border-accent (very subtle cyan edge)

**Gem Grid** (6 columns × 8 rows):
- Each cell: square, sized to fit the board width minus padding (approximately 44–46px per cell at 390px screen width with 16px horizontal padding and 8px board padding)
- Gems render as described in the **Gem System — 12-Tile Dual Economy** section above
- Board pool always includes both knowledge and resource gems; node config controls the family weighting
- Cell layout: color wash background + icon centered + border ring
- Matched gems: burst animation with particles in the gem's category color
- Falling gems: smooth ease-out vertical translation
- New gems: drop in from above the board with slight bounce

**Obstacle Overlays** (per node configuration, layered on top of gem tiles):
- **Frozen cells**: ice crystal overlay on top of the gem, 50% opacity blue-white (#dbeafe), cracked-ice edge pattern. Icon visible but desaturated beneath the ice. Takes 2 adjacent matches to break. On first hit: crack lines appear. On second: ice shatters (particle burst of ice shards).
- **Locked cells**: small padlock icon (12px) at bottom-right corner of the cell. Gem icon visible but cannot be moved. Unlocked by matching adjacent.
- **Chain cells**: diagonal chain pattern overlay, dark, 30% opacity. Takes 1 match to clear. Chain links scatter on break.
- **Stone cells**: no gem, gray stone texture fills the cell (#374151 with noise texture). Indestructible blocker. Rounded-md to match cell shape.

#### Bottom Section — Thumb Zone (80px + safe area)

**Resource Bar** (80px tall, full width):
- Background: linear-gradient(to top, surface, transparent) — fades into the board background
- Three-column layout, vertically centered:

  **Left column** (resource wallet, left-aligned, padding-left lg):
  - Fixed horizontal row of the 4 resource currencies (gap sm):
    - Each: resource-colored circle (16px) with the resource icon (10px, white or dark navy for 📘) inside + count number to the right (badge text, text-primary)
    - If a resource was just earned: the circle does a brief scale-up bounce (1.3x, 200ms)
    - Tap the wallet area to expand a full wallet breakdown (glass-bg tooltip above, shows all 4 resources, current passive item count, and shop discounts if any)

  **Center column** (moves counter, centered):
  - Large rounded pill (glass-bg, rounded-xl, padding sm lg, border 1px border-accent):
    - "MOVES" — badge text, text-muted, centered above
    - Number — 28px font, 700 weight, text-primary, centered (e.g., "15")
    - When moves < 5: number turns accent-rose, pill border turns accent-rose, subtle glow-rose

  **Right column** (score, right-aligned, padding-right lg):
  - "SCORE" — badge text, text-muted
  - Score number — heading-sm, accent-amber (e.g., "2,340")
  - Streak indicator (if streak > 1): small pill below score, "×2.5" — badge text, accent-cyan

- **Bottom safe area**: 34px, surface color fill

---

## Screen 3a: Clue Bottom Sheet (overlay on Board Screen)

Triggered by tapping the "Clues 3/8" pill or swiping up from the bottom resource bar.

### Half-Sheet State (default on open)
- Covers bottom 50% of screen
- Top: rounded-xl corners (top-left, top-right)
- Background: surface
- Drag handle: 36px × 4px, rounded-full, surface-elevated, centered, margin-top sm
- Sheet can be dragged up to full-screen or down to dismiss

### Full-Sheet State (drag up or tap handle)
- Covers bottom 90% of screen (status bar still visible)

### Sheet Content (scrollable, padding xl horizontal):

#### Species Header (sticky at top of sheet, glass-bg background)
- Left: Species silhouette thumbnail (48px square, rounded-md, surface-elevated background, centered animal silhouette in text-muted if not yet identified, actual image if identified)
- Right (vertical stack):
  - Species name or "Mystery Species #3" — heading-sm, accent-cyan
  - "Species 2 of 6 — 3/8 clues" — caption, text-secondary
- Below: row of 8 category icons (12px each, gap 4px):
  - Revealed: gem icon in its category color (e.g., 🧬 in red, 🌿 in green)
  - Unrevealed: same icon shape but in surface-elevated gray, 40% opacity

#### Clue Cards (scrollable area, gap sm)
- Each card (surface-elevated, rounded-md, padding md):
  - Left border: 3px, gem category color
  - Top row: category gem icon (14px, category color) + category name (caption, category color) — e.g., 🌿 + "Habitat"
  - Content: clue text (body, text-primary) — e.g., "Found in temperate rainforests of South America"
  - If clue includes a checklist-style field: show field name (caption, text-muted) and value (body, text-primary) on separate line

- **Empty/locked slots**: shown as dashed-border cards (surface, border 1px dashed border-subtle, rounded-md):
  - Category gem icon (grayed out, 40% opacity) + "???" (caption, text-muted)
  - "Match [icon] gems to reveal" — caption, text-muted, italic, with the small category icon inline

#### Guess Button (sticky at bottom of sheet)
- Pinned to bottom with padding lg
- Background: gradient from surface (transparent top to solid bottom) to hide scrolled content
- Button: full width, 48px, rounded-lg
  - If < 3 clues: surface-elevated background, text-muted text, "Need more clues..." — disabled appearance
  - If >= 3 clues: linear-gradient(135deg, accent-amber, #d97706), white text, "Guess Species (3 clues)" — heading-sm
  - If all 8 clues: border pulsing glow-amber, text "Identify Species!"

---

## Screen 3b: Encounter Flash (overlay on Board Screen)

Triggered when a special encounter occurs during gameplay.

- **Duration**: visible for 2.5 seconds, then fades out (300ms)
- **Position**: centered horizontally, 80px below the node progress track
- **Size**: 280px wide, auto height
- **Background**: glass-bg, rounded-lg, border 1px accent-amber, glow-amber
- **Content** (padding md, centered):
  - Encounter icon or emoji (32px, centered)
  - Encounter label — heading-sm, accent-amber (e.g., "Rare Butterfly Spotted!")
  - Encounter description — caption, text-secondary, centered, max 2 lines
  - If souvenir earned: small row showing souvenir emoji (20px) + "Added to inventory" — caption, accent-emerald
- **Entry animation**: scale from 0.8 to 1.0, opacity from 0 to 1, slight upward slide (8px), 200ms ease-out
- **Exit animation**: opacity to 0, slight upward slide (8px), 300ms ease-in

---

## Screen 3c: Node Complete Interstitial (overlay on Board Screen)

Shown when a node's objective is met or manually completed.

- Full-screen overlay, rgba(10,14,26,0.85) background
- Centered card (300px wide, auto height, surface, rounded-xl, shadow-card)
- **Content** (padding xl, centered):
  - Checkmark icon in a circle (48px, accent-emerald background, white checkmark)
  - "Node Complete!" — heading-lg, text-primary, margin-top md
  - Node type label — caption, text-secondary (e.g., "Collection Node — Lv.3")
  - Horizontal divider (border-subtle, margin-y md)
  - **Rewards row** (horizontal, centered, gap lg):
    - Each reward: large number (heading-lg, gem/resource color) above caption label
    - Resource rewards use the 4 resource icons (e.g., "+3" above "🍃 Nature")
    - Clue rewards use the 8 knowledge icons (e.g., "+1 clue" above "🧬 Classification")
  - If souvenir earned: souvenir emoji (28px) + name (body, accent-amber) below rewards
  - **"Continue" button**: full width, 44px, rounded-md, accent-cyan background, white heading-sm text, margin-top lg
  - Subtle particle/sparkle animation around the checkmark icon

---

## Screen 3d: Wildlife Standoff (Board Screen variant)

When a node is a **standoff node**, the Board Screen layout remains the same (glance zone, play zone, thumb zone) but the top section and board behavior change to show a creature encounter.

### Creature HUD (replaces the Objective & Clue Bar, expands to 64px total)

**Creature Banner** (64px tall, full width, glass-bg, border-bottom 1px border-subtle):

- **Left section** (creature identity, 60% width):
  - Row 1: Creature emoji (20px) + creature name — heading-sm, text-primary (e.g., "🐊 Saltwater Crocodile")
  - Row 2: "Lv.4 Territorial" — caption, text-muted (difficulty + behavior type)

- **Center section** (HP bar, 30% width):
  - HP bar: full width of section, 12px tall, rounded-full
    - Track: creature-hp-bg
    - Fill: creature-hp (red), width = currentHP / maxHP percentage, rounded-full
    - When HP < 25%: fill pulses (opacity oscillates 0.7–1.0, 800ms loop)
  - Below bar: "28/40" — caption, text-primary, centered
  - If creature has armor: a small shield icon (10px, creature-shield) appears left of the HP text, with armor count (e.g., "🛡 5")

- **Right section** (attack telegraph, 10% width):
  - A countdown circle (28px):
    - Circular progress ring (2px, accent-rose) that depletes clockwise as moves pass
    - Center number: moves until next creature action (heading-sm, accent-rose, e.g., "2")
    - When count reaches 1: ring pulses with glow-rose, number turns bold
    - When count reaches 0: creature attacks (see Creature Actions below)

### Creature Weakness Indicators

Shown as a row of tiny pills directly below the creature banner (24px tall area, horizontal scroll if needed):
- Each pill (rounded-full, padding 2px 8px, gap xs):
  - **Weak to**: gem category icon (10px) + "×2" — caption, accent-emerald, surface-elevated background with emerald tint. Means matching this gem type deals double damage.
  - **Resists**: gem category icon (10px) + "×½" — caption, accent-rose, surface-elevated background with rose tint. Means matching this gem type deals half damage.
  - **Neutral**: not shown (implicit ×1)
- Max 3-4 pills visible. Typically 1-2 weaknesses, 1 resistance.

### Damage Numbers (floating text on the board)

When a match deals damage to the creature:
- A floating number appears above the matched gems: "-6" in heading-sm, white, with a text-shadow in the gem's category color
- If weakness multiplier: number is larger (heading-lg), category color text, with "WEAK!" caption above it in accent-emerald
- If resistance: number is smaller (caption), text-muted, with "RESIST" caption above in accent-rose
- Float upward 40px over 600ms, fade opacity to 0 in last 200ms

### Creature Actions (board disruptions)

Every N moves (shown by the countdown circle), the creature performs one action. The action is **telegraphed** — the player sees which action is coming via a label that appears below the countdown circle 1 move before it fires.

#### Action: Territorial Roar
- **Telegraph**: "ROAR" badge (accent-rose background, white caption) appears below countdown
- **Effect**: 1 random gem is overwritten with a **stone blocker** and 2 adjacent gems become **weakened**
- **Animation**: board shakes (3px horizontal, 3 cycles, 200ms total), stone blocks slam into place from above (150ms, hard ease-in), dust particle burst at impact point
- **Sound cue**: deep rumble (if audio implemented)

#### Action: Camouflage
- **Telegraph**: "HIDE" badge (gem-lifecycle gray background, white caption)
- **Effect**: a 3×3 patch of gems is covered with **fog** — cells show surface-elevated background only, gem icons hidden. Fog clears when an adjacent match occurs (clears the whole fog patch).
- **Animation**: fog drifts in from the side of the patch (300ms, opacity 0 to 1, slight horizontal slide)

#### Action: Strike
- **Telegraph**: "STRIKE" badge (accent-rose, white caption) + a column highlight (accent-rose at 15% opacity) flashes on the targeted column for 1 move before it fires
- **Effect**: destroys all gems in the targeted column. Gems above fall to fill. Player loses 1 HP (hit).
- **Animation**: red slash line diagonally across the column (100ms), gems shatter outward (similar to match explode but with red particles), screen flash red edge vignette (100ms, 20% opacity)

#### Action: Poison/Spoil
- **Telegraph**: "TOXIN" badge (gem-habitat green-tinted, dark background)
- **Effect**: 3-4 random gems become **spoiled** — icon replaced with gray "?" at 50% opacity, cannot be swapped. Cleared by matching adjacent gems.
- **Animation**: green-purple miasma bubbles rise from each spoiled cell (200ms), icon fades to "?" (150ms crossfade)

#### Action: Armor Up
- **Telegraph**: "ARMOR" badge (creature-shield blue background, white caption)
- **Effect**: creature gains +5 armor. Armor is a flat shield value that is subtracted from each incoming damage packet (minimum 1 damage always gets through). Craft matches remove 1 armor before damage is applied.
- **Animation**: blue hexagonal shield pattern flashes over the creature banner (200ms), shield icon with "+5" floats up (like damage numbers but blue)

### Player HP (Standoff only)

During standoffs, the player has **hit points** (3–5 depending on difficulty). Shown in the thumb zone:

- Replaces the score display in the **right column** of the resource bar
- Row of heart icons (16px each, gap 2px):
  - Full heart: accent-rose, filled
  - Lost heart: surface-elevated, 30% opacity, empty outline
- "HP" label above — badge text, text-muted
- When hit: lost heart does a break animation (cracks, splits into 2 halves falling away, 300ms) + screen edge flashes red (100ms, 15% opacity)
- When HP = 1: remaining heart pulses (scale 1.0–1.15, glow-rose, 600ms loop)
- When HP = 0: standoff failed (see Standoff Failed state below)

### Ability Belt (resource gems spent in battle)

Resource gems are not dead currency during standoffs. Matching them fills the wallet and also unlocks manual combat skills shown as a compact row above the resource bar.

- 4 small skill chips (28px tall, horizontal):
  - **🍃 Mend**: spend 3 Nature → heal 1 HP and clear poison/spoil from 1 chosen cell
  - **💧 Wash**: spend 3 Water → clear fog or weaken from a 3×3 area
  - **📘 Study**: spend 3 Knowledge → reveal the next creature action immediately and expose one new weakness for 2 turns
  - **🔧 Trap**: spend 3 Craft → deal 4 true damage and strip 2 armor or destroy 1 stone blocker
- A skill chip is dimmed until the player can afford it
- When affordable: chip border glows in its resource color and pulses subtly
- Tap skill chip → targeting overlay appears if needed; second tap confirms
- Skills use the same run wallet shown in the thumb zone, so store purchases and battle powers compete for the same resources

### Damage Calculation

- Base damage per match: 3-match = 3, 4-match = 5, 5-match = 8, 6+ match = 12
- Weakness multiplier: ×2.0 (gems the creature is weak to)
- Resistance multiplier: ×0.5 (gems the creature resists)
- Armor reduction: subtract creature's current armor from damage, minimum 1
- Streak bonus: if player streak > 1, add +1 per streak tier
- Multi-match cascade: each successive match in a cascade deals +1 bonus damage
- Resource skills resolve after the current cascade finishes and do not consume a move

### Standoff Victory

When creature HP reaches 0:
- Creature banner: HP bar empties, creature emoji shakes (3 cycles, 4px), then the entire banner slides up and fades out (300ms)
- Board pauses — gems freeze in place
- Centered victory flash: "🏆 Creature Studied!" — heading-lg, accent-emerald, glass-bg pill, glow-emerald. Scale from 0.8 to 1.0, 200ms spring.
- Below: "You gathered valuable data on [creature name]" — caption, text-secondary
- After 1.5s: transitions to Node Complete interstitial (Screen 3c) with bonus rewards:
  - Clue reward: always reveals 1 clue of the creature's weakness category
  - Resource reward: +3 of a creature-linked resource type
  - If first-time victory: guaranteed store discount token for the next Field Store
  - Possible souvenir drop

### Standoff Failed

When player HP reaches 0:
- Board dims to 30% opacity
- Centered card (280px wide, surface, rounded-xl, shadow-card, padding xl):
  - "❌ Standoff Lost" — heading-lg, accent-rose
  - "The [creature name] proved too strong" — body, text-secondary
  - Divider
  - **"Retry"** button: full width, 44px, accent-cyan gradient, "Try Again" heading-sm white. Resets the node with same creature/same board seed.
  - **"Retreat"** link: body, text-muted, underline. Skips this node (no rewards) and proceeds. Costs 1 resource gem from the wallet (player chooses which type).

---

## Screen 3e: Expedition Crisis (between-node decision)

Appears between nodes when the expedition route includes a crisis event. This is NOT a board screen — it's a decision card that modifies the next node's conditions.

### Layout

- Full-screen overlay on the board background (blurred biome art visible behind)
- Background: rgba(10,14,26,0.85)
- Centered card: 340px wide, auto height, surface, rounded-xl, shadow-card

### Card Content (padding xl):

#### Header
- Crisis icon (40px, centered): themed to the crisis type
  - River crossing: 🌊
  - Supply shortage: 🎒
  - Rare sighting: 🔭
  - Poacher activity: 🚨
  - Weather event: ⛈️
- Crisis title — heading-lg, text-primary, centered, margin-top sm (e.g., "River Crossing")
- Description — body, text-secondary, centered, margin-top xs, max 3 lines (e.g., "A wide river blocks the expedition route. How do you proceed?")

#### Divider (border-subtle, margin-y md)

#### Choice A (top option card)
- Card (surface-elevated, rounded-lg, padding md, border 1px border-subtle):
  - On hover/press: border changes to accent-cyan, glow-cyan
  - **Title row**: choice label — heading-sm, text-primary (e.g., "Ford the River")
  - **Cost row** (if any): "Cost: 5 💧 Water" — caption, accent-rose. Shows resource icon (14px) + count. Cost is deducted from the 4-resource wallet.
    - If player cannot afford: card is dimmed (40% opacity), "Not enough resources" caption below, not tappable
  - **Effect row**: "Next node starts normally" — caption, accent-emerald (positive effects in emerald, negative in accent-rose)

#### Choice B (bottom option card, margin-top sm)
- Same card structure as Choice A
  - e.g., Title: "Attempt the Crossing"
  - Cost: "Free"
  - Effect: "Next node has Flooding hazard" — caption, accent-rose (negative)
  - May include a secondary effect: "+ 2 bonus moves" — caption, accent-emerald

#### Optional Choice C (rare, for especially interesting crises)
- Same structure, typically the "risky high-reward" option
  - e.g., Title: "Search for a Rare Species"
  - Cost: "+1 bonus standoff node (harder)"
  - Effect: "Discover a rare creature + 2 bonus clues" — caption, accent-amber

### Crisis Examples

| Crisis | Icon | Choice A | Choice B |
|---|---|---|---|
| **River Crossing** | 🌊 | Spend 5 💧 Water → safe passage | Free → next node has Flooding hazard |
| **Supply Shortage** | 🎒 | Spend 3 🍃 Nature to forage → normal | Free → next node has 5 fewer moves |
| **Rare Sighting** | 🔭 | Spend 3 📘 Knowledge → add a bonus store node with rare goods | Ignore → no cost, no reward |
| **Poacher Activity** | 🚨 | Spend 3 🔧 Craft to rig deterrents → +1 conservation clue | Sneak past → free, no reward |
| **Sudden Storm** | ⛈️ | Spend 4 💧 Water for shelter systems → safe | Free → next node starts with Fog on 50% of the board |
| **Territorial Warning** | 🐾 | Spend 3 🍃 Nature to circle around → safe | Free → next standoff creature starts with +10 HP |

### After Choice

- Selected card pulses (border accent-cyan, 200ms), unselected card fades to 20% opacity (200ms)
- If choice has a resource cost: resource icons float from the wallet area to the card and vanish (3-4 small icons, staggered, 400ms total)
- Card fades out (300ms), a brief "route continues" animation plays on the node progress track (avatar walks to next node, 500ms)
- Next node loads with modified config based on the choice

---

## Screen 3f: Field Store (between-node merchant)

Appears on dedicated **Field Store** nodes or when a crisis spawns a bonus shop. The vibe is compact, high-value, and run-focused: buy one or two meaningful upgrades, not browse a giant menu.

### Layout

- Full-screen overlay on top of the biome background
- Background: rgba(10,14,26,0.88)
- Top header bar (56px): "Field Store" heading on left, wallet summary on right
- Main card stack centered with 3 offer cards visible at once
- Bottom action bar (72px): reroll, continue, and inventory-slot summary

### Header Wallet

- Horizontal row of the 4 resource gems with counts:
  - 🍃 Nature
  - 💧 Water
  - 📘 Knowledge
  - 🔧 Craft
- If the player has a store discount from a standoff victory: small badge "Discount -1" in accent-emerald

### Offer Cards

Each offer card is 100px tall, surface-elevated, rounded-lg, border 1px border-subtle.

- Left: item icon badge (32px)
- Center:
  - Item name — heading-sm
  - Item type pill — badge text:
    - Consumable
    - Passive
    - Battle Tech
  - 1-line description — caption, text-secondary
- Right:
  - Cost row with 1-2 resource icons and counts
  - Purchase button or "Owned / Full" disabled state

### Item Examples

- **Field Medkit** (Consumable): cost 3 🍃 + 1 📘. Restores 2 HP during a standoff.
- **Flash Flood Vial** (Battle Tech): cost 4 💧. Clears one full row and applies Wet, making the next Water match worth +2.
- **Predator Notes** (Passive): cost 4 📘. First Study skill each standoff is free.
- **Snare Kit** (Battle Tech): cost 3 🔧. Trap skill deals +2 damage for the next two uses.
- **Forager's Charm** (Passive): cost 2 🍃 + 2 💧. Gain +1 Nature whenever a 4-match occurs.
- **Pack Expansion** (Passive): cost 2 🔧 + 2 📘. Increases consumable capacity by 1 for the run.

### Store Rules

- Stock size: 3 offers
- 1 free reroll per store; additional rerolls cost 2 📘
- Max 2 consumables carried, max 3 passive relics equipped
- Buying an item animates the card into the inventory tray at the bottom
- The player can leave without buying, but store nodes are the main place to convert resource surplus into power

### Bottom Action Bar

- **Reroll** button: secondary button, disabled if no free reroll remains and player lacks 2 📘
- **Continue Expedition** button: primary accent-cyan button
- Small slot summary: "Consumables 1/2 • Passives 2/3"

---

## Screen 4: Species Guess Panel (replaces clue sheet content)

When the user taps "Guess Species" in the clue bottom sheet.

### Sheet Content Changes:
- Species header remains (sticky)
- Below header: search/guess input area

#### Guess Input
- Text input: full width, 44px tall, surface-elevated, rounded-md, border 1px border-subtle
- Placeholder: "Type species name..." — body, text-muted
- On focus: border changes to border-accent, glow-cyan
- Below input: suggestion list as cards (surface-elevated, rounded-md, padding sm md):
  - Each suggestion: species common name (body, text-primary) + scientific name (caption, text-muted italic)
  - Max 4 visible, scrollable
  - Tap to select

#### Selected State
- Input shows selected species name with a small X button to clear
- Below: "Confirm Guess" button — full width, 44px, rounded-md
  - Background: linear-gradient(135deg, accent-amber, #d97706), white heading-sm text
  - Disabled if nothing typed

#### Result (after guess submission)
- **Correct**: card expands with confetti particles, species image fades in (replacing silhouette), "Correct!" heading-lg accent-emerald, species full name, conservation status badge
- **Incorrect**: card shakes horizontally (3 cycles, 4px amplitude, 300ms), "Not quite..." body text-secondary, "Keep collecting clues" caption text-muted, returns to clue sheet after 1.5s

---

## Screen 5: Run Complete (modal overlay on Board Screen)

Full-screen overlay after all nodes are finished.

### Background
- Board fades to 30% opacity behind rgba(10,14,26,0.7)
- Subtle particle confetti from top (accent-cyan, accent-amber, accent-emerald particles, slow fall)

### Card
- Centered, 340px wide, auto height, surface, rounded-xl, shadow-card
- Padding xl

### Content (vertical, centered):
- Trophy icon (48px, accent-amber) or expedition-themed icon
- "Expedition Complete!" — heading-lg, text-primary, margin-top md
- Region name — body, text-secondary

- **Divider** (margin-y md)

- **Stats Grid** (2 columns, 4 rows, gap md):
  - Each cell: surface-elevated, rounded-md, padding md, centered
    - Large number: heading-lg, accent color
    - Label below: caption, text-muted
  - Row 1: "Nodes" (count, accent-cyan), "Score" (total, accent-amber)
  - Row 2: "Species" (identified count, accent-emerald), "Creatures" (standoffs won, accent-rose)
  - Row 3: "Damage Taken" (total HP lost, accent-rose), "Crises" (choices made, accent-amber)
  - Row 4: "Store Buys" (items purchased, resource-knowledge), "Resources Spent" (sum spent in crises + stores, resource-craft)
  - Rows with zero values are collapsed only if their partner cell is also zero

- **Resource Wallet Row** (margin-top md):
  - Horizontal row: 4 resource circles (18px each) with count (caption, white) below each
  - Always shown
  - Represents the run's collected resources and how much was retained at the finish

- **Knowledge Match Row** (margin-top sm):
  - Horizontal row: 8 knowledge icons (14px each) with tiny count beneath
  - Optional subtitle: "Clue matches this run"

- **Souvenirs Row** (if any, margin-top md):
  - "Souvenirs Collected" — caption, text-muted
  - Row of souvenir emojis (24px each, gap sm)

- **Divider** (margin-y md)

- **"New Expedition" button**: full width, 48px, rounded-lg, accent-cyan gradient, white heading-sm
- **"Return to Map" link**: below button, body, text-secondary, underline, margin-top sm, tapping returns to Map Screen

---

## Screen 6: Species Catalog (Field Guide tab)

### Layout
- Status bar (47px)
- Screen header (56px)
- Content area (scrollable, fills remaining)
- Tab bar (90px)

### Header
- Background: surface
- Bottom border: 1px border-subtle
- Left: "Field Guide" — heading-lg, text-primary
- Right: filter icon (24px, text-secondary), tap opens filter dropdown

### Filter Bar (below header, 44px, horizontal scroll)
- Row of filter pills (rounded-full, padding 4px 14px, gap sm):
  - "All" (active: accent-cyan background, white text)
  - "Discovered" (inactive: surface-elevated, text-secondary)
  - "In Progress" (inactive)
  - "Undiscovered" (inactive)
  - Biome/region pills if applicable
- Active pill: accent-cyan background, white badge text
- Inactive: surface-elevated, text-secondary, tappable

### Species Grid (scrollable, padding lg)
- 2-column grid, gap md
- Each card (surface-elevated, rounded-lg, overflow hidden):
  - **Image area** (aspect ratio 4:3, top):
    - Discovered: species photo, slight dark gradient at bottom
    - In Progress: species silhouette (dark outline on surface), "?" overlay center
    - Undiscovered: fully dark surface with lock icon center (20px, text-muted)
  - **Text area** (padding sm md):
    - Species name — heading-sm, text-primary (or "???" if undiscovered)
    - Scientific name — caption, text-muted, italic (or hidden)
    - Bottom row: conservation status pill (tiny, colored: CR=accent-rose, EN=accent-amber, VU=accent-amber, LC=accent-emerald) + clue progress dots (6px, row)
  - **Border treatment**:
    - Discovered: 2px bottom border accent-emerald
    - In Progress: 2px bottom border accent-amber
    - Undiscovered: none

### Empty State (no species yet)
- Centered in content area: compass icon (48px, text-muted), "Start an expedition to discover species" — body, text-secondary

---

## Screen 7: Inventory (Inventory tab)

### Layout
- Same shell as Species Catalog: header + scrollable content + tab bar

### Header
- "Inventory" — heading-lg, text-primary

### Sections (vertical scroll, padding lg):

#### Resource Reserves
- "Resource Reserves" — heading-sm, text-primary, margin-bottom sm
- Card (surface-elevated, rounded-lg, padding md):
  - 4-column row, each column centered:
    - Resource circle (32px, resource color) with total count (heading-sm, white or dark navy for 📘) inside
    - Label below: caption, text-muted ("Nature", "Water", "Knowledge", "Craft")

#### Expedition Kit
- "Expedition Kit" — heading-sm, text-primary, margin-top lg, margin-bottom sm
- Card (surface-elevated, rounded-lg, padding md):
  - **Consumables row**: 2 slots, each either item chip or dashed empty slot
  - **Passive row**: 3 slots, each item chip with icon + short name
  - Tap an item for its effect text and source ("Bought at store", "Rewarded after boss", etc.)

#### Knowledge Ledger
- "Knowledge Ledger" — heading-sm, text-primary, margin-top lg, margin-bottom sm
- 2-row grid of the 8 knowledge gem icons with lifetime match totals
- Used for completionists and balancing visibility, not spendable currency

#### Souvenirs
- "Souvenirs" — heading-sm, text-primary, margin-top lg, margin-bottom sm
- 3-column grid of souvenir cards (surface-elevated, rounded-md, padding md, centered):
  - Emoji (32px)
  - Name — caption, text-primary, centered, max 2 lines
  - Count if > 1: "×3" — badge, text-secondary
- Empty state: dashed border card, "Complete encounters to earn souvenirs" — caption, text-muted

---

## Animation & Motion Principles

### Board Animations
- **Gem swap**: 180ms ease-in-out, two gems translate to each other's positions simultaneously
- **Invalid swap**: snap to swapped positions then snap back, 120ms ease-in total round trip, subtle shake (2px horizontal)
- **Match explode**: matched gems scale to 1.3x over 100ms, then fade opacity to 0 over 150ms. Simultaneously: 4-6 small particles (4px circles, gem's category color) burst outward radially, travel 20-30px, fade over 300ms
- **Gem fall**: ease-out, 80ms base + 40ms per row fallen, max 280ms. Slight bounce at landing (scale-y 0.95 for 60ms then back)
- **New gem enter**: appear at top of column, fall with same physics as above
- **Cascade pause**: 100ms delay between match-clear and next gravity check, so player can see matches resolve

### Standoff Animations
- **Creature entrance** (node start): creature banner slides down from top (300ms, ease-out), creature emoji scales from 2.0 to 1.0 with slight bounce. Board dims briefly (200ms, 30% opacity) then brightens.
- **Damage dealt**: floating damage number rises from board center, HP bar depresses (shrinks fill with 200ms ease-in-out). If weakness hit: screen-wide flash in the gem category color (100ms, 10% opacity).
- **Creature attacks**: board shakes for physical attacks (Roar, Strike). Screen edge flashes red for player damage. Specific animations per action type (see Screen 3d).
- **Creature defeated**: HP bar drains to zero, creature banner shakes and flies upward off-screen (400ms), victory text pops in.
- **Player hit**: lost heart breaks apart, screen edges pulse red (150ms), board briefly pauses (100ms).

### Crisis Animations
- **Crisis card entrance**: background dims (200ms), card slides up from bottom (300ms, ease-out) with slight overshoot
- **Choice selection**: selected card border glows, unselected fades, resource cost icons float from wallet to card
- **Crisis exit**: card scales down to 0.95 and fades (200ms), node progress track avatar walks forward (500ms)

### Store Animations
- **Store entrance**: offer cards stagger up from below, 60ms apart, while wallet icons slide in from the right
- **Purchase confirmed**: cost icons fly from wallet to the offer card, item chip pops out of the card and lands in the kit tray
- **Reroll**: current cards tilt back 4deg and slide down; new cards cascade in from alternating sides

### Screen Transitions
- **Tab switch**: crossfade 200ms
- **Bottom sheet open**: slide up from bottom, 300ms ease-out, with background dimming
- **Bottom sheet drag**: follows finger 1:1, with rubber-band effect past limits
- **Modal overlay**: fade in background 200ms, card slides up 300ms ease-out (staggered 50ms after background)
- **Encounter flash**: spring-style entrance (slight overshoot on scale)

### Haptic Feedback (mobile)
- Match found: light impact
- Streak milestone (×2, ×3): medium impact
- Objective complete: success notification pattern
- Invalid move: soft error tap
- **Standoff — damage dealt**: light impact per damage number
- **Standoff — weakness hit**: medium impact + 50ms pause
- **Standoff — creature attacks**: heavy impact (board shake)
- **Standoff — player hit**: double-tap heavy impact pattern
- **Standoff — creature defeated**: success notification + medium impact
- **Crisis — choice confirmed**: medium impact
- **Store — purchase confirmed**: medium impact + soft success tap
- **Store — reroll**: light impact

---

## Responsive Breakpoints

### Small phone (< 375px width)
- Gem grid cells: 38px
- Reduce board padding to xs
- Node progress track: hide text labels, dots only
- Gem wallet: numbers only, no labels

### Standard phone (375–414px)
- As specified above (baseline)

### Large phone / small tablet (415–768px)
- Gem grid cells: 48px
- Board has more breathing room
- Clue bottom sheet: max-width 420px, centered
- Species catalog: 3-column grid

### Tablet landscape (> 768px)
- Side-by-side layout: board left (60%), clue panel right (40%) — persistent, no bottom sheet
- Tab bar moves to left sidebar (vertical)
- Map gets picture-in-picture during runs (small 200px window, bottom-right)
