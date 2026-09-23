BEGIN;
ALTER TABLE evidence_family_hints ADD COLUMN IF NOT EXISTS explains jsonb;
ALTER TABLE evidence_family_cards ADD COLUMN IF NOT EXISTS explains jsonb;
COMMIT;
