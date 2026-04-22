# Species Table Simplification Plan

> Replaces the complex taxa.id migration in `SPECIES_ID_MIGRATION_PLAN.md`.
> That plan was overengineered for 22 species and 4 players.

## Problem

All game tables FK to `icaa.ogc_fid`, which is a serial PK assigned by ogr2ogr on shapefile import.
Reimporting the shapefile (even with the same data) reassigns `ogc_fid` values, breaking every FK in the game.

The stable IUCN identifier is `icaa.species_id` (maps to IUCN `id_no`), but it's stored as `numeric(65,30)` — not suitable as a FK target.

## Current State (2026-04-21)

| Table | species FK column | Rows |
|---|---|---|
| `icaa` | — (is the FK target) | 22 |
| `species_deduction_profiles` | `species_id → icaa.ogc_fid` | 22 |
| `species_deduction_clues` | `species_id → icaa.ogc_fid` | 341 |
| `player_species_discoveries` | `species_id → icaa.ogc_fid` | 21 |
| `player_clue_unlocks` | `species_id → icaa.ogc_fid` | 55 |
| `species_cards` | `species_id → icaa.ogc_fid` | 1 |
| `species_card_unlocks` | `species_id → icaa.ogc_fid` | 1 |
| `run_memories` | `species_id → icaa.ogc_fid` | ~1 with species |
| `eco_run_nodes` | `guessed_species_id → icaa.ogc_fid` | 0 with species |
| Players | — | 4 |

## Design

### Principle: keep `icaa` raw, add curated game tables

`icaa` = raw IUCN shapefile import. Never hand-edit it. It owns geometry + IUCN metadata.

New `species` table = curated game content. Stable PK. All game FKs point here.

Join for geometry: `species.iucn_id = icaa.species_id` (the stable IUCN `id_no`).

**Multi-row warning:** Current icaa has 1 row per species_id (22 unique). But IUCN range
shapefiles commonly have multiple polygons per species (subspecies, seasonal ranges, disjoint
populations). Future reimports may produce N rows per species_id. All geometry joins MUST use
`SELECT DISTINCT ON (s.id)` or aggregate with `ST_Union(i.wkb_geometry)` to avoid duplicating
species rows. If multi-polygon support becomes important, add a `species_ranges` view:

```sql
CREATE VIEW species_ranges AS
SELECT s.id AS species_id, ST_Union(i.wkb_geometry) AS geom
FROM species s JOIN icaa i ON i.species_id = s.iucn_id::numeric
GROUP BY s.id;
```

<!-- NOTE: game content columns (color_primary, diet_type, behavior_1, key_fact_1, etc.)
   were authored in ArcGIS Pro on the shapefile BEFORE import. They ended up in icaa
   because ogr2ogr imports ALL columns. The new species table is where this content
   should live going forward — icaa should only have IUCN-native fields. -->

### Table 1: `species`

Wide table. One row per game species. All single-valued content lives here.

```sql
CREATE TABLE species (
  id            SERIAL PRIMARY KEY,
  iucn_id       BIGINT NOT NULL UNIQUE,        -- stable IUCN id_no (from icaa.species_id)
  scientific_name TEXT NOT NULL,
  common_name     TEXT NOT NULL,

  -- taxonomy
  kingdom       TEXT,
  phylum        TEXT,
  class         TEXT,
  taxon_order   TEXT,
  family        TEXT,
  genus         TEXT,

  -- conservation
  conservation_code TEXT,                       -- 'VU', 'EN', 'CR', etc.
  conservation_text TEXT,

  -- biogeography
  realm         TEXT,
  subrealm      TEXT,
  biome         TEXT,
  bioregion     TEXT,
  habitat_description TEXT,
  habitat_tags  TEXT[],                         -- intentional denormalization: array of tags
  geographic_description TEXT,
  marine        BOOLEAN DEFAULT FALSE,
  terrestrial   BOOLEAN DEFAULT FALSE,
  freshwater    BOOLEAN DEFAULT FALSE,

  -- morphology (game-authored in ArcGIS Pro)
  color_primary   TEXT,
  color_secondary TEXT,
  pattern         TEXT,
  shape_description TEXT,
  size_min_cm     NUMERIC,
  size_max_cm     NUMERIC,
  weight_kg       NUMERIC,

  -- diet
  diet_type     TEXT,

  -- life history
  lifespan      NUMERIC,
  maturity      TEXT,
  reproduction_type TEXT,
  clutch_size   TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comment: iucn_id is the bridge to icaa geometry.
-- To get geometry: SELECT s.*, i.wkb_geometry FROM species s JOIN icaa i ON i.species_id = s.iucn_id::numeric
```

