# YMBAB Tactical Rewrite + GIS Evidence Pipeline

Implemented across branch `refactor/frontend-work`. This document covers the multi-phase integration: database schema migration to org-scoped PostGIS tables, YMBAB-style multi-threat encounter model, GIS evidence pipeline feeding deduction and species cards, and client-side player tracking migration.

## Phase 0: Database Schema Migration

### Problem

The database was reorganized from Brazil-only `public.*` tables into per-organization schemas (`unesco`, `ramsar`, `wpda`, `wwf`, `oneearth`) with global data. Codebase still referenced deleted/replaced tables.

### Changes

**`src/db/schema/gis.ts`** (new) — Drizzle `pgSchema()` definitions for 5 org-scoped GIS tables:
- `unesco.world_rivers` (5104 rows, replaces `public.hydro_rivers`)
- `ramsar.wetland` (449 rows, new)
- `wpda.wdpa_points` (7663 rows) and `wpda.wdpa_polygons` (306950 rows, replaces `public.protected_planet_parcels`)
- `wwf.glwd_1` (3721 rows, replaces `public.hydro_lakes`)

**`drizzle.config.ts`** — Added `schemaFilter: ['public']` so drizzle-kit doesn't try to manage org-schema tables.

**`src/db/schema/game.ts`** — Removed dead exports: `protectedPlanetParcels`, `hydroRivers`, `hydroLakes`, `marineEez`.

**API routes updated**:
- `src/app/api/layers/near-point/route.ts` — schema-qualified queries, added wetlands + lakes responses
- `src/app/api/protected-areas/at-point/route.ts` — same, gates on new `eco_gis_layers` keys (`unesco_rivers`, `wwf_glwd`, `wdpa_polygons`, `ramsar_wetland`)

**`src/lib/nodeScoring.ts`** — Signal keys updated (`wdpa_*` replaces `icca_*`).

**`src/hooks/useCesiumTrail.ts`** — Removed `icca` rendering, added `wetlands` (teal) and `lakes` (blue) layers.

### Key constraint

`oneearthBioregion` stays in `species.ts`. (`taxa.ts` was deleted in the species table simplification; `types.ts` FK reference was removed at the same time.) All runtime queries use `oneearth_bioregion` via raw SQL.

---

## Phase 1: GIS Enrichment Types

**`src/types/gis.ts`** (new) — Core types for the evidence pipeline:

```ts
type FeatureClass = 'river' | 'lake' | 'protected_area' | 'bioregion' | 'ramsar_site';

interface FeatureFingerprint {
  featureClass: FeatureClass;
  sourceTable: string;
  sourceId: string | number;
  name: string | null;
  distanceM: number;
  overlapRatio: number;
  properties: Record<string, unknown>;
}

interface RunEvidenceBundle {
  fingerprints: FeatureFingerprint[];
  featureClassCounts: Partial<Record<FeatureClass, number>>;
  dominantFeatureClass: FeatureClass | null;
  uniqueProtectedAreas: string[];
  bioregionContext: { bioregion; realm; biome } | null;
}
```

**`src/lib/featureFingerprint.ts`** (new):
- `normalizeNearPointResponse(data)` — flattens API FeatureCollections into fingerprints
- `buildRunEvidenceBundle(fingerprints[])` — aggregates across nodes

---

## Phase 2: YMBAB Multi-Threat Encounter Model

### Design

Replaces the old single-bar "fill one bar with one gem type" model with multi-threat encounters where every gem is an immediate verb.

### New types (`src/game/encounterState.ts`)

```
ThreatType = 'quarry' | 'blocker' | 'hazard' | 'loot_cache' | 'time_pressure'

ThreatSlot { counterGem, altGem, progress, target, resistances, resolved }
EncounterState { threats[], spookLevel, spookRate, chipDamagePool, chipDamageTotal, outcome }
EncounterConfig { threats[], baseSpookRate }
```

