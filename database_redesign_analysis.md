# Database Redesign Analysis Report
**Generated:** 2025-12-21
**Database:** Supabase PostgreSQL (PostGIS-enabled)
**Purpose:** Prepare for migration to new service with improved schema design

---

## Executive Summary

**Current State:**
- 11 application tables in `public` schema
- PostGIS 3.3.7 with heavy spatial data (IUCN species ranges, bioregion polygons)
- Player tracking system (sessions, discoveries, stats, clues)
- Minimal row counts (development/beta stage): 22 species, 3-5 active players
- RLS enabled on 6/11 tables
- 3 triggers, 1,253 functions in `public` (16 custom non-extension)
- 31 indexes (11 unused)

**Critical Issues:**
1. **Naming inconsistency:** mix of snake_case/PascalCase, column name clashes (`order_` reserved keyword workaround)
2. **Missing RLS:** `icaa` (species table) + geo tables have no RLS despite public reads
3. **Redundant indexes:** 3 separate GIST indexes on `icaa.wkb_geometry`
4. **Data type issues:** storing numeric data as TEXT (maturity, clutch_sz, repro_type), NUMERIC for integers
5. **Denormalization:** 60+ sparse columns in `icaa` table; JSONB aggregates in `player_stats` duplicate source data
6. **No foreign key validation:** `player_clue_unlocks.species_id → icaa.ogc_fid` references auto-increment PK instead of stable ID

---

## 1. Schema Structure Analysis

### 1.1 Core Tables

| Table | Rows | Size | Purpose | Issues |
|-------|------|------|---------|--------|
| **icaa** | 22 | 15MB | IUCN species ranges + metadata | 66 columns (40% nullable), geometry indexes x3, reserved keyword `order_`, inconsistent TEXT vs NUMERIC |
| **oneearth_bioregion** | 185 | 9.5MB | One Earth bioregion polygons | Duplicate geometry indexes, unused objectid columns |
| **spatial_ref_sys** | 8501 | 7MB | PostGIS system table | Heavy index usage (45k scans) |
| **player_stats** | 3 | 32KB | Aggregated player metrics | JSONB columns duplicate normalized data; no triggers to maintain consistency |
| **player_species_discoveries** | 20 | 120KB | Discovery events | No time_to_discover validation; foreign key cascade risk |
| **player_clue_unlocks** | 55 | 152KB | Individual clue reveals | Composite UNIQUE constraint fragile; discovery_id always NULL |
| **player_game_sessions** | 5 | 88KB | Game sessions | ended_at always NULL (sessions never closed) |
| **profiles** | 3 | 48KB | User profiles | username UNIQUE but nullable |
| **high_scores** | 5 | 64KB | Leaderboard | No FK to profiles; anon users allowed |
| **habitat_colormap** | 82 | 48KB | Raster pixel→label lookup | Good design; heavily scanned (3476 seq scans) |
| **mfd_meta** | 12 | 32KB | Unknown metadata store | UPPERCASE column names, no comments |

### 1.2 Views

| View | Type | Purpose | Performance |
|------|------|---------|-------------|
| **top_scores** | View | `LIMIT 100` leaderboard with row_number() | Built on high_scores; no materialization |
| **geometry_columns** | PostGIS system | — | — |
| **geography_columns** | PostGIS system | — | — |
| **raster_columns** | PostGIS system | — | — |
| **raster_overviews** | PostGIS system | — | — |

### 1.3 Materialized Views

| MatView | Purpose | Notes |
|--------|---------|-------|
| **player_leaderboard** | Cached leaderboard | Currently empty; ensure refresh strategy on migration |

---

## 2. Constraints & Relationships

### 2.1 Primary Keys
- ✅ All application tables have PKs
- ⚠️ `icaa.ogc_fid` is auto-increment INT (not stable across dumps/migrations)
- ⚠️ `profiles.user_id` references `auth.users(id)` (external Supabase Auth schema; migration challenge)

### 2.2 Foreign Keys

```
profiles.user_id → auth.users(id) ON DELETE CASCADE
player_stats.player_id → profiles(user_id) ON DELETE CASCADE
player_game_sessions.player_id → profiles(user_id) ON DELETE CASCADE
player_species_discoveries.player_id → profiles(user_id) ON DELETE CASCADE
player_species_discoveries.session_id → player_game_sessions(id) ON DELETE SET NULL
player_species_discoveries.species_id → icaa(ogc_fid) ON DELETE CASCADE
player_clue_unlocks.player_id → profiles(user_id) ON DELETE CASCADE
player_clue_unlocks.species_id → icaa(ogc_fid) ON DELETE CASCADE
player_clue_unlocks.discovery_id → player_species_discoveries(id) ON DELETE CASCADE
```

