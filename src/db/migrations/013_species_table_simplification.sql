-- Species Table Simplification Migration
-- Creates stable species + species_facts tables, repoints all game FKs from
-- the raw IUCN range table's ogc_fid to species.id.
-- See docs/SPECIES_TABLE_SIMPLIFICATION_PLAN.md for full context.
--
-- FRESH-ENVIRONMENT PREREQUISITES:
--   The raw IUCN range shapefile must be imported before running this migration.
--   Preferred setup: import shapefile into a table named "iucn" with raw IUCN field names
--   (id_no, sci_name, order_, terrestria, generalisd, shape_leng, etc.).
--   If the table was imported as "icaa" with old app-shaped column names, run this migration
--   first, then run 014_rename_icaa_to_iucn.sql (idempotent) to rename/fix column names.
--
-- NOTE: Originally applied via MCP tool on 2026-04-22. Recorded here for reproducibility.

-- =====================================================================
-- Phase 1: Create new tables
-- =====================================================================

CREATE TABLE IF NOT EXISTS species (
  id              SERIAL PRIMARY KEY,
  iucn_id         BIGINT NOT NULL UNIQUE,
  scientific_name TEXT NOT NULL,
  common_name     TEXT NOT NULL,
  kingdom         TEXT,
  phylum          TEXT,
  class           TEXT,
  taxon_order     TEXT,
  family          TEXT,
  genus           TEXT,
  conservation_code TEXT,
  conservation_text TEXT,
  realm           TEXT,
  subrealm        TEXT,
  biome           TEXT,
  bioregion       TEXT,
  habitat_description TEXT,
  habitat_tags    TEXT[],
  geographic_description TEXT,
  marine          BOOLEAN DEFAULT FALSE,
  terrestrial     BOOLEAN DEFAULT FALSE,
  freshwater      BOOLEAN DEFAULT FALSE,
  color_primary   TEXT,
  color_secondary TEXT,
  pattern         TEXT,
  shape_description TEXT,
  size_min_cm     NUMERIC,
  size_max_cm     NUMERIC,
  weight_kg       NUMERIC,
  diet_type       TEXT,
  diet_prey       TEXT,
  diet_flora      TEXT,
  behavior_1      TEXT,
  behavior_2      TEXT,
  life_description_1 TEXT,
  life_description_2 TEXT,
  key_fact_1      TEXT,
  key_fact_2      TEXT,
  key_fact_3      TEXT,
  threats         TEXT,
  taxonomic_comment TEXT,
  distribution_comment TEXT,
  lifespan        NUMERIC,
  maturity        TEXT,
  reproduction_type TEXT,
  clutch_size     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS species_facts (
  id          SERIAL PRIMARY KEY,
  species_id  INTEGER NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  fact_text   TEXT NOT NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (species_id, category, sort_order)
);
CREATE INDEX IF NOT EXISTS ix_species_facts_species ON species_facts(species_id);
CREATE INDEX IF NOT EXISTS ix_species_facts_category ON species_facts(species_id, category);

-- =====================================================================
-- Phase 2: Seed species from raw IUCN table (only if species table is empty)
-- Handles two states:
--   "iucn" table with raw field names (preferred fresh-env setup, post-014)
--   "icaa" table with old app-shaped column names (legacy; run 014 after this)
-- Only the iucn_id and raw taxonomy/habitat flags come from the source table.
-- App-authored fields (conservation_code, realm, bioregion, etc.) stay NULL here;
-- they are populated separately by the app or manual data entry.
-- =====================================================================

DO $$
BEGIN
  -- Skip entirely if species already seeded
  IF EXISTS (SELECT 1 FROM species LIMIT 1) THEN
    RAISE NOTICE 'species table already seeded — skipping Phase 2';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'iucn') THEN
    -- Fresh env: raw IUCN field names
    -- iucn may have multiple rows per id_no (multiple range polygons: subspecies, seasonal ranges).
    -- GROUP BY id_no dedupes to one species row. Taxonomy fields are consistent per id_no (MAX is safe).
    -- Boolean flags use BOOL_OR: species is marine/terrestrial/freshwater if ANY range row says so.
    RAISE NOTICE 'Seeding species from iucn table (raw IUCN field names)';
    INSERT INTO species (iucn_id, scientific_name, common_name, kingdom, phylum, class, taxon_order, family, genus, marine, terrestrial, freshwater)
    SELECT
      i.id_no::bigint,
      MAX(i.sci_name),
      MAX(i.sci_name),  -- no common_name in raw IUCN; use sci_name as placeholder
      MAX(i.kingdom), MAX(i.phylum), MAX(i.class), MAX(i.order_), MAX(i.family), MAX(i.genus),
      COALESCE(BOOL_OR(i.marine), false),
      COALESCE(BOOL_OR(i.terrestria), false),  -- terrestria is the raw IUCN field name for terrestrial
      COALESCE(BOOL_OR(i.freshwater), false)
    FROM iucn i
    GROUP BY i.id_no;
  ELSIF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'icaa') THEN
    -- Legacy: old app-shaped column names (pre-014 rename)
    RAISE NOTICE 'Seeding species from icaa table (old app-shaped column names)';
    INSERT INTO species (
      iucn_id, scientific_name, common_name,
      kingdom, phylum, class, taxon_order, family, genus,
      conservation_code, conservation_text,
      realm, subrealm, biome, bioregion,
      habitat_description, habitat_tags, geographic_description,
      marine, terrestrial, freshwater,
      color_primary, color_secondary, pattern, shape_description,
      size_min_cm, size_max_cm, weight_kg,
      diet_type, diet_prey, diet_flora,
      behavior_1, behavior_2,
      life_description_1, life_description_2,
      key_fact_1, key_fact_2, key_fact_3,
      threats, taxonomic_comment, distribution_comment,
      lifespan, maturity, reproduction_type, clutch_size
    )
    -- DISTINCT ON species_id guards against duplicate species_id rows in icaa
    -- (unique constraint was optional in old import pipeline).
    SELECT DISTINCT ON (i.species_id)
      i.species_id::bigint, i.scientific_name, i.common_name,
      i.kingdom, i.phylum, i.class, i.taxon_order, i.family, i.genus,
      i.conservation_code, i.conservation_text,
      i.realm, i.subrealm, i.biome, i.bioregion,
      i.habitat_description,
      string_to_array(i.habitat_tags, '; '),
      i.geographic_description,
      COALESCE(i.marine, false), COALESCE(i.terrestrial, false), COALESCE(i.freshwater, false),
      i.color_primary, i.color_secondary, i.pattern, i.shape_description,
      i.size_min_cm, i.size_max_cm, i.weight_kg,
      i.diet_type, i.diet_prey, i.diet_flora,
      i.behavior_1, i.behavior_2,
      i.life_description_1, i.life_description_2,
      i.key_fact_1, i.key_fact_2, i.key_fact_3,
      i.threats, i.taxonomic_comment, i.distribution_comment,
      i.lifespan, i.maturity, i.reproduction_type, i.clutch_size
    FROM icaa i
    ORDER BY i.species_id;
  ELSE
    RAISE EXCEPTION 'Neither iucn nor icaa table found. Import the IUCN range shapefile before running this migration.';
  END IF;
