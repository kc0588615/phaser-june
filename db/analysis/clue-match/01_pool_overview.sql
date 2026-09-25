-- Clue Match pool overview: one row per playable species, clue counts per gem color.
--
-- Practice: JOIN, GROUP BY, aggregate FILTER clauses, COALESCE.
-- Question: which species have no clue for a color, so that gem shows only
--           fun notes (or "No more clues") in its rounds?
--
-- Gem colors map to clue categories in src/clueGame/categories.ts:
--   red taxonomy, orange morphology, yellow behavior + diet, green habitat,
--   blue geography, black reproduction, white conservation, purple key_fact.
SELECT
  s.id,
  s.common_name,
  s.class,
  s.taxon_order,
  count(*) FILTER (WHERE c.category = 'taxonomy')                AS red,
  count(*) FILTER (WHERE c.category = 'morphology')              AS orange,
  count(*) FILTER (WHERE c.category IN ('behavior', 'diet'))     AS yellow,
  count(*) FILTER (WHERE c.category = 'habitat')                 AS green,
  count(*) FILTER (WHERE c.category = 'geography')               AS blue,
  count(*) FILTER (WHERE c.category = 'reproduction')            AS black,
  count(*) FILTER (WHERE c.category = 'conservation')            AS white,
  count(*) FILTER (WHERE c.category = 'key_fact')                AS purple,
  count(*) FILTER (WHERE c.is_filtering AND cardinality(c.compare_tags) > 0) AS deductive,
  COALESCE((SELECT count(*) FROM species_facts f WHERE f.species_id = s.id), 0) AS facts
FROM species s
JOIN species_deduction_clues c ON c.species_id = s.id
GROUP BY s.id, s.common_name, s.class, s.taxon_order
ORDER BY s.class, s.taxon_order, s.common_name;
