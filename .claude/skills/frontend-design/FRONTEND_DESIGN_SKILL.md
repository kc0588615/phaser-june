---
name: mobile-match3-biodiversity-design
description: Design distinctive UI for mobile-first match-3 expedition game combining Phaser canvas + React overlays. Harmonize game aesthetics with naturalist field journal sensibility.
context: Hybrid Phaser/React app, Cesium map integration, expedition/discovery theme
---

# Frontend Design Skill: Mobile Match-3 Biodiversity Game

Design production-grade interfaces for a hybrid mobile-first web game combining Phaser canvas gameplay with React UI overlays, Cesium 3D map, and biodiversity discovery mechanics.

## Context-Specific Constraints

### Technical Architecture
- **Dual rendering**: Phaser canvas (game) + React DOM (UI panels/HUD)
- **Mobile-first**: Touch targets ≥44px, thumb-zone layout, portrait primary
- **EventBus communication**: `src/game/EventBus.ts` typed events bridge Phaser↔React
- **Persistent mount**: Components use `display: none`, NOT unmount (preserves listeners)
- **Stack**: Next.js, TypeScript, shadcn/ui, Tailwind, Cesium for 3D map
- **Performance**: 60fps game loop, minimize React re-renders during gameplay

### Design Philosophy: Naturalist Field Journal
Core aesthetic = **modern digital field journal** meeting expedition game:
- Scientific precision + tactile exploration
- Specimen collection + habitat discovery
- Educational depth + playful engagement
- Analog warmth (sketches, notes) + digital clarity

Avoid: generic mobile game tropes (bubbly cartoon, neon gradients, Comic Sans energy)

## Design Thinking Process

Before implementing, define:

1. **Component Role**
   - Game-critical HUD? (minimal, non-distracting)
   - Discovery moment? (celebratory, immersive)
   - Data reference? (scannable, organized)
   - Narrative context? (atmospheric, engaging)

2. **Aesthetic Direction** (pick ONE per component, execute fully)
   - **Vintage Field Guide**: Sepia tones, botanical illustration style, ornate borders, parchment texture
   - **Modern Naturalist**: Clean sans-serif, photography-forward, generous whitespace, earthy palette
   - **Tactical Expedition**: Utilitarian, monospace accents, grid overlays, topographic patterns
   - **Specimen Archive**: Card catalog, taxonomy hierarchy, labeled diagrams, archival precision
   - **Trail Journal**: Handwritten touches, ink splatters, worn edges, chronological narrative

3. **Mobile Interaction Model**
   - **Thumb zones**: Primary actions bottom 1/3, secondary top corners
   - **Gesture vocabulary**: Swipe (navigation), tap (select), long-press (details), drag (rarely)
   - **State persistence**: Collapse/expand states survive mode switches (map↔game↔species list)
   - **Context switching**: Clear visual cues when toggling between viewMode states

4. **Information Hierarchy**
   - **Glanceable**: Score, streaks, objectives (always visible during game)
   - **On-demand**: Species details, clues, souvenirs (modal/drawer)
   - **Ambient**: Habitat context, environmental hints (subtle background elements)

## Component-Specific Guidelines

### Game HUD Overlays
**Challenge**: Info display without obscuring Phaser board (centered canvas)

**Design principles**:
- Semi-transparent backgrounds (backdrop-blur)
- Corner/edge anchoring (avoid center-screen)
- Compact icon-first design (tap to expand details)
- Animation: slide-in on update, pulse on milestone

**Example aesthetic**: Tactical Expedition
- Monospace numeric scores
- Icon badges for gem wallet (consumable inventory)
- Minimal chrome, high contrast on varied backgrounds
- Grid-snapped positioning

### Discovery Moments (Clue Reveals, Species Unlocks)
**Challenge**: Celebrate achievement without breaking game flow

**Design principles**:
- Full-screen takeover (brief, skippable)
- Scroll-driven reveal (species card details unfold)
- Haptic/sound cues (EventBus trigger, not UI responsibility)
- Collectible "specimen card" metaphor

