# Database ER — Play Path Schema

> **Checked against live DB: 2026-07-11** via WSL SSH tunnel (`127.0.0.1:55432` → Postgres).
> Database name: **`phaser_june`**. One Postgres instance; GIS “datasets” are **schemas**, not separate databases.
> Focus: tables and fields **utilized by the v3 expedition loop** (map → three evidence-family boards → guess).
> Source of truth for app types: `src/db/schema/*`. Re-verify with `postgres-tunnel` skill after migrations.

Related: [DATABASE_USER_GUIDE.md](./DATABASE_USER_GUIDE.md), [ACTION_RUN_SCHEMA_AND_GIS_SOURCES.md](./ACTION_RUN_SCHEMA_AND_GIS_SOURCES.md), [EXPEDITION_RUN_LOOP.md](./EXPEDITION_RUN_LOOP.md), [SHAPEFILE_BEST_PRACTICES.md](./SHAPEFILE_BEST_PRACTICES.md).

---

## 1. Instance layout

| Schema | Role | Approx rows (2026-07-11) |
|---|---|---|
| **`public`** | App/game tables | species, runs, nodes, evidence-family corpus, profiles |
| **`oneearth`** | Bioregion polygons + legend colors | bioregion 827 |
| **`unesco`** | Rivers | world_rivers 5 104 |
| **`wpda`** | Protected areas | polygons ~307k · points 7 663 |
| **`ramsar`** | Wetlands | 449 |
| **`wwf`** | Lakes (GLWD) | 3 721 |
| **`natural_earth`** | Countries / places | peripheral |
| **`postgres`** | Legacy `oneearth_ecoregion` | 14 458 |

---

## 2. Play data flow

```text
MAP CLICK (GIS READ)
  species ⋈ iucn (ranges)
  oneearth / wpda / unesco / ramsar / wwf / habitat_colormap
        │
        ▼
POST /api/runs (WRITE)
  species + species_deduction_profiles
  + evidence_family_cards / evidence_family_hints / cascade_hints → v3 compiler
  INSERT eco_run_sessions + eco_run_nodes
  casePrivate / casePublic / board seeds → session.metadata jsonb
        │
        ▼
THREE BOARDS (client Phaser; six moves each)
  POST /api/runs/:id/evidence-progress → board checkpoint, charges, hints
  POST /api/runs/:id/evidence-choice   → selected family, elimination, node advance
  metadata.evidenceApplications stores the three applied family cards
        │
        ▼
POST /api/runs/:id/guess (TERMINAL WRITE)
  eco_run_sessions (completed + finalScore)
  eco_run_nodes (guessed_species_id)
  INSERT run_memories
  auth path: player_species_discoveries, species_cards, species_card_unlocks
```

Match-3 cell state is **not** persisted row-by-row. Durable board inputs: `board_seed`, objectives, scores, case metadata.

---

## 3. Entity-relationship diagram (play-centric)

