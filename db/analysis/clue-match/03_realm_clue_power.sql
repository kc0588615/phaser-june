-- How strong is each Range (realm) clue? For every species' realm clue, count
-- the other playable species it would rule out: they have realm data, but not
-- this realm. This is the "complete family" rule from src/clueGame/traits.ts,
-- written in SQL.
--
-- Practice: CTEs (WITH), array operators (&& overlap, @> contains), NOT, EXISTS,
--           a correlated subquery.
-- Question: which realms split the pool best? Would a species in two realms be
--           harder or easier to find?
WITH realm_tags AS (
  SELECT ARRAY['realm:nearctic', 'realm:neotropical', 'realm:palearctic', 'realm:afrotropical',
               'realm:indomalayan', 'realm:australasian', 'realm:oceanian', 'realm:antarctic'] AS all_realms
), species_realms AS (
  -- Each species' realm tags, from its own geography clues.
  SELECT c.species_id, array_agg(DISTINCT t) AS realms
  FROM species_deduction_clues c
  CROSS JOIN LATERAL unnest(c.compare_tags) AS t
  CROSS JOIN realm_tags r
  WHERE c.category = 'geography' AND t = ANY (r.all_realms)
  GROUP BY c.species_id
), realm_clues AS (
  SELECT c.id, c.species_id, c.label, c.compare_tags
  FROM species_deduction_clues c, realm_tags r
  WHERE c.category = 'geography' AND c.compare_tags && r.all_realms
)
SELECT
  s.common_name,
  rc.label,
  (SELECT count(*) FROM species_realms other
    WHERE other.species_id <> rc.species_id
      AND NOT other.realms @> rc.compare_tags) AS rules_out,
  (SELECT count(*) FROM species_realms) - 1 AS other_species
FROM realm_clues rc
JOIN species s ON s.id = rc.species_id
ORDER BY rules_out DESC, s.common_name;