**Example aesthetic**: Vintage Field Guide
- Illustration reveal with ink-drawn border animation
- Taxonomy badge fade-in sequence
- Parchment-textured card background
- Serif display font for species name, sans body text

### Species Catalog/List
**Challenge**: Browse 500+ entries, filter by bioregion/habitat, responsive performance

**Design principles**:
- Virtualized scroll (react-window for 500+ cards)
- Filter chips (habitat, bioregion, conservation status)
- Card density: thumbnail + name + key facts (tap for modal)
- Discovery state: grayscale locked, color unlocked

**Example aesthetic**: Modern Naturalist
- Photography hero images (species in habitat)
- Sans-serif hierarchy (DM Sans display, system body)
- Earthy palette: moss green, clay terracotta, stone gray
- Generous padding, card shadows for depth

### Map Interface (Cesium Overlay)
**Challenge**: 3D globe controls + habitat polygons + expedition nodes, mobile-friendly

**Design principles**:
- Floating action button (bottom-right, toggle map controls)
- Habitat highlights (translucent polygon fills, no clutter)
- Node markers (tap to load expedition, distinct from species pins)
- Zoom-adaptive labels (hide detail at high altitude)

**Example aesthetic**: Tactical Expedition
- Topographic line pattern on water bodies
- Compass rose (fixed top-right)
- Coordinate display (monospace, top-left)
- UTM grid overlay toggle (advanced users)

### Expedition Run UI (Node Track, Encounter Panels)
**Challenge**: Linear progression through nodes, each with objectives/encounters/souvenirs

**Design principles**:
- Horizontal scroll track (past←current→future nodes)
- Encounter flash (modal interrupt, story beat)
- Souvenir pickup (badge animation, add to pouch)
- Objective checklist (checkboxes, strikethrough on complete)

**Example aesthetic**: Trail Journal
- Handwritten-style headings (Caveat or Permanent Marker)
- Node icons: hand-drawn trail markers
- Encounter text: narrative prose, aged paper background
- Progress dots (filled=complete, outlined=remaining)

## Typography System

### Font Pairing Strategy
Match fonts to component aesthetic, but maintain app-wide coherence:

**Option A: Scientific Modern**
- Display: `Instrument Serif` (naturalist elegance)
- Body: `Inter Variable` (readable, neutral)
- Accent: `JetBrains Mono` (code/data)

**Option B: Field Guide Classic**
- Display: `Cinzel` (ornate, vintage)
- Body: `Crimson Text` (serif, bookish)
- Accent: `Special Elite` (typewriter)

**Option C: Tactical Utility** (current project leans here)
- Display: `Space Grotesk` (geometric, modern)
- Body: `DM Sans` (friendly, clear)
- Accent: `Roboto Mono` (technical)

**Load via Google Fonts or bundle woff2**. Define CSS vars in `src/styles/globals.css`:

```css
:root {
  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --font-mono: 'Roboto Mono', monospace;
}
```

### Type Scale (Mobile-First)
```css
/* Base: 16px (1rem) */
--text-xs: 0.75rem;   /* 12px - labels, captions */
--text-sm: 0.875rem;  /* 14px - body secondary */
--text-base: 1rem;    /* 16px - body primary */
--text-lg: 1.125rem;  /* 18px - subheadings */
--text-xl: 1.25rem;   /* 20px - card titles */
--text-2xl: 1.5rem;   /* 24px - section headers */
--text-3xl: 1.875rem; /* 30px - page titles */
--text-4xl: 2.25rem;  /* 36px - hero display */
```

## Color & Theme

### Biodiversity Palette (Naturalist)
Earthy, habitat-inspired, avoid neon/synthetic:

```css
:root {
  /* Primary: Forest Canopy */
  --color-primary: hsl(142, 48%, 28%);     /* #248a46 deep green */
  --color-primary-light: hsl(142, 45%, 65%); /* lighter tint */

  /* Secondary: Clay Terracotta */
  --color-secondary: hsl(16, 62%, 52%);    /* #d9673a warm red-orange */

  /* Accent: Sky Blue (water, air) */
  --color-accent: hsl(201, 78%, 45%);      /* #1a8cb8 clear blue */

  /* Neutral: Stone & Parchment */
  --color-bg: hsl(45, 25%, 96%);           /* #f9f7f3 off-white */
  --color-surface: hsl(0, 0%, 100%);       /* #ffffff pure white */
  --color-text: hsl(210, 15%, 20%);        /* #2b3034 charcoal */
  --color-text-muted: hsl(210, 10%, 50%);  /* #757a80 gray */

  /* Functional */
  --color-success: hsl(142, 48%, 38%);     /* matches primary green */
  --color-warning: hsl(38, 92%, 50%);      /* amber */
  --color-danger: hsl(0, 72%, 51%);        /* red */
}
```

### Dark Mode (Optional, for night exploration)
```css
.dark {
  --color-bg: hsl(210, 15%, 12%);          /* deep charcoal */
  --color-surface: hsl(210, 15%, 16%);     /* card bg */
  --color-text: hsl(45, 25%, 92%);         /* cream white */
  --color-text-muted: hsl(210, 10%, 60%);  /* lighter gray */
}
```

## Motion & Animation

### Performance Budget
- **60fps target**: Use `transform` + `opacity` only (GPU-accelerated)
- **Phaser sync**: Coordinate with game loop, avoid React animation jank
- **Gesture response**: <100ms feedback (button press, card flip)

### Animation Patterns

#### 1. Page/Panel Transitions (Mode Switches)
```css
/* Slide up from bottom (expedition panel) */
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.expedition-panel {
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

#### 2. Discovery Celebrations (Staggered Reveals)
```tsx
// Species card unlock: image → name → details
<div className="species-card">
  <img style={{ animationDelay: '0ms' }} />
  <h3 style={{ animationDelay: '150ms' }} />
  <p style={{ animationDelay: '300ms' }} />
