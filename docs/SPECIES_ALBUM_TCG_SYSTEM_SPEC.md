# Species Album TCG System Spec

## Document Status

- Status: Proposed implementation spec
- Scope: Encyclopedia redesign, collectible card system, GIS-backed expedition memory, Swiper architecture, persistence model, rollout plan
- Primary surfaces:
  - `src/components/SpeciesList.tsx`
  - `src/components/SpeciesCard.tsx`
  - `src/components/SpeciesCarousel.tsx`
  - `src/components/FamilyCardStack.tsx`
  - `src/components/SpeciesTree.tsx`
  - `src/components/CesiumMap.tsx`
  - `src/hooks/useCesiumTrail.ts`
  - `src/hooks/useExpeditionRun.ts`
  - `src/app/api/runs/*`

---

## 1. Product Goal

Transform the current species encyclopedia from a taxonomy-first browser into a mobile-first collectible album that feels:

- joyful
- personal
- game-like
- educational without feeling like homework
- tightly connected to the expedition run the player just completed

The player should not feel like they are reading a database. They should feel like they are building a field binder of hard-won discoveries.

The album must preserve three things simultaneously:

1. The identity of the endangered species
2. The knowledge unlocked during deduction
3. The memory of the specific expedition route and environmental context that made the run unique

---

## 2. Core Fantasy

The player taps the globe, starts a personalized expedition, clears obstacles through match-3 play, uses items and clue purchases to deduce the species, and then earns a collectible card that permanently records:

- what species it was
- where it was found
- what GIS conditions shaped the run
- what events and obstacles defined the journey
- what facts the player unlocked

The species card is the trophy.

The expedition route is the memory.

The unlocked trivia is the educational reward.

---

## 3. Current State Summary

### Current Strengths

- Globe click -> run generation -> match-3 expedition -> deduction is already a strong loop
- The system already persists run sessions and run nodes
- The current app already renders a route trail on the globe
- Species are grouped by taxonomy and can be browsed
- Discovered species are already cached in local storage
- The current mobile UI work improved responsiveness and Swiper stability

### Current Problems

1. The encyclopedia is taxonomy-first, not reward-first.
2. Undiscovered species are still effectively spoiled because the card shows names and scientific names.
3. The species card reads like a wiki article, not a collectible card.
4. GIS is used for run generation, but the resulting GIS story is not preserved on the collection artifact.
5. The current Swiper usage is mostly navigation and layout infrastructure, not part of the emotional game fantasy.
6. The run memory is not yet elevated into a durable player-facing collectible system.

### Current Relevant System Capabilities

- Run session creation:
  - `src/app/api/runs/route.ts`
- Run patching:
  - `src/app/api/runs/[runId]/route.ts`
- Node completion:
  - `src/app/api/runs/[runId]/nodes/[nodeIndex]/complete/route.ts`
- Route trail rendering:
  - `src/hooks/useCesiumTrail.ts`
- Run state machine:
  - `src/hooks/useExpeditionRun.ts`
- Current species list shell:
  - `src/components/SpeciesList.tsx`
- Current card:
  - `src/components/SpeciesCard.tsx`

---

## 4. Design Pillars

### 4.1 Reward First

The first thing the player sees in the encyclopedia should be cards, sets, recent discoveries, and unresolved cases, not nested taxonomy accordions.

### 4.2 Mystery Before Discovery

Undiscovered species must remain unknown. The UI can show:

- silhouette
- rarity frame
- biome
- conservation band
- clue completion progress
- expedition stamp slots

It must not reveal:

- common name
- scientific name
- full image
- complete taxonomy

### 4.3 Every Card Is A Memory

The back of the card must encode the expedition run:

- route
- GIS features
- obstacles
- items used
- event chain
- unlocked facts

### 4.4 Mobile Delight

Interactions should feel tactile:

- swipe
- flip
- stamp
- reveal
- slot filling
- binder browsing

### 4.5 Learning Through Discovery

Educational content should be unlocked, staged, and tied to player action.

---

## 5. Player Experience Flow

### 5.1 Macro Loop

1. Player taps a location on the globe
2. App generates expedition nodes and GIS context
3. Player completes expedition run through match-3 board interactions
4. Player reaches deduction camp
5. Player buys facts and clues
6. Player deduces the species
7. App unlocks or advances a collectible species card
8. App records a run memory on the back of that card
9. Player returns to encyclopedia and reviews card, route, facts, and stamps

