-- Backfill normalized biodiversity tables from legacy icaa
-- Requires: source icaa + oneearth_bioregion tables already populated

BEGIN;

-- Seed source datasets
INSERT INTO source_datasets (name, version)
VALUES ('ICAA', 'shapefile')
ON CONFLICT (name) DO NOTHING;

INSERT INTO source_datasets (name, version)
VALUES ('IUCN', 'redlist')
ON CONFLICT (name) DO NOTHING;

-- Seed conservation statuses
INSERT INTO conservation_statuses (code, label, sort_order)
VALUES
  ('EX', 'Extinct', 1),
  ('EW', 'Extinct in the Wild', 2),
  ('CR', 'Critically Endangered', 3),
  ('EN', 'Endangered', 4),
  ('VU', 'Vulnerable', 5),
  ('NT', 'Near Threatened', 6),
  ('LC', 'Least Concern', 7),
  ('DD', 'Data Deficient', 8),
  ('NE', 'Not Evaluated', 9)
ON CONFLICT (code) DO NOTHING;

-- Taxon names (per-rank)
INSERT INTO taxon_names (scientific_name, rank)
SELECT DISTINCT TRIM(kingdom), 'kingdom'
FROM icaa
WHERE kingdom IS NOT NULL AND TRIM(kingdom) <> ''
ON CONFLICT (scientific_name, rank) DO NOTHING;

INSERT INTO taxon_names (scientific_name, rank)
SELECT DISTINCT TRIM(phylum), 'phylum'
FROM icaa
WHERE phylum IS NOT NULL AND TRIM(phylum) <> ''
ON CONFLICT (scientific_name, rank) DO NOTHING;

INSERT INTO taxon_names (scientific_name, rank)
SELECT DISTINCT TRIM("class"), 'class'
FROM icaa
WHERE "class" IS NOT NULL AND TRIM("class") <> ''
ON CONFLICT (scientific_name, rank) DO NOTHING;

INSERT INTO taxon_names (scientific_name, rank)
SELECT DISTINCT TRIM(taxon_order), 'order'
FROM icaa
WHERE taxon_order IS NOT NULL AND TRIM(taxon_order) <> ''
ON CONFLICT (scientific_name, rank) DO NOTHING;

INSERT INTO taxon_names (scientific_name, rank)
SELECT DISTINCT TRIM(family), 'family'
FROM icaa
WHERE family IS NOT NULL AND TRIM(family) <> ''
ON CONFLICT (scientific_name, rank) DO NOTHING;

INSERT INTO taxon_names (scientific_name, rank)
SELECT DISTINCT TRIM(genus), 'genus'
FROM icaa
WHERE genus IS NOT NULL AND TRIM(genus) <> ''
ON CONFLICT (scientific_name, rank) DO NOTHING;

INSERT INTO taxon_names (scientific_name, rank)
SELECT DISTINCT TRIM(scientific_name), 'species'
FROM icaa
WHERE scientific_name IS NOT NULL AND TRIM(scientific_name) <> ''
ON CONFLICT (scientific_name, rank) DO NOTHING;

-- Taxa (backbone) with parent relationships
INSERT INTO taxa (accepted_name_id)
SELECT tn.id
FROM taxon_names tn
WHERE tn.rank = 'kingdom'
ON CONFLICT (accepted_name_id) DO NOTHING;

INSERT INTO taxa (accepted_name_id, parent_id)
SELECT DISTINCT child_name.id, parent_taxa.id
FROM icaa i
JOIN taxon_names child_name
  ON child_name.rank = 'phylum' AND child_name.scientific_name = TRIM(i.phylum)
JOIN taxon_names parent_name
  ON parent_name.rank = 'kingdom' AND parent_name.scientific_name = TRIM(i.kingdom)
JOIN taxa parent_taxa ON parent_taxa.accepted_name_id = parent_name.id
WHERE i.phylum IS NOT NULL AND TRIM(i.phylum) <> ''
  AND i.kingdom IS NOT NULL AND TRIM(i.kingdom) <> ''
ON CONFLICT (accepted_name_id) DO UPDATE SET parent_id = EXCLUDED.parent_id;

INSERT INTO taxa (accepted_name_id, parent_id)
SELECT DISTINCT child_name.id, parent_taxa.id
FROM icaa i
JOIN taxon_names child_name
  ON child_name.rank = 'class' AND child_name.scientific_name = TRIM(i."class")
