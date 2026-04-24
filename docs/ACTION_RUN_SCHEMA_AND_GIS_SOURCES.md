# Action Run Schema + GIS Source Map

Current schema + GIS reference for expedition generation. The database and signal-key sections describe current runtime contracts; some challenge and upgrade ideas below are still forward-looking design notes.

Related migration: `src/db/migrations/007_action_run_loop_schema.sql`
Related migration: `src/db/migrations/008_protected_planet_parcels.sql`

## Core Data Flow

1. Player clicks map location -> expedition briefing overlay appears (dismissible; player can close and click elsewhere). On "Start Expedition" -> create `eco_run_sessions`.
2. Route generator creates 6 nodes -> insert `eco_run_nodes`.
3. For each node, sample GIS layers -> insert `eco_node_gis_samples`.
4. Node play results -> write `eco_node_attempts`.
5. Species/clue outcomes remain in existing tables, now linked via `run_id` / `run_node_id`.
6. Roll up long-term progression by area in `eco_location_mastery`.

## Node Mechanics -> Signal Keys

Use these `signal_key` values in `eco_node_gis_samples` so gameplay logic stays consistent.

- `riverbank_sweep`: `water_ratio`, `wetland_ratio`, `flow_direction`
- `dense_canopy`: `tree_cover_ratio`, `canopy_density`, `habitat_forest_ratio`
- `urban_fringe`: `built_up_ratio`, `human_pressure_index`, `night_lights_mean`
- `elevation_ridge`: `elevation_mean_m`, `slope_mean_deg`, `ruggedness_index`
- `storm_window`: `rainfall_anomaly`, `cloud_fraction`, `wind_speed_ms`
- `analysis`: no unique terrain signal; uses aggregate confidence from prior nodes

## Recommended GIS Layers

These are practical, globally available options to represent the signal keys above.

- Existing in your stack:
  - IUCN Habitat raster COG (already queried via TiTiler): dominant habitat proportions.
  - One Earth bioregions (already in DB): realm/biome/bioregion context.
  - IUCN species polygons (already in DB as `iucn` table): species presence and discovery validation.

- Add next for strong emergent variation:
  - JRC Global Surface Water (water seasonality/occurrence): `water_ratio`, `wetland_ratio`
    - https://global-surface-water.appspot.com/
  - Copernicus DEM GLO-30 (elevation/slope): `elevation_mean_m`, `slope_mean_deg`
    - https://doi.org/10.5270/ESA-c5d3d65
  - GHSL Built-Up / Settlement layers (urban pressure): `built_up_ratio`
    - https://ghsl.jrc.ec.europa.eu/
  - HydroRIVERS (vector river network): `flow_direction`, river proximity
    - https://www.hydrosheds.org/products/hydrorivers

- Optional climate overlays for time-modified nodes:
  - ERA5-Land (weather/reanalysis): `rainfall_anomaly`, `wind_speed_ms`
    - https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land
  - WorldClim (baseline climate normals): biome/climate envelopes
    - https://www.worldclim.org/data/index.html

## Layer-to-Node Taxonomy

4 node families scored per click. Families are a **selection layer** — they map to the persisted `node_type` enum.

| Layer group | Source | Node family | Variant keys |
|---|---|---|---|
| Bioregion | One Earth bioregions, FEOW | `bioregion_node` | `realm`, `biome`, `bioregion` |
| Protected area | WDPA / WD-OECM (Protected Planet v4) | `protected_node` | `site_type`, `designation_name`, `iucn_category_name`, `governance_subtype` |
| Community conserved | WDPA `governance_subtype` proxy (MVP) | `community_node` | `governance_type`, `recognition_status`, `management_context` |
| Water | HydroRIVERS, HydroLAKES, Marine Regions, JRC GSW | `water_node` | `river`, `lake`, `coastal`, `marine`, `wetland` |

### Node Family → node_type Mapping

Families don't go in the DB `node_type` column. They resolve to existing enum values:

- `water_node:river` → `riverbank_sweep`
- `bioregion_node:tropical_forest` → `dense_canopy`
- `bioregion_node:urban` → `urban_fringe`
- `bioregion_node:montane` → `elevation_ridge`
- `water_node:storm` → `storm_window`
- `protected_node:*` / `community_node:*` → `custom` (detail in JSONB fields)

### Challenge Mapping

- `bioregion_node`:
  - tropical forest → overgrowth + low visibility
  - dry shrubland → heat + fragile clues
  - montane → slope friction + path constraints
- `protected_node`:
  - strict category + high overlap → stealth / low-disturbance route
  - multiple designation overlap → permit/patrol timing challenge
  - OECM → co-management objective variant
- `community_node`:
  - community conserved overlap → protocol/consent challenge
  - shared governance area → collaboration objective
  - customary-use context → stewardship challenge
