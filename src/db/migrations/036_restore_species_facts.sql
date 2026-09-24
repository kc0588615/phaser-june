-- Restore species_facts (dropped by plan 031) for the clue-category game's fun-fact notes.
-- Definition matches db/archive/2026-09-17-species_facts.schema.txt.
-- Data load (run from the repo root after this migration):
--   \copy public.species_facts (id, species_id, category, fact_text, sort_order)
--     FROM 'db/archive/2026-09-17-species_facts.csv' WITH (FORMAT csv, HEADER true)
--   SELECT setval('species_facts_id_seq', (SELECT max(id) FROM species_facts));
BEGIN;
SET LOCAL search_path = public;

CREATE TABLE IF NOT EXISTS species_facts (
  id serial PRIMARY KEY,
  species_id integer NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  category text NOT NULL,
  fact_text text NOT NULL,
  sort_order smallint NOT NULL DEFAULT 1,
  UNIQUE (species_id, category, sort_order)
);

CREATE INDEX IF NOT EXISTS ix_species_facts_category ON species_facts (species_id, category);
CREATE INDEX IF NOT EXISTS ix_species_facts_species ON species_facts (species_id);

COMMIT;
