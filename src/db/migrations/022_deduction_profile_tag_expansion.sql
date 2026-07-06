-- Migration 022: expand deduction profiles for full gem-category filtering.

ALTER TABLE public.species_deduction_profiles
  ADD COLUMN IF NOT EXISTS geography_tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS conservation_tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS key_fact_tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS signature_tag text;

CREATE INDEX IF NOT EXISTS ix_deduction_profiles_geography
  ON public.species_deduction_profiles USING gin (geography_tags);

CREATE INDEX IF NOT EXISTS ix_deduction_profiles_conservation
  ON public.species_deduction_profiles USING gin (conservation_tags);

CREATE INDEX IF NOT EXISTS ix_deduction_profiles_key_fact
  ON public.species_deduction_profiles USING gin (key_fact_tags);