### 5.2 Emotional Beats

- Globe tap: curiosity
- Expedition briefing: anticipation
- Match-3 obstacles: tension
- Crisis events: improvisation
- Deduction camp: inference and suspense
- Card reveal: payoff
- Binder revisit: pride and intimacy

---

## 6. Information Architecture

The encyclopedia becomes a four-mode surface.

## 6.1 Top-Level Modes

### Album

Default mode. Shows discovered species as collectible cards.

Sections:

- Recent Discoveries
- By Biome
- By Expedition Region
- Family Sets
- Affinity Sets
- Near Completion

### Case Files

Undiscovered or partially-completed species.

Sections:

- Active Mystery Cards
- Recently Encountered Unknowns
- Biome Leads
- Family Leads

### Runs

Run-first memory surface.

Sections:

- Recent Expeditions
- Best Runs
- Landmark Runs
- Protected Habitat Runs
- High Difficulty Runs

### Taxonomy

Secondary utility mode.

Contains:

- tree browser
- search
- filters
- exact taxonomy lookup

This is not the default entry point.

---

## 7. Card System

## 7.1 Card Types

### Mystery Card

Shown before discovery.

Visible:

- silhouette
- frame theme
- rarity / conservation rank
- biome / region class
- progress slots
- expedition stamps earned

Hidden:

- common name
- scientific name
- full species art
- exact taxonomy details

### Discovered Card

Shown after successful deduction.

Visible:

- species art / image
- common name
- scientific name
- conservation badge
- key unlocked facts
- affinity / family marker
- completion progress

### Expedition Memory Card Back

Visible:

- route mini-map
- node sequence
- GIS feature stamps
- obstacle/event log
- items used
- first discovered timestamp
- best score / deduction quality / encounter context

## 7.2 Card Structure

### Front Layout

1. Top band
   - rarity
   - biome icon
   - conservation rank

2. Art window
   - full image if discovered
   - silhouette if undiscovered

3. Name plate
   - blank or scrambled if undiscovered
   - full common/scientific name if discovered

4. Quick facts
   - 2 to 4 top unlocked facts
   - locked slots show progress

5. Set footer
   - family
   - affinity icons
   - card number

### Back Layout

1. Mini route map
2. GIS feature chips
3. Node timeline
4. Event summary
5. Item usage summary
6. Unlock notes / field log

---

## 8. Visual Language

## 8.1 Tone

The visual language should feel:

- adventurous
- tactile
- crafted
- luminous
- a little ceremonial

It should not feel:

- clinical
- spreadsheet-like
- generic dashboard UI

## 8.2 Card Themes

Card frames should vary by ecological identity.

Examples:

- Wetland: teal, reeds, mist, ripple motif
- Alpine: slate, silver contour lines, cold glow
- Forest: moss, canopy shadow, leaf vein texture
- Desert: amber, sand grain, heat shimmer
- Coastal: blue, tide arcs, shell accents

## 8.3 Rarity and Conservation Treatment

Use conservation status as a major visual differentiator.

Examples:

- CR: urgent foil edge, rose / ember highlights
- EN: amber / gold high-contrast frame
- VU: cool cyan / emerald frame
- NT / LC if present: calmer reduced treatment

## 8.4 Unlock Feedback

Important actions should animate:

- card reveal
- fact slot unlock
- GIS stamp placement
- “first discovered” badge
- set completion

Avoid constant motion on idle surfaces.

---

## 9. Swiper Architecture

The encyclopedia redesign will use Swiper as a primary interaction system, not just a transport mechanism.

This repo currently uses `swiper ^11.2.10`.

The design should stay within Swiper React patterns and module support documented in the official Swiper React and API docs.

## 9.1 Approved Swiper Modules

### Core Modules

- `Keyboard`
- `A11y`
- `Navigation`
- `Pagination`

### Album Modules

- `Thumbs`
- `Controller`
- `Virtual`
- `Grid`
- `EffectCards`
- `EffectCreative`

### Optional Enhancement Modules

- `HashNavigation` or `History` for deep-linking to a species card
- `Zoom` if image inspection becomes important
- `FreeMode` for the binder thumb strip

