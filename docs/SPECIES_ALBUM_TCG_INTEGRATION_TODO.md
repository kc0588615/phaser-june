# Species Album TCG — Integration TODO & Data Inventory

Status as of 2026-04-11. Covers remaining work after Phase 0–1 + code review fixes.

---

## Completed

- [x] Phase 0: Spoiler-hide undiscovered species in SpeciesCard
- [x] Phase 1: Album/Cases/Runs/Taxonomy tab shell, TCG card front, card grid
- [x] DB schema: `species_cards`, `run_memories`, `species_card_unlocks` tables
- [x] API routes: species cards CRUD, unlock endpoint, runs list, run memory
- [x] TCG card with CSS 3D flip, conservation-themed frames
- [x] AlbumHeroSwiper with lazy run-memory fetch + cache
- [x] SpeciesAlbumContext (tab/focus/flip state)
- [x] Auth fix: all new APIs derive playerId from Clerk (no client-supplied IDs)
- [x] Discovery sync: single fire-and-forget `/api/species/cards/[id]/unlock` write from gameplay tracking
- [x] Album hydration: `SpeciesList` loads discovered state from authenticated `species_cards` and merges localStorage as fallback
- [x] run_memories persistence on run completion (PATCH `/api/runs/[runId]`)
- [x] run_memories linkage: completion PATCH now includes `speciesId`, so card-back memory resolves per species
- [x] Runs list scoped to authenticated player
- [x] Run memory endpoint scoped to authenticated owner

---

## TODO

### Phase 2 — Card Back & Run Memory Enrichment

- [x] **GIS stamps on card back**: query spatial tables at run start/node completion, write stamps to `species_cards.gis_stamps` via unlock endpoint
  - Stamps = bioregion name, nearby rivers, protected areas, IUCN habitat type
  - Use PostGIS `ST_DWithin` / `ST_Intersects` against player's route or node coordinates
- [ ] **Route polyline**: persist simplified route geometry in `run_memories.route_polyline` (currently NULL)
  - Source: accumulate player positions during run, simplify with `ST_Simplify`
- [ ] **GIS features nearby**: populate `run_memories.gis_features_nearby` JSONB during run completion
  - Query hydro_rivers, protected_planet_parcels, oneearth_bioregion within radius of run coords
- [x] **Richer card back layout**: show GIS stamps as badge chips, mini-map thumbnail, route stats
- [x] **Facts slot unlocking**: wire `species.key_fact_1/2/3` (and `species_facts` rows) into card front fact slots; unlock via gameplay events (`taxon_key_facts` removed)
- [x] **Clue category tracking**: populate `species_cards.clue_categories_unlocked` from clue reveals during runs

### Phase 3 — Collection Depth & Progression

- [x] **Completion percentage calc**: define formula (facts + stamps + clues + encounters → pct), update on each unlock
- [x] **Rarity tier assignment**: assign based on IUCN status + encounter frequency (CR=legendary, EN=epic, VU=rare, NT=uncommon, LC=common)
- [x] **Card variant system**: holographic/foil variants for full-completion or special achievements
- [x] **Affinity tag accumulation**: track which gem affinities a species was discovered with, store in `species_cards.affinity_tags`
- [x] **Expedition regions seen**: accumulate distinct bioregion/realm/biome combos per species card
- [x] **Best run tracking**: update `best_run_id` / `best_run_score` when a new high score is set
- [ ] **Deduplicate unlock timeline semantics**: decide which events should increment `times_encountered` vs only append to `species_card_unlocks`

### Phase 4 — Swiper & UX Polish

- [ ] **Swiper premium modules**: evaluate Swiper Element (web component) for better perf on large collections
- [ ] **Virtual slides**: enable Swiper virtual mode for albums with 100+ cards (prevent DOM bloat)
- [x] **Card sort/filter in Album tab**: sort by rarity, conservation status, discovery date, completion %
- [ ] **Cases tab grouping**: group undiscovered by biome/realm/bioregion instead of flat list
- [x] **Search within album**: quick-filter by name substring
- [ ] **Runs tab enrichment**: show mini-map, species discovered per run, gem wallet summary

### Phase 5 — Data Pipeline & GIS Expansion