**Problems:**
1. **No FK from high_scores to profiles** → orphaned/inconsistent usernames
2. **Cascade delete from auth.users deletes all player data** → lose stats if user account deleted
3. **discovery_id FK exists but column always NULL** (100% null_frac) → dead constraint
4. **species_id uses auto-increment ogc_fid** → breaks on CSV reimport if IDs shift

### 2.3 UNIQUE Constraints

```sql
-- Good
profiles(username) UNIQUE
player_species_discoveries(player_id, species_id) UNIQUE  -- prevents duplicate discoveries

-- Fragile
player_clue_unlocks(player_id, species_id, clue_category, clue_field) UNIQUE
  -- 4-column composite; clue_category often duplicates clue_field (e.g., "diet_type"/"diet_type")
```

### 2.4 CHECK Constraints

```sql
-- Good
high_scores: score >= 0 AND score <= 999999
high_scores: username length 2-25
spatial_ref_sys: srid > 0 AND srid <= 998999

-- Missing
✗ No email format validation (profiles) -- optional; often better handled in app layer
✗ No positive integer checks (total_moves, total_score, clues_unlocked, etc.)
✗ No enum validation on text columns (diet_type, cons_code, etc. in icaa)
```

---

## 3. Index Analysis

### 3.1 Usage Stats (12mo equivalent)

| Index | Scans | Tup Read | Status |
|-------|-------|----------|--------|
| **spatial_ref_sys_pkey** | 45,845 | 9.6M | ✅ Critical (PostGIS lookups) |
| **icaa_pkey** | 25,981 | 29k | ✅ Heavy use |
| **idx_icaa_geometry** | 4,769 | 17k | ✅ Primary spatial index |
| **icaa_wkb_geometry_gix** | 725 | 3k | ⚠️ Redundant (2nd GIST on same column) |
| **icaa_wkb_geometry_geom_idx** | 263 | 769 | ⚠️ Redundant (3rd GIST!) |
| **profiles_pkey** | 572 | 173 | ✅ Auth lookups |
| **oneearth_bioregion_wkb_geometry_idx** | 116 | 2k | ✅ Used |
| **player_stats_pkey** | 120 | 98 | ✅ Stats reads |
| **idx_high_scores_score_desc** | 26 | 43 | ✅ Leaderboard queries |
| **idx_player_clue_unlocks_discovered** | 4 | 204 | ⚠️ Low use |
| **idx_player_clue_unlocks_category** | 0 | 0 | ❌ **UNUSED** |
| **idx_player_species_discoveries_discovered_at** | 0 | 0 | ❌ **UNUSED** |
| **idx_player_species_discoveries_species** | 0 | 0 | ❌ **UNUSED** |
| **profiles_username_key** | 0 | 0 | ❌ **UNUSED** (but needed for UNIQUE) |
| **player_clue_unlocks_pkey** | 0 | 0 | ⚠️ UUID PK never used (composite UNIQUE used instead) |

**Recommendations:**
- Index usage stats reset on restart; confirm with query logs or recent traffic before dropping
- Drop 2 redundant GIST indexes on `icaa.wkb_geometry` (keep `idx_icaa_geometry`)
- Drop 1 redundant GIST on `oneearth_bioregion` (keep `_idx` variant)
- Drop `idx_player_clue_unlocks_category` (low cardinality; seq scan faster)
- Evaluate `idx_player_species_discoveries_*` after production load

---

## 4. RLS (Row-Level Security)

### 4.1 Current Policies

