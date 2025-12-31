# Developer Onboarding

This is the entry point for engineers joining the Phaser + Next.js + Cesium + Supabase project. It explains how the app is structured, what to read next, and where every doc lives.

## 1) Start Here
- Project overview & setup: [docs/README.md](./README.md) (install, env vars, scripts).
- Run the app: `npm install`, `cp .env.example .env.local`, set Supabase + Cesium env vars, then `npm run dev` (port 8080) or `npm run build && npm run serve`.

## 2) How the Codebase is Shaped
- Layout host: `src/MainAppLayout.tsx` keeps Cesium map + Phaser canvas mounted; toggles view modes.
- React ↔ Phaser bridge: `src/PhaserGame.tsx` boots `src/game/main.ts`, which registers scenes (Boot → Preloader → MainMenu → Game → GameOver).
- Event bus: `src/game/EventBus.ts` carries typed events between React and Phaser (e.g., `cesium-location-selected`, `game-hud-updated`).
- Game MVC: `BackendPuzzle.ts` (model) ↔ `Game.ts` (controller) ↔ `BoardView.ts` (view/animation); `MoveAction.ts` and `ExplodeAndReplacePhase.ts` handle swaps/cascades.
- UI layer: `src/components/CesiumMap.tsx`, `SpeciesPanel.tsx`, `SpeciesList.tsx`, shadcn UI under `src/components/ui`.
- Data/auth: Supabase clients in `src/lib/*`, auth actions in `auth-actions.ts`, species RPCs in `speciesService.ts`, player tracking in `playerTracking.ts`.

## 3) Recommended Reading Path
1) **Core architecture:** [EVENTBUS_AND_DISPLAY_ARCHITECTURE.md](./EVENTBUS_AND_DISPLAY_ARCHITECTURE.md), [GAME_REACTIVITY_GUIDE.md](./GAME_REACTIVITY_GUIDE.md), [UI_DISPLAY_SYSTEM_REFERENCE.md](./UI_DISPLAY_SYSTEM_REFERENCE.md).
2) **Game board & clues:** [CLUE_BOARD_IMPLEMENTATION.md](./CLUE_BOARD_IMPLEMENTATION.md), [SPECIES_DISCOVERY_IMPLEMENTATION.md](./SPECIES_DISCOVERY_IMPLEMENTATION.md).
3) **Map & data ingress:** [CESIUM_UI_CUSTOMIZATION.md](./CESIUM_UI_CUSTOMIZATION.md), [HABITAT_HIGHLIGHT_IMPLEMENTATION.md](./HABITAT_HIGHLIGHT_IMPLEMENTATION.md), [MAP_MINIMIZE_IMPLEMENTATION.md](./MAP_MINIMIZE_IMPLEMENTATION.md), [HABITAT_RASTER_MIGRATION.md](./HABITAT_RASTER_MIGRATION.md).
4) **UI & styling:** [SHADCN_IMPLEMENTATION_GUIDE.md](./SHADCN_IMPLEMENTATION_GUIDE.md), [STYLE_MAPPING.md](./STYLE_MAPPING.md), [LAYOUT_RESTRUCTURE_IMPLEMENTATION.md](./LAYOUT_RESTRUCTURE_IMPLEMENTATION.md), [SPECIES_CARD_UI_IMPROVEMENTS.md](./SPECIES_CARD_UI_IMPROVEMENTS.md), [SPECIES_UI_MOBILE_IMPROVEMENTS.md](./SPECIES_UI_MOBILE_IMPROVEMENTS.md), [SPECIES_UI_BREADCRUMB_AND_DROPDOWN_FIX.md](./SPECIES_UI_BREADCRUMB_AND_DROPDOWN_FIX.md), [species-list-improvements.md](./species-list-improvements.md).
5) **Data layer:** [DATABASE_USER_GUIDE.md](./DATABASE_USER_GUIDE.md), [SPECIES_DATABASE_IMPLEMENTATION.md](./SPECIES_DATABASE_IMPLEMENTATION.md), [USER_ACCOUNTS_MIGRATION_PLAN.md](./USER_ACCOUNTS_MIGRATION_PLAN.md).
6) **Player tracking & stats:** [PLAYER_TRACKING_IMPLEMENTATION_SUMMARY.md](./PLAYER_TRACKING_IMPLEMENTATION_SUMMARY.md), [PLAYER_TRACKING_INTEGRATION_PLAN.md](./PLAYER_TRACKING_INTEGRATION_PLAN.md), [PLAYER_STATS_DASHBOARD_INTEGRATION.md](./PLAYER_STATS_DASHBOARD_INTEGRATION.md), [PLAYER_STATS_DASHBOARD_FINAL_REVIEW.md](./PLAYER_STATS_DASHBOARD_FINAL_REVIEW.md).
7) **Biodiversity content:** [BIOREGION_FEATURE_SUMMARY.md](./BIOREGION_FEATURE_SUMMARY.md), [BIOREGION_IMPLEMENTATION.md](./BIOREGION_IMPLEMENTATION.md), [ECOREGION_IMPLEMENTATION.md](./ECOREGION_IMPLEMENTATION.md).

