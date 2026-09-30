-- How players actually do: every finished round is a row in clue_match_solves
-- (db/schema.sql), solved or lost (outcome). Which animals are hardest, which
-- questions do players ask, and does a last chance help?
--
-- Practice: aggregates (avg, percentile_cont ... WITHIN GROUP), FILTER,
--           jsonb_array_elements to unpack a JSON array, LEFT JOIN.
-- Question: do players who ask about Range first need fewer animals standing
--           at the guess? (Hint: questions->0->>'tag'.)
-- Rounds before plan 041 have rules_version NULL; compare like with like.

-- 1. Hardest animals first (plan 041 rules only).
SELECT
  s.common_name,
  count(*)                                                     AS rounds,
  count(*) FILTER (WHERE x.outcome = 'solved')                 AS solved,
  round(avg(x.moves), 1)                                       AS avg_moves_used,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY x.standing_at_guess) AS median_left_at_guess,
  round(avg(x.wrong_guesses), 2)                               AS avg_wrong_guesses,
  count(*) FILTER (WHERE x.wrong_guesses = 0 AND x.outcome = 'solved') AS first_try
FROM clue_match_solves x
JOIN species s ON s.id = x.species_id
WHERE x.rules_version IS NOT NULL
GROUP BY s.common_name
ORDER BY solved::numeric / count(*), rounds DESC;

-- 2. The questions players ask most, and how often the answer is yes.
SELECT q->>'tag' AS question, count(*) AS asked, count(*) FILTER (WHERE q->>'answer' = 'yes') AS yes
FROM clue_match_solves x
CROSS JOIN LATERAL jsonb_array_elements(x.questions) AS q
GROUP BY 1
ORDER BY asked DESC
LIMIT 20;

-- 3. Field notes and family tree steps, by outcome.
SELECT outcome, count(*) AS rounds, round(avg(notes_saved), 2) AS avg_notes_saved, round(avg(tree_steps), 2) AS avg_tree_steps
FROM clue_match_solves
WHERE rules_version IS NOT NULL
GROUP BY outcome;

-- 4. First-try and last-chance solves, by rules (041-1 charges; 041-5 with toys and 12 look-alikes; 041-2 to 041-4 were removed experiments).
--    last_chance is NULL for rounds saved before 2026-09-28, so those can't tell a rescue from a first try.
SELECT
  rules_version,
  count(*)                                                                AS rounds,
  count(*) FILTER (WHERE outcome = 'solved' AND wrong_guesses = 0)        AS first_try,
  count(*) FILTER (WHERE outcome = 'solved' AND last_chance)              AS on_last_chance,
  count(*) FILTER (WHERE outcome = 'lost')                                AS lost,
  round(avg(standing_at_guess), 2)                                        AS avg_left_at_guess
FROM clue_match_solves
WHERE rules_version IS NOT NULL
GROUP BY rules_version
ORDER BY rules_version;