- [ ] **Populate empty tables**: hydro_lakes (0 rows), marine_eez (0 rows) — need data imports
- [ ] **Enable disabled GIS layers**: protected_planet, icca_registry, marine_eez in `eco_gis_layers`
- [ ] **eco_node_gis_samples**: populate during node generation — sample nearby GIS features per node
- [ ] **iucn spatial queries**: use `iucn` range polygons (replacing removed `taxon_ranges`) to validate/enhance discoveries — join via `species.iucn_id = iucn.id_no`
- [ ] **Threat/conservation overlays**: surface `species.threats` and conservation fields on card back (`taxon_threats`/`taxon_conservation_assessments` were removed)
- [ ] **Habitat tag matching**: cross-ref `species.habitat_tags` with node biome for relevance scoring (`taxon_habitat_tags` was removed)

### Misc / Debt

- [ ] **Backfill playerId on old runs**: existing eco_run_sessions have NULL playerId (pre-auth fix)
- [ ] **Anonymous → authenticated backfill hardening**: current album merges localStorage + server cards for display, but there is still no explicit one-shot claim/backfill job for older anonymous discoveries beyond live discovery sync
- [ ] **Rate limiting on unlock endpoint**: prevent spam/abuse of POST unlock
- [ ] **Card image generation**: generate or source species artwork for card fronts (currently emoji placeholders)
- [ ] **Offline support**: cache card data in IndexedDB for offline album browsing

---

## Database Tables — GIS / Spatial

| Table | Rows | Geometry Type | SRID | Description | Album Use |
|---|---|---|---|---|---|
| `hydro_rivers` | 11,120 | MULTILINESTRING | 4326 | HydroRIVERS river segments | GIS stamp: "near [river name]" on card back |
| `hydro_lakes` | 0 | MULTIPOLYGON | 4326 | HydroLAKES lake polygons | GIS stamp: "near [lake name]" — **needs data import** |
| `marine_eez` | 0 | MULTIPOLYGON | 4326 | Exclusive Economic Zones | GIS stamp: marine region context — **needs data import** |
| `protected_planet_parcels` | 1,177 | MULTIPOLYGON | 4326 | WDPA protected areas | GIS stamp: "in [protected area]", conservation badge |
| `icca_registry_point` | 264 | POINT | 4326 | Indigenous/community conservation areas | GIS stamp: ICCA proximity |
| `oneearth_bioregion` | 185 | MULTIPOLYGON | 4326 | One Earth bioregion polygons | Bioregion name on card back, expedition region tracking |
| `iucn` | 22+ | MULTIPOLYGON | 4326 | Raw IUCN range polygons | Validate discovery location is within range (join via `species.iucn_id = iucn.id_no`) |
| `eco_node_gis_samples` | 0 | — | — | GIS features sampled per node | Node-level spatial context — **needs pipeline** |
| `habitat_colormap` | 82 | — | — | IUCN habitat type → color mapping | Card frame tinting by habitat |

### eco_gis_layers Registry (8 layers, 3 enabled)

| Layer Key | Enabled | Source Table | Notes |
|---|---|---|---|
| `iucn_habitat` | Yes | habitat_colormap + raster | Active — habitat type overlay |
| `oneearth_bioregion` | Yes | oneearth_bioregion | Active — bioregion polygon lookup |
| `hydrorivers` | Yes | hydro_rivers | Active — river proximity |
| `protected_planet` | No | protected_planet_parcels | 1,177 rows ready, needs layer enable |
| `icca_registry` | No | icca_registry_point | 264 rows ready, needs layer enable |
| `marine_eez` | No | marine_eez | Empty — needs data + enable |
| `hydrolakes` | No | hydro_lakes | Empty — needs data + enable |
| `taxon_range` | No | iucn | 22+ rows (`taxon_ranges` removed; source is now `iucn` table), needs enable |

---

## Database Tables — Species / Taxonomy