```mermaid
erDiagram
  profiles ||--o{ player_game_sessions : has
  profiles ||--o| player_stats : has
  profiles ||--o{ player_species_discoveries : discovers
  profiles ||--o{ player_clue_unlocks : unlocks
  profiles ||--o{ species_cards : collects
  profiles ||--o{ species_card_unlocks : logs
  profiles ||--o{ eco_run_sessions : plays

  species ||--o{ player_species_discoveries : "discovered as"
  species ||--o{ player_clue_unlocks : "clue of"
  species ||--o{ species_cards : "card for"
  species ||--o{ species_card_unlocks : "unlock of"
  species ||--o| species_deduction_profiles : "tags for"
  species ||--o{ evidence_family_cards : "family cards for"
  species ||--o{ evidence_family_hints : "progress hints for"
  species ||--o{ species_deduction_clues : "legacy clues"
  species ||--o{ species_facts : "facts"
  species ||--o{ species_ecoregions : "overlaps"
  species ||--o| species_combat_traits : "legacy combat"
  species }o--|| iucn : "iucn_id = id_no"

  eco_run_sessions ||--|{ eco_run_nodes : contains
  eco_run_sessions ||--o| run_memories : recaps
  eco_run_sessions }o--o| player_game_sessions : "optional outer"
  eco_run_nodes ||--o{ eco_node_attempts : "unused"
  eco_run_nodes ||--o{ eco_node_gis_samples : "unused"
  eco_node_gis_samples }o--|| eco_gis_layers : samples
  eco_run_nodes }o--o| species : "guessed_species_id"
  run_memories }o--o| species : "answer species"
  run_memories }o--o| profiles : "owner"

  oneearth_bioregion ||--o{ species_ecoregions : "ecoregion_id"
  player_species_discoveries }o--o| oneearth_bioregion : "found_ecoregion_id"

  profiles {
    uuid user_id PK
    text clerk_user_id UK
    text username
  }

  species {
    serial id PK
    bigint iucn_id UK
    text scientific_name
    text common_name
    text conservation_code
    text realm
    text biome
    text bioregion
  }

  iucn {
    serial ogc_fid PK
    numeric id_no "join key"
    geometry wkb_geometry
  }

  eco_run_sessions {
    uuid id PK
    uuid player_id FK
    text run_status
    float selected_lng
    float selected_lat
    text location_key
    int score_total
    jsonb metadata "case bag"
  }

  eco_run_nodes {
    uuid id PK
    uuid run_id FK
    smallint node_order
    text node_type
    text node_status
    int objective_target
    int objective_progress
    bigint board_seed
    int score_earned
    int guessed_species_id FK
  }

  evidence_family_cards {
    bigint id PK
    int species_id FK
    text family
    text observation_text
    text inference_text
    text trait_category
    text compare_tag
    text trait_phrase
    text bonus_fact_text
  }

  evidence_family_hints {
    bigint id PK
    int species_id FK
    text family
    smallint sequence_index
    text hint_text
    text weak_tag
  }

  species_deduction_profiles {
    int species_id PK_FK
    text_array habitat_tags
    text_array morphology_tags
    text signature_tag
  }

  run_memories {
    uuid id PK
    uuid run_id UK_FK
    uuid player_id FK
    int species_id FK
    jsonb route_polyline
    jsonb deduction_summary
    int final_score
  }
```

### ASCII overview

```text
profiles ──┬── player_game_sessions
           ├── player_stats
           ├── player_species_discoveries ── species
           ├── player_clue_unlocks ────────── species
           ├── species_cards / species_card_unlocks ── species
           └── eco_run_sessions ──┬── eco_run_nodes ──(empty) attempts / gis_samples
                                  └── run_memories ── species

species ──┬── iucn (iucn_id = id_no)           [ranges — spatial R]
          ├── species_deduction_profiles       [elimination tags]
          ├── evidence_family_cards            [v3 hard evidence]
          ├── evidence_family_hints            [v3 board hints]
          ├── species_deduction_clues          [legacy free-play deck]
          ├── species_facts / species_ecoregions
          └── species_combat_traits            [dead combat remnant]

eco_run_sessions.metadata ──► casePrivate | casePublic | evidenceApplications
                              (private answer never projected to client)
```

---

## 4. Utilization tiers

| Tier | Tables | Role during a played game |
|---|---|---|
| **A — every v3 mystery run** | `eco_run_sessions`, `eco_run_nodes`, `species`, `species_deduction_profiles`, `evidence_family_cards`, `evidence_family_hints`, `cascade_hints`, `iucn` + GIS schemas on map click | Core loop |
| **B — finish / resume / list** | `run_memories`, `profiles` | Recap & ownership |
| **C — auth rewards** | `player_species_discoveries`, `species_cards`, `species_card_unlocks`, optional `player_game_sessions` / `player_stats` | Discovery persistence |
| **D — map flavor** | `habitat_colormap`, rivers / PA / lakes / wetlands / bioregion | Node scoring & map UI (not board cells) |
| **E — legacy / unused this loop** | `evidence_cards`, `species_deduction_clues`, `species_combat_traits`, `eco_node_attempts` (0 rows), `eco_node_gis_samples` (0 rows), old metadata wallets | Database history only; no runtime mapping or route |

---

## 5. Hot-path tables and fields

### 5.1 Run engine (`public`)

#### `eco_run_sessions` — one expedition case

