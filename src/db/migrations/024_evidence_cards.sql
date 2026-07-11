-- Migration 024: evidence cards for server-compiled investigation cases.

CREATE TABLE IF NOT EXISTS public.evidence_cards (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  species_id integer NOT NULL,
  method text NOT NULL,
  observation_text text NOT NULL,
  inference_text text NOT NULL,
  trait_category text NOT NULL,
  primary_predicate text NOT NULL,
  compare_tags text[] NOT NULL,
  is_signature boolean NOT NULL DEFAULT false,
  specificity smallint NOT NULL DEFAULT 2,
  source text,
  review_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_evidence_cards_species
    FOREIGN KEY (species_id) REFERENCES public.species(id) ON DELETE CASCADE,
  CONSTRAINT ck_evidence_cards_method
    CHECK (method IN ('track', 'observe', 'listen', 'survey', 'analyze')),
  CONSTRAINT ck_evidence_cards_trait_category
    CHECK (trait_category IN (
      'habitat',
      'morphology',
      'diet',
      'behavior',
      'reproduction',
      'taxonomy',
      'key_fact',
      'geography',
      'conservation'
    )),
  CONSTRAINT ck_evidence_cards_compare_tags_atomic
    CHECK (cardinality(compare_tags) = 1),
  CONSTRAINT ck_evidence_cards_specificity
    CHECK (specificity BETWEEN 1 AND 3)
);

CREATE INDEX IF NOT EXISTS ix_evidence_cards_species
  ON public.evidence_cards (species_id);

CREATE INDEX IF NOT EXISTS ix_evidence_cards_species_method
  ON public.evidence_cards (species_id, method);

CREATE INDEX IF NOT EXISTS ix_evidence_cards_compare
  ON public.evidence_cards USING gin (compare_tags);
