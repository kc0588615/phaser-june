-- Rename raw species range table from icaa to iucn
-- Corrects the table name to reflect the actual data source:
-- International Union for Conservation of Nature (IUCN) range shapefiles.
-- Restores raw IUCN field names; drops app-authored columns that now live on species.
--
-- NOTE: Applied live via MCP tool on 2026-04-22. Recorded here for fresh-env reproducibility.
-- This file is IDEMPOTENT: safe to run against either pre-rename (icaa) or post-rename (iucn) state.
-- On a fresh environment where the shapefile was imported directly as "iucn" with raw field names,
-- all DO blocks will detect the already-correct state and skip gracefully.

-- Step 1: Rename table (skip if already named iucn)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'icaa') THEN
    ALTER TABLE icaa RENAME TO iucn;
    RAISE NOTICE 'Renamed table icaa -> iucn';
  ELSE
    RAISE NOTICE 'Table icaa not found (already iucn or fresh env) — skipping table rename';
  END IF;
END $$;

-- Step 2: Rename sequence (skip if already renamed)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'icaa_ogc_fid_seq') THEN
    ALTER SEQUENCE icaa_ogc_fid_seq RENAME TO iucn_ogc_fid_seq;
    RAISE NOTICE 'Renamed sequence icaa_ogc_fid_seq -> iucn_ogc_fid_seq';
  ELSE
    RAISE NOTICE 'Sequence icaa_ogc_fid_seq not found — skipping';
  END IF;
END $$;

-- Step 3: Rename primary key index (skip if already renamed)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'icaa_pkey') THEN
    ALTER INDEX icaa_pkey RENAME TO iucn_pkey;
    RAISE NOTICE 'Renamed index icaa_pkey -> iucn_pkey';
  ELSE
    RAISE NOTICE 'Index icaa_pkey not found — skipping';
  END IF;
END $$;

-- Step 4: Rename geometry index (skip if already renamed)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ix_icaa_wkb_geometry') THEN
    ALTER INDEX ix_icaa_wkb_geometry RENAME TO ix_iucn_wkb_geometry;
    RAISE NOTICE 'Renamed index ix_icaa_wkb_geometry -> ix_iucn_wkb_geometry';
  ELSE
    RAISE NOTICE 'Index ix_icaa_wkb_geometry not found — skipping';
  END IF;
END $$;

-- Step 5: Column renames — each guarded by checking current column name existence
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'iucn' AND column_name = 'species_id') THEN
    ALTER TABLE iucn RENAME COLUMN species_id TO id_no;
    RAISE NOTICE 'Renamed column species_id -> id_no';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'iucn' AND column_name = 'scientific_name') THEN
    ALTER TABLE iucn RENAME COLUMN scientific_name TO sci_name;
    RAISE NOTICE 'Renamed column scientific_name -> sci_name';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'iucn' AND column_name = 'taxonomic_comment') THEN
    ALTER TABLE iucn RENAME COLUMN taxonomic_comment TO tax_comm;
    RAISE NOTICE 'Renamed column taxonomic_comment -> tax_comm';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'iucn' AND column_name = 'taxon_order') THEN
    ALTER TABLE iucn RENAME COLUMN taxon_order TO order_;
    RAISE NOTICE 'Renamed column taxon_order -> order_';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'iucn' AND column_name = 'year_compiled') THEN
    ALTER TABLE iucn RENAME COLUMN year_compiled TO yrcompiled;
    RAISE NOTICE 'Renamed column year_compiled -> yrcompiled';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'iucn' AND column_name = 'generalised') THEN
    ALTER TABLE iucn RENAME COLUMN generalised TO generalisd;
    RAISE NOTICE 'Renamed column generalised -> generalisd';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'iucn' AND column_name = 'shape_length') THEN
    ALTER TABLE iucn RENAME COLUMN shape_length TO shape_leng;
    RAISE NOTICE 'Renamed column shape_length -> shape_leng';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'iucn' AND column_name = 'terrestrial') THEN
    ALTER TABLE iucn RENAME COLUMN terrestrial TO terrestria;
    RAISE NOTICE 'Renamed column terrestrial -> terrestria';
  END IF;
END $$;

-- Step 6: Drop app-authored columns (not present in raw IUCN shapefile; live on species table)
-- Guarded: only runs if iucn table exists; skip-graceful if neither table present.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'iucn') THEN
    ALTER TABLE iucn DROP COLUMN IF EXISTS common_name;
    ALTER TABLE iucn DROP COLUMN IF EXISTS iucn_url;
    ALTER TABLE iucn DROP COLUMN IF EXISTS aquatic;
    ALTER TABLE iucn DROP COLUMN IF EXISTS shape_length_alt;
    RAISE NOTICE 'Dropped app-authored columns from iucn';
  ELSE
    RAISE NOTICE 'iucn table not found — skipping app column drops';
  END IF;
END $$;

-- Spatial join pattern after this migration:
--   SELECT s.*, i.wkb_geometry
--   FROM species s
--   JOIN iucn i ON i.id_no = s.iucn_id::numeric
