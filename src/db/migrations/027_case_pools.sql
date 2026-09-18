-- Apply atomically with ./scripts/db -1 -f <file>.
SET LOCAL search_path = public;

-- Earlier runs inherited the role search path; preserve those rows on replay.
DO $$
BEGIN
  IF to_regclass('public.case_pools') IS NULL AND to_regclass('postgres.case_pools') IS NOT NULL THEN
    ALTER TABLE postgres.case_pools SET SCHEMA public;
  END IF;
  IF to_regclass('public.case_pool_members') IS NULL AND to_regclass('postgres.case_pool_members') IS NOT NULL THEN
    ALTER TABLE postgres.case_pool_members SET SCHEMA public;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS case_pools (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug          text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title         text NOT NULL,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'reviewed')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_pool_members (
  pool_id    bigint  NOT NULL REFERENCES case_pools(id) ON DELETE CASCADE,
  species_id integer NOT NULL REFERENCES species(id)    ON DELETE RESTRICT,
  PRIMARY KEY (pool_id, species_id)
);

ALTER TABLE evidence_family_cards ADD COLUMN IF NOT EXISTS pool_id bigint REFERENCES case_pools(id) ON DELETE CASCADE;
ALTER TABLE evidence_family_hints ADD COLUMN IF NOT EXISTS pool_id bigint REFERENCES case_pools(id) ON DELETE CASCADE;

INSERT INTO case_pools (slug, title) VALUES ('prototype-six', 'Prototype Six')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO case_pool_members (pool_id, species_id)
SELECT p.id, s.id FROM case_pools p CROSS JOIN species s
WHERE p.slug = 'prototype-six' AND s.iucn_id IN (512, 5748, 7140, 12763, 15955, 18732)
ON CONFLICT DO NOTHING;
UPDATE evidence_family_cards SET pool_id = (SELECT id FROM case_pools WHERE slug = 'prototype-six') WHERE pool_id IS NULL;
UPDATE evidence_family_hints SET pool_id = (SELECT id FROM case_pools WHERE slug = 'prototype-six') WHERE pool_id IS NULL;
ALTER TABLE evidence_family_cards ALTER COLUMN pool_id SET NOT NULL;
ALTER TABLE evidence_family_hints ALTER COLUMN pool_id SET NOT NULL;
ALTER TABLE evidence_family_cards DROP CONSTRAINT IF EXISTS uq_evidence_family_cards_species_family;
DROP INDEX IF EXISTS uq_evidence_family_cards_species_family;
ALTER TABLE evidence_family_hints DROP CONSTRAINT IF EXISTS uq_evidence_family_hints_species_family_sequence;
DROP INDEX IF EXISTS uq_evidence_family_hints_species_family_sequence;
CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_family_cards_pool_species_family ON evidence_family_cards (pool_id, species_id, family);
CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_family_hints_pool_species_family_sequence ON evidence_family_hints (pool_id, species_id, family, sequence_index);
UPDATE case_pools SET review_status = 'reviewed' WHERE slug = 'prototype-six';
