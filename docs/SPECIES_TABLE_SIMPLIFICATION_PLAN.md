# Species Table Simplification — Completed 2026-04-22

> Replaced the complex taxa.id migration in `SPECIES_ID_MIGRATION_PLAN.md`.
> All phases completed; committed across two commits on `refactor/frontend-work`.

## Problem (solved)

All game tables FKd to `icaa.ogc_fid`, a serial PK assigned by ogr2ogr on shapefile import.
Reimporting the shapefile reassigned `ogc_fid` values, breaking every FK.

Solution: new `species` table with a stable serial PK. All game FKs now point to `species.id`.
Geometry joins via: `species.iucn_id = icaa.species_id::bigint`.

## Final Architecture

```
species (id, iucn_id, ...)        ← all game FKs point here (stable)
  └── species_facts (species_id)  ← created; populated by app as needed
  └── species_deduction_profiles  ← species_id → species.id
  └── species_deduction_clues     ← species_id → species.id
  └── player_species_discoveries  ← species_id → species.id
  └── player_clue_unlocks         ← species_id → species.id
  └── species_cards               ← species_id → species.id
  └── species_card_unlocks        ← species_id → species.id
  └── run_memories                ← species_id → species.id (nullable)
  └── eco_run_nodes               ← guessed_species_id → species.id (nullable)

iucn (ogc_fid, id_no, sci_name, wkb_geometry, ...)  ← raw IUCN shapefile import, source-owned field names
  joined via: species.iucn_id = iucn.id_no::numeric
```

## What Was Done

### Phase 1 — Create tables ✓

`species` and `species_facts` tables created (see migration 013 for DDL).

**Divergence from plan:** `species` table retains flat fact columns
(`behavior_1/2`, `key_fact_1/2/3`, `life_description_1/2`, `diet_prey`, `diet_flora`,
`threats`, `taxonomic_comment`, `distribution_comment`, `lifespan`, `maturity`,
`reproduction_type`, `clutch_size`) rather than moving them to `species_facts`.
`species_facts` exists for future use; the flat columns are the live data store.

### Phase 2 — Seed from iucn ✓

Seeded directly from `iucn` (then named `icaa` — view was already
scheduled for deletion and content was equivalent). 22 rows inserted.

`habitat_tags` converted from semicolon-delimited text to `TEXT[]` via `string_to_array`.

`species_facts` not seeded — repeating content lives as flat columns on `species` for now.

### Phase 3 — Repoint game FKs ✓

All 8 FK relationships migrated from `icaa.ogc_fid` to `species.id` via temp table bridge:
`icaa.species_id::bigint = species.iucn_id`. Applied live one statement at a time via MCP tool.

### Phase 4 — Update Drizzle schema + app code ✓

- `src/db/schema/taxa.ts` deleted (403 lines, 17 tables)
- `src/db/schema/species.ts`: `icaaView` pgView removed; `icaa` trimmed to IUCN-native fields only; fact columns added to `speciesTable`
- `src/db/schema/index.ts`: removed taxa export
- `src/lib/speciesQueries.ts`: all queries use `speciesTable`; `speciesColumns` includes all 57 fields
- `src/lib/drizzleToSnake.ts`: new utility converts Drizzle camelCase rows to snake_case for API responses (digit boundary fix: `behavior1` → `behavior_1`)
- 15+ components/hooks: all `.ogc_fid` references changed to `.id`
- `src/game/scenes/Game.ts`: 15+ `.ogc_fid` → `.id`
- `src/game/clueConfig.ts`, `src/expedition/affinities.ts`: removed `species.aquatic` refs
- `src/components/CesiumMap.tsx`: GeoJSON property key `ogc_fid` → `species_id`; removed aquatic refs
- `src/app/api/species/at-point/route.ts`, `in-radius/route.ts`: switched to `s.*` for full column coverage
- `src/app/api/species/closest/route.ts`: fixed DISTINCT ON with subquery (inner dedupes per species, outer picks globally closest)
- `src/app/api/discoveries/migrate/route.ts`: accepts localStorage entries marked with `idSource: 'species.id'` only. Legacy `ogc_fid` bridging was removed because `ogc_fid` is reassigned by raw IUCN reimports and can silently map old clients to the wrong species.

### Phase 5 — Cleanup ✓

DB:
- `DROP VIEW icaa_view CASCADE`
- Dropped 17 taxa/taxon tables + `source_datasets`
- Dropped 30 game-authored columns from `icaa` (color_primary, behavior_1, key_fact_1, etc.)

Code:
- `src/db/types.ts`: removed `ICAAView` type
- `src/types/database.ts`: removed `Views.icaa_view`; renamed `Tables.icaa` → `Tables.species`
- `docs/NORMALIZED_BIODIVERSITY_SCHEMA.md` archived to `docs/archive/`

Migration recorded in `src/db/migrations/013_species_table_simplification.sql`.

### Phase 6 — Rename icaa → iucn ✓

Corrected the raw source table name from `icaa` (mistaken) to `iucn` (International Union for
Conservation of Nature). Raw IUCN shapefile field names restored on the table. App-authored
columns (`common_name`, `iucn_url`, `aquatic`, `shape_length_alt`) dropped from raw table.

- DB: `icaa` → `iucn`; columns: `species_id` → `id_no`, `scientific_name` → `sci_name`,
  `taxonomic_comment` → `tax_comm`, `taxon_order` → `order_`, `year_compiled` → `yrcompiled`,
  `generalised` → `generalisd`, `shape_length` → `shape_leng`, `terrestrial` → `terrestria`
- Code: Drizzle schema, all SQL JOINs, type exports updated
- Migration: `014_rename_icaa_to_iucn.sql`

## Multi-Row Warning

IUCN range shapefiles commonly have multiple polygons per species (subspecies, seasonal ranges).
Current iucn table has 1 row per id_no but future reimports may not. All geometry joins use
`DISTINCT ON (s.id)` to prevent row duplication. If multi-polygon support is needed:

```sql
CREATE VIEW species_ranges AS
SELECT s.id AS species_id, ST_Union(i.wkb_geometry) AS geom
FROM species s JOIN iucn i ON i.id_no = s.iucn_id::numeric
GROUP BY s.id;
```