| Table | RLS Enabled | Policies | Concerns |
|-------|-------------|----------|----------|
| **high_scores** | ✅ | `public` can SELECT/INSERT | ✅ Correct for anon leaderboard |
| **profiles** | ✅ | `auth.uid() = user_id` (SELECT/INSERT/UPDATE) | ✅ Users own their profile |
| **player_stats** | ✅ | `auth.uid() = player_id` | ✅ Stats privacy |
| **player_game_sessions** | ✅ | `auth.uid() = player_id` (S/I/U) | ✅ Session privacy |
| **player_species_discoveries** | ✅ | `auth.uid() = player_id` (S/I/U) | ✅ Discovery privacy |
| **player_clue_unlocks** | ✅ | `auth.uid() = player_id` (S/I) | ✅ Clue privacy; ⚠️ no UPDATE policy |
| **icaa** | ❌ | None | ⚠️ **Species data publicly readable without policy** |
| **oneearth_bioregion** | ❌ | None | ⚠️ **Geo data publicly readable** |
| **habitat_colormap** | ❌ | None | ✅ OK (lookup table) |
| **spatial_ref_sys** | ❌ | None | ✅ OK (PostGIS system) |
| **mfd_meta** | ❌ | None | ⚠️ Unknown; should have policy or be in private schema |

**Recommendations:**
1. Add `SELECT` policy for `public` role on `icaa`, `oneearth_bioregion` (explicit allow)
2. Add `UPDATE` policy to `player_clue_unlocks` (currently SELECT/INSERT only)
3. Move `mfd_meta` to private schema or add RLS

---

## 5. Data Quality Issues

### 5.1 Type Mismatches (icaa table)

| Column | Current Type | Actual Data | Should Be |
|--------|--------------|-------------|-----------|
| **maturity** | TEXT | "about two years", "18 months" | `INTERVAL` or `INT` (months) + TEXT description |
| **clutch_sz** | TEXT | "2-6 eggs", "10-30" | `INT4RANGE` or separate min/max INT columns |
| **repro_type** | TEXT | "oviparous", "Oviparous" | ENUM or normalized `reproduction_types` table |
| **lifespan** | NUMERIC(10,0) | 8, 15, 30 | `INT` (years) |
| **id_no** | NUMERIC(10,0) | Integer IDs | `INT` |
| **presence**, **origin**, **seasonal**, **yrcompiled**, **generalisd** | NUMERIC(10,0) | Integer codes | `INT` or ENUM |
| **diet_type** | VARCHAR | "insectivore", "Herbivore" | ENUM (inconsistent case) |
| **cons_code** / **category** | VARCHAR | "EN", "LC", "CR", "VU" | ENUM (IUCN Red List status) |
| **aquatic**, **terrestria**, **freshwater**, **marine** | VARCHAR | "true"/"false" | `BOOLEAN` |

### 5.2 Null Handling

```
icaa.citation: 50% NULL  → missing attribution for half of species
icaa.source: 54.5% NULL  → unknown data provenance
icaa.island: 9% NULL
icaa.subspecies: 9% NULL
icaa.discovery_id in player_clue_unlocks: 100% NULL  → dead column/FK
player_game_sessions.ended_at: 100% NULL  → sessions never closed
player_stats: many aggregate fields NULL (fastest_discovery_clues, favorite_clue_category, etc.)
```

### 5.3 Naming Issues

1. **Reserved keyword:** `icaa.order_` (underscore suffix workaround for SQL `ORDER`)
2. **Inconsistent casing:** `mfd_meta.OBJ`/`PROP`/`VAL` (UPPERCASE) vs snake_case elsewhere
3. **Abbreviations:** `icaa`, `ogc_fid`, `wkb_geometry`, `sci_name`, `comm_name`, `cons_code`
4. **Ambiguous:** `player_stats.species_by_order` (taxonomy or discovery order?)

---

## 6. Triggers & Functions

### 6.1 Triggers

```sql
-- player_clue_unlocks: on INSERT → update_player_stats_on_clue_unlock()
-- player_species_discoveries: on INSERT → update_player_stats_on_discovery()
-- profiles: on UPDATE → handle_updated_at()
```

**Issues:**
- No trigger to update `player_stats` when discoveries/clues are DELETED
- No trigger to close `player_game_sessions.ended_at`
- `update_player_stats_*` functions compute aggregates in JSONB → risk of drift from source tables

### 6.2 Functions (public schema)

Public schema contains 1,253 functions total (mostly PostGIS); 16 appear custom (non-extension). Key custom functions visible:
- `update_player_stats_on_clue_unlock()`
- `update_player_stats_on_discovery()`
- `handle_updated_at()`
- Likely many Supabase RPC endpoints (e.g., `get_species_at_location()`, `get_top_scores()`)

**Recommendation:** Audit functions for:
- Duplicate logic (DRY violations)
- N+1 query patterns
- Missing SECURITY DEFINER/INVOKER declarations
- Unused functions (check `pg_stat_user_functions`)

