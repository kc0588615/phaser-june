---

name: modern-atmospheric-hud-skill
description: Design modern premium UI for a mobile-first match-3 expedition game using Phaser canvas with React overlays. Prioritize dark glass surfaces, atmospheric depth, and restrained bioluminescent accents.
context: Hybrid Phaser/React app, Cesium map integration, expedition/discovery theme
------------------------------------------------------------------------------------

# Frontend Design Skill: Modern Atmospheric HUD for Mobile Match-3 Expedition Game

Design production-grade interfaces for a hybrid mobile-first web game combining Phaser canvas gameplay with React UI overlays, Cesium 3D map, and biodiversity discovery mechanics.

This skill favors a **premium dark glass UI** over a field-journal look.

## Primary Visual Direction

**Default aesthetic:** cinematic glassmorphism for game overlays.

**Visual tone:**

* atmospheric
* bioluminescent
* premium
* minimal
* calm under pressure
* modern mobile game HUD, not scrapbook or notebook

**Core principle:** let the world art carry texture and fantasy; let the UI carry clarity, hierarchy, and restraint.

## Hard Style Rules

Always prefer:

* dark translucent surfaces
* soft backdrop blur
* thin luminous borders
* subtle cyan/mint active glow
* generous padding
* rounded corners with consistent radius
* modern sans typography
* low-noise composition

Always avoid:

* parchment textures
* brass trims
* ornate borders
* faux-explorer props
* handwritten headings
* scrapbook layering
* bubbly mobile-game chrome
* loud rainbow gradients
* candy-color saturation
* constant pulsing or attention-seeking motion

## Technical Architecture Constraints

* **Dual rendering:** Phaser canvas for gameplay, React DOM for overlays and panels
* **Mobile-first:** touch targets at least 44px, portrait-first layout, thumb-friendly action placement
* **EventBus communication:** use typed events through `src/game/EventBus.ts`
* **Persistent mount:** prefer hiding with CSS/display state rather than unmounting panels that hold listeners
* **Stack:** Next.js, TypeScript, shadcn/ui, Tailwind, Cesium
* **Performance target:** preserve smooth gameplay and avoid unnecessary React work during active play

## Output Contract

When asked to design or implement a component, always respond in this order:

1. **Component role**
2. **Chosen visual treatment**
3. **Information hierarchy**
4. **Mobile interaction model**
5. **Layout placement relative to the Phaser board**
6. **shadcn/Tailwind implementation plan**
7. **Performance and accessibility checks**

Do not skip the visual treatment decision.
Do not mix multiple aesthetics in one component.
Do not default back to a field-journal style unless explicitly requested.

## Decision Framework

Before implementing, classify the component:

### 1. Component Role

* **Live HUD:** persistent, glanceable, low-noise
* **Progress feedback:** node progression, clue updates, milestone banners
* **Discovery moment:** celebratory but controlled
* **Reference surface:** species info, clues, catalog, objectives
* **Navigation layer:** map controls, drawers, tabs, mode switching

### 2. Visual Treatment

Use the same core system everywhere, with only small intensity shifts:

* **Live HUD:** darkest surfaces, thinnest borders, lowest motion
* **Progress feedback:** slightly brighter glow, stronger emphasis
* **Discovery moment:** elevated blur, focused spotlight, richer internal depth
* **Reference surface:** calm card stacks, clearer separators, more readable spacing
* **Navigation layer:** clean segmented controls, obvious active state, quiet idle state

### 3. Attention Budget

Ask:

* Is this needed during active matching?
* Can this stay at the edge instead of the center?
* Can this collapse to one line or one icon?
* Can this animate once and then become still?

If the answer is yes, do it.

## System Tokens

### Color Behavior

Use a restrained dark palette with selective accent energy.

```css
:root {
  --bg-0: hsl(200 35% 6%);
  --bg-1: hsl(196 28% 9%);
  --bg-2: hsl(193 24% 13%);
  --surface: hsla(190 30% 12% / 0.68);
  --surface-strong: hsla(190 34% 10% / 0.82);
  --surface-soft: hsla(190 24% 16% / 0.52);

  --border-soft: hsla(186 55% 74% / 0.22);
  --border-active: hsla(182 80% 74% / 0.48);
  --glow-soft: hsla(177 90% 72% / 0.16);
  --glow-active: hsla(177 100% 72% / 0.28);

  --text-strong: hsl(0 0% 96%);
  --text: hsl(200 18% 84%);
  --text-muted: hsl(198 12% 66%);
  --text-dim: hsl(198 10% 52%);

  --success: hsl(150 55% 62%);
  --warning: hsl(38 88% 68%);
  --danger: hsl(0 75% 68%);
}
```