END $$;

-- =====================================================================
-- Phase 3: Repoint game FKs (raw_table.ogc_fid -> species.id)
-- Mapping: raw_table.id_no::bigint = species.iucn_id  (or species_id in old icaa)
-- Each table: drop raw-table FK, rewrite old raw ids in-place to species.id via bridge,
-- then add a new FK to species(id). In-place rewrite preserves PKs and indexes.
-- =====================================================================

-- Build a bridge from the raw import row id used by old game FKs to the new
-- stable species.id. This migration may run before or after the raw table is
-- renamed from icaa -> iucn, so both raw table shapes are supported.
CREATE TEMP TABLE IF NOT EXISTS _species_id_bridge (
  old_raw_id integer PRIMARY KEY,
  species_id integer NOT NULL REFERENCES species(id)
) ON COMMIT DROP;

DO $$
BEGIN
  TRUNCATE _species_id_bridge;

  IF to_regclass('public.iucn') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'iucn' AND column_name = 'id_no'
     ) THEN
    INSERT INTO _species_id_bridge (old_raw_id, species_id)
    SELECT DISTINCT ON (i.ogc_fid) i.ogc_fid, s.id
    FROM iucn i
    JOIN species s ON s.iucn_id = i.id_no::bigint
    WHERE i.ogc_fid IS NOT NULL
      AND i.id_no IS NOT NULL
    ORDER BY i.ogc_fid, s.id
    ON CONFLICT (old_raw_id) DO NOTHING;
  ELSIF to_regclass('public.icaa') IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'icaa' AND column_name = 'species_id'
        ) THEN
    INSERT INTO _species_id_bridge (old_raw_id, species_id)
    SELECT DISTINCT ON (i.ogc_fid) i.ogc_fid, s.id
    FROM icaa i
    JOIN species s ON s.iucn_id = i.species_id::bigint
    WHERE i.ogc_fid IS NOT NULL
      AND i.species_id IS NOT NULL
    ORDER BY i.ogc_fid, s.id
    ON CONFLICT (old_raw_id) DO NOTHING;
  ELSE
    RAISE EXCEPTION 'Cannot build raw-to-species bridge: expected iucn.id_no or icaa.species_id';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM _species_id_bridge LIMIT 1) THEN
    RAISE EXCEPTION 'Raw-to-species bridge is empty; cannot repoint game FKs safely';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION _repoint_raw_species_fk(
  target_table regclass,
  target_column name,
  column_required boolean,
  on_delete_action text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  target_attnum smallint;
  constraint_name name;
  missing_count integer;
  fk_sql text;
BEGIN
  IF target_table IS NULL THEN
    RAISE NOTICE 'Skipping %.%: table not found', target_table, target_column;
    RETURN;
  END IF;

  SELECT attnum INTO target_attnum
  FROM pg_attribute
  WHERE attrelid = target_table
    AND attname = target_column
    AND NOT attisdropped;

  IF target_attnum IS NULL THEN
    RAISE NOTICE 'Skipping %.%: column not found', target_table, target_column;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid = target_table
      AND conkey = ARRAY[target_attnum]
      AND confrelid = 'species'::regclass
  ) THEN
    RAISE NOTICE 'Skipping %.%: already references species(id)', target_table, target_column;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid = target_table
      AND conkey = ARRAY[target_attnum]
      AND confrelid IN (
        COALESCE(to_regclass('public.icaa'), 'species'::regclass),
        COALESCE(to_regclass('public.iucn'), 'species'::regclass)
      )
  ) THEN
    RAISE NOTICE 'Skipping %.%: no raw-table FK found to repoint', target_table, target_column;
    RETURN;
  END IF;

  EXECUTE format(
    'SELECT COUNT(*) FROM %s t LEFT JOIN _species_id_bridge b ON b.old_raw_id = t.%I WHERE t.%I IS NOT NULL AND b.species_id IS NULL',
    target_table,
    target_column,
    target_column
  ) INTO missing_count;

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Cannot repoint %.%: % non-null raw ids have no species bridge',
      target_table, target_column, missing_count;
  END IF;

  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid = target_table
      AND conkey = ARRAY[target_attnum]
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', target_table, constraint_name);
  END LOOP;

  EXECUTE format(
    'UPDATE %s t SET %I = b.species_id FROM _species_id_bridge b WHERE t.%I = b.old_raw_id',
    target_table,
    target_column,
    target_column
  );

  IF column_required THEN
    EXECUTE format('ALTER TABLE %s ALTER COLUMN %I SET NOT NULL', target_table, target_column);
  END IF;

  fk_sql := format(
    'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES species(id)',
    target_table,
    'fk_' || replace(target_table::text, '.', '_') || '_' || target_column || '_species',
    target_column
  );

  IF on_delete_action IS NOT NULL AND btrim(on_delete_action) <> '' THEN
    fk_sql := fk_sql || ' ON DELETE ' || on_delete_action;
  END IF;

  EXECUTE fk_sql;
  RAISE NOTICE 'Repointed %.% to species(id)', target_table, target_column;