## 9.2 Swiper Roles

### `AlbumHeroSwiper`

Purpose:

- Full-screen focused collectible card viewer

Recommended modules:

- `EffectCards` or `EffectCreative`
- `Thumbs`
- `Keyboard`
- `A11y`

Behavior:

- horizontal swipe changes active card
- active card can flip front/back
- card is centered and presented as the reward object

### `BinderThumbsSwiper`

Purpose:

- Secondary strip of cards beneath the hero card

Recommended modules:

- `Thumbs`
- `FreeMode`
- `A11y`

Behavior:

- scrolling strip of nearby cards
- tap any card to focus it in the hero swiper
- watch active slide progress

### `BinderPageSwiper`

Purpose:

- Album pages with multiple cards visible at once

Recommended modules:

- `Grid`
- `Pagination`
- `Navigation`
- `Keyboard`
- `A11y`

Behavior:

- page through 2x3 mobile binder pages
- tap a card to open focused hero mode

### `RunMemorySwiper`

Purpose:

- Show different route memory cards or expedition memories

Recommended modules:

- `EffectCreative`
- `Pagination`
- `Keyboard`

### `CardDetailSwiper`

Purpose:

- Switch card detail panes inside focused view

Tabs:

- Front
- Back
- Facts
- Route
- Events

Recommended modules:

- `Controller`
- `Pagination`
- `A11y`

## 9.3 Swiper Constraints

Implementation must follow these constraints:

1. Do not rely on changing `loop` or `effect` inside breakpoints.
2. Use one swiper instance per behavior mode rather than forcing one component to do everything.
3. Use `Virtual` for large collections.
4. Use `Thumbs` rather than raw `Controller` when the relationship is clearly main-view + thumbnail-strip.
5. Avoid manual DOM binding for nav/pagination where built-in React props are sufficient.
6. Keep 3D or card effects for focused hero card views only, not dense list views.

---

## 10. Proposed Frontend Architecture

## 10.1 New Component Map

### Top-Level Surfaces

- `SpeciesAlbumScreen`
- `SpeciesCasesScreen`
- `SpeciesRunsScreen`
- `SpeciesTaxonomyScreen`

### Card Components

- `SpeciesTCGCard`
- `SpeciesTCGCardFront`
- `SpeciesTCGCardBack`
- `SpeciesMysteryCardFront`
- `SpeciesFactSlots`
- `SpeciesGISStampRail`
- `SpeciesCardRevealModal`

### Album Components

- `AlbumHeroSwiper`
- `BinderThumbsSwiper`
- `BinderPageSwiper`
- `SpeciesSetShelf`
- `SpeciesAlbumSection`

### Run Memory Components

- `RunMemoryCard`
- `RunRouteMiniMap`
- `RunNodeTimeline`
- `RunGISStampGroup`
- `RunEventLog`

### Supporting Components

- `SpeciesAlbumTabs`
- `SpeciesFilterSheet`
- `SpeciesSetHeader`
- `SpeciesCompletionBadge`

## 10.2 Existing Components to Replace or Demote

### Replace

- `src/components/SpeciesCard.tsx`
- `src/components/SpeciesCarousel.tsx`
- `src/components/FamilyCardStack.tsx`

### Keep but move to secondary role

- `src/components/SpeciesTree.tsx`
- existing search/filter tools in `SpeciesList.tsx`

### Refactor

- `src/components/SpeciesList.tsx` becomes shell/router for album modes instead of directly rendering taxonomy accordions as the default experience

---

## 11. Detailed Screen Specs

## 11.1 Album Home

### Purpose

Primary collectible landing page.

### Structure

1. Header
   - title: `Field Album`
   - subtext: collection completion
   - quick progress indicators

2. Hero carousel
   - recent discoveries
   - 1 card fully focused

3. Section shelves
   - `Continue Your Cases`
   - `By Biome`
   - `Family Sets`
   - `Recent Runs`
   - `Near Completion`

4. Quick actions
   - open taxonomy index
   - search species
   - jump to unresolved cases

### Success Criteria

- feels like opening a binder / card album
- one-handed mobile browsing
- no taxonomy complexity forced on entry

## 11.2 Case Files

### Purpose

Surface unresolved species mysteries.

### Structure