## 4) Full Document Index (every .md)

**Core / Architecture**
- [README.md](./README.md) — project overview, setup, scripts.
- [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md) — you are here.
- [EVENTBUS_AND_DISPLAY_ARCHITECTURE.md](./EVENTBUS_AND_DISPLAY_ARCHITECTURE.md) — React↔Phaser event model and layout.
- [GAME_REACTIVITY_GUIDE.md](./GAME_REACTIVITY_GUIDE.md) — resize behavior, MVC flow, reactive patterns.
- [UI_DISPLAY_SYSTEM_REFERENCE.md](./UI_DISPLAY_SYSTEM_REFERENCE.md) — layout variables, gem sizing, responsive behavior.
- [PAGE_ROUTING_INFRASTRUCTURE.md](./PAGE_ROUTING_INFRASTRUCTURE.md) — Next.js routing.

**Game Board & Clues**
- [CLUE_BOARD_IMPLEMENTATION.md](./CLUE_BOARD_IMPLEMENTATION.md) — match-3 board, clue emission.
- [SPECIES_DISCOVERY_IMPLEMENTATION.md](./SPECIES_DISCOVERY_IMPLEMENTATION.md) — species progression and discovery flow.
- [MAP_MINIMIZE_IMPLEMENTATION.md](./MAP_MINIMIZE_IMPLEMENTATION.md) — map/game resizing hook-up.
- [HABITAT_HIGHLIGHT_IMPLEMENTATION.md](./HABITAT_HIGHLIGHT_IMPLEMENTATION.md) — habitat hit/highlight flow.
- [HABITAT_RASTER_MIGRATION.md](./HABITAT_RASTER_MIGRATION.md) — TiTiler COG integration for habitat stats.
- [CESIUM_UI_CUSTOMIZATION.md](./CESIUM_UI_CUSTOMIZATION.md) — Cesium map UX changes.
- [LAYOUT_RESTRUCTURE_IMPLEMENTATION.md](./LAYOUT_RESTRUCTURE_IMPLEMENTATION.md) — layout changes aligning React + Phaser.

**UI & Styling**
- [SHADCN_IMPLEMENTATION_GUIDE.md](./SHADCN_IMPLEMENTATION_GUIDE.md) — component library usage.
- [STYLE_MAPPING.md](./STYLE_MAPPING.md) — design tokens and style references.
- [SPECIES_CARD_UI_IMPROVEMENTS.md](./SPECIES_CARD_UI_IMPROVEMENTS.md) — species card UX changes.
- [SPECIES_UI_MOBILE_IMPROVEMENTS.md](./SPECIES_UI_MOBILE_IMPROVEMENTS.md) — mobile UX adjustments.
- [SPECIES_UI_BREADCRUMB_AND_DROPDOWN_FIX.md](./SPECIES_UI_BREADCRUMB_AND_DROPDOWN_FIX.md) — breadcrumb/dropdown behavior.
- [species-list-improvements.md](./species-list-improvements.md) — species list UX improvements.
- [MAP_MINIMIZE_IMPLEMENTATION.md](./MAP_MINIMIZE_IMPLEMENTATION.md) — also relevant for responsive UI.