END $$;

SELECT _repoint_raw_species_fk(to_regclass('public.player_species_discoveries'), 'species_id', true, NULL);
SELECT _repoint_raw_species_fk(to_regclass('public.player_clue_unlocks'), 'species_id', true, NULL);
SELECT _repoint_raw_species_fk(to_regclass('public.eco_run_nodes'), 'guessed_species_id', false, 'SET NULL');
SELECT _repoint_raw_species_fk(to_regclass('public.species_cards'), 'species_id', true, 'CASCADE');
SELECT _repoint_raw_species_fk(to_regclass('public.run_memories'), 'species_id', false, 'SET NULL');
SELECT _repoint_raw_species_fk(to_regclass('public.species_card_unlocks'), 'species_id', true, 'CASCADE');
SELECT _repoint_raw_species_fk(to_regclass('public.species_deduction_profiles'), 'species_id', true, 'CASCADE');
SELECT _repoint_raw_species_fk(to_regclass('public.species_deduction_clues'), 'species_id', true, 'CASCADE');

DROP FUNCTION _repoint_raw_species_fk(regclass, name, boolean, text);

-- =====================================================================
-- Phase 5: Cleanup — drop obsolete objects
-- =====================================================================

DROP VIEW IF EXISTS icaa_view CASCADE;
DROP VIEW IF EXISTS taxa_taxonomy_view CASCADE;
DROP TABLE IF EXISTS taxa CASCADE;
DROP TABLE IF EXISTS taxon_behaviors CASCADE;
DROP TABLE IF EXISTS taxon_bioregions CASCADE;
DROP TABLE IF EXISTS taxon_common_names CASCADE;
DROP TABLE IF EXISTS taxon_conservation_assessments CASCADE;
DROP TABLE IF EXISTS taxon_diet_items CASCADE;
DROP TABLE IF EXISTS taxon_external_ids CASCADE;
DROP TABLE IF EXISTS taxon_habitat_tags CASCADE;
DROP TABLE IF EXISTS taxon_key_facts CASCADE;
DROP TABLE IF EXISTS taxon_life_descriptions CASCADE;
DROP TABLE IF EXISTS taxon_name_usages CASCADE;
DROP TABLE IF EXISTS taxon_names CASCADE;
DROP TABLE IF EXISTS taxon_profiles CASCADE;
DROP TABLE IF EXISTS taxon_ranges CASCADE;
DROP TABLE IF EXISTS taxon_threats CASCADE;
DROP TABLE IF EXISTS source_datasets CASCADE;

