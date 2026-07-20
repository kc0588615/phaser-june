CREATE TABLE IF NOT EXISTS public.evidence_family_cards (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  species_id integer NOT NULL REFERENCES public.species(id) ON DELETE CASCADE,
  family text NOT NULL,
  observation_text text NOT NULL,
  inference_text text NOT NULL,
  trait_category text NOT NULL,
  compare_tag text NOT NULL,
  trait_phrase text NOT NULL,
  bonus_fact_text text NOT NULL,
  source text NOT NULL,
  review_status text NOT NULL DEFAULT 'reviewed',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_evidence_family_cards_species_family UNIQUE (species_id, family),
  CONSTRAINT ck_evidence_family_cards_family
    CHECK (family IN ('relatives', 'body', 'behavior', 'habits', 'place')),
  CONSTRAINT ck_evidence_family_cards_trait_category
    CHECK (trait_category IN ('habitat', 'morphology', 'diet', 'behavior', 'reproduction', 'taxonomy', 'key_fact', 'geography', 'conservation')),
  CONSTRAINT ck_evidence_family_cards_review_status CHECK (review_status = 'reviewed')
);

CREATE INDEX IF NOT EXISTS ix_evidence_family_cards_species ON public.evidence_family_cards(species_id);
CREATE INDEX IF NOT EXISTS ix_evidence_family_cards_family ON public.evidence_family_cards(family);
CREATE INDEX IF NOT EXISTS ix_evidence_family_cards_compare_tag ON public.evidence_family_cards(compare_tag);

CREATE TABLE IF NOT EXISTS public.evidence_family_hints (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  species_id integer NOT NULL REFERENCES public.species(id) ON DELETE CASCADE,
  family text NOT NULL,
  sequence_index smallint NOT NULL,
  hint_text text NOT NULL,
  weak_tag text NOT NULL,
  review_status text NOT NULL DEFAULT 'reviewed',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_evidence_family_hints_species_family_sequence UNIQUE (species_id, family, sequence_index),
  CONSTRAINT ck_evidence_family_hints_family CHECK (family IN ('relatives', 'body', 'behavior', 'habits', 'place')),
  CONSTRAINT ck_evidence_family_hints_sequence CHECK (sequence_index BETWEEN 0 AND 9),
  CONSTRAINT ck_evidence_family_hints_review_status CHECK (review_status = 'reviewed')
);

CREATE INDEX IF NOT EXISTS ix_evidence_family_hints_species_family ON public.evidence_family_hints(species_id, family);

CREATE TABLE IF NOT EXISTS public.cascade_hints (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sequence_index smallint NOT NULL UNIQUE,
  hint_text text NOT NULL,
  review_status text NOT NULL DEFAULT 'reviewed',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_cascade_hints_sequence CHECK (sequence_index BETWEEN 0 AND 99),
  CONSTRAINT ck_cascade_hints_review_status CHECK (review_status = 'reviewed')
);