| Column | Type | Play use |
|---|---|---|
| `id` | uuid PK | Run id held by client |
| `player_id` | uuid → `profiles` | Clerk player; nullable guest |
| `game_session_id` | uuid → `player_game_sessions` | Optional outer session |
| `run_status` | text | `active` → terminal states |
| `run_seed` | bigint | Case RNG (private path) |
| `node_count_planned` | smallint | v3: 3 |
| `node_index_current` | smallint | Cursor |
| `selected_lng` / `selected_lat` | float8 | Map click |
| `selected_point` | geometry(Point,4326) | Spatial index |
| `selection_zoom` | numeric | UI context |
| `location_key` | text | Location identity |
| `realm` / `biome` / `bioregion` | text | GIS labels |
| `move_budget` / `moves_used` | int | Aggregate telemetry |
| `score_total` | int | Banked score |
| `species_discovered_count` | int | +1 on correct guess |
| `started_at` / `ended_at` | timestamptz | Lifecycle |
| **`metadata`** | **jsonb** | **Primary case store** |

##### `metadata` keys

The counts below are a historical 2026-07-11 inventory. Current v3 writes only the case snapshots,
GIS/resume data, `evidenceApplications`, guess metrics, and terminal summary.

| Key | n sessions | Role |
|---|---:|---|
| `activeAffinities` | 107 | Affinity set |
| `expeditionSnapshot` | 70 | Resume snapshot |
| `routePolyline` | 70 | Route |
| `habitats` / `rasterHabitats` | 70 | Habitat context |
| `featureFingerprints` | 70 | GIS fingerprints |
| `speciesIds` | 68 | Pool ids |
| `correctSpeciesId` | 68 | **Legacy** answer leak surface (old runs) |
| `resourceWallet` / `gemWallet` / `clueFragments` | legacy | Pre-013 wallets |
| `finalScore` / `deductionSummary` | ~25 | Terminal scoring |
| **`casePrivate`** | 2 | v3 answer id, family card/hint ids, private seed (server only) |
| **`casePublic`** | 2 | v3 candidate ids, public board seeds, map view |
| **`evidenceApplications`** | current | Three selected families and server-derived eliminations |

Older rows still carry `correctSpeciesId`, wallets, issued observations, and reasoning blobs. They are not parsed as resumable expeditions.

#### `eco_run_nodes` — evidence-family sites (3 per v3 run)

| Column | Type | Play use |
|---|---|---|
| `id` | uuid PK | Node id |
| `run_id` | uuid → sessions | Parent run |
| `node_order` | smallint | 1..n (unique with run) |
| `node_type` | text | GIS site type |
| `node_status` | text | `locked` / `active` / `completed` |
| `objective_type` | text | `evidence_family` |
| `objective_target` / `objective_progress` | int | Six-move segment progress |
| `move_budget` / `moves_used` | int | Per-board budget |
| `board_seed` | bigint | Deterministic board |
| `board_sampling_method` | text | GIS sample mode |
| `board_context` | jsonb | Obstacles / board setup |
| `hazard_profile` / `tool_profile` / `reward_profile` | jsonb | Sparse legacy profiles |
| `reward_claimed` | bool | Reward flag |
| `wager_tier` / `wager_result` | text | Legacy wager |
| `guessed_species_id` | int → species | Written on `/guess` |
| `guess_correct` | bool | Guess outcome |
| `score_earned` | int | Banked at evidence choice |
| `dominant_habitat` | text | Habitat label |
| `center_point` / `bbox` | geometry | Spatial context |
| `started_at` / `ended_at` / `created_at` / `updated_at` | timestamptz | Timing |

Live status mix: locked ~493 · active ~124 · completed ~335 (includes multi-node historical runs).

#### `run_memories` — post-run recap

| Column | Type | Play use |
|---|---|---|
| `id` | uuid PK | |
| `run_id` | uuid UK → sessions | One memory per run |
| `player_id` | uuid → profiles | Owner |
| `species_id` | int → species | Answer / solved species |
| `location_key` | text | Where |
| `start_lon` / `start_lat` | float8 | Start point |
| `route_polyline` / `route_bounds` | jsonb | Map recap |
| `nodes` | jsonb | Per-node summary |
| `gis_features_nearby` | jsonb | Fingerprints |
| `events_triggered` / `items_used` | jsonb | Legacy event log |
| `deduction_summary` | jsonb | Score breakdown |
| `final_score` | int | Terminal score |
| `realm` / `biome` / `bioregion` | text | Labels |
| `created_at` | timestamptz | |