JOIN taxon_names parent_name
  ON parent_name.rank = 'phylum' AND parent_name.scientific_name = TRIM(i.phylum)
JOIN taxa parent_taxa ON parent_taxa.accepted_name_id = parent_name.id
WHERE i."class" IS NOT NULL AND TRIM(i."class") <> ''
  AND i.phylum IS NOT NULL AND TRIM(i.phylum) <> ''
ON CONFLICT (accepted_name_id) DO UPDATE SET parent_id = EXCLUDED.parent_id;

INSERT INTO taxa (accepted_name_id, parent_id)
SELECT DISTINCT child_name.id, parent_taxa.id
FROM icaa i
JOIN taxon_names child_name
  ON child_name.rank = 'order' AND child_name.scientific_name = TRIM(i.taxon_order)
JOIN taxon_names parent_name
  ON parent_name.rank = 'class' AND parent_name.scientific_name = TRIM(i."class")
JOIN taxa parent_taxa ON parent_taxa.accepted_name_id = parent_name.id
WHERE i.taxon_order IS NOT NULL AND TRIM(i.taxon_order) <> ''
  AND i."class" IS NOT NULL AND TRIM(i."class") <> ''
ON CONFLICT (accepted_name_id) DO UPDATE SET parent_id = EXCLUDED.parent_id;

INSERT INTO taxa (accepted_name_id, parent_id)
SELECT DISTINCT child_name.id, parent_taxa.id
FROM icaa i
JOIN taxon_names child_name
  ON child_name.rank = 'family' AND child_name.scientific_name = TRIM(i.family)
JOIN taxon_names parent_name
  ON parent_name.rank = 'order' AND parent_name.scientific_name = TRIM(i.taxon_order)
JOIN taxa parent_taxa ON parent_taxa.accepted_name_id = parent_name.id
WHERE i.family IS NOT NULL AND TRIM(i.family) <> ''
  AND i.taxon_order IS NOT NULL AND TRIM(i.taxon_order) <> ''
ON CONFLICT (accepted_name_id) DO UPDATE SET parent_id = EXCLUDED.parent_id;

INSERT INTO taxa (accepted_name_id, parent_id)
SELECT DISTINCT child_name.id, parent_taxa.id
FROM icaa i
JOIN taxon_names child_name
  ON child_name.rank = 'genus' AND child_name.scientific_name = TRIM(i.genus)
JOIN taxon_names parent_name
  ON parent_name.rank = 'family' AND parent_name.scientific_name = TRIM(i.family)
JOIN taxa parent_taxa ON parent_taxa.accepted_name_id = parent_name.id
WHERE i.genus IS NOT NULL AND TRIM(i.genus) <> ''
  AND i.family IS NOT NULL AND TRIM(i.family) <> ''
ON CONFLICT (accepted_name_id) DO UPDATE SET parent_id = EXCLUDED.parent_id;

INSERT INTO taxa (accepted_name_id, parent_id)
SELECT DISTINCT child_name.id, parent_taxa.id
FROM icaa i
JOIN taxon_names child_name
  ON child_name.rank = 'species' AND child_name.scientific_name = TRIM(i.scientific_name)
JOIN taxon_names parent_name
  ON parent_name.rank = 'genus' AND parent_name.scientific_name = TRIM(i.genus)
JOIN taxa parent_taxa ON parent_taxa.accepted_name_id = parent_name.id
WHERE i.scientific_name IS NOT NULL AND TRIM(i.scientific_name) <> ''
  AND i.genus IS NOT NULL AND TRIM(i.genus) <> ''
ON CONFLICT (accepted_name_id) DO UPDATE SET parent_id = EXCLUDED.parent_id;

-- Accepted name usages for IUCN
INSERT INTO taxon_name_usages (taxon_id, taxon_name_id, source_id, is_accepted)
SELECT t.id, t.accepted_name_id, s.id, true
FROM taxa t
CROSS JOIN (SELECT id FROM source_datasets WHERE name = 'ICAA') s
ON CONFLICT (taxon_id, taxon_name_id, source_id) DO NOTHING;