-- Drop game-authored columns from the raw IUCN table (now on species table).
-- Works against either "icaa" (pre-014) or "iucn" (post-014 or fresh env).
-- On a fresh env where these columns never existed, DROP IF EXISTS is a no-op.
DO $$
DECLARE
  tbl text;
  col text;
  game_cols text[] := ARRAY[
    'conservation_code','conservation_text','threats','habitat_description',
    'habitat_tags','geographic_description','distribution_comment',
    'bioregion','realm','subrealm','biome',
    'color_primary','color_secondary','pattern','shape_description',
    'size_min_cm','size_max_cm','weight_kg',
    'diet_type','diet_prey','diet_flora',
    'behavior_1','behavior_2',
    'life_description_1','life_description_2',
    'key_fact_1','key_fact_2','key_fact_3',
    'lifespan','maturity','reproduction_type','clutch_size'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'iucn') THEN
    tbl := 'iucn';
  ELSIF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'icaa') THEN
    tbl := 'icaa';
  ELSE
    RAISE NOTICE 'Neither iucn nor icaa found — skipping game column drops';
    RETURN;
  END IF;
  FOREACH col IN ARRAY game_cols LOOP
    EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS %I', tbl, col);
  END LOOP;
  RAISE NOTICE 'Dropped game-authored columns from %', tbl;
END $$;