- `water_node`:
  - nearest river → `raft` tool challenge
  - lake overlap → `boat_lake` tool challenge
  - coastal/marine overlap → `boat_ocean` tool challenge
  - wetland dominance → traversal penalty + amphibious modifier

### Community Data Ethics Rule

Do not generate gameplay from "tribe type" labels.
Use governance and management context fields only. Treat unknown/absent community data as unknown.

## Proximity Scoring (Deterministic Node Selection)

For each layer candidate near the clicked point:

1. Compute `overlap_ratio` = `intersection_area_m2 / square_area_m2` (100x100m = 10000)
2. Compute `nearest_distance_m` from clicked point to nearest feature
   - **Must use `::geography` cast** for meter-accurate distance
3. Compute score:
   - Polygon layers: `score = 0.7 * overlap_ratio + 0.3 * exp(-nearest_distance_m / 500)`
   - Line layers (rivers): `score = exp(-nearest_distance_m / 500)` (overlap_ratio = 0)

Selection:

- Highest score = primary node family
- Second-highest (above threshold 0.1) = modifier node

Persist to `eco_node_gis_samples`:

- `signal_key`: e.g. `wdpa_overlap_ratio`, `river_distance_m`, `icca_overlap_ratio`
- `signal_value_numeric`: computed value
- `signal_payload`: feature identifiers used in scoring

## Board Economy Snapshot

### Gem families

- The board now uses **8 action gems** plus **8 rarer loot gems**.
- GIS generation returns `action_bias`, which weights action-gem spawning per expedition.
- Loot-gem frequency is controlled separately by node board config (`lootChance`), not by `action_bias`.
- Action gems drive node objectives and most run-side effects.
- Loot gems award clue fragments by category during expeditions.

### Action gems

- `sword` → Observe
- `staff` → Scan
- `shield` → Camouflage
- `key` → Traverse
- `crate` → Backpack
- `power` → Focus
- `thought` → Field Notes
- `multiplier` → Burst

### Loot gems

- `red` → classification
- `green` → habitat
- `blue` → geographic
- `orange` → morphology
- `yellow` → behavior
- `black` → life_cycle
- `white` → conservation
- `purple` → key_facts

### Wallet + crate effects

- The expedition wallet still tracks `gold`, `power`, `thought`, and `dust`.
- Crate action-gem matches can also roll consumables such as Signal Flare, Bait, Trail Map, and Field Kit.

## Mission Node JSON Contract

Target response from `/api/protected-areas/at-point`:

```json
{
  "mission_seed": 123456789,
  "query": { "lon": -60.12, "lat": -3.45, "square_size_m": 100 },
  "signals": {
    "wdpa_overlap_ratio": 0.42,
    "icca_overlap_ratio": 0.11,
    "river_distance_m": 84,
    "water_ratio": 0.31,
    "forest_ratio": 0.55,
    "urban_ratio": 0.0
  },
  "primary_node_family": "water_node",
  "primary_variant": "river",
  "modifier_nodes": ["protected_node:strict_pa", "bioregion_node:tropical_forest"],
  "action_bias": {
    "shield": 0.22,
    "power": 0.18,
    "staff": 0.16,
    "crate": 0.12,
    "thought": 0.10,
    "key": 0.08,
    "sword": 0.08,
    "multiplier": 0.06
  },
  "generated_nodes": [...],
  "protected_areas": [...],
  "threatened_species": [...],
  "habitat_mix": [...]
}
```

## Sampling Strategy (MVP -> V2)

- MVP: center-point sampling per board cell (`board_sampling_method = 'center_point'`).
- V2: majority/zonal statistics over each board cell (`'majority'` or `'zonal_stats'`).

For reproducibility, persist:

- `eco_run_nodes.board_seed`
- `eco_run_nodes.board_context` (6×8 cell summary)
- `eco_node_gis_samples` records for each signal used

## Minimal Seed Rows for `eco_gis_layers`

Seed these first so node sampling has stable IDs:

- `iucn_habitat`
- `oneearth_bioregion`
- `jrc_surface_water`
- `cop_dem_glo30`
- `ghsl_built_up`
- `hydrorivers`

You can keep `enabled = false` for layers not wired yet and still preserve schema stability.

## New Runtime Endpoint

`GET /api/protected-areas/at-point?lon={lon}&lat={lat}&size=100`

Returns:

- intersecting protected/conserved area parcels (`protected_planet_parcels`)
- intersecting threatened species from `species` (via `iucn` geometry join)
- habitat composition in a 100x100m square (TiTiler stats)
- derived signals and generated roguelike node suggestions

Expected prerequisite:

- `protected_planet_parcels` is populated from Protected Planet v4 parcel API data.