1. Mystery card grid / binder swiper
2. Progress indicators:
   - clue slots filled
   - number of encounters
   - likely biome
   - likely family
3. Focus view for each mystery card

### Important Rule

No answer leakage.

## 11.3 Focused Card View

### Purpose

The main collectible experience.

### Layout

1. Main hero swiper
2. Binder thumbs below
3. Segmented pane for:
   - Card Front
   - Card Back
   - Facts
   - Route
   - Events

### Interactions

- swipe horizontally to another card
- tap to flip
- swipe tabs or tap tabs to switch detail pane
- long press shows enlarged art / stamp detail

## 11.4 Runs Screen

### Purpose

Let players relive expeditions as personalized stories.

### Layout

1. Recent run cards
2. Featured route visualization
3. GIS feature breakdown
4. Event sequence
5. Species unlocked from run

---

## 12. Species Card Data Model

The current species metadata is not enough for collectible state. Introduce dedicated progression state.

## 12.1 `species_cards`

Suggested shape:

```ts
type SpeciesCardRecord = {
  speciesId: number;
  discovered: boolean;
  firstDiscoveredAt: string | null;
  lastEncounteredAt: string | null;
  timesEncountered: number;
  bestRunId: string | null;
  bestRunScore: number | null;
  completionPct: number;
  rarityTier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  conservationCode: string | null;
  affinityTags: string[];
  factsUnlocked: string[];
  clueCategoriesUnlocked: string[];
  gisStamps: string[];
  expeditionRegionsSeen: string[];
  cardVariant: string | null;
};
```

## 12.2 `run_memory`

Suggested shape:

```ts
type RunMemoryRecord = {
  runId: string;
  speciesId: number | null;
  locationKey: string;
  startLon: number;
  startLat: number;
  routePolyline: Array<{ lon: number; lat: number }>;
  routeBounds: [number, number, number, number] | null;
  nodes: Array<{
    nodeOrder: number;
    nodeType: string;
    difficulty: number;
    obstacleFamily: string | null;
    counterGem: string | null;
    objectiveTarget: number | null;
    outcome: 'completed' | 'escaped' | 'skipped';
    scoreEarned: number | null;
    movesUsed: number | null;
  }>;
  gisFeaturesNearby: Array<{
    featureType: string;
    featureName: string | null;
    distanceM: number | null;
    metadata: Record<string, unknown>;
  }>;
  eventsTriggered: Array<{
    eventId: string;
    eventType: string;
    label: string;
    metadata: Record<string, unknown>;
  }>;
  itemsUsed: Array<{
    itemId: string;
    itemName: string;
    nodeOrder: number | null;
  }>;
  deductionSummary: Record<string, unknown> | null;
  finalScore: number | null;
};
```

## 12.3 `card_unlocks`

Optional separate log table for timeline and analytics.

```ts
type CardUnlockLog = {
  id: string;
  speciesId: number;
  runId: string | null;
  unlockType: 'discover' | 'fact' | 'stamp' | 'set-complete';
  payload: Record<string, unknown>;
  createdAt: string;
};
```

---

## 13. GIS Expansion Spec

The GIS system should expand beyond rivers so that routes become environmentally expressive and educational.

## 13.1 Target GIS Categories

### Hydrology

- rivers
- streams
- wetlands
- lakes
- coastlines

### Terrain / Relief

- mountains
- ridgelines
- elevation bands
- slope / ruggedness
- passes / valleys

### Protected Ecology

- parks
- protected areas
- wildlife corridors
- conservation zones

### Cultural Layers

- heritage sites
- indigenous / ICCA territories where permitted
- cultural landmarks
- archaeological / historical sites

### Political / Administrative

- country boundaries
- state / provincial boundaries
- border zones
- protected administrative units

### Landcover / Ecotones

- forest edge
- grassland transition
- urban fringe
- floodplain
- mangrove / marsh / scrub transitions

## 13.2 GIS-To-Run Mapping

Each GIS feature category should influence:

1. Node selection
2. Obstacle families
3. Crisis event candidates
4. Reward modifiers
5. Card-back stamps

### Examples

#### Rivers

- Run effect:
  - river crossing
  - floodplain sweep
  - amphibian / fish affinity synergies
- Card stamp:
  - `River Corridor`

#### Mountains