**Data, Auth, and Platform**
- [DATABASE_USER_GUIDE.md](./DATABASE_USER_GUIDE.md) — Supabase tables, RPCs, TiTiler integration.
- [SPECIES_DATABASE_IMPLEMENTATION.md](./SPECIES_DATABASE_IMPLEMENTATION.md) — schema and species data sourcing.
- [USER_ACCOUNTS_MIGRATION_PLAN.md](./USER_ACCOUNTS_MIGRATION_PLAN.md) — auth migration steps.
- [HABITAT_RASTER_MIGRATION.md](./HABITAT_RASTER_MIGRATION.md) — TiTiler COG migration from Supabase raster.
- [PRISMA_VERCEL_MIGRATION.md](./PRISMA_VERCEL_MIGRATION.md) — Prisma ORM + Vercel server runtime setup.

**Player Tracking & Stats**
- [PLAYER_TRACKING_IMPLEMENTATION_SUMMARY.md](./PLAYER_TRACKING_IMPLEMENTATION_SUMMARY.md) — telemetry + Supabase writes.
- [PLAYER_TRACKING_INTEGRATION_PLAN.md](./PLAYER_TRACKING_INTEGRATION_PLAN.md) — rollout steps for tracking.
- [PLAYER_STATS_DASHBOARD_INTEGRATION.md](./PLAYER_STATS_DASHBOARD_INTEGRATION.md) — stats UI integration.
- [PLAYER_STATS_DASHBOARD_FINAL_REVIEW.md](./PLAYER_STATS_DASHBOARD_FINAL_REVIEW.md) — review of stats dashboard work.

**Biodiversity & Map Content**
- [BIOREGION_FEATURE_SUMMARY.md](./BIOREGION_FEATURE_SUMMARY.md) — overview of bioregion feature.
- [BIOREGION_IMPLEMENTATION.md](./BIOREGION_IMPLEMENTATION.md) — implementation notes for bioregions.
- [ECOREGION_IMPLEMENTATION.md](./ECOREGION_IMPLEMENTATION.md) — ecoregion details.

**Feature / UX Improvements**
- [MAP_MINIMIZE_IMPLEMENTATION.md](./MAP_MINIMIZE_IMPLEMENTATION.md) — shared with UI.
- [HABITAT_HIGHLIGHT_IMPLEMENTATION.md](./HABITAT_HIGHLIGHT_IMPLEMENTATION.md) — shared with map.

**Archive / Historical (for reference only)**
- [archive/BOARD_POSITION_FIX.md](./archive/BOARD_POSITION_FIX.md)
- [archive/MISSING_PROFILES_FIX.md](./archive/MISSING_PROFILES_FIX.md)
- [archive/RESPONSIVE_BOARD_SCALING_FIX.md](./archive/RESPONSIVE_BOARD_SCALING_FIX.md)
- [archive/PLAYER_STATS_DASHBOARD_FIX_PLAN.md](./archive/PLAYER_STATS_DASHBOARD_FIX_PLAN.md)
- [archive/PLAYER_STATS_DEBUG_LOGGING_ADDED.md](./archive/PLAYER_STATS_DEBUG_LOGGING_ADDED.md)
- [archive/P0_FIXES_PROPOSAL.md](./archive/P0_FIXES_PROPOSAL.md)
- [archive/P0_FIXES_REVISED.md](./archive/P0_FIXES_REVISED.md)
- [archive/gameTime.md](./archive/gameTime.md)
- [archive/gamification.md](./archive/gamification.md)