#### Run scaffolding (catalog / unused)

| Table | Rows | Notes |
|---|---:|---|
| `eco_gis_layers` | 9 | Layer catalog (`layer_key`, decay, license) |
| `eco_node_attempts` | **0** | Attempt telemetry unused |
| `eco_node_gis_samples` | **0** | Per-node GIS samples unused |
| `eco_location_mastery` | 11 | Per-player location mastery; not v0 hot path |

---

### 5.2 Species content

#### `species` — curated game species (50)

| Group | Columns |
|---|---|
| Identity | `id`, `iucn_id` UK, `scientific_name`, `common_name` |
| Taxonomy | `kingdom`, `phylum`, `class`, `taxon_order`, `family`, `genus` |
| Conservation | `conservation_code`, `conservation_text` |
| Place tags | `realm`, `subrealm`, `biome`, `bioregion`, marine/terrestrial/freshwater |
| Dossier (legacy + album) | habitat / morphology / diet / behavior / life / key_fact / reproduction / threats |
| Meta | `created_at`, `updated_at` |

**Join to ranges:** `species.iucn_id = iucn.id_no` (never `iucn.ogc_fid` as app FK).

#### `iucn` — raw range import (103 polygons)

| Group | Columns |
|---|---|
| Keys | `ogc_fid` PK, `id_no` (IUCN species id) |
| Taxonomy | `sci_name`, kingdom…genus, `category` |
| Flags | marine, terrestria, freshwater, presence, seasonal, origin |
| Geometry | `wkb_geometry` (gist) |
| Import noise | compiler, citation, shape_leng/area, … |

**R only** for spatial APIs: at-point, in-radius, closest, protected-areas species join.

#### `species_deduction_profiles` (28)

| Columns | Role |
|---|---|
| `species_id` PK → species | |
| Tag arrays | `habitat_tags`, `morphology_tags`, `diet_tags`, `behavior_tags`, `reproduction_tags`, `taxonomy_tags`, `geography_tags`, `conservation_tags`, `key_fact_tags` (GIN) |
| `signature_tag` | Signature evidence |
| Notes | `*_note`, `reference_summary` |
| `created_at` / `updated_at` | |

**R** run create, `/api/species/profiles`, guess contrastive feedback.

#### v3 evidence-family corpus

`evidence_family_cards` stores one reviewed hard clue per species and family
(`relatives`, `body`, `behavior`, `habits`, `place`). Its runtime fields are `species_id`, `family`,
`observation_text`, `inference_text`, `trait_category`, `compare_tag`, `trait_phrase`, and
`bonus_fact_text`.

`evidence_family_hints` stores ordered weak hints per species/family. `cascade_hints` stores the
global ordered cascade-hint feed. Run creation snapshots only their private ids; progress and choice
routes hydrate public text server-side.

#### `evidence_cards` (42) — retired v1/v2 deck

| Column | Type | Role |
|---|---|---|
| `id` | bigint identity PK | Historical card id |
| `species_id` | int → species | Answer / pool species |
| `method` | text | `track\|observe\|listen\|survey\|analyze` |
| `observation_text` | text | Pre-commit player text |
| `inference_text` | text | Post-commit reveal |
| `trait_category` | text | 9 deduction categories |
| `primary_predicate` | text | Rule text |
| `compare_tags` | text[] | Atomic tag (cardinality 1) |
| `is_signature` | bool | Signature path |
| `specificity` | smallint 1–3 | Weight |
| `source` / `review_status` | text | Editorial |
| `created_at` | timestamptz | |

#### `species_deduction_clues` (371) — legacy

`id`, `species_id`, `category`, `label`, `compare_tags`, `reveal_order`, `unlock_mode`, `base_cost`, `is_filtering`.  
Older free-play / pre-compiler path. No v3 expedition route reads this table.

#### Supporting species tables

| Table | Rows | Play role |
|---|---:|---|
| `species_facts` | 218 | Album / unlock facts |
| `species_ecoregions` | 261 | Species ↔ bioregion overlap (`species_id`, `ecoregion_id` → `oneearth.oneearth_bioregion.ogc_fid`) |
| `species_combat_traits` | 22 | Combat remnant; not mystery loop |
| `conservation_statuses` | 9 | Lookup codes |