- Run effect:
  - ridge sightline
  - cold exposure
  - cliff traverse
  - altitude pressure
- Card stamp:
  - `Highland Route`

#### Parks / Protected Areas

- Run effect:
  - ranger encounter
  - permit event
  - high habitat integrity bonus
- Card stamp:
  - `Protected Habitat`

#### Cultural Sites

- Run effect:
  - local knowledge clue
  - cultural stewardship event
  - caution / ethics modifier
- Card stamp:
  - `Cultural Knowledge`

#### Political Boundaries

- Run effect:
  - borderland logistics
  - jurisdiction shift
  - language / permit event
- Card stamp:
  - `Borderland`

#### Ecotones

- Run effect:
  - rare sighting chance
  - mixed obstacle pressure
  - unusual clue combinations
- Card stamp:
  - `Habitat Edge`

---

## 14. Event Generation Spec

Events should be legible consequences of GIS context rather than random noise.

## 14.1 Event Inputs

- GIS features near route start
- GIS features near nodes
- habitat ratios
- protected area overlap
- elevation / slope
- hydrology distance
- species family / affinity
- run difficulty

## 14.2 Event Classes

### Traversal Events

- bridge washout
- switchback climb
- marsh slowdown
- border checkpoint

### Observation Events

- ridge vantage point
- canopy occlusion
- fog bank
- twilight window

### Cultural / Knowledge Events

- ranger guidance
- community warning
- oral-history clue
- stewardship restriction

### Ecological Events

- migration crossing
- predator sign
- storm pressure
- habitat fragmentation

## 14.3 Output Requirements

Every event should be able to produce:

- node modifier
- player-facing label
- card-back event log line
- optional GIS stamp contribution

---

## 15. Expedition Memory System

The run should produce a durable memory object that powers the card back.

## 15.1 Required Captures

At minimum, every run memory should capture:

- starting point
- planned nodes
- actual completed nodes
- route polyline
- GIS features involved
- items used
- obstacles encountered
- crisis events encountered
- deduction result
- final score

## 15.2 Route Representation

Current route trail in `useCesiumTrail` uses synthetic positions. For the card system, persist a canonical version:

- route points used in map rendering
- node labels
- bounds for mini-map framing

This can begin with the existing synthetic route positions, then be upgraded later to more GIS-aware geometry.

---

## 16. Persistence and Backend Changes

## 16.1 Existing Persistence

Already available:

- run session creation
- node persistence
- wallet persistence
- deduction summary persistence

## 16.2 Required Persistence Additions

### Session Metadata Additions

Add to run session metadata or structured columns:

- `routePolyline`
- `routeBounds`
- `gisFeaturesNearby`
- `eventsTriggered`
- `itemsUsed`
- `speciesCardOutcome`

### Node-Level Additions

Add where useful:

- GIS context per node
- event trigger source per node
- item usage per node

### Player Collection Additions

Add persistent species card state:

- discovery status
- unlocked facts
- unlocked GIS stamps
- run memories linked to species

## 16.3 Storage Strategy

Recommended approach:

- keep `eco_run_sessions` and `eco_run_nodes`
- add `species_cards`
- add `species_card_unlocks`
- optionally add `run_memories` if metadata in `eco_run_sessions` becomes too large or difficult to query

---

## 17. API Additions

## 17.1 New API Surfaces

### `GET /api/species/cards`

Returns collection-ready card data.

### `GET /api/species/cards/[speciesId]`

Returns one card with front/back progression and linked run memories.

### `GET /api/runs/[runId]/memory`

Returns normalized run memory for route display, events, GIS features, and card-back composition.

### `POST /api/species/cards/[speciesId]/unlock`

Optional command endpoint if unlock writes are not folded into run completion.

## 17.2 Existing Endpoints to Extend

### `POST /api/runs`

Add:

- canonical route points
- GIS feature summary
- candidate stamps

### `PATCH /api/runs/[runId]`

Add:

- item usage log
- event log
- card unlock outcome

### `POST /api/runs/[runId]/nodes/[nodeIndex]/complete`

Add:

- node-specific GIS / event summary

---

## 18. Frontend State Model

## 18.1 Required Client State

### Album State

- active mode
- active set
- active species card
- card side front/back
- binder page
- selected detail pane

### Run Memory State

- selected run
- selected node
- highlighted GIS features

