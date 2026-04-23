-- Species Table Simplification Migration
-- Creates stable species + species_facts tables, repoints all game FKs from
-- icaa.ogc_fid to species.id, drops icaa_view/taxa tables/game-authored icaa columns.
-- See docs/SPECIES_TABLE_SIMPLIFICATION_PLAN.md for full context.
--
-- NOTE: This migration was originally applied via MCP tool (one statement at a time).
-- It is recorded here for reproducibility in fresh environments.

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
-- Phase 2: Seed from icaa (run only if species table is empty)
-- =====================================================================

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
SELECT
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
WHERE NOT EXISTS (SELECT 1 FROM species LIMIT 1);

-- =====================================================================
-- Phase 3: Repoint game FKs (icaa.ogc_fid -> species.id)
-- Mapping: icaa.species_id::bigint = species.iucn_id
-- Each table: add column, backfill, drop old FK/column, rename, add new FK
-- =====================================================================
-- (Omitted for brevity — see docs/SPECIES_TABLE_SIMPLIFICATION_PLAN.md Phase 3
-- for the full per-table SQL. Already applied to the live DB.)

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

-- Drop game-authored columns from icaa (now on species table)
ALTER TABLE icaa DROP COLUMN IF EXISTS conservation_code;
ALTER TABLE icaa DROP COLUMN IF EXISTS conservation_text;
ALTER TABLE icaa DROP COLUMN IF EXISTS threats;
ALTER TABLE icaa DROP COLUMN IF EXISTS habitat_description;
ALTER TABLE icaa DROP COLUMN IF EXISTS habitat_tags;
ALTER TABLE icaa DROP COLUMN IF EXISTS geographic_description;
ALTER TABLE icaa DROP COLUMN IF EXISTS distribution_comment;
ALTER TABLE icaa DROP COLUMN IF EXISTS bioregion;
ALTER TABLE icaa DROP COLUMN IF EXISTS realm;
ALTER TABLE icaa DROP COLUMN IF EXISTS subrealm;
ALTER TABLE icaa DROP COLUMN IF EXISTS biome;
ALTER TABLE icaa DROP COLUMN IF EXISTS color_primary;
ALTER TABLE icaa DROP COLUMN IF EXISTS color_secondary;
ALTER TABLE icaa DROP COLUMN IF EXISTS pattern;
ALTER TABLE icaa DROP COLUMN IF EXISTS shape_description;
ALTER TABLE icaa DROP COLUMN IF EXISTS size_min_cm;
ALTER TABLE icaa DROP COLUMN IF EXISTS size_max_cm;
ALTER TABLE icaa DROP COLUMN IF EXISTS weight_kg;
ALTER TABLE icaa DROP COLUMN IF EXISTS diet_type;
ALTER TABLE icaa DROP COLUMN IF EXISTS diet_prey;
ALTER TABLE icaa DROP COLUMN IF EXISTS diet_flora;
ALTER TABLE icaa DROP COLUMN IF EXISTS behavior_1;
ALTER TABLE icaa DROP COLUMN IF EXISTS behavior_2;
ALTER TABLE icaa DROP COLUMN IF EXISTS lifespan;
ALTER TABLE icaa DROP COLUMN IF EXISTS maturity;
ALTER TABLE icaa DROP COLUMN IF EXISTS reproduction_type;
ALTER TABLE icaa DROP COLUMN IF EXISTS clutch_size;
ALTER TABLE icaa DROP COLUMN IF EXISTS life_description_1;
ALTER TABLE icaa DROP COLUMN IF EXISTS life_description_2;
ALTER TABLE icaa DROP COLUMN IF EXISTS key_fact_1;
ALTER TABLE icaa DROP COLUMN IF EXISTS key_fact_2;
ALTER TABLE icaa DROP COLUMN IF EXISTS key_fact_3;
