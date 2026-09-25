-- Text a player would stumble on, found with regular expressions. The same
-- checks run in `npm run clue:pool -- --check` (src/clueGame/validatePool.ts).
--
-- Practice: UNION ALL to stack two tables, the ~ regex operator, CASE.
-- Question: fix one problem with an UPDATE inside BEGIN ... COMMIT, rerun this
--           query, then `npm run clue:pool -- --check`.
WITH texts AS (
  SELECT 'clue' AS source, c.id::text AS row_id, s.common_name, c.category, c.label AS text
  FROM species_deduction_clues c JOIN species s ON s.id = c.species_id
  UNION ALL
  SELECT 'fact', f.id::text, s.common_name, f.category, f.fact_text
  FROM species_facts f JOIN species s ON s.id = f.species_id
)
SELECT source, row_id, common_name, category,
  CASE
    WHEN text ~* '^\s*(none|n/a|unknown|-)?\.?\s*$'          THEN 'placeholder'
    WHEN text ~ '^Status: [A-Z]{2}\M'                       THEN 'Red List code, spell it out'
    WHEN text ~ '(^|[^0-9,.])0[0-9]{2,}\M'                  THEN 'numbers run together (lost dash?)'
    WHEN text ~ '\m(19|20)[0-9]{2}(19|20)[0-9]{2}\M'         THEN 'years run together (lost dash?)'
    WHEN text ~ '[a-z]{3,}(and|cant|dont)\M'                THEN 'words run together?'
  END AS problem,
  text
FROM texts
WHERE text ~* '^\s*(none|n/a|unknown|-)?\.?\s*$'
   OR text ~ '^Status: [A-Z]{2}\M'
   OR text ~ '(^|[^0-9,.])0[0-9]{2,}\M'
   OR text ~ '\m(19|20)[0-9]{2}(19|20)[0-9]{2}\M'
ORDER BY common_name, source, category;
