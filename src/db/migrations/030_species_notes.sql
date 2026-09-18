SET LOCAL search_path = public;

-- 1. Preserve authored prose. JSON extraction also makes replay safe after columns are gone.
CREATE TABLE IF NOT EXISTS species_notes (
  species_id integer NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  topic text NOT NULL CHECK (topic IN ('behavior', 'life_cycle', 'key_fact', 'taxonomy', 'distribution', 'reproduction', 'threats')),
  sort_order smallint NOT NULL CHECK (sort_order BETWEEN 1 AND 9),
  note_text text NOT NULL,
  source_url text CHECK (source_url IS NULL OR source_url LIKE 'https://%'),
  PRIMARY KEY (species_id, topic, sort_order)
);
INSERT INTO species_notes (species_id, topic, sort_order, note_text)
SELECT s.id, v.topic, v.sort_order, to_jsonb(s)->>v.column_name
FROM species s CROSS JOIN (VALUES
  ('behavior_1', 'behavior', 1),
  ('behavior_2', 'behavior', 2),
  ('life_description_1', 'life_cycle', 1),
  ('life_description_2', 'life_cycle', 2),
  ('key_fact_1', 'key_fact', 1),
  ('key_fact_2', 'key_fact', 2),
  ('key_fact_3', 'key_fact', 3),
  ('taxonomic_comment', 'taxonomy', 1),
  ('lifespan', 'life_cycle', 3),
  ('maturity', 'life_cycle', 4),
  ('reproduction_type', 'reproduction', 1),
  ('clutch_size', 'reproduction', 2),
  ('distribution_comment', 'distribution', 1),
  ('threats', 'threats', 1)
) AS v(column_name, topic, sort_order)
WHERE to_jsonb(s)->>v.column_name IS NOT NULL
ON CONFLICT (species_id, topic, sort_order) DO NOTHING;
SELECT count(*) AS notes_after_backfill FROM species_notes;

-- 2. Archives in db/archive/ must exist before applying this group.
DROP TABLE IF EXISTS species_facts;
DROP TABLE IF EXISTS species_deduction_clues;
DROP TABLE IF EXISTS evidence_cards;
SELECT count(*) AS remaining_retired_tables FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('species_facts','species_deduction_clues','evidence_cards');

-- 3. Distribution and threats stay on species for the answer prior.
ALTER TABLE species
  DROP COLUMN IF EXISTS behavior_1,
  DROP COLUMN IF EXISTS behavior_2,
  DROP COLUMN IF EXISTS life_description_1,
  DROP COLUMN IF EXISTS life_description_2,
  DROP COLUMN IF EXISTS key_fact_1,
  DROP COLUMN IF EXISTS key_fact_2,
  DROP COLUMN IF EXISTS key_fact_3,
  DROP COLUMN IF EXISTS taxonomic_comment,
  DROP COLUMN IF EXISTS lifespan,
  DROP COLUMN IF EXISTS maturity,
  DROP COLUMN IF EXISTS reproduction_type,
  DROP COLUMN IF EXISTS clutch_size;
SELECT count(*) AS species_after_cleanup FROM species;