-- Species map (IUCN -> taxa)
WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_external_ids (taxon_id, source_id, external_ref_id, source_url, is_primary)
SELECT st.taxon_id, s.id, st.species_id::text, st.iucn_url, true
FROM species_taxa st
JOIN source_datasets s ON s.name = 'IUCN'
WHERE st.species_id IS NOT NULL
ON CONFLICT (source_id, external_ref_id) DO NOTHING;

WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_external_ids (taxon_id, source_id, external_ref_id, source_url, is_primary)
SELECT st.taxon_id, s.id, st.ogc_fid::text, NULL, true
FROM species_taxa st
JOIN source_datasets s ON s.name = 'ICAA'
WHERE st.ogc_fid IS NOT NULL
ON CONFLICT (source_id, external_ref_id) DO NOTHING;

-- Common names
WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_common_names (taxon_id, name, locale, source_id, is_primary)
SELECT st.taxon_id, TRIM(st.common_name), 'und', s.id, true
FROM species_taxa st
JOIN source_datasets s ON s.name = 'ICAA'
WHERE st.common_name IS NOT NULL AND TRIM(st.common_name) <> ''
ON CONFLICT (taxon_id, name, locale) DO NOTHING;

-- Canonical profiles
WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_profiles (
  taxon_id,
  source_id,
  iucn_url,
  habitat_description,
  geographic_description,
  distribution_comment,
  taxonomic_comment,
  marine,
  terrestrial,
  freshwater,
  aquatic,
  island,
  color_primary,
  color_secondary,
  pattern,
  shape_description,
  size_min_cm,
  size_max_cm,
  weight_kg,
  diet_type,
  lifespan,
  maturity,
  reproduction_type,
  clutch_size,
  origin,
  presence,
  seasonal,
  legend,
  generalised,
  compiler,
  year_compiled,
  citation,
  source,
  subspecies,
  subpop
)
SELECT
  st.taxon_id,
  s.id,
  st.iucn_url,
  st.habitat_description,
  st.geographic_description,
  st.distribution_comment,
  st.taxonomic_comment,
  st.marine,
  st.terrestrial,
  st.freshwater,
  st.aquatic,
  st.island,
  st.color_primary,
  st.color_secondary,
  st.pattern,
  st.shape_description,
  st.size_min_cm,
  st.size_max_cm,
  st.weight_kg,
  st.diet_type,
  st.lifespan,
  st.maturity,
  st.reproduction_type,
  st.clutch_size,
  st.origin,
  st.presence,
  st.seasonal,
  st.legend,
  st.generalised,
  st.compiler,
  st.year_compiled,
  st.citation,
  st.source,
  st.subspecies,
  st.subpop
FROM species_taxa st
JOIN source_datasets s ON s.name = 'ICAA'
ON CONFLICT (taxon_id) DO UPDATE SET
  source_id = EXCLUDED.source_id,
  iucn_url = EXCLUDED.iucn_url,
  habitat_description = EXCLUDED.habitat_description,
  geographic_description = EXCLUDED.geographic_description,
  distribution_comment = EXCLUDED.distribution_comment,
  taxonomic_comment = EXCLUDED.taxonomic_comment,
  marine = EXCLUDED.marine,
  terrestrial = EXCLUDED.terrestrial,
  freshwater = EXCLUDED.freshwater,
  aquatic = EXCLUDED.aquatic,
  island = EXCLUDED.island,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  pattern = EXCLUDED.pattern,
  shape_description = EXCLUDED.shape_description,
  size_min_cm = EXCLUDED.size_min_cm,
  size_max_cm = EXCLUDED.size_max_cm,
  weight_kg = EXCLUDED.weight_kg,
  diet_type = EXCLUDED.diet_type,
  lifespan = EXCLUDED.lifespan,
  maturity = EXCLUDED.maturity,
  reproduction_type = EXCLUDED.reproduction_type,
  clutch_size = EXCLUDED.clutch_size,
  origin = EXCLUDED.origin,
  presence = EXCLUDED.presence,
  seasonal = EXCLUDED.seasonal,
  legend = EXCLUDED.legend,
  generalised = EXCLUDED.generalised,
  compiler = EXCLUDED.compiler,
  year_compiled = EXCLUDED.year_compiled,
  citation = EXCLUDED.citation,
  source = EXCLUDED.source,
  subspecies = EXCLUDED.subspecies,
  subpop = EXCLUDED.subpop,
  updated_at = now();