### Match resolution (`src/game/objectiveResolver.ts`)

`resolveMatchAgainstEncounter(gemType, matchSize, encounter, affinities, obstacles)`:
- **counterGem match** = full rate contribution to that threat
- **altGem match** = half rate
- **Off-gem / support gems** = chip-damage pool (accumulates at 1 per match, auto-assigns 1 progress to highest-remaining threat every 3 points)
- Shield matches reduce spookRate

Legacy `resolveObjectiveContribution()` preserved for crisis/analysis nodes.

### Spook consolidation

`spookLevel` replaces old `nodeBonusPool` as single pressure axis. In `Game.ts`, `startNodeBonusDecay()` branches:
- Encounter nodes: timer calls `tickSpook()`, UI shows "Spook" label
- Legacy nodes: old bonusPool path, UI shows "Tracking" label

### Blocker obstacles (`src/game/BackendPuzzle.ts`)

- `getMatches()` skips cells where `cell.state?.blockerId && durability > 0`
- `damageBlocker(x, y)` reduces durability on adjacent matches (called from `recordMatchesForSummary`)
- Durability 0 = blocker cleared

### Node templates (`src/lib/nodeScoring.ts`)

All 6 combat templates now have multi-threat `encounterConfig`:
- `riverbank_sweep`: quarry(sword,3) + blocker(key,4) + hazard(shield,2)
- `dense_canopy`: quarry(sword,4) + hazard(shield,3) + time_pressure(staff,3)
- `urban_fringe`: blocker(key,3) + hazard(shield,3) + loot_cache(crate,2)
- `elevation_ridge`: quarry(sword,5) + time_pressure(staff,3)
- `storm_window`: time_pressure(staff,4) + hazard(shield,3) + quarry(sword,3)
- `custom`: hazard(crate,3) + quarry(sword,3)

`objectiveTarget` = sum of threat targets for backward compatibility.

### Encounter persistence

Node completion POST (`/api/runs/[runId]/nodes/[nodeIndex]/complete`) accepts `encounterOutcome` in body, merges into `boardContext` jsonb on `eco_run_nodes`. Snapshot includes per-threat progress, finalSpookLevel, outcome, chipDamageTotal.

### UI changes

- **`ActiveEncounterPanel.tsx`** — multi-threat bars with gem swatch + color, chip-damage pool indicator (pool/3)
- **`RunTrack.tsx`** — threat type emojis on node dots
- **`EventBus.ts`** — `node-objective-updated` carries `threats[]`, `spookLevel`, `chipDamagePool`, `overallResolved`

---

## Phase 3: GIS Evidence Pipeline

### Server-authoritative evidence (`at-point/route.ts`)

The at-point API builds `FeatureFingerprint[]` from query results (protected areas, rivers, lakes, wetlands, bioregions) and returns them as `feature_fingerprints` in the response. `CesiumMap.tsx` passes them to `expedition-data-ready`.

### Evidence in run state

`ExpeditionContext.tsx` builds `RunEvidenceBundle` from fingerprints on `expedition-data-ready` and stores in `RunState.evidenceBundle`.

### Evidence auto-confirms deduction tags

On comparative deduction init (`ExpeditionContext.tsx`), `applyEvidenceBundle()` intersects GIS evidence with mystery profile habitat tags, pre-populates `confirmedTags`, and recomputes `candidateCount` via `filterCandidates()`.

`DeductionCamp.tsx` renders a "Route Evidence" section showing unique protected areas, feature class counts, and bioregion context.

### GIS stamps on species cards

**Write path**: On run completion, `PATCH /api/runs/[runId]` persists `featureFingerprints` as `gisFeaturesNearby` on `run_memories`, and upserts unique feature classes onto `species_cards.gis_stamps`.

Both deduction paths (legacy and comparative) include `featureFingerprints` in the PATCH body.

