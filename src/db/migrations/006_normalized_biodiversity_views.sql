-- Compatibility views for normalized biodiversity schema

BEGIN;

CREATE OR REPLACE VIEW taxa_taxonomy_view AS
WITH RECURSIVE lineage AS (
  SELECT t.id AS taxon_id,
         t.parent_id,
         tn.rank,
         tn.scientific_name
  FROM taxa t
  JOIN taxon_names tn ON tn.id = t.accepted_name_id
  UNION ALL
  SELECT l.taxon_id,
         p.parent_id,
         pn.rank,
         pn.scientific_name
  FROM lineage l
  JOIN taxa p ON p.id = l.parent_id
  JOIN taxon_names pn ON pn.id = p.accepted_name_id
)
SELECT
  taxon_id,
  MAX(scientific_name) FILTER (WHERE rank = 'kingdom') AS kingdom,
  MAX(scientific_name) FILTER (WHERE rank = 'phylum') AS phylum,
  MAX(scientific_name) FILTER (WHERE rank = 'class') AS "class",
  MAX(scientific_name) FILTER (WHERE rank = 'order') AS taxon_order,
  MAX(scientific_name) FILTER (WHERE rank = 'family') AS family,
  MAX(scientific_name) FILTER (WHERE rank = 'genus') AS genus,
  MAX(scientific_name) FILTER (WHERE rank = 'species') AS scientific_name
FROM lineage
GROUP BY taxon_id;

CREATE OR REPLACE VIEW icaa_view AS
WITH species_taxa AS (
  SELECT t.id AS taxon_id
  FROM taxa t
  JOIN taxon_names tn ON tn.id = t.accepted_name_id
  WHERE tn.rank = 'species'
)
SELECT
  icaa_id.ogc_fid,
  iucn_id.species_id,
  cn.name AS common_name,
  taxonomy.scientific_name,
  tp.taxonomic_comment,
  tp.iucn_url,
  taxonomy.kingdom,
  taxonomy.phylum,
  taxonomy."class" AS class,
  taxonomy.taxon_order,
  taxonomy.family,
  taxonomy.genus,
  ca.conservation_code,
  ca.conservation_text,
  ca.conservation_code AS category,
  tp.habitat_description,
  tp.marine,
  tp.terrestrial,
  tp.freshwater,
  tp.aquatic,
  tp.geographic_description,
  tp.distribution_comment,
  tp.island,
  tp.origin,
  tp.presence,
  tp.seasonal,
  tb.bioregion,
  ob.realm,
  ob.sub_realm AS subrealm,
  ob.biome,
  tp.color_primary,
  tp.color_secondary,
  tp.pattern,
  tp.shape_description,
  tp.size_min_cm,
  tp.size_max_cm,
  tp.weight_kg,
  tp.diet_type,
  diet.diet_prey,
  diet.diet_flora,
  behavior.behavior_1,
  behavior.behavior_2,
  tp.lifespan,
  tp.maturity,
  tp.reproduction_type,
  tp.clutch_size,
  life_desc.life_description_1,
  life_desc.life_description_2,
  key_facts.key_fact_1,
  key_facts.key_fact_2,
  key_facts.key_fact_3,
  tp.compiler,
  tp.year_compiled,
  tp.citation,
  tp.source,
  tp.subspecies,
  tp.subpop,
  tp.legend,
  tp.generalised,
  tr.shape_length,
  tr.shape_length_alt,
  tr.shape_area,
  tr.wkb_geometry,
  tags.habitat_tags,
  threats.threats
