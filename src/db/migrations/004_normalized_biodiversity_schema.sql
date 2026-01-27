-- Normalized biodiversity schema (strict 3NF, multi-source ready)

BEGIN;

-- Reference datasets/sources
CREATE TABLE IF NOT EXISTS source_datasets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  version text,
  doi text,
  license text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

-- Taxon names (strings) with rank context
CREATE TABLE IF NOT EXISTS taxon_names (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scientific_name text NOT NULL,
  authorship text,
  rank text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scientific_name, rank)
);

-- Taxonomic backbone (concepts/tree)
CREATE TABLE IF NOT EXISTS taxa (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parent_id bigint REFERENCES taxa(id),
  accepted_name_id bigint NOT NULL REFERENCES taxon_names(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (accepted_name_id)
);

CREATE INDEX IF NOT EXISTS ix_taxa_parent_id ON taxa(parent_id);

-- Name usages (synonyms + accepted names per source)
CREATE TABLE IF NOT EXISTS taxon_name_usages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxon_id bigint NOT NULL REFERENCES taxa(id) ON DELETE CASCADE,
  taxon_name_id bigint NOT NULL REFERENCES taxon_names(id),
  source_id bigint NOT NULL REFERENCES source_datasets(id),
  is_accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taxon_id, taxon_name_id, source_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_taxon_name_usages_accepted
  ON taxon_name_usages(taxon_id, source_id)
  WHERE is_accepted;

-- External identifier mapping (IUCN, GBIF, COL, etc.)
CREATE TABLE IF NOT EXISTS taxon_external_ids (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxon_id bigint NOT NULL REFERENCES taxa(id) ON DELETE CASCADE,
  source_id bigint NOT NULL REFERENCES source_datasets(id),
  external_ref_id text NOT NULL,
  source_url text,
  is_primary boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_ref_id)
);

CREATE INDEX IF NOT EXISTS ix_taxon_external_ids_taxon_id
  ON taxon_external_ids(taxon_id);

-- Conservation status reference
CREATE TABLE IF NOT EXISTS conservation_statuses (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code)
);

-- Conservation assessments per source
CREATE TABLE IF NOT EXISTS taxon_conservation_assessments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxon_id bigint NOT NULL REFERENCES taxa(id) ON DELETE CASCADE,
  source_id bigint NOT NULL REFERENCES source_datasets(id),
  conservation_status_id bigint NOT NULL REFERENCES conservation_statuses(id),
  assessment_date date,
  assessment_text text,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_taxon_conservation_assessments_current
  ON taxon_conservation_assessments(taxon_id, source_id)
  WHERE is_current;

CREATE INDEX IF NOT EXISTS ix_taxon_conservation_assessments_date
  ON taxon_conservation_assessments(taxon_id, source_id, assessment_date);

-- Canonical taxon profile (single-record attributes)
CREATE TABLE IF NOT EXISTS taxon_profiles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxon_id bigint NOT NULL REFERENCES taxa(id) ON DELETE CASCADE,
  source_id bigint REFERENCES source_datasets(id),
  iucn_url text,
  habitat_description text,
  geographic_description text,
  distribution_comment text,
  taxonomic_comment text,
  marine boolean,
  terrestrial boolean,
  freshwater boolean,
  aquatic boolean,
  island boolean,
  color_primary text,
  color_secondary text,
  pattern text,
  shape_description text,
  size_min_cm numeric,
  size_max_cm numeric,
  weight_kg numeric,
  diet_type text,
  lifespan numeric,
  maturity text,
  reproduction_type text,
  clutch_size text,
  origin numeric,
  presence numeric,
  seasonal numeric,
  legend text,
  generalised numeric,
  compiler text,
  year_compiled numeric,
  citation text,
  source text,
  subspecies text,
  subpop text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taxon_id)
);

-- Taxon ranges/geometry (may vary by source)
CREATE TABLE IF NOT EXISTS taxon_ranges (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxon_id bigint NOT NULL REFERENCES taxa(id) ON DELETE CASCADE,
  source_id bigint REFERENCES source_datasets(id),
  wkb_geometry geometry,
  shape_length numeric,
  shape_length_alt numeric,
  shape_area numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_taxon_ranges_taxon_id ON taxon_ranges(taxon_id);
CREATE INDEX IF NOT EXISTS ix_taxon_ranges_wkb_geometry ON taxon_ranges USING gist (wkb_geometry);

-- Bioregions (link to OneEarth natural key)
ALTER TABLE oneearth_bioregion
  ADD CONSTRAINT IF NOT EXISTS uq_oneearth_bioregion_bioregion UNIQUE (bioregion);

CREATE TABLE IF NOT EXISTS taxon_bioregions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxon_id bigint NOT NULL REFERENCES taxa(id) ON DELETE CASCADE,
  bioregion text NOT NULL REFERENCES oneearth_bioregion(bioregion),
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taxon_id, bioregion)
);

CREATE INDEX IF NOT EXISTS ix_taxon_bioregions_bioregion ON taxon_bioregions(bioregion);

-- Common names (multi-lingual)
CREATE TABLE IF NOT EXISTS taxon_common_names (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxon_id bigint NOT NULL REFERENCES taxa(id) ON DELETE CASCADE,
  name text NOT NULL,
  locale text,
  source_id bigint REFERENCES source_datasets(id),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taxon_id, name, locale)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_taxon_common_names_primary
  ON taxon_common_names(taxon_id)
  WHERE is_primary;

-- Multi-value normalized tables
CREATE TABLE IF NOT EXISTS taxon_behaviors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxon_id bigint NOT NULL REFERENCES taxa(id) ON DELETE CASCADE,
  behavior_index integer NOT NULL,
  behavior_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taxon_id, behavior_index)
);

CREATE TABLE IF NOT EXISTS taxon_key_facts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxon_id bigint NOT NULL REFERENCES taxa(id) ON DELETE CASCADE,
  fact_index integer NOT NULL,
  fact_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taxon_id, fact_index)
);

CREATE TABLE IF NOT EXISTS taxon_life_descriptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxon_id bigint NOT NULL REFERENCES taxa(id) ON DELETE CASCADE,
  description_index integer NOT NULL,
  description_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taxon_id, description_index)
);

CREATE TABLE IF NOT EXISTS taxon_habitat_tags (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxon_id bigint NOT NULL REFERENCES taxa(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taxon_id, tag)
);

CREATE INDEX IF NOT EXISTS ix_taxon_habitat_tags_tag ON taxon_habitat_tags(tag);

CREATE TABLE IF NOT EXISTS taxon_threats (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxon_id bigint NOT NULL REFERENCES taxa(id) ON DELETE CASCADE,
  threat_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taxon_id, threat_text)
);

CREATE INDEX IF NOT EXISTS ix_taxon_threats_threat_text ON taxon_threats(threat_text);

CREATE TABLE IF NOT EXISTS taxon_diet_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxon_id bigint NOT NULL REFERENCES taxa(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taxon_id, category, item_text),
  CHECK (category IN ('prey', 'flora'))
);

CREATE INDEX IF NOT EXISTS ix_taxon_diet_items_item_text ON taxon_diet_items(item_text);

COMMIT;