---

## 7. Performance Observations

### 7.1 Table Scan Patterns

| Table | Sequential Scans | Index Scans | Ratio | Assessment |
|-------|------------------|-------------|-------|------------|
| **icaa** | 3,635 | 31,738 | 1:8.7 | ⚠️ High seq scans (wide table, many columns) |
| **habitat_colormap** | 3,476 | 31 | 112:1 | ⚠️ **Seq scan heavy** (but tiny table, OK) |
| **oneearth_bioregion** | 95 | 141 | 1:1.5 | ✅ Balanced |
| **player_game_sessions** | 256 | 56 | 4.6:1 | ⚠️ Sessions scanned frequently; add index on `(player_id, started_at DESC)` |
| **player_species_discoveries** | 135 | 65 | 2:1 | ⚠️ Discovery history queries inefficient |

### 7.2 Write Patterns

```
icaa: 3 deletes, 102 updates, 23 inserts  → observed updates; could be imports/cleanup, treat as mutable
player_stats: 75 updates vs 3 inserts  → heavy aggregate recomputation
player_game_sessions: 70 updates, 53 inserts  → sessions updated but never ended
```

---

## 8. Migration Challenges

### 8.1 Supabase-Specific Dependencies

1. **auth.users schema:** All FK chains depend on `profiles.user_id → auth.users(id)`
   - **Solution:** Create local `users` table; migrate auth data; update FKs
2. **RLS with auth.uid():** Policies call `auth.uid()` function
   - **Solution:** Recreate function in target DB or refactor to app-level auth
3. **extensions:** postgis, pg_graphql, supabase_vault, uuid-ossp
   - **Solution:** Install postgis + uuid-ossp on target; remove Supabase-specific extensions
4. **storage/realtime schemas:** Not used in application tables but may exist
   - **Solution:** Exclude from dump

### 8.2 Data Integrity Risks

1. **icaa.ogc_fid auto-increment:** Can change if you re-import without preserving IDs or rebuild from source
   - **Solution:** Add `iucn_id_no` as stable natural key; migrate FKs
2. **Geometry SRIDs:** Ensure target DB has matching spatial_ref_sys entries
3. **JSONB aggregates in player_stats:** May drift from source; verify before migration
4. **discovery_id NULL FK:** Drop constraint before migration

---

## 9. Redesign Recommendations

### 9.1 Normalization

**Split `icaa` into:**
```
species (core taxonomy + stable ID)
  - species_id (UUID or stable INT)
  - scientific_name
  - common_name
  - class, order, family, genus
  - iucn_category ENUM
  - iucn_id_no (natural key)

species_ranges (geometry)
  - id
  - species_id FK
  - wkb_geometry
  - presence, origin, seasonal (ENUMs)
  - realm, subrealm, biome, bioregion FKs

species_traits (morphology, diet, behavior)
  - species_id FK
  - diet_type ENUM
  - size_min_cm, size_max_cm INT
  - weight_kg NUMERIC
  - lifespan_years INT
  - maturity_months INT
  - reproductive_type ENUM
  - clutch_size_range INT4RANGE

species_descriptions (text blobs)
  - species_id FK
  - habitat_description TEXT
  - geographic_description TEXT
  - behavior_1 TEXT
  - life_cycle_desc TEXT
  - key_facts TEXT[]
  - threats TEXT
  - conservation_notes TEXT
```

**Benefits:**
- Separate frequently queried columns (taxonomy, name, status) from large TEXT blobs
- Easier to query/filter on traits without scanning 60-column table
- Geometry in dedicated table → faster spatial joins
- Type safety (ENUM, INT4RANGE)

### 9.2 Rename for Consistency

```
icaa → species (or species_ranges if keeping flat structure)
player_stats → player_statistics
player_clue_unlocks → clue_reveals or player_clues
player_species_discoveries → species_discoveries
player_game_sessions → game_sessions
profiles → user_profiles
high_scores → leaderboard_entries
mfd_meta → metadata (or clarify purpose)
```

**Column renames:**
```
icaa.order_ → taxonomic_order
icaa.ogc_fid → range_id (or drop; use species_id)
icaa.sci_name → scientific_name
icaa.comm_name → common_name
icaa.cons_code → iucn_status
icaa.terrestria → is_terrestrial
profiles.user_id → id (if not referencing auth.users)
```