| Table | Rows | Description | Album Use |
|---|---|---|---|
| `species` | 22 | Curated game species: stable PK, taxonomy, IUCN status, habitat flags, flat fact/behavior/clue columns | Card front: name, taxonomy, conservation, habitat |
| `species_facts` | 0 | Extensible fact rows per species (category, fact_text, sort_order) | Future: card fact slots |
| `species_deduction_profiles` | 22 | Tag arrays (habitat, morphology, diet, behavior, etc.) per species | Deduction/clue game mechanic |
| `species_deduction_clues` | — | Per-species clue definitions (label, category, reveal order) | Clue unlock flow |
| `iucn` | 22+ | Raw IUCN range polygons (source-owned field names) | Discovery location validation (join via `species.iucn_id = iucn.id_no`) |
| ~~`taxon_key_facts`~~ | — | **Removed** — facts now on `species.key_fact_1/2/3` + `species_facts` | — |
| ~~`taxon_habitat_tags`~~ | — | **Removed** — habitat tags now on `species.habitat_tags TEXT[]` | — |
| ~~`taxon_threats`~~ | — | **Removed** — threats now on `species.threats` | — |
| ~~`taxon_behaviors`~~ | — | **Removed** — behaviors now on `species.behavior_1/2` | — |
| ~~`taxon_diet_items`~~ | — | **Removed** — diet now on `species.diet_prey/diet_flora` | — |
| ~~`taxon_life_descriptions`~~ | — | **Removed** — life history now on `species.life_description_1/2` | — |
| ~~`taxon_profiles`~~ | — | **Removed** — profile data consolidated onto `species` | — |
| ~~`taxon_conservation_assessments`~~ | — | **Removed** — conservation fields on `species.conservation_code/text` | — |

---

## Database Tables — Game / Runs

| Table | Rows | Description | Album Use |
|---|---|---|---|
| `eco_run_sessions` | ~varies | Expedition run sessions | Run history, best-run tracking |
| `eco_run_nodes` | ~varies | Individual nodes per run | Node chips on card back, score breakdown |
| `run_memories` | ~varies | Durable run summaries (new) | Card back expedition memory |
| `species_cards` | ~varies | Player card collection state (new) | Core album data |
| `species_card_unlocks` | ~varies | Unlock event timeline (new) | Activity feed, progression tracking |

---

## Database Tables — Player / Auth

| Table | Rows | Description | Album Use |
|---|---|---|---|
| `profiles` | ~varies | Clerk userId → internal playerId | Auth resolution for all card APIs |
| `player_sessions` | ~varies | Game session tracking | Context for when discoveries happened |
| `player_discoveries` | ~varies | Species discovery records | Source of truth for discovered species |
| `player_clue_reveals` | ~varies | Clue reveal history | Clue category unlock tracking |

---

## Key Integration Points

1. **Run completion → card enrichment**: PATCH `/api/runs/[runId]` now writes `run_memories` with `speciesId`, so `AlbumHeroSwiper` can resolve species-specific expedition memories. Next: also enrich `species_cards` with GIS stamps, best-run info, and completion metrics.

2. **Node GIS sampling**: During node generation in `POST /api/runs`, query spatial tables at node coords → store in `eco_node_gis_samples` → flow into `run_memories.gis_features_nearby`.

3. **Discovery → card creation**: gameplay discovery tracking now owns the `/unlock` write, avoiding duplicate encounter increments. `SpeciesList` reads authenticated `species_cards` for album hydration and merges localStorage as fallback. Next: include richer unlock payloads (biome, realm, clue categories revealed).

4. **Clue reveal → fact unlock**: EventBus `clue-revealed` events should trigger `/api/species/cards/[id]/unlock` with `unlockType: 'fact'` and the clue content.

5. **Key facts → card slots**: Read `species.key_fact_1/2/3` (and any `species_facts` rows) for a species; show as locked/unlocked slots on card front based on `species_cards.facts_unlocked`. (`taxon_key_facts` removed)

6. **Spatial queries at run start**: Use `ST_DWithin(geom, ST_MakePoint(lon,lat)::geography, radius)` against hydro_rivers, protected_planet_parcels, oneearth_bioregion to gather GIS context.

7. **Conservation status → card rarity**: Join `species.iucn_status` with `conservation_statuses` to assign rarity tier and frame color on card creation.

8. **API security baseline**: `/api/runs/list`, `/api/species/cards/*`, and `/api/runs/[runId]/memory` are now authenticated and owner-scoped. Keep new album endpoints aligned with this pattern as more write/read surfaces are added.