-- Conservation assessments
WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_conservation_assessments (
  taxon_id,
  source_id,
  conservation_status_id,
  assessment_date,
  assessment_text,
  is_current
)
SELECT st.taxon_id, s.id, cs.id, CURRENT_DATE, st.conservation_text, true
FROM species_taxa st
JOIN source_datasets s ON s.name = 'IUCN'
JOIN conservation_statuses cs ON cs.code = st.conservation_code
WHERE st.conservation_code IS NOT NULL AND TRIM(st.conservation_code) <> ''
ON CONFLICT (taxon_id, source_id) WHERE is_current DO NOTHING;

-- Bioregions
WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_bioregions (taxon_id, bioregion, is_primary)
SELECT st.taxon_id, TRIM(st.bioregion), true
FROM species_taxa st
WHERE st.bioregion IS NOT NULL AND TRIM(st.bioregion) <> ''
ON CONFLICT (taxon_id, bioregion) DO NOTHING;

-- Ranges/geometry
WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_ranges (
  taxon_id,
  source_id,
  wkb_geometry,
  shape_length,
  shape_length_alt,
  shape_area
)
SELECT st.taxon_id, s.id, st.wkb_geometry, st.shape_length, st.shape_length_alt, st.shape_area
FROM species_taxa st
JOIN source_datasets s ON s.name = 'ICAA'
WHERE st.wkb_geometry IS NOT NULL;

-- Behaviors (1..2)
WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_behaviors (taxon_id, behavior_index, behavior_text)
SELECT st.taxon_id, 1, TRIM(st.behavior_1)
FROM species_taxa st
WHERE st.behavior_1 IS NOT NULL AND TRIM(st.behavior_1) <> ''
ON CONFLICT (taxon_id, behavior_index) DO NOTHING;

WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_behaviors (taxon_id, behavior_index, behavior_text)
SELECT st.taxon_id, 2, TRIM(st.behavior_2)
FROM species_taxa st
WHERE st.behavior_2 IS NOT NULL AND TRIM(st.behavior_2) <> ''
ON CONFLICT (taxon_id, behavior_index) DO NOTHING;

-- Key facts (1..3)
WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_key_facts (taxon_id, fact_index, fact_text)
SELECT st.taxon_id, 1, TRIM(st.key_fact_1)
FROM species_taxa st
WHERE st.key_fact_1 IS NOT NULL AND TRIM(st.key_fact_1) <> ''
ON CONFLICT (taxon_id, fact_index) DO NOTHING;

WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_key_facts (taxon_id, fact_index, fact_text)
SELECT st.taxon_id, 2, TRIM(st.key_fact_2)
FROM species_taxa st
WHERE st.key_fact_2 IS NOT NULL AND TRIM(st.key_fact_2) <> ''
ON CONFLICT (taxon_id, fact_index) DO NOTHING;

WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_key_facts (taxon_id, fact_index, fact_text)
SELECT st.taxon_id, 3, TRIM(st.key_fact_3)
FROM species_taxa st
WHERE st.key_fact_3 IS NOT NULL AND TRIM(st.key_fact_3) <> ''
ON CONFLICT (taxon_id, fact_index) DO NOTHING;

-- Life descriptions (1..2)
WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_life_descriptions (taxon_id, description_index, description_text)
SELECT st.taxon_id, 1, TRIM(st.life_description_1)
FROM species_taxa st
WHERE st.life_description_1 IS NOT NULL AND TRIM(st.life_description_1) <> ''
ON CONFLICT (taxon_id, description_index) DO NOTHING;

WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_life_descriptions (taxon_id, description_index, description_text)
SELECT st.taxon_id, 2, TRIM(st.life_description_2)
FROM species_taxa st
WHERE st.life_description_2 IS NOT NULL AND TRIM(st.life_description_2) <> ''
ON CONFLICT (taxon_id, description_index) DO NOTHING;

-- Habitat tags (split on comma + semicolon)
WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_habitat_tags (taxon_id, tag)
SELECT st.taxon_id, TRIM(tag)
FROM species_taxa st
CROSS JOIN LATERAL regexp_split_to_table(st.habitat_tags, '[,;]') AS tag
WHERE st.habitat_tags IS NOT NULL
  AND TRIM(tag) <> ''
  AND lower(TRIM(tag)) NOT IN ('none', 'n/a', 'na')
