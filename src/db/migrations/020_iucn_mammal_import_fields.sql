-- Migration 020: align raw IUCN import fields with current mammal release.
-- `island` stores island names in current IUCN data; keep it source-owned text.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'iucn'
      AND column_name = 'island'
      AND data_type = 'boolean'
  ) THEN
    ALTER TABLE public.iucn
      ALTER COLUMN island TYPE text
      USING CASE
        WHEN island IS TRUE THEN 'true'
        ELSE NULL
      END;
  END IF;
END $$;

ALTER TABLE public.iucn
  ADD COLUMN IF NOT EXISTS dist_comm text;