<!-- DENORMALIZATION NOTE: habitat_tags is stored as TEXT[] on the species row rather than
   normalized into species_facts. This is intentional — tags are used for array-overlap
   filtering in deduction queries (GIN-indexable) and are always read/written as a set,
   never individually. diet_type is also kept as a single column (it's a category label
   like 'herbivore', not a list). If you need per-item storage for these later, move them
   to species_facts rows with category='habitat_tag' or 'diet_type'. -->

### Table 2: `species_facts`

One table for all repeating text content. Category column replaces the old `key_fact_1/2/3`, `behavior_1/2`, `life_description_1/2`, `diet_prey`, `diet_flora`, `threats` pattern.

```sql
CREATE TABLE species_facts (
  id          SERIAL PRIMARY KEY,
  species_id  INTEGER NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,    -- 'key_fact', 'behavior', 'life_description', 'diet_prey', 'diet_flora', 'threat'
  fact_text   TEXT NOT NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 1,

  UNIQUE (species_id, category, sort_order)
);

CREATE INDEX ix_species_facts_species ON species_facts(species_id);
CREATE INDEX ix_species_facts_category ON species_facts(species_id, category);
```

<!-- NOTE: this replaces the 17-table taxa/* normalized schema which was absurd overkill
   for 22 species. A single facts table with a category column does the same job. -->

## Migration Steps

### Phase 1: Create new tables

```sql
-- 1a. Create species table
CREATE TABLE species ( ... );  -- as above

-- 1b. Create species_facts table
CREATE TABLE species_facts ( ... );  -- as above
```

### Phase 2: Seed from icaa_view

<!-- WHY icaa_view not raw icaa: the normalized taxon_* tables may have fixes that diverge
   from the raw shapefile import. Verified: ogc_fid=7 (Galapagos Giant Tortoise) has a
   behavior_1 text difference between icaa and icaa_view. Seeding from the view picks up
   any corrections applied through the normalized pipeline. -->

```sql
-- 2a. Verify parity first (should return 0 rows if data is in sync)
-- If rows appear, the view value is preferred (normalized pipeline is canonical for reads)
SELECT v.ogc_fid, 'behavior_1' AS field, i.behavior_1 AS icaa_val, v.behavior_1 AS view_val
FROM icaa i JOIN icaa_view v ON i.ogc_fid = v.ogc_fid
WHERE i.behavior_1 IS DISTINCT FROM v.behavior_1;
-- Known divergence: ogc_fid=7 behavior_1 text differs.

-- 2b. Seed species from icaa_view (22 rows)
-- Uses icaa_view for text content (canonical) but icaa.species_id for stable IUCN id
INSERT INTO species (
  iucn_id, scientific_name, common_name,
  kingdom, phylum, class, taxon_order, family, genus,
  conservation_code, conservation_text,
  realm, subrealm, biome, bioregion,
  habitat_description, habitat_tags, geographic_description,
  marine, terrestrial, freshwater,
  color_primary, color_secondary, pattern, shape_description,
  size_min_cm, size_max_cm, weight_kg,
  diet_type, lifespan, maturity, reproduction_type, clutch_size
)
SELECT
  v.species_id::bigint, v.scientific_name, v.common_name,
  v.kingdom, v.phylum, v.class, v.taxon_order, v.family, v.genus,
  v.conservation_code, v.conservation_text,
  v.realm, v.subrealm, v.biome, v.bioregion,
  v.habitat_description,
  string_to_array(v.habitat_tags, '; '),  -- TEXT → TEXT[] split
  v.geographic_description,
  COALESCE(v.marine, false), COALESCE(v.terrestrial, false), COALESCE(v.freshwater, false),
  v.color_primary, v.color_secondary, v.pattern, v.shape_description,
  v.size_min_cm, v.size_max_cm, v.weight_kg,
  v.diet_type, v.lifespan, v.maturity, v.reproduction_type, v.clutch_size
FROM icaa_view v;

-- 2c. Seed species_facts from icaa_view flat columns
WITH mapping AS (
  SELECT s.id AS sid, v.ogc_fid
  FROM species s
  JOIN icaa_view v ON v.species_id::bigint = s.iucn_id
)
INSERT INTO species_facts (species_id, category, fact_text, sort_order)
SELECT m.sid, f.category, f.fact_text, f.sort_order
FROM mapping m
JOIN icaa_view v ON v.ogc_fid = m.ogc_fid
CROSS JOIN LATERAL (
  VALUES
    ('key_fact',          v.key_fact_1,          1),
    ('key_fact',          v.key_fact_2,          2),
    ('key_fact',          v.key_fact_3,          3),
    ('behavior',          v.behavior_1,          1),
    ('behavior',          v.behavior_2,          2),
    ('life_description',  v.life_description_1,  1),
    ('life_description',  v.life_description_2,  2),
    ('diet_prey',         v.diet_prey,           1),
    ('diet_flora',        v.diet_flora,          1),
    ('threat',            v.threats,             1)
) AS f(category, fact_text, sort_order)
WHERE f.fact_text IS NOT NULL AND f.fact_text <> '';
```

### Phase 3: Repoint game FKs

For each table that currently FKs to `icaa.ogc_fid`, add a new column pointing to `species.id`,
backfill it, then drop the old column.

<!-- NOTE: with 22 species and <400 rows across all tables, this can be done in a single
   transaction. No need for CONCURRENTLY or NOT VALID patterns at this scale. -->

**Live FK constraints (verified from pg_constraint):**

| Table | Constraint name | ON DELETE | Column |
|---|---|---|---|
| `species_deduction_profiles` | `species_deduction_profiles_species_id_fkey` | CASCADE | `species_id` (PK) |
| `species_deduction_clues` | `species_deduction_clues_species_id_fkey` | CASCADE | `species_id` |
| `player_species_discoveries` | `fk_player_species_discoveries_species_id` | SET NULL | `species_id` |
| `player_clue_unlocks` | `fk_player_clue_unlocks_species_id` | SET NULL | `species_id` |
| `species_cards` | `species_cards_species_id_fkey` | CASCADE | `species_id` |
| `species_card_unlocks` | `species_card_unlocks_species_id_fkey` | CASCADE | `species_id` |
| `run_memories` | `run_memories_species_id_fkey` | SET NULL | `species_id` |
| `eco_run_nodes` | `eco_run_nodes_guessed_species_id_fkey` | SET NULL | `guessed_species_id` |

<!-- NOTE: player_species_discoveries and player_clue_unlocks use renamed fk_* constraint
   names and ON UPDATE CASCADE ON DELETE SET NULL, which differs from the Drizzle schema
   definitions. The live DB is authoritative. -->

**Full SQL — run as a single transaction:**

```sql
BEGIN;

-- Reusable mapping: old ogc_fid → new species.id
CREATE TEMP TABLE _fid_map ON COMMIT DROP AS
  SELECT i.ogc_fid AS old_fid, s.id AS new_id
  FROM icaa i JOIN species s ON i.species_id = s.iucn_id::numeric;

-- -----------------------------------------------------------------------
-- 1. species_deduction_profiles (PK swap, 22 rows)
-- -----------------------------------------------------------------------
ALTER TABLE species_deduction_profiles ADD COLUMN new_species_id INTEGER;
UPDATE species_deduction_profiles p SET new_species_id = m.new_id FROM _fid_map m WHERE p.species_id = m.old_fid;
ALTER TABLE species_deduction_profiles ALTER COLUMN new_species_id SET NOT NULL;

ALTER TABLE species_deduction_profiles DROP CONSTRAINT species_deduction_profiles_species_id_fkey;
ALTER TABLE species_deduction_profiles DROP CONSTRAINT species_deduction_profiles_pkey;
ALTER TABLE species_deduction_profiles DROP COLUMN species_id;
ALTER TABLE species_deduction_profiles RENAME COLUMN new_species_id TO species_id;
ALTER TABLE species_deduction_profiles ADD PRIMARY KEY (species_id);
ALTER TABLE species_deduction_profiles ADD CONSTRAINT species_deduction_profiles_species_id_fkey
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------
-- 2. species_deduction_clues (341 rows, unique + 2 indexes)
-- -----------------------------------------------------------------------
ALTER TABLE species_deduction_clues ADD COLUMN new_species_id INTEGER;
UPDATE species_deduction_clues c SET new_species_id = m.new_id FROM _fid_map m WHERE c.species_id = m.old_fid;
ALTER TABLE species_deduction_clues ALTER COLUMN new_species_id SET NOT NULL;

ALTER TABLE species_deduction_clues DROP CONSTRAINT species_deduction_clues_species_id_fkey;
DROP INDEX IF EXISTS uq_deduction_clues_species_cat_order;
DROP INDEX IF EXISTS ix_deduction_clues_species;
DROP INDEX IF EXISTS ix_deduction_clues_category;
ALTER TABLE species_deduction_clues DROP COLUMN species_id;
ALTER TABLE species_deduction_clues RENAME COLUMN new_species_id TO species_id;

ALTER TABLE species_deduction_clues ADD CONSTRAINT species_deduction_clues_species_id_fkey
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX uq_deduction_clues_species_cat_order ON species_deduction_clues(species_id, category, reveal_order);
CREATE INDEX ix_deduction_clues_species ON species_deduction_clues(species_id);
CREATE INDEX ix_deduction_clues_category ON species_deduction_clues(species_id, category);

-- -----------------------------------------------------------------------
-- 3. player_species_discoveries (21 rows, unique index)
--    Live FK: ON UPDATE CASCADE ON DELETE SET NULL
-- -----------------------------------------------------------------------
ALTER TABLE player_species_discoveries ADD COLUMN new_species_id INTEGER;
UPDATE player_species_discoveries p SET new_species_id = m.new_id FROM _fid_map m WHERE p.species_id = m.old_fid;
ALTER TABLE player_species_discoveries ALTER COLUMN new_species_id SET NOT NULL;

ALTER TABLE player_species_discoveries DROP CONSTRAINT fk_player_species_discoveries_species_id;
DROP INDEX IF EXISTS uq_player_species_discoveries_player_species;
ALTER TABLE player_species_discoveries DROP COLUMN species_id;
ALTER TABLE player_species_discoveries RENAME COLUMN new_species_id TO species_id;

ALTER TABLE player_species_discoveries ADD CONSTRAINT fk_player_species_discoveries_species_id
  FOREIGN KEY (species_id) REFERENCES species(id) ON UPDATE CASCADE ON DELETE SET NULL;
CREATE UNIQUE INDEX uq_player_species_discoveries_player_species ON player_species_discoveries(player_id, species_id);

-- -----------------------------------------------------------------------
-- 4. player_clue_unlocks (55 rows, unique index)
--    Live FK: ON UPDATE CASCADE ON DELETE SET NULL
-- -----------------------------------------------------------------------
ALTER TABLE player_clue_unlocks ADD COLUMN new_species_id INTEGER;
UPDATE player_clue_unlocks c SET new_species_id = m.new_id FROM _fid_map m WHERE c.species_id = m.old_fid;
ALTER TABLE player_clue_unlocks ALTER COLUMN new_species_id SET NOT NULL;

ALTER TABLE player_clue_unlocks DROP CONSTRAINT fk_player_clue_unlocks_species_id;
DROP INDEX IF EXISTS uq_player_clue_unlocks_player_species_category_field;
ALTER TABLE player_clue_unlocks DROP COLUMN species_id;
ALTER TABLE player_clue_unlocks RENAME COLUMN new_species_id TO species_id;

ALTER TABLE player_clue_unlocks ADD CONSTRAINT fk_player_clue_unlocks_species_id
  FOREIGN KEY (species_id) REFERENCES species(id) ON UPDATE CASCADE ON DELETE SET NULL;
CREATE UNIQUE INDEX uq_player_clue_unlocks_player_species_category_field
  ON player_clue_unlocks(player_id, species_id, clue_category, clue_field);

-- -----------------------------------------------------------------------
-- 5. species_cards (1 row, unique index)
-- -----------------------------------------------------------------------
ALTER TABLE species_cards ADD COLUMN new_species_id INTEGER;
UPDATE species_cards c SET new_species_id = m.new_id FROM _fid_map m WHERE c.species_id = m.old_fid;
ALTER TABLE species_cards ALTER COLUMN new_species_id SET NOT NULL;

ALTER TABLE species_cards DROP CONSTRAINT species_cards_species_id_fkey;
DROP INDEX IF EXISTS uq_species_cards_player_species;
ALTER TABLE species_cards DROP COLUMN species_id;
ALTER TABLE species_cards RENAME COLUMN new_species_id TO species_id;

ALTER TABLE species_cards ADD CONSTRAINT species_cards_species_id_fkey
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX uq_species_cards_player_species ON species_cards(player_id, species_id);

-- -----------------------------------------------------------------------
-- 6. species_card_unlocks (1 row, plain index)
-- -----------------------------------------------------------------------
ALTER TABLE species_card_unlocks ADD COLUMN new_species_id INTEGER;
UPDATE species_card_unlocks c SET new_species_id = m.new_id FROM _fid_map m WHERE c.species_id = m.old_fid;
ALTER TABLE species_card_unlocks ALTER COLUMN new_species_id SET NOT NULL;

ALTER TABLE species_card_unlocks DROP CONSTRAINT species_card_unlocks_species_id_fkey;
DROP INDEX IF EXISTS ix_species_card_unlocks_species;
ALTER TABLE species_card_unlocks DROP COLUMN species_id;
ALTER TABLE species_card_unlocks RENAME COLUMN new_species_id TO species_id;

ALTER TABLE species_card_unlocks ADD CONSTRAINT species_card_unlocks_species_id_fkey
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE;
CREATE INDEX ix_species_card_unlocks_species ON species_card_unlocks(species_id);

-- -----------------------------------------------------------------------
-- 7. run_memories (nullable species_id, plain index)
-- -----------------------------------------------------------------------
ALTER TABLE run_memories ADD COLUMN new_species_id INTEGER;
UPDATE run_memories r SET new_species_id = m.new_id FROM _fid_map m WHERE r.species_id = m.old_fid;
-- stays nullable (not all runs have a species)

ALTER TABLE run_memories DROP CONSTRAINT run_memories_species_id_fkey;
DROP INDEX IF EXISTS ix_run_memories_species;
ALTER TABLE run_memories DROP COLUMN species_id;
ALTER TABLE run_memories RENAME COLUMN new_species_id TO species_id;

ALTER TABLE run_memories ADD CONSTRAINT run_memories_species_id_fkey
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE SET NULL;
CREATE INDEX ix_run_memories_species ON run_memories(species_id);

-- -----------------------------------------------------------------------
-- 8. eco_run_nodes (nullable guessed_species_id, no species index)
-- -----------------------------------------------------------------------
ALTER TABLE eco_run_nodes ADD COLUMN new_guessed_species_id INTEGER;
UPDATE eco_run_nodes n SET new_guessed_species_id = m.new_id FROM _fid_map m WHERE n.guessed_species_id = m.old_fid;
-- stays nullable

ALTER TABLE eco_run_nodes DROP CONSTRAINT eco_run_nodes_guessed_species_id_fkey;
ALTER TABLE eco_run_nodes DROP COLUMN guessed_species_id;
ALTER TABLE eco_run_nodes RENAME COLUMN new_guessed_species_id TO guessed_species_id;

ALTER TABLE eco_run_nodes ADD CONSTRAINT eco_run_nodes_guessed_species_id_fkey
  FOREIGN KEY (guessed_species_id) REFERENCES species(id) ON DELETE SET NULL;

COMMIT;
```

### Phase 4: Update Drizzle schema + app code

1. **New schema file:** Add `src/db/schema/species-game.ts` (or inline in `species.ts`) with Drizzle definitions for `species` and `species_facts`.

2. **Update FK references:** In `species.ts`, `player.ts`, `game.ts` — change all `.references(() => icaa.ogcFid)` to `.references(() => species.id)`.

3. **Update API routes** that receive/send `speciesId`:
   - `src/pages/api/player/track.ts` — speciesId params are now `species.id`
   - `src/app/api/species/cards/[speciesId]/unlock/route.ts` — URL param is `species.id`
   - `src/app/api/runs/[runId]/route.ts` — body speciesId is `species.id`
   - `src/app/api/discoveries/migrate/route.ts` — needs mapping from old ogc_fid (localStorage) to `species.id`
   - `src/app/api/species/deduction/route.ts` — query params are `species.id`

4. **Update queries** in `src/lib/speciesQueries.ts` and `src/hooks/useSpeciesData.ts` to query `species` + `species_facts` instead of `icaa` for game content.

5. **Geometry joins:** Where geometry is needed, join `species.iucn_id = icaa.species_id::bigint`.

### Phase 5: Cleanup (optional, after migration verified)

**Must do BEFORE dropping icaa_view or taxa tables:**

The app currently depends on `icaa_view` at startup and in queries. These must be
repointed to the new `species` + `species_facts` tables first:

1. **`src/db/index.ts`** — Remove `ensureIcaaViewReady()`, the startup check block
   (lines 33-71), and its export. The `species` table is a real table, no view check needed.

2. **`src/lib/speciesQueries.ts`** — Currently imports `icaaView` and `ensureIcaaViewReady`
   from `@/db`. Rewrite all queries to use `species` + `species_facts` tables.

3. **10 API routes** that call `ensureIcaaViewReady` or query `icaaView`:
   - `src/app/api/species/at-point/route.ts`
   - `src/app/api/species/bioregions/route.ts`
   - `src/app/api/species/by-ids/route.ts`
   - `src/app/api/species/catalog/route.ts`
   - `src/app/api/species/closest/route.ts`
   - `src/app/api/species/in-radius/route.ts`
   - `src/app/api/species/random-names/route.ts`
   - `src/app/api/discoveries/migrate/route.ts`
   - `src/app/api/protected-areas/at-point/route.ts`
   - `src/lib/playerTracking.ts`

4. **`src/db/schema/index.ts`** — Remove taxa table exports (species.ts `icaaView` export,
   taxa.ts `*` exports). Remove `src/db/schema/taxa.ts` file entirely.

5. **`src/db/types.ts`** — Remove any `ICAAView` type alias if derived from icaaView.

**Then safe to drop from DB:**

- `DROP VIEW icaa_view;`
- Drop all 17 `taxa_*` / `taxon_*` tables and `source_datasets`
- Drop `src/db/migrations/004_*`, `005_*`, `006_*` normalized biodiversity SQL files (archive)
- Drop game-authored columns from `icaa` (color_primary, behavior_1, key_fact_1, etc.)
  and reimport a clean shapefile with only IUCN-native fields
- Archive `docs/SPECIES_ID_MIGRATION_PLAN.md`, `docs/NORMALIZED_BIODIVERSITY_SCHEMA.md`

## Post-Migration Architecture

```
species (id, iucn_id, ...)        ← all game FKs point here
  └── species_facts (species_id)  ← repeating text content
  └── species_deduction_profiles  ← comparative deduction tags
  └── species_deduction_clues     ← clue definitions
  └── player_species_discoveries  ← who found what
  └── player_clue_unlocks         ← which clues revealed
  └── species_cards               ← album/TCG cards
  └── species_card_unlocks        ← card unlock events
  └── run_memories                ← per-run snapshots
  └── eco_run_nodes               ← guessed_species_id

icaa (ogc_fid, species_id, wkb_geometry, ...)  ← raw IUCN import, geometry only
  joined via: species.iucn_id = icaa.species_id
```

## Why This Is Better

- **Stable IDs:** `species.id` is a serial we control. Reimporting icaa never breaks game FKs.
- **Simple:** 2 new tables vs the 17-table taxa/* schema. Appropriate for 22 species.
- **Clean separation:** `icaa` = raw science data + geometry. `species` = curated game content.
- **Beginner-friendly:** Wide table with obvious column names. No recursive CTEs, no lateral joins, no external-ID indirection.
- **Easy to grow:** Adding a species = INSERT into `species` + `species_facts`. No 17-table insert chain.
