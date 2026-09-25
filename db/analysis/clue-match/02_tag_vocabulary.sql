-- Tag vocabulary: every compare tag, how many species carry it, and in which
-- categories. Deduction compares these tags (src/clueGame/traits.ts).
--
-- Practice: unnest() to turn an array column into rows, GROUP BY, HAVING,
--           array_agg(DISTINCT ...).
-- Question: which tags only one species has (they can never split two
--           candidates), and which look like typos of another tag?
SELECT
  lower(tag)                                   AS tag,
  count(DISTINCT c.species_id)                 AS species,
  array_agg(DISTINCT c.category ORDER BY c.category) AS categories,
  array_agg(DISTINCT s.common_name ORDER BY s.common_name) AS who
FROM species_deduction_clues c
CROSS JOIN LATERAL unnest(c.compare_tags) AS tag
JOIN species s ON s.id = c.species_id
GROUP BY lower(tag)
ORDER BY species DESC, tag;

-- Only the tags a single species has:
--   ... GROUP BY lower(tag) HAVING count(DISTINCT c.species_id) = 1