ON CONFLICT (taxon_id, tag) DO NOTHING;

-- Threats (split on semicolons only)
WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
)
INSERT INTO taxon_threats (taxon_id, threat_text)
SELECT st.taxon_id, TRIM(threat_text)
FROM species_taxa st
CROSS JOIN LATERAL unnest(string_to_array(st.threats, ';')) AS threat_text
WHERE st.threats IS NOT NULL
  AND TRIM(threat_text) <> ''
  AND lower(TRIM(threat_text)) NOT IN ('none', 'n/a', 'na')
ON CONFLICT (taxon_id, threat_text) DO NOTHING;

-- Diet items (hybrid split)
WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
),
prey_stats AS (
  SELECT st.taxon_id,
         st.diet_prey,
         CASE
           WHEN st.diet_prey IS NULL THEN NULL
           WHEN lower(TRIM(st.diet_prey)) IN ('', 'none', 'n/a', 'na') THEN NULL
           WHEN st.diet_prey LIKE '%;%' THEN 'semicolon'
           ELSE 'comma_or_whole'
         END AS split_mode,
         (
           SELECT AVG(array_length(regexp_split_to_array(TRIM(seg), '\\s+'), 1))
           FROM unnest(string_to_array(st.diet_prey, ',')) AS seg
           WHERE TRIM(seg) <> ''
         ) AS avg_words
  FROM species_taxa st
)
INSERT INTO taxon_diet_items (taxon_id, category, item_text)
SELECT ps.taxon_id, 'prey', TRIM(seg)
FROM prey_stats ps
CROSS JOIN LATERAL (
  SELECT seg
  FROM unnest(
    CASE
      WHEN ps.split_mode IS NULL THEN ARRAY[]::text[]
      WHEN ps.split_mode = 'semicolon' THEN string_to_array(ps.diet_prey, ';')
      WHEN ps.avg_words <= 2 THEN string_to_array(ps.diet_prey, ',')
      ELSE ARRAY[ps.diet_prey]
    END
  ) AS seg
) items
WHERE TRIM(seg) <> ''
  AND lower(TRIM(seg)) NOT IN ('none', 'n/a', 'na')
ON CONFLICT (taxon_id, category, item_text) DO NOTHING;

WITH species_taxa AS (
  SELECT i.*, t.id AS taxon_id
  FROM icaa i
  JOIN taxon_names tn
    ON tn.rank = 'species' AND tn.scientific_name = TRIM(i.scientific_name)
  JOIN taxa t ON t.accepted_name_id = tn.id
),
flora_stats AS (
  SELECT st.taxon_id,
         st.diet_flora,
         CASE
           WHEN st.diet_flora IS NULL THEN NULL
           WHEN lower(TRIM(st.diet_flora)) IN ('', 'none', 'n/a', 'na') THEN NULL
           WHEN st.diet_flora LIKE '%;%' THEN 'semicolon'
           ELSE 'comma_or_whole'
         END AS split_mode,
         (
           SELECT AVG(array_length(regexp_split_to_array(TRIM(seg), '\\s+'), 1))
           FROM unnest(string_to_array(st.diet_flora, ',')) AS seg
           WHERE TRIM(seg) <> ''
         ) AS avg_words
  FROM species_taxa st
)
INSERT INTO taxon_diet_items (taxon_id, category, item_text)
SELECT fs.taxon_id, 'flora', TRIM(seg)
FROM flora_stats fs
CROSS JOIN LATERAL (
  SELECT seg
  FROM unnest(
    CASE
      WHEN fs.split_mode IS NULL THEN ARRAY[]::text[]
      WHEN fs.split_mode = 'semicolon' THEN string_to_array(fs.diet_flora, ';')
      WHEN fs.avg_words <= 2 THEN string_to_array(fs.diet_flora, ',')
      ELSE ARRAY[fs.diet_flora]
    END
  ) AS seg
) items
WHERE TRIM(seg) <> ''
  AND lower(TRIM(seg)) NOT IN ('none', 'n/a', 'na')
ON CONFLICT (taxon_id, category, item_text) DO NOTHING;

COMMIT;