</div>
```

```css
.species-card > * {
  animation: fadeInUp 0.5s ease-out both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

#### 3. Micro-Interactions (Haptic Feedback Analogs)
```css
/* Button press (scale + shadow) */
.btn:active {
  transform: scale(0.95);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 0.1s, box-shadow 0.1s;
}

/* Gem wallet pulse (new consumable) */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
.gem-badge.new {
  animation: pulse 0.6s ease-in-out;
}
```

### Scroll-Driven Effects
Use Intersection Observer for viewport-triggered animations:

```tsx
// Fade in species cards as they scroll into view
const observerOptions = {
  threshold: 0.2,
  rootMargin: '0px 0px -10% 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);
```

## Backgrounds & Atmospheric Details

### Texture Overlays (Naturalist Aesthetic)
```css
/* Parchment grain (species cards, expedition briefing) */
.parchment-bg {
  background-color: var(--color-bg);
  background-image:
    url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E");
}

/* Topographic pattern (map background) */
.topo-pattern {
  background-image:
    repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 11px),
    repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 11px);
}
```

### Gradient Mesh Backgrounds (Discovery Modals)
```css
.discovery-modal {
  background:
    radial-gradient(ellipse at 20% 30%, hsla(142, 48%, 75%, 0.3), transparent 50%),
    radial-gradient(ellipse at 80% 70%, hsla(201, 78%, 75%, 0.2), transparent 50%),
    var(--color-surface);
}
```

### Decorative Borders (Field Guide Cards)
```css
.specimen-card {
  border: 2px solid var(--color-primary);
  border-image: url('/assets/ornate-border.svg') 30 round;
  box-shadow:
    0 2px 8px rgba(0,0,0,0.08),
    inset 0 0 0 1px rgba(255,255,255,0.5);
}
```

## Mobile-Specific Optimizations

### Touch Targets
```css
/* Minimum 44×44px (Apple HIG), prefer 48×48px (Material) */
.touch-target {
  min-width: 48px;
  min-height: 48px;
  padding: 12px; /* expand beyond visual size */
}
```

### Thumb Zone Layout
```tsx
// Primary actions: bottom 1/3 of screen
<div className="fixed bottom-0 w-full p-4 safe-area-bottom">
  <Button>Continue Expedition</Button>
  <Button variant="secondary">View Map</Button>
</div>

// Secondary: top corners (reachable with index finger)
<Button className="fixed top-4 right-4">Settings</Button>
```

### Safe Area (Notch Avoidance)
```css
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

### Prevent Overscroll Bounce (Canvas Games)
```css
body {
  overscroll-behavior: none;
  touch-action: pan-x pan-y;
}
```

## Component Composition Patterns

### HUD Overlay (Game.ts → React)
```tsx
// src/components/GameHUD.tsx
import { useEffect, useState } from 'react';
import { EventBus } from '@/game/EventBus';

export function GameHUD() {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const handler = (data: { score: number; streak: number }) => {
      setScore(data.score);
      setStreak(data.streak);
    };
    EventBus.on('game-hud-updated', handler);
    return () => EventBus.off('game-hud-updated', handler);
  }, []);

  return (
    <div className="fixed top-4 left-4 bg-surface/80 backdrop-blur rounded-lg p-3 shadow-md">
      <div className="text-xs text-muted uppercase tracking-wide">Score</div>
      <div className="text-2xl font-display font-bold">{score}</div>
      {streak > 2 && (
        <div className="text-sm text-accent mt-1">🔥 {streak}x Streak</div>
      )}
    </div>
  );
}
```

### Modal Discovery Card
```tsx
// src/components/SpeciesDiscoveryModal.tsx
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function SpeciesDiscoveryModal({ species, open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="species-card parchment-bg max-w-md">
        {/* Hero image with fade-in */}
        <img
          src={species.imageUrl}
          alt={species.commonName}
          className="w-full h-48 object-cover rounded-t-lg"
          style={{ animationDelay: '0ms' }}
        />

        {/* Name + taxonomy badge */}
        <div className="p-6">
          <h2
            className="text-3xl font-display mb-2"
            style={{ animationDelay: '150ms' }}
          >
            {species.commonName}
          </h2>
          <p
            className="text-sm italic text-muted mb-4"
            style={{ animationDelay: '200ms' }}
          >
            {species.scientificName}
          </p>

          {/* Habitat, range, conservation status */}
          <div
            className="space-y-2 text-sm"
            style={{ animationDelay: '300ms' }}
          >
            <div><strong>Habitat:</strong> {species.habitat}</div>
            <div><strong>Range:</strong> {species.range}</div>
            <div><strong>Status:</strong> {species.conservationStatus}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Expedition Node Track (Horizontal Scroll)
```tsx
// src/components/RunTrack.tsx (simplified example)
export function RunTrack({ nodes, currentIndex }) {
  return (
    <div className="overflow-x-auto flex gap-4 p-4 snap-x snap-mandatory">
      {nodes.map((node, i) => (
        <div
          key={i}
          className={`
            snap-center shrink-0 w-64 p-4 rounded-lg border-2
            ${i === currentIndex ? 'border-primary bg-primary/5' : 'border-gray-300'}
            ${i < currentIndex ? 'opacity-60' : ''}
          `}
        >
          <h4 className="font-display text-lg">{node.name}</h4>
          <p className="text-sm text-muted">{node.habitat}</p>

          {/* Objective checklist */}
          <ul className="mt-2 space-y-1">
            {node.objectives.map((obj, j) => (
              <li key={j} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={obj.complete}
                  readOnly
                  className="w-4 h-4"
                />
                <span className={obj.complete ? 'line-through text-muted' : ''}>
                  {obj.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

## Implementation Checklist

Before finalizing any component:

- [ ] **Mobile-first**: Tested on 375×667 (iPhone SE), 390×844 (iPhone 12)
- [ ] **Touch targets**: All interactive elements ≥48px
- [ ] **Performance**: 60fps on mid-range Android (throttle CPU 4× in DevTools)
- [ ] **Accessibility**: Keyboard nav, ARIA labels, color contrast ≥4.5:1
- [ ] **EventBus integration**: Listeners added in `useEffect`, cleaned up on unmount
- [ ] **Aesthetic coherence**: Fonts, colors, spacing match chosen design direction
- [ ] **Animation timing**: `cubic-bezier(0.4, 0, 0.2, 1)` for most UI, `ease-out` for reveals
- [ ] **Dark mode** (if applicable): Test color variables in `.dark` class
- [ ] **Phaser coexistence**: No z-index conflicts, canvas remains visible when needed

## Anti-Patterns to Avoid

❌ **Generic mobile game UI**: Bubbly buttons, candy colors, Comic Sans energy
✅ **Naturalist precision**: Scientific typography, habitat-inspired palette, field journal textures

❌ **Center-screen clutter**: HUD elements blocking Phaser board
✅ **Edge anchoring**: Top/bottom bars, corner badges, slide-out drawers

❌ **Jank animations**: Heavy DOM manipulation during 60fps game loop
✅ **GPU-accelerated**: `transform` + `opacity` only, coordinate with EventBus timing

❌ **Unmounting panels**: Breaks EventBus listeners, causes re-initialization
✅ **Display toggling**: `className={viewMode === 'game' ? 'block' : 'hidden'}`

❌ **Desktop-first responsive**: Tiny touch targets, cramped thumb zones
✅ **Mobile-first scaling**: 48px minimum, bottom-heavy layout, safe-area insets

❌ **One-size-fits-all aesthetic**: Every panel looks identical
✅ **Context-specific styling**: HUD (tactical), discoveries (celebratory), catalog (archival)

---

## Example: Complete Component (Species Card)

Combining all principles into production code:

```tsx
// src/components/SpeciesCard.tsx
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Species } from '@/types/species';

interface SpeciesCardProps {
  species: Species;
  discovered: boolean;
  onTap: (species: Species) => void;
}

export function SpeciesCard({ species, discovered, onTap }: SpeciesCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Card
      className={`
        relative overflow-hidden cursor-pointer
        transform transition-all duration-200 hover:scale-[1.02] active:scale-95
        ${discovered ? 'opacity-100' : 'opacity-40 grayscale'}
      `}
      onClick={() => discovered && onTap(species)}
    >
      {/* Hero Image */}
      <div className="relative h-48 bg-gray-200">
        <img
          src={species.imageUrl}
          alt={species.commonName}
          className={`
            w-full h-full object-cover transition-opacity duration-500
            ${imageLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Conservation Badge (top-right overlay) */}
        {species.conservationStatus !== 'Least Concern' && (
          <Badge
            variant="destructive"
            className="absolute top-2 right-2 text-xs"
          >
            {species.conservationStatus}
          </Badge>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-display text-xl leading-tight">
          {discovered ? species.commonName : '???'}
        </h3>

        <p className="text-sm italic text-muted">
          {discovered ? species.scientificName : 'Undiscovered'}
        </p>

        {discovered && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className="text-xs">
              {species.habitat}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {species.bioregion}
            </Badge>
          </div>
        )}
      </div>

      {/* Decorative Border (field guide aesthetic) */}
      <div className="absolute inset-0 pointer-events-none border-2 border-primary/20 rounded-lg" />
    </Card>
  );
}
```

**CSS (Tailwind + custom animations)**:

```css
/* src/styles/globals.css */

/* Staggered card reveal on page load */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.species-card > * {
  animation: fadeInUp 0.5s ease-out both;
}

.species-card > *:nth-child(1) { animation-delay: 0ms; }
.species-card > *:nth-child(2) { animation-delay: 150ms; }
.species-card > *:nth-child(3) { animation-delay: 300ms; }

/* Parchment texture for modals */
.parchment-bg {
  background-color: hsl(45, 25%, 96%);
  background-image: url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E");
}
```

---

## Closing Principles

1. **Context over convention**: Design for naturalist game, not generic mobile app
2. **Boldness with restraint**: Commit to aesthetic but execute with precision
3. **Mobile performance**: 60fps, GPU-accelerated, touch-optimized
4. **Phaser harmony**: React UI enhances canvas game, never competes
5. **Discovery delight**: Celebrate moments, respect focus during play

Every interface element should answer: **Does this feel like a field biologist's digital expedition journal?**