### Card Progress State

- discovered / undiscovered
- facts unlocked
- stamps unlocked
- completion percentage

## 18.2 Context Recommendation

Do not keep this new system as cross-component EventBus state.

Recommended contexts:

- `SpeciesAlbumContext`
- `RunMemoryContext`
- `CollectionProgressContext`

Keep EventBus only where Phaser/React bridge behavior is truly necessary.

---

## 19. UX Rules

## 19.1 Undiscovered Species Rules

- no common name
- no scientific name
- no full art
- no exact species details
- may show silhouette, biome, rarity, clue progress

## 19.2 Discovery Rules

When a species is first correctly identified:

1. reveal animation plays
2. card front unlocks
3. back-of-card route memory is generated
4. stamps earned are applied
5. local and server collection states update

## 19.3 Album Rules

- one-hand reachable controls
- no overloaded top navigation
- horizontal progression should feel tactile
- taxonomy mode must never dominate default flow

---

## 20. Component Migration Plan

## 20.1 `SpeciesList.tsx`

### Current Role

- taxonomy shell
- accordion browser
- mobile/desktop species grouping

### New Role

- encyclopedia router and top-level mode container

### Required Changes

- add tab state for `Album`, `Cases`, `Runs`, `Taxonomy`
- default to `Album`
- demote taxonomy accordions to `Taxonomy`
- remove taxonomy-first rendering from the initial experience

## 20.2 `SpeciesCard.tsx`

### Current Role

- data-heavy encyclopedic detail card

### New Role

- replace with `SpeciesTCGCard`

### Required Changes

- hide all spoiler data for undiscovered species
- separate front and back
- add route memory visualization region
- add fact slots / lock state
- add GIS stamp rail

## 20.3 `SpeciesCarousel.tsx`

### Current Role

- mobile single-card swiper wrapper

### New Role

- replace with `AlbumHeroSwiper`

### Required Changes

- use `Thumbs`
- use built-in Swiper React patterns
- allow card flip
- support virtualized album views

## 20.4 `FamilyCardStack.tsx`

### Current Role

- desktop swiper wrapper for family species

### New Role

- split responsibilities into:
  - binder page view
  - focused hero view

### Required Changes

- stop mixing desktop/mobile concepts in one component
- remove duplicated nav/pagination patterns

## 20.5 `SpeciesTree.tsx`

### Current Role

- taxonomy browser

### New Role

- utility mode only

---

## 21. Suggested File Additions

Frontend:

- `src/components/album/SpeciesAlbumScreen.tsx`
- `src/components/album/SpeciesCasesScreen.tsx`
- `src/components/album/SpeciesRunsScreen.tsx`
- `src/components/album/SpeciesTCGCard.tsx`
- `src/components/album/SpeciesTCGCardFront.tsx`
- `src/components/album/SpeciesTCGCardBack.tsx`
- `src/components/album/AlbumHeroSwiper.tsx`
- `src/components/album/BinderThumbsSwiper.tsx`
- `src/components/album/BinderPageSwiper.tsx`
- `src/components/album/RunRouteMiniMap.tsx`
- `src/components/album/RunGISStampGroup.tsx`
- `src/components/album/SpeciesFactSlots.tsx`

Contexts:

- `src/contexts/SpeciesAlbumContext.tsx`
- `src/contexts/RunMemoryContext.tsx`
- `src/contexts/CollectionProgressContext.tsx`

Hooks:

- `src/hooks/useSpeciesCards.ts`
- `src/hooks/useRunMemories.ts`
- `src/hooks/useCardUnlocks.ts`

API:

- `src/app/api/species/cards/route.ts`
- `src/app/api/species/cards/[speciesId]/route.ts`
- `src/app/api/runs/[runId]/memory/route.ts`

---

## 22. Mini-Map Spec

## 22.1 Purpose

The back of the card must show where the run happened and why it was special.

## 22.2 Requirements

- route line
- node markers
- GIS overlays as simplified shapes or stamps
- start/end emphasis
- protected areas, rivers, mountains, and borders simplified for readability

## 22.3 Rendering Strategy

Phase 1:

- stylized 2D route map from stored route points and summarized GIS badges

Phase 2:

- richer overlays and simplified vector geometries

Phase 3:

- animated route playback for selected runs

