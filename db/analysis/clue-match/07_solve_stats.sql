-- How players actually do: every solved mystery is a row in clue_match_solves
-- (db/schema.sql). Which animals take the most moves or wrong guesses, and
-- which gem colors do players lean on?
--
-- Practice: aggregates (avg, percentile_cont ... WITHIN GROUP), FILTER,
--           jsonb_each_text to unpack a JSON column, LEFT JOIN.
-- Question: do rounds with close relatives in the lineup (relatives > 0) take
--           more moves? Try grouping by relatives.

-- 1. Hardest animals first.
SELECT
  s.common_name,
  count(*)                                                     AS solves,
  round(avg(x.moves), 1)                                       AS avg_moves,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY x.moves)         AS median_moves,
  round(avg(x.wrong_guesses), 2)                               AS avg_wrong_guesses,
  count(*) FILTER (WHERE x.wrong_guesses = 0)                  AS first_try
FROM clue_match_solves x
JOIN species s ON s.id = x.species_id
GROUP BY s.common_name
ORDER BY avg_moves DESC, solves DESC;

-- 2. Clues read per gem color, over all solves.
SELECT gem.key AS color, sum(gem.value::int) AS clues_read
FROM clue_match_solves x
CROSS JOIN LATERAL jsonb_each_text(x.revealed_by_gem) AS gem
GROUP BY gem.key
ORDER BY clues_read DESC;