---

### 5.3 Map / GIS (read at click)

| Table | Fields that matter |
|---|---|
| `oneearth.oneearth_bioregion` | `ogc_fid`, `bioregion`, `realm`, `biome`/`sub_realm`, `eco_sym`, `wkb_geometry` |
| `oneearth.eco_sym_colors` | `eco_sym` → map color |
| `wpda.wdpa_polygons` | name, desig, `iucn_cat`, `geom` — PA pressure / nodes |
| `unesco.world_rivers` | `gid`, `river_map`, `geom` |
| `wwf.glwd_1` | lake ids/names + geom |
| `ramsar.wetland` | wetland polygons |
| `public.habitat_colormap` | raster `value` → habitat `label` |

Habitat **raster** pixels come from TiTiler/COG (not Postgres). Fingerprints often cite `unesco.world_rivers`, `wpda.wdpa_polygons`, `oneearth.oneearth_bioregion`.

---

### 5.4 Player / identity / rewards

| Table | When written/read |
|---|---|
| `profiles` | Clerk → `user_id`; run ownership |
| `player_game_sessions` | Optional outer session (`total_moves`, `total_score`, discoveries) |
| `player_species_discoveries` | First capture (`species_id`, `run_id`, score, found lon/lat/ecoregion) |
| `player_clue_unlocks` | Legacy per-clue unlocks |
| `player_stats` | Aggregates for dashboard |
| `species_cards` | TCG album on discover (`discovered`, `completion_pct`, unlocks jsonb) |
| `species_card_unlocks` | Unlock event log (`unlock_type`, `payload`) |
| `high_scores` | Leaderboard (peripheral) |

Guest runs may omit `player_id` and skip discovery/card writes.

---

## 6. Historical content snapshot (2026-07-11)

This predates the v3 evidence-family corpus; re-query before using it for capacity decisions.

| Entity | Count |
|---|---:|
| Species | 50 |
| Deduction profiles | 28 |
| Retired v1/v2 evidence cards | 42 |
| Deduction clues (legacy) | 371 |
| Run sessions | 183 (**2** with `casePrivate`/`casePublic`) |
| Run nodes | 952 |
| Run memories | 19 |
| Profiles | 4 |
| Discoveries | 25 |
| Species cards | 9 |

---

## 7. App code anchors

| Concern | Location |
|---|---|
| Schema | `src/db/schema/{game,player,species,gis}.ts` |
| Run create / case | `src/app/api/runs/route.ts`, `src/lib/caseCompilerV3.ts` |
| Projection (no private leak) | `src/lib/runProjection.ts` |
| Case state helpers | `src/lib/runCaseState.ts` |
| Evidence / guess | `src/app/api/runs/[runId]/evidence-progress`, `.../evidence-choice`, `.../guess` |
| Map at-point | `src/app/api/protected-areas/at-point`, `src/app/api/species/at-point` |
| Node generation | `src/lib/nodeScoring.ts` |
| Client run loop | `src/contexts/ExpeditionContext.tsx` |

---

## 8. Conventions

1. **One database** `phaser_june`; use `DATABASE_URL` + tunnel port **55432** for agents (not Windows 5433).
2. **IUCN ownership:** raw ranges stay on `iucn`; game FKs use `species.id`.
3. **Answer secrecy:** private case lives in `eco_run_sessions.metadata.casePrivate`; client projection must not spread metadata blindly.
4. **Do not** treat empty attempt/gis_sample tables as active telemetry without new writers.
5. After schema changes: re-introspect / update this doc date and counts via `postgres-tunnel` skill.

---

## 9. Re-dump query (read-only)

```sql
-- schemas + row counts
SELECT n.nspname, c.relname,
  (xpath('/row/c/text()',
    query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname),
      false, true, '')))[1]::text::bigint AS rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname IN ('public','oneearth','unesco','ramsar','wpda','wwf')
ORDER BY 1, 2;

-- session metadata key inventory
SELECT key, COUNT(*) AS n
FROM eco_run_sessions, LATERAL jsonb_object_keys(COALESCE(metadata, '{}'::jsonb)) AS key
GROUP BY key ORDER BY n DESC;
```