Rules:

* Keep most surfaces in blue-green charcoal space
* Reserve high-brightness cyan/mint for active, selected, or newly revealed states
* Never make every element glow at once
* Let gameplay pieces remain more colorful than the surrounding HUD

### Typography

Default stack:

* **Display:** `Space Grotesk`
* **Body:** `DM Sans` or `Inter`
* **Data/utility:** `Roboto Mono`

Tone:

* headlines are clean and confident
* labels are quiet and compact
* metadata is subdued
* no decorative serif or handwritten font by default

Suggested scale:

```css
:root {
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
}
```

### Radius, Stroke, Shadow

* **Card radius:** 18px to 24px
* **Inner chip radius:** pill or 14px
* **Border weight:** 1px preferred
* **Shadow:** soft, broad, low contrast
* **Glow:** ambient edge light, not neon tubes

### Blur and Transparency

Use glass intentionally:

* HUD cards: light blur
* modal surfaces: medium blur
* background overlays: soft gradient dimming
* never stack so much blur that text loses contrast

## Motion Rules

Motion should feel expensive, soft, and intentional.

Use:

* fade
* slight upward drift
* subtle scale from 0.98 to 1
* gentle border/glow pulse for active states
* horizontal progress sweeps

Avoid:

* bounce
* elastic overshoot
* arcade pop spam
* repeated shimmer loops on many components
* long chained animations during gameplay

Animation guidance:

* most transitions: 160ms to 240ms
* reveals: 240ms to 320ms
* use `transform` and `opacity`
* avoid layout-triggering animations during active gameplay

## Layout Rules for Phaser Coexistence

The puzzle board and runner lane are the visual center of gravity.

Therefore:

* anchor HUD to top, bottom, and corners
* keep the central board area visually clear
* use overlays that float above the scene without fully boxing it in
* expand secondary information from edges or bottom sheets
* use large centered overlays only for milestone or discovery moments

Never:

* cover the active puzzle board with persistent panels
* place tall stacked chrome in the center during a live run
* force the player to parse dense text while matching

## Component Defaults

### 1. Game HUD Overlays

**Default treatment:** Minimal tactical glass HUD

Use for:

* score
* streak
* current objective
* consumables
* expedition state

Rules:

* edge-anchored
* compact first, expandable second
* one emphasis state at a time
* icon + short label + value
* translucent charcoal panel with thin luminous border

Visual cues:

* numbers can use mono or tight sans
* active objective can gain a soft cyan edge glow
* do not over-badge or over-outline

### 2. Clue Toasts and Discovery Notifications

**Default treatment:** Elevated cinematic callout

Use for:

* new clue found
* habitat hint revealed
* milestone progression
* species evidence updates

Rules:

* brief and highly readable
* one toast at a time
* newest toast replaces prior one cleanly
* icon/art tile on the left, title + supporting line on the right
* appears above gameplay, then settles or exits

Visual cues:

* strongest glow in the system, but still restrained
* backdrop blur stronger than standard HUD cards
* title is bold and bright; supporting line is muted

### 3. Expedition Track / Node Progress

**Default treatment:** Luminous route strip

Use for:

* node path
* region progression
* obstacle sequence
* current expedition stage

Rules:

* horizontal, simple, legible
* node states: complete / current / upcoming / locked
* current node gets halo and strongest contrast
* connector line stays subtle
* labels remain short

Visual cues:

* route line is soft and thin
* current node has a glow ring
* completed nodes are calmer than the active node

### 4. Species Drawer / Bottom Sheet

**Default treatment:** Premium reference drawer

Use for:

* mystery species progress
* clue count
* quick facts
* expandable details

Rules:

* collapsed by default during active play
* opens from bottom
* strong headline, muted metadata, clear progress chip
* one primary action only

Visual cues:

* heavy blur is acceptable here because it is separated from the core board
* use chips and dividers sparingly
* avoid making it look like enterprise dashboard UI

### 5. Species Catalog / Collection Screens

**Default treatment:** Modern archival gallery

Use for:

* browsing species
* filtering by habitat, biome, rarity, status
* discovery completion

Rules:

* use calm grid/list views
* cards should feel premium and breathable
* locked state is subdued, not ugly
* filters should look like clean pills, not chunky segmented toy controls

Visual cues:

* strong image area
* thin type hierarchy
* light surface separation and minimal chrome

### 6. Cesium Map Overlay

**Default treatment:** Atmospheric tactical overlay

Use for:

* globe controls
* expedition nodes
* habitat polygons
* region labels

Rules:

* allow globe art to dominate
* keep overlays sparse
* controls float at edges
* labels fade with zoom level
* data overlays should be translucent, not opaque stickers

Visual cues:

* coordinate and telemetry surfaces can use mono accents
* selected habitats get subtle luminous outline/fill
* never turn the map into a cluttered GIS desktop tool

## Mobile Interaction Model

* Primary actions belong in the bottom third where possible
* Secondary readouts can live along the top edge
* Bottom sheet is preferred over center modal for reference content
* Long-press is optional, never required for core play
* Swipe can dismiss transient overlays or move between side panels
* Expansion states should persist when moving between game, map, and catalog

## Accessibility and Readability

Always check:

* text contrast against blurred surfaces
* legibility over varied scene backgrounds
* touch targets at least 44px, preferably 48px
* state not conveyed by color alone
* focus styles visible even on dark translucent surfaces
* motion reduced when appropriate

For small text on glass:

* raise opacity of the surface first
* darken the backdrop if needed
* do not solve contrast problems with more glow

## Runtime Safety Rules

* Do not subscribe React UI directly to unnecessarily high-frequency game events
* Prefer coarse-grained UI events such as milestone changed, clue added, objective updated, run state changed
* Throttle or batch updates when a source can fire rapidly
* Avoid expensive blur stacks on many simultaneous elements
* Avoid box-shadow spam on large lists
* Prefer opacity and transform transitions only
* Keep live HUD components shallow and memo-friendly

## Implementation Preferences

When proposing code:

* prefer existing shadcn primitives first
* prefer project Tailwind tokens and CSS variables over one-off colors
* use `backdrop-blur-*` selectively, not everywhere
* use `pointer-events-none` on decorative overlays where appropriate
* use `pointer-events-auto` only on interactive children
* keep z-index layers simple and named by purpose

## Example Utility Classes

```tsx
<Card
  className={cn(
    "rounded-3xl border border-white/10",
    "bg-[color:var(--surface)] text-[color:var(--text)]",
    "backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
  )}
/>
```

```tsx
<div
  className={cn(
    "rounded-full border px-3 py-1 text-sm",
    "border-[color:var(--border-soft)]",
    "bg-[color:var(--surface-soft)] text-[color:var(--text-muted)]",
    isActive && "border-[color:var(--border-active)] text-white shadow-[0_0_0_1px_rgba(140,255,235,0.12),0_0_24px_rgba(140,255,235,0.10)]"
  )}
/>
```

## Review Checklist

Before finalizing any component, verify:

* [ ] It looks modern, calm, and premium rather than themed or decorative
* [ ] The world art remains visible and emotionally dominant
* [ ] The center gameplay area stays clear during active play
* [ ] There is only one primary emphasis area at a time
* [ ] Active glow is used sparingly and intentionally
* [ ] Typography is clean and neutral
* [ ] The layout works one-handed on a narrow mobile screen
* [ ] Motion uses transform and opacity only where possible
* [ ] React work is minimized during live gameplay
* [ ] Contrast remains strong over dark translucent surfaces

## Anti-Patterns

❌ Paper, parchment, leather, brass, scrapbook, handwritten explorer UI

✅ Dark glass, luminous edge light, restrained premium HUD

❌ Heavy ornament trying to explain the setting

✅ Let the scene art explain the setting; let the UI explain the state

❌ Multiple competing glow colors and loud highlight states

✅ One accent family, one active emphasis at a time

❌ Dense dashboard panels during active puzzle play

✅ Compact edge HUD and expandable secondary surfaces

❌ Toast spam and stacked notifications

✅ One controlled callout with clean replacement behavior

❌ Re-rendering large trees from noisy game events

✅ Coarse event wiring and memo-friendly UI islands

## Closing Principle

Every interface element should answer:

**Does this feel like a premium atmospheric game overlay that supports focus, discovery, and motion without fighting the world beneath it?**