---

## 23. Educational Content Rules

Facts should feel earned and layered.

## 23.1 Fact Buckets

- taxonomy
- habitat
- geography
- morphology
- behavior
- life cycle
- conservation
- key facts

## 23.2 Display Rules

- front of card: only 2 to 4 strongest unlocked facts
- rest of facts live in the `Facts` pane
- locked facts show category but not answer

## 23.3 Run Relationship

Some facts should be tied to the run context when possible.

Examples:

- near river -> aquatic movement fact emphasis
- near mountain -> altitude / range fact emphasis
- protected area -> conservation governance fact emphasis
- cultural site -> human relationship or stewardship fact emphasis

---

## 24. Accessibility

Accessibility is mandatory, not optional.

Requirements:

- full keyboard support for Swiper and tabbed panes
- proper announcement of discovered vs undiscovered card state
- no reliance on color alone
- reduced-motion mode for card reveal and foil effects
- sufficient contrast on rarity and biome frames

---

## 25. Performance

## 25.1 Collection Scale

Use `Virtual` for large shelves and focused album views when card counts become large.

## 25.2 Rendering Strategy

- do not mount heavy route maps for every card in dense list views
- only render back-map detail when focused
- lazy-load heavier visuals

## 25.3 Swiper Safety

- avoid unnecessary destroy/re-init churn
- avoid effect changes across breakpoints
- avoid multiple nested heavy Swipers on the same screen unless necessary

---

## 26. Rollout Plan

## Phase 0: Safety Fixes

- hide undiscovered species names and scientific names
- preserve current taxonomy browser

## Phase 1: Album Foundations

- add `Album`, `Cases`, `Runs`, `Taxonomy` shell
- ship `SpeciesTCGCard` front state
- move current taxonomy UI behind `Taxonomy`

## Phase 2: Swiper Upgrade

- add hero card swiper
- add thumbs strip
- add binder page swiper

## Phase 3: Run Memory

- persist route memory and GIS stamps
- implement card back
- implement runs screen

## Phase 4: GIS Expansion

- add mountains
- add parks / protected areas
- add cultural sites
- add political boundaries
- map each to event and stamp generation

## Phase 5: Collection Depth

- set completion
- rarity variants
- animated reveal moments
- deeper run retrospectives

---

## 27. Acceptance Criteria

The redesign is successful when:

1. The encyclopedia opens into a collectible album view, not taxonomy accordions.
2. Undiscovered species never reveal names or scientific names.
3. A discovered species card contains both educational facts and expedition memory.
4. Every completed run can generate a route-backed collectible artifact.
5. GIS expansion affects both gameplay and card memory.
6. Swiping and browsing feel joyful on mobile.
7. Taxonomy browsing still exists, but as a secondary utility mode.

---

## 28. Testing Plan

## 28.1 UX Testing

- one-handed mobile navigation
- discovery reveal emotional clarity
- no spoiler leaks
- clarity of card front vs back
- understandability of GIS stamps

## 28.2 Technical Testing

- large collection performance
- Swiper stability under resize/orientation change
- route memory persistence
- item/event stamping accuracy
- species discovery unlock consistency

## 28.3 Data Integrity Testing

- one run -> one memory record
- first discovery timestamp only once
- repeat encounters increment correctly
- clue/fact unlocks merge without duplication

---

## 29. Risks

### Risk: Overbuilding the album before fixing spoiler logic

Mitigation:

- fix undiscovered secrecy first

### Risk: GIS complexity outpaces readable UX

Mitigation:

- summarize GIS into player-facing stamps and concise map overlays

### Risk: Too many nested Swipers

Mitigation:

- isolate Swiper roles and keep heavy effects only in focused hero views

### Risk: Card back becomes a data dump

Mitigation:

- prioritize storytelling hierarchy:
  - route
  - landmarks
  - obstacles/events
  - facts

---

## 30. Final Recommendation

The correct product move is not to make the current encyclopedia prettier. It is to change what it fundamentally is.

It should become:

- a collectible album
- a mystery case board
- an expedition memory archive

Taxonomy remains important, but only as a secondary organizer.

The card is the reward.

The route is the memory.

The unlocked facts are the learning.

That is the system that best fits Critter Connect's expedition loop and gives the player the intimate excitement of a personalized discovery.