**Read path**: `AlbumHeroSwiper.tsx` fetches card data, prefers `card.gisStamps` (authoritative), falls back to `memory.gisFeaturesNearby`. Passes stamps to `SpeciesTCGCard.tsx` which renders feature class badges on the card back.

### Feature mastery tracking

**`src/lib/featureMastery.ts`** (new) — `FeatureMasteryData`, `updateFeatureMastery()`, `getFeatureMasteryTier()`, `getOverallMasteryTier()`.

**Write path**: `PATCH /api/runs/[runId]` upserts `eco_location_mastery` row (insert on first visit, merge on subsequent) with feature mastery data in `metadata` jsonb. Also increments `runsCompleted`.

### Taxonomy note

`FeatureClass` has 5 values: `river`, `lake`, `protected_area`, `bioregion`, `ramsar_site`. There is no separate `wetland` class — Ramsar wetland data uses `ramsar_site`. The deduction engine's `ramsar_site` tag mapping includes `['wetland', 'freshwater', 'marsh', 'ramsar']`.

---

## Player Tracking: Server-Only to API-Backed

### Problem

`src/lib/playerTracking.ts` is server-only (DB imports, `isServer` guards). `Game.ts` (Phaser, runs in browser) dynamically imported it with `/* webpackIgnore: true */`, causing a runtime `Failed to resolve module specifier` crash. Removing the comment fixed the crash but made all tracking calls silent no-ops (every function returns early on client).

### Solution

`src/lib/playerTracking.ts` remains the server-only core implementation. The migration wraps it with an API route -- it does not replace it. **Do not import playerTracking from client code.**

**`src/pages/api/player/track.ts`** (new) — single API route proxying all 5 post-bootstrap tracking operations via discriminated `action` field:

| Action | Purpose |
|---|---|
| `trackClueUnlock` | Insert clue unlock record |
| `updateSessionProgress` | Update session stats (moves, score, species count) |
| `forceSessionUpdate` | Same but immediate (bypasses debounce) |
| `trackSpeciesDiscovery` | Insert discovery + link pending clues + refresh stats |
| `endGameSession` | Close session (endedAt, totalMoves, totalScore) |

### Bootstrap path

Session creation is separate from these 5 mutations. `src/hooks/useAuthBridge.ts` calls `POST /api/player/start-session` on mount, receives `sessionId`, and emits `auth-user-ready` with it into Game.ts via the EventBus. `/api/player/track` handles only the post-bootstrap mutations that happen during gameplay.

### Auth model

`/api/player/track` authenticates via Clerk `getAuth(req)` and resolves the internal `profiles.userId` server-side from the Clerk session cookie. Auth enforcement is route-local (the route is not listed in `src/middleware.ts` protected-route matcher). Same-origin cookies are sent automatically with both `fetch` and `sendBeacon`.

### Why `pages/api` not `app/api`

The tracking route lives under `pages/api` (`NextApiRequest`/`NextApiResponse`) to stay consistent with the existing Clerk/Phaser tracking path (`start-session`, `ensure-profile`, `profile` all live there). Game.ts posts to this route using the same pattern.

### `Game.ts` changes