### 9.3 Add Missing Constraints

```sql
ALTER TABLE user_profiles
  ADD CONSTRAINT username_not_null CHECK (username IS NOT NULL),
  -- Optional: keep strict email validation in the app; if in DB, use a loose check
  ADD CONSTRAINT email_format CHECK (email IS NULL OR email ~* '^[^@]+@[^@]+\.[^@]+$');

ALTER TABLE game_sessions
  ADD CONSTRAINT ended_after_started CHECK (ended_at IS NULL OR ended_at >= started_at);

ALTER TABLE species_discoveries
  ADD CONSTRAINT positive_score CHECK (score_earned >= 0),
  ADD CONSTRAINT positive_clues CHECK (clues_unlocked_before_guess >= 0);

-- Add FK from leaderboard_entries to user_profiles (allow NULL for anon)
ALTER TABLE leaderboard_entries
  ADD COLUMN user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
```

### 9.4 Partitioning (Future Scale)

If player base grows:
```sql
-- Partition game_sessions by started_at month
CREATE TABLE game_sessions (
  id UUID NOT NULL,
  player_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ...
  PRIMARY KEY (id, started_at)
) PARTITION BY RANGE (started_at);

-- Partition species_discoveries by discovered_at month
```

### 9.5 Audit/Timestamps

Add to all tables:
```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- Trigger: UPDATE updated_at = now() ON UPDATE
```

Current state:
- ✅ profiles, player_stats, player_game_sessions, player_species_discoveries, player_clue_unlocks have created_at
- ⚠️ icaa, oneearth_bioregion, high_scores missing timestamps
- ✅ profiles has updated_at trigger

---

## 10. Security Hardening

### 10.1 RLS Best Practices

```sql
-- Explicit public read access
ALTER TABLE species ENABLE ROW LEVEL SECURITY;
ALTER TABLE bioregions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "species_public_read" ON species FOR SELECT TO public USING (true);
CREATE POLICY "bioregions_public_read" ON bioregions FOR SELECT TO public USING (true);

-- Prevent DELETE on player data (soft delete instead)
ALTER TABLE species_discoveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discoveries_no_delete" ON species_discoveries FOR DELETE TO authenticated
  USING (false);  -- Force soft delete via updated_at/deleted_at column
```

### 10.2 Least Privilege

```sql
-- Create read-only role for analytics
CREATE ROLE analytics_reader;
GRANT CONNECT ON DATABASE your_db TO analytics_reader;
GRANT USAGE ON SCHEMA public TO analytics_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_reader;

-- Revoke default public schema access
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```

---

## 11. Migration Checklist

### Pre-Migration
- [ ] Export current schema (`pg_dump --schema-only`)
- [ ] Export data (`pg_dump --data-only --column-inserts`)
- [ ] Document all RPC functions + clients calling them
- [ ] Audit unused indexes/columns
- [ ] Backup production data (if any)

### Schema Redesign
- [ ] Create normalized `species_*` tables
- [ ] Add stable `species_id` (UUID or iucn_id_no)
- [ ] Convert TEXT booleans → BOOLEAN
- [ ] Convert NUMERIC integers → INT
- [ ] Create ENUMs (iucn_status, diet_type, reproductive_type, etc.)
- [ ] Rename tables/columns for consistency
- [ ] Add missing CHECK constraints
- [ ] Drop unused indexes
- [ ] Add composite indexes for common queries

### Data Migration
- [ ] Write transformation scripts (TEXT→ENUM, VARCHAR→BOOLEAN, etc.)
- [ ] Migrate `auth.users` → local `users` table
- [ ] Update FKs to use stable `species_id`
- [ ] Verify JSONB aggregates in `player_stats` match source
- [ ] Close open `game_sessions` (set ended_at)
- [ ] Drop `discovery_id` column from `player_clue_unlocks`

### Testing
- [ ] Run full test suite against migrated schema
- [ ] Verify spatial queries return same results
- [ ] Check RLS policies work without auth.uid()
- [ ] Performance test critical queries (species lookup, leaderboard, player stats)

### Deployment
- [ ] Deploy new schema to staging
- [ ] Recreate RPC functions
- [ ] Update client code (API calls, column names)
- [ ] Run migration on production
- [ ] Monitor query performance (enable pg_stat_statements)

---

## 12. Query Suggestions for AI Redesign