FROM species_taxa st
LEFT JOIN taxa_taxonomy_view taxonomy ON taxonomy.taxon_id = st.taxon_id
LEFT JOIN taxon_profiles tp ON tp.taxon_id = st.taxon_id
LEFT JOIN LATERAL (
  SELECT te.external_ref_id::integer AS ogc_fid
  FROM taxon_external_ids te
  JOIN source_datasets sd ON sd.id = te.source_id
  WHERE te.taxon_id = st.taxon_id AND sd.name = 'ICAA'
  ORDER BY te.is_primary DESC, te.created_at DESC
  LIMIT 1
) icaa_id ON true
LEFT JOIN LATERAL (
  SELECT te.external_ref_id::numeric AS species_id
  FROM taxon_external_ids te
  JOIN source_datasets sd ON sd.id = te.source_id
  WHERE te.taxon_id = st.taxon_id AND sd.name = 'IUCN'
  ORDER BY te.is_primary DESC, te.created_at DESC
  LIMIT 1
) iucn_id ON true
LEFT JOIN LATERAL (
  SELECT name
  FROM taxon_common_names cn
  WHERE cn.taxon_id = st.taxon_id
  ORDER BY cn.is_primary DESC, cn.created_at DESC
  LIMIT 1
) cn ON true
LEFT JOIN LATERAL (
  SELECT cs.code AS conservation_code,
         tca.assessment_text AS conservation_text
  FROM taxon_conservation_assessments tca
  JOIN conservation_statuses cs ON cs.id = tca.conservation_status_id
  JOIN source_datasets sd ON sd.id = tca.source_id
  WHERE tca.taxon_id = st.taxon_id AND tca.is_current
  ORDER BY sd.name = 'IUCN' DESC, tca.created_at DESC
  LIMIT 1
) ca ON true
LEFT JOIN LATERAL (
  SELECT b.bioregion
  FROM taxon_bioregions b
  WHERE b.taxon_id = st.taxon_id
  ORDER BY b.is_primary DESC, b.created_at DESC
  LIMIT 1
) tb ON true
LEFT JOIN oneearth_bioregion ob ON ob.bioregion = tb.bioregion
LEFT JOIN LATERAL (
  SELECT r.shape_length, r.shape_length_alt, r.shape_area, r.wkb_geometry
  FROM taxon_ranges r
  WHERE r.taxon_id = st.taxon_id
  ORDER BY r.created_at DESC
  LIMIT 1
) tr ON true
LEFT JOIN LATERAL (
  SELECT
    (SELECT behavior_text FROM taxon_behaviors b WHERE b.taxon_id = st.taxon_id AND b.behavior_index = 1) AS behavior_1,
    (SELECT behavior_text FROM taxon_behaviors b WHERE b.taxon_id = st.taxon_id AND b.behavior_index = 2) AS behavior_2
) behavior ON true
LEFT JOIN LATERAL (
  SELECT
    (SELECT description_text FROM taxon_life_descriptions d WHERE d.taxon_id = st.taxon_id AND d.description_index = 1) AS life_description_1,
    (SELECT description_text FROM taxon_life_descriptions d WHERE d.taxon_id = st.taxon_id AND d.description_index = 2) AS life_description_2
) life_desc ON true
LEFT JOIN LATERAL (
  SELECT
    (SELECT fact_text FROM taxon_key_facts f WHERE f.taxon_id = st.taxon_id AND f.fact_index = 1) AS key_fact_1,
    (SELECT fact_text FROM taxon_key_facts f WHERE f.taxon_id = st.taxon_id AND f.fact_index = 2) AS key_fact_2,
    (SELECT fact_text FROM taxon_key_facts f WHERE f.taxon_id = st.taxon_id AND f.fact_index = 3) AS key_fact_3
) key_facts ON true
LEFT JOIN LATERAL (
  SELECT
    (SELECT string_agg(tag, ', ' ORDER BY tag) FROM taxon_habitat_tags ht WHERE ht.taxon_id = st.taxon_id) AS habitat_tags
) tags ON true
LEFT JOIN LATERAL (
  SELECT
    (SELECT string_agg(threat_text, '; ' ORDER BY threat_text) FROM taxon_threats tt WHERE tt.taxon_id = st.taxon_id) AS threats
) threats ON true
LEFT JOIN LATERAL (
  SELECT
    (SELECT string_agg(item_text, ', ' ORDER BY item_text)
     FROM taxon_diet_items di
     WHERE di.taxon_id = st.taxon_id AND di.category = 'prey') AS diet_prey,
    (SELECT string_agg(item_text, ', ' ORDER BY item_text)
     FROM taxon_diet_items di
     WHERE di.taxon_id = st.taxon_id AND di.category = 'flora') AS diet_flora
) diet ON true;

COMMIT;
