---
sidebar_position: 101
title: Documentation Todo List
description: Prioritized list of documentation gaps and expansion opportunities
tags: [meta, contributing, todo]
---

# Documentation Todo List

Prioritized documentation gaps for contributors. Each item includes the source file(s), current state, and what's needed.

---

## Priority Levels

| Priority | Meaning | Criteria |
|----------|---------|----------|
| **P0** | Critical | Blocks understanding of core game loop |
| **P1** | High | Required for common contribution tasks |
| **P2** | Medium | Improves developer experience |
| **P3** | Low | Nice to have, polish |

---

## P0: Critical Path Documentation

These files are essential to understand before making any game changes.

### 1. Match-3 Game Logic (`BackendPuzzle.ts`)

**Source:** `src/game/BackendPuzzle.ts` (13KB)
**Current State:** Mentioned in architecture docs but no dedicated guide
**Location:** `docs/guides/game/`

**Needs:**
- [ ] Grid data structure explanation (`PuzzleGrid`)
- [ ] Match detection algorithm (horizontal/vertical/combo)
- [ ] Move validation logic (`getMatchesFromHypotheticalMove`)
- [ ] Cascade/gravity system
- [ ] State mutation patterns
- [ ] Code examples with line references

**Suggested File:** `match3-logic.md`

---

### 2. Board Rendering (`BoardView.ts`)

**Source:** `src/game/BoardView.ts` (33KB - largest file in codebase!)
**Current State:** Brief mention in architecture
**Location:** `docs/guides/game/`

**Needs:**
- [ ] Sprite management (creation, pooling, destruction)
- [ ] Position calculation (`getSpritePosition`)
- [ ] Animation system (tweens for swap, fall, explode)
- [ ] Resize handling (`updateVisualLayout`)
- [ ] Gem selection/highlighting
- [ ] Coordinate systems (grid vs pixel)

**Suggested File:** `board-rendering.md`

---

### 3. Clue Configuration (`clueConfig.ts`)

**Source:** `src/game/clueConfig.ts` (13KB)
**Current State:** Partially covered in clue-board.md
**Location:** `docs/reference/`

**Needs:**
- [ ] Complete `CLUE_CONFIG` object documentation
- [ ] Category → database field mapping (authoritative source)
- [ ] Progressive classification sequence logic
- [ ] `getClue()` function behavior
- [ ] How to add new clue types

**Suggested File:** `clue-config-reference.md`

---

### 4. Game Scene (`Game.ts`)

**Source:** `src/game/scenes/Game.ts` (large)
**Current State:** Examples scattered across tutorials
**Location:** `docs/guides/game/`

**Needs:**
- [ ] Complete lifecycle (create → update → shutdown)
- [ ] Input handling (pointer events, drag detection)
- [ ] Species queue management
- [ ] Score/streak system
- [ ] EventBus emissions catalog
- [ ] State machine (idle → dragging → animating)

**Suggested File:** `game-scene-guide.md`

---

## P1: High Priority - Common Contribution Areas

### 5. Species Service (`speciesService.ts`)

**Source:** `src/lib/speciesService.ts` (16KB)
**Current State:** Stub in database-guide.md
**Location:** `docs/reference/`

**Needs:**
- [ ] All RPC function wrappers documented
- [ ] Query patterns for species by location
- [ ] Habitat data fetching
- [ ] Error handling patterns
- [ ] Caching considerations

**Suggested File:** `species-service-reference.md`

---

### 6. Player Tracking (`playerTracking.ts`)

**Source:** `src/lib/playerTracking.ts` (13KB)
**Current State:** Stub guide exists
**Location:** `docs/guides/player/`

**Needs:**
- [ ] Session lifecycle (start → events → end)
- [ ] Event types recorded
- [ ] Local storage integration
- [ ] Prisma write patterns
- [ ] Anonymous vs authenticated tracking

**Expand:** `tracking-implementation.md`

---

### 7. Prisma Schema

**Source:** `prisma/schema.prisma` (18KB)
**Current State:** Undocumented
**Location:** `docs/reference/`

**Needs:**
- [ ] All models with field descriptions
- [ ] Relationships diagram
- [ ] Indexes and their purposes
- [ ] Enums
- [ ] Migration patterns

**Suggested File:** `prisma-schema-reference.md`

---

### 8. Species Guess Flow

**Source:** `src/components/SpeciesGuessSelector.tsx`
**Current State:** Undocumented
**Location:** `docs/guides/game/`

**Needs:**
- [ ] UI component structure
- [ ] Autocomplete/search logic
- [ ] Validation against hidden species
- [ ] EventBus integration
- [ ] Success/failure feedback

**Suggested File:** `species-guessing.md`

---

### 9. Constants Reference

**Source:** `src/game/constants.ts` (5KB)
**Current State:** Documented in `reference/game-constants.md`
**Location:** `docs/reference/`

**Needs:**
- [x] All constants with descriptions
- [x] Where each is used
- [x] How to tune game difficulty
- [x] Animation timing values

**Suggested File:** `game-constants.md`

---

## P2: Medium Priority - Developer Experience

### 10. Species List Component

**Source:** `src/components/SpeciesList.tsx`
**Current State:** Stub only
**Location:** `docs/guides/ui/`

**Needs:**
- [ ] Data fetching pattern (React Query)
- [ ] Filtering/search implementation
- [ ] localStorage discovery state
- [ ] Virtualization (if any)

**Expand:** `species-list-improvements.md`

---

### 11. CesiumMap Deep Dive

**Source:** `src/components/CesiumMap.tsx`
**Current State:** Tutorial covers basics
**Location:** `docs/guides/map/`