When providing this report to an AI for schema redesign, also share:

1. **Sample queries your app runs frequently:**
   ```sql
   -- Example: Get species at clicked location
   SELECT * FROM icaa WHERE ST_Intersects(wkb_geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326));

   -- Example: Get player stats
   SELECT * FROM player_stats WHERE player_id = $1;

   -- Example: Get top 100 scores
   SELECT * FROM top_scores;
   ```

2. **Expected scale (next 1-2 years):**
   - Number of species: 22 → ? (hundreds? thousands?)
   - Number of players: 3 → ? (hundreds? millions?)
   - Number of discoveries per player: avg 6 → ?
   - Game sessions per day: ?

3. **Read/write ratio:**
   - Species data: mostly read (static reference) or frequent updates?
   - Player data: heavy writes during gameplay?
   - Leaderboard: real-time updates or cached?

4. **Target database platform:**
   - Staying on PostgreSQL? (If yes, keep PostGIS)
   - Moving to MySQL, CockroachDB, Planetscale? (geometry handling changes)
   - Cloud provider: AWS RDS, GCP CloudSQL, Supabase, self-hosted?

---

## Appendix: Raw Schema Metrics

**Tables:** 11
**Views:** 5 (4 PostGIS system views + `top_scores`)
**Materialized Views:** 1 (`player_leaderboard`)
**Total Size:** ~32MB (mostly geometry indexes)
**Columns:** 260 total (66 in icaa alone)
**Indexes:** 31 (11 unused, 3 redundant)
**Constraints:** 27 (10 PK, 10 FK, 4 UNIQUE, 3 CHECK)
**RLS Policies:** 16 (across 6 tables)
**Triggers:** 3
**Functions (public):** 1,253 total (16 custom non-extension)
**Extensions:** postgis, postgis_raster, uuid-ossp, pgcrypto, pg_stat_statements, pg_graphql, supabase_vault
**Enums:** None in public schema (all auth/realtime/storage)
**Sequences:** 2 (icaa_ogc_fid_seq, oneearth_bioregion_ogc_fid_seq)

---

## Appendix: Custom Functions (public, non-extension)

| Function | Args | Language | Volatility | Security | Trigger Usage |
|---------|------|----------|------------|----------|---------------|
| **debug_heatmap_function** | lon double precision, lat double precision | plpgsql | VOLATILE | INVOKER | — |
| **ensure_player_stats_exists** | p_player_id uuid | plpgsql | VOLATILE | DEFINER | — |
| **find_nearest_habitats** | lon double precision, lat double precision, limit_count integer | plpgsql | VOLATILE | INVOKER | — |
| **get_closest_habitat** | lon double precision, lat double precision | plpgsql | VOLATILE | INVOKER | — |
| **get_nearest_habitat_points** | lon double precision, lat double precision, max_distance_km double precision, grid_size_km double precision | plpgsql | VOLATILE | INVOKER | — |
| **get_species_at_point** | lon double precision, lat double precision | plpgsql | VOLATILE | INVOKER | — |
| **get_species_bioregion** | species_id integer | plpgsql | VOLATILE | INVOKER | — |
| **get_species_bioregions** | species_ids integer[] | plpgsql | VOLATILE | INVOKER | — |
| **get_species_in_radius** | lon double precision, lat double precision, radius_m double precision | plpgsql | VOLATILE | DEFINER | — |
| **handle_new_user** | — | plpgsql | VOLATILE | DEFINER | — |
| **handle_updated_at** | — | plpgsql | VOLATILE | INVOKER | `profiles.on_profiles_updated` |
| **query_location_simple** | lon double precision, lat double precision | plpgsql | VOLATILE | DEFINER | — |
| **refresh_player_leaderboard** | — | plpgsql | VOLATILE | DEFINER | — |
| **test_simple_heatmap** | lon double precision, lat double precision | plpgsql | VOLATILE | INVOKER | — |
| **update_player_stats_on_clue_unlock** | — | plpgsql | VOLATILE | DEFINER | `player_clue_unlocks.on_clue_unlock_created` |
| **update_player_stats_on_discovery** | — | plpgsql | VOLATILE | DEFINER | `player_species_discoveries.on_species_discovery_created` |

---

**End of Report**

Next steps: Share this document with AI + your specific requirements (scale, target platform, critical queries) for detailed schema redesign + migration SQL scripts.
