-- Restore species_deduction_clues (dropped by 030) for the clue-category prototype.
-- Definition matches db/archive/2026-09-17-species_deduction_clues.schema.txt.
-- Data load (run from the repo root after this migration):
--   \copy public.species_deduction_clues (id, category, label, compare_tags, reveal_order, unlock_mode, base_cost, is_filtering, created_at, species_id)
--     FROM 'db/archive/2026-09-17-species_deduction_clues.csv' WITH (FORMAT csv, HEADER true)
--   SELECT setval('species_deduction_clues_id_seq', (SELECT max(id) FROM species_deduction_clues));
BEGIN;
SET LOCAL search_path = public;

CREATE TABLE IF NOT EXISTS species_deduction_clues (
  id serial PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('habitat', 'morphology', 'diet', 'behavior', 'reproduction', 'taxonomy', 'key_fact', 'geography', 'conservation')),
  label text NOT NULL,
  compare_tags text[],
  reveal_order smallint NOT NULL DEFAULT 1,
  unlock_mode text NOT NULL DEFAULT 'fragment' CHECK (unlock_mode IN ('fragment', 'score')),
  base_cost smallint NOT NULL DEFAULT 2,
  is_filtering boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  species_id integer NOT NULL REFERENCES species(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_deduction_clues_category ON species_deduction_clues (species_id, category);
CREATE INDEX IF NOT EXISTS ix_deduction_clues_compare ON species_deduction_clues USING gin (compare_tags);
CREATE INDEX IF NOT EXISTS ix_deduction_clues_species ON species_deduction_clues (species_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_deduction_clues_species_cat_order ON species_deduction_clues (species_id, category, reveal_order);

COMMIT;