- All 5 `import('@/lib/playerTracking')` replaced with `fetch('/api/player/track')`
- `updateSessionProgress` uses client-side 10s debounce (server debounce doesn't work across stateless requests)
- `forceSessionUpdate` (beforeunload at `Game.ts:979-1000`) and `endSessionSync` (shutdown at `Game.ts:2735-2744`) use `navigator.sendBeacon` with JSON blob for reliable delivery during page teardown. The client debounce timer is cleared first in both paths.
- localStorage discovery update + card unlock API call moved to client-side after successful `trackSpeciesDiscovery` response
- `sessionUpdateTimer` cleared in `shutdown()`

### `sendBeacon` caveat

`sendBeacon` is fire-and-forget: there is no response and no retry on failure. It is used only for the two shutdown/unload paths where a regular `fetch` would be cancelled by the browser. All other tracking calls use standard `fetch` with response handling.

---

## Files Created

| File | Purpose |
|---|---|
| `src/db/schema/gis.ts` | Drizzle pgSchema definitions for org-scoped GIS tables |
| `src/types/gis.ts` | FeatureClass, FeatureFingerprint, RunEvidenceBundle types |
| `src/lib/featureFingerprint.ts` | Fingerprint normalization + evidence bundle builder |
| `src/game/encounterState.ts` | Multi-threat encounter model types + logic |
| `src/lib/featureMastery.ts` | Feature class mastery tracking |
| `src/pages/api/player/track.ts` | Client-safe proxy for playerTracking server functions |

## Files Modified

| File | What changed |
|---|---|
| `drizzle.config.ts` | `schemaFilter: ['public']` |
| `src/db/schema/game.ts` | Removed 4 dead table exports |
| `src/db/schema/index.ts` | Added `export * from './gis'` |
| `src/app/api/layers/near-point/route.ts` | Schema-qualified queries, wetlands + lakes |
| `src/app/api/protected-areas/at-point/route.ts` | Schema-qualified queries, fingerprint generation |
| `src/app/api/runs/route.ts` | encounterConfig in boardContext |
| `src/app/api/runs/[runId]/route.ts` | featureFingerprints, encounter data, mastery upsert, card stamps |
| `src/app/api/runs/[runId]/memory/route.ts` | encounterOutcome + encounterConfig in nodesSummary |
| `src/app/api/runs/[runId]/nodes/[nodeIndex]/complete/route.ts` | Accepts + persists encounterOutcome |
| `src/lib/nodeScoring.ts` | Multi-threat encounterConfig on all combat templates |
| `src/game/objectiveResolver.ts` | `resolveMatchAgainstEncounter()` multi-threat resolver |
| `src/game/scenes/Game.ts` | Encounter state, blocker damage, spook consolidation, API-backed tracking |
| `src/game/BackendPuzzle.ts` | `damageBlocker()`, blocker-aware `getMatches()` |
| `src/game/nodeObstacles.ts` | `ObstacleRule` type |
| `src/game/EventBus.ts` | Multi-threat + fingerprint payload fields |
| `src/expedition/gemEffects.ts` | `TacticalRole`, `GEM_TACTICAL_ROLE` map |
| `src/components/ActiveEncounterPanel.tsx` | Multi-threat bars, chip-damage indicator |
| `src/components/RunTrack.tsx` | Threat type icons |
| `src/components/DeductionCamp.tsx` | Route Evidence section |
| `src/components/album/AlbumHeroSwiper.tsx` | Card stamp caching + rendering |
| `src/components/album/SpeciesTCGCard.tsx` | GIS stamp badges on card back |
| `src/components/CesiumMap.tsx` | Passes featureFingerprints to expedition-data-ready |
| `src/contexts/ExpeditionContext.tsx` | Evidence bundle, auto-confirm, fingerprints in PATCH |
| `src/hooks/useCesiumTrail.ts` | Wetland + lake layer rendering |
| `src/hooks/useExpeditionRun.ts` | evidenceBundle in initial state |
| `src/types/expedition.ts` | `evidenceBundle` on RunState |
| `src/lib/deductionEngine.ts` | `applyEvidenceBundle()`, feature class habitat tag map |
| `src/MainAppLayout.tsx` | Passes evidenceBundle to DeductionCamp |

## Related Files (not modified but architecturally relevant)

| File | Role |
|---|---|
| `src/lib/playerTracking.ts` | Server-only tracking core; wrapped by `track.ts`, never imported client-side |
| `src/hooks/useAuthBridge.ts` | Bootstraps session via `/api/player/start-session`, emits `auth-user-ready` with sessionId |
| `src/pages/api/player/start-session.ts` | Session creation endpoint (separate from `/api/player/track`) |
| `src/middleware.ts` | Clerk route matcher; `/api/player/track` uses route-local auth, not middleware |