**Needs:**
- [ ] Click handler implementation
- [ ] Entity management
- [ ] Camera controls
- [ ] Performance optimization
- [ ] TiTiler integration details

**Expand:** `cesium-customization.md`

---

### 12. Player Stats Dashboard

**Source:** `src/components/PlayerStatsDashboard/`
**Current State:** Stub only
**Location:** `docs/guides/player/`

**Needs:**
- [ ] Component architecture
- [ ] Data fetching from `playerStatsService.ts`
- [ ] Chart/visualization implementation
- [ ] Real-time updates

**Expand:** `stats-dashboard.md`

---

### 13. Habitat Configuration

**Sources:**
- `src/config/habitatColors.ts` (5KB)
- `src/utils/ecoregion.ts` (6KB)

**Current State:** Undocumented
**Location:** `docs/reference/`

**Needs:**
- [ ] Color mapping reference
- [ ] Ecoregion utilities
- [ ] How to add new habitat types

**Suggested File:** `habitat-config-reference.md`

---

### 14. Authentication Flow

**Source:** `src/lib/auth-actions.ts`
**Current State:** Mentioned but not documented
**Location:** `docs/guides/data/`

**Needs:**
- [ ] Clerk auth integration
- [ ] Sign in/out flows
- [ ] Profile creation
- [ ] Protected routes (if any)

**Expand:** New Clerk auth guide (Supabase-era doc archived at `archive/supabase/user-accounts-migration.md`)

---

### 15. Move & Cascade System

**Sources:**
- `src/game/MoveAction.ts`
- `src/game/ExplodeAndReplacePhase.ts`

**Current State:** Undocumented
**Location:** `docs/guides/game/`

**Needs:**
- [ ] Move validation
- [ ] Swap animation triggering
- [ ] Cascade detection
- [ ] Phase sequencing

**Suggested File:** `move-cascade-system.md`

---

## P3: Low Priority - Polish

### 16. UI Component Catalog

**Sources:** `src/components/ui/*.tsx` (shadcn components)
**Current State:** Stub mentioning shadcn
**Location:** `docs/reference/`

**Needs:**
- [ ] List of available components
- [ ] Customization patterns
- [ ] Theme variables

**Suggested File:** `ui-component-catalog.md`

---

### 17. Species Card Components

**Sources:**
- `src/components/SpeciesCard.tsx`
- `src/components/SpeciesCardSlide.tsx`
- `src/components/SpeciesCarousel.tsx`

**Current State:** Undocumented
**Location:** `docs/guides/ui/`

**Needs:**
- [ ] Card layout/props
- [ ] Carousel implementation
- [ ] Image handling

**Expand:** `species-card-improvements.md`

---

### 18. Family/Taxonomy Pickers

**Sources:**
- `src/components/CategoryGenusPicker.tsx`
- `src/components/CategoryGenusPickerFixed.tsx`
- `src/components/CategoryGenusPickerSimple.tsx`

**Current State:** Undocumented
**Location:** `docs/guides/ui/`

**Needs:**
- [ ] Why multiple versions exist
- [ ] Which to use when
- [ ] Dropdown/selection logic

**Suggested File:** `taxonomy-picker-guide.md`

---

### 19. Menu Scenes

**Sources:**
- `src/game/scenes/MainMenu.ts`
- `src/game/scenes/GameOver.ts`

**Current State:** Brief tutorial mention
**Location:** `docs/guides/game/`

**Needs:**
- [ ] Menu navigation
- [ ] Score display
- [ ] Restart/continue flow

**Expand in:** `first-phaser-scene.md` tutorial

---

### 20. Type Definitions

**Sources:**
- `src/types/database.ts`
- `src/types/speciesBrowser.ts`

**Current State:** Partial in database-schema.md
**Location:** `docs/reference/`

**Needs:**
- [ ] Complete type catalog
- [ ] Usage examples
- [ ] Generated vs manual types

**Expand:** `database-schema.md`

---

## TSDoc Coverage

### Files Needing TSDoc Comments

For TypeDoc API generation, these files need comprehensive TSDoc:

| Priority | File | Size | Current TSDoc |
|----------|------|------|---------------|
| P0 | `BackendPuzzle.ts` | 13KB | Minimal |
| P0 | `BoardView.ts` | 33KB | Minimal |
| P0 | `Game.ts` | Large | Partial |
| P1 | `EventBus.ts` | 3KB | Types only |
| P1 | `speciesService.ts` | 16KB | Minimal |
| P1 | `playerTracking.ts` | 13KB | Minimal |
| P1 | `clueConfig.ts` | 13KB | Minimal |
| P2 | `constants.ts` | 5KB | None |
| P2 | `speciesQueries.ts` | 9KB | Minimal |

---

## Quick Wins

Small documentation improvements that can be done quickly:

1. [ ] Add file path headers to all code examples
2. [ ] Add "Source file" links to existing guides
3. [ ] Complete frontmatter tags on all stub docs
4. [ ] Add mermaid diagrams for data flows
5. [ ] Add "Last updated" dates to reference docs

---

## Contribution Workflow

1. Pick an item from this list
2. Read the source file(s)
3. Follow [CONTRIBUTING_DOCS.md](/docs/CONTRIBUTING_DOCS) guidelines
4. Create/expand the documentation
5. Add TSDoc comments to source if appropriate
6. Run `npm run build` in `/wiki` to verify
7. Submit PR with both doc and TSDoc changes

---

## Progress Tracking

Update this section as items are completed:

| Item | Status | Contributor | Date |
|------|--------|-------------|------|
| match3-logic.md | Not Started | - | - |
| board-rendering.md | Not Started | - | - |
| game-constants.md | Completed | Codex | 2025-12-31 |
| ... | ... | ... | ... |