## 5) Quick Code Navigation
- **Map click → board init:** `src/components/CesiumMap.tsx` emits `cesium-location-selected` → `src/game/scenes/Game.ts.initializeBoardFromCesium`.
- **HUD updates:** `Game.ts.emitHud` → `EventBus 'game-hud-updated'` → `src/components/SpeciesPanel.tsx`.
- **Species list sync:** `SpeciesPanel` emits `show-species-list` → `src/MainAppLayout.tsx` toggles view and scrolls `SpeciesList`.
- **Data access:** `src/lib/speciesService.ts` (RPCs), `src/hooks/useSpeciesData.ts` (React Query), `src/lib/playerTracking.ts` (session + telemetry).

## 6) Gem Assets & Clue Mapping (current build)
- Gem types loaded: 8 colors (`black`, `blue`, `green`, `orange`, `red`, `white`, `yellow`, `purple`). Pink art files exist in `public/assets/` but are not loaded because `pink` is not in `GEM_TYPES`.
- Asset files: `{color}_gem_{frame}.png`, frames `0-7` (0 = idle, 1-7 = explosion), served from `public/assets/` via the `assets/` base path.
- Total gem assets used: 64 images (8 types × 8 frames), plus `bg.png`, `logo.png`, and `Owl_spritesheet.png`.
- Habitat-to-gem mapping for board seeding (`HABITAT_GEM_MAP`): Forests (100-109) → green; Savannas (200-202) → orange; Shrublands (300-308) → black; Grasslands (400-407) → white; Wetlands (500-518) → blue; Urban/Artificial (1400-1406) → red; default/unknown → white.
- Green gem clues are not from the ICAA species text table; they consume Cesium `rasterHabitat` results (`habitat_type`, `percentage`) in the order returned (service currently returns highest % first), emitting `Search Area is {percentage}% {habitat_type}` until exhausted.

**Clue sources by gem (matches map through `Game.gemTypeToCategory`)**

| Color (asset key) | Category | Icon | Clue source (progressive order) | Example output |
| --- | --- | --- | --- | --- |
| red | Classification | 🧬 | `tax_comm`, `phylum`, `class`, `order_`, `family`, `genus`, `sci_name` | `Genus: Panthera` |
| green | Habitat (Cesium) | 🌳 | Cesium click `rasterHabitats` (`habitat_type` with `percentage`, uses returned order) | `Search Area is 62% Mangroves` |
| blue | Geographic & Habitat text | 🗺️ | `geo_desc`, `dist_comm`, `hab_desc`, `hab_tags` | `Habitat: tropical rainforests` |
| orange | Morphology | 🐆 | `pattern`, `color_prim`, `color_sec`, `shape_desc`, `size_max`, `weight_kg` | `Primary color: chestnut` |
| yellow | Behavior & Diet | 💨 | `behav_1`, `behav_2`, `diet_type`, `diet_prey`, `diet_flora` | `Diet type: Carnivore` |
| black | Life Cycle | ⏳ | `life_desc1`, `life_desc2`; fallback: `lifespan`, `maturity`, `repro_type`, `clutch_sz` | `Clutch size: 2-4 eggs` |
| white | Conservation | 🛡️ | `cons_text`, `threats`; fallback: `cons_code` or `category` | `Threats: habitat loss` |
| purple | Key Facts | 🔮 | `key_fact1`, `key_fact2`, `key_fact3` | `Has night vision` |

Notes:
- Behavior + diet clues are emitted by matching yellow gems. Conservation clues are emitted by matching white gems.
- Habitat text fields (`hab_desc`, `hab_tags`) now ride with the blue Geographic gem. The green gem exclusively returns Cesium habitat legend values.

Use this doc as the hub: follow the recommended reading path, then dive into the specific files linked above before modifying the game.
