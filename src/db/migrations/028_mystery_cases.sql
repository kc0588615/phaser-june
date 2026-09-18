-- Apply atomically with ./scripts/db -1 -f <file>.
CREATE TABLE IF NOT EXISTS mystery_cases (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pool_id       bigint  NOT NULL REFERENCES case_pools(id) ON DELETE CASCADE,
  species_id    integer NOT NULL REFERENCES species(id)    ON DELETE CASCADE,
  slug          text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title         text NOT NULL,
  incident      text NOT NULL,
  atmosphere    text NOT NULL,
  question      text NOT NULL,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'reviewed')),
  UNIQUE (pool_id, species_id)
);

CREATE TABLE IF NOT EXISTS mystery_explanations (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_id     bigint NOT NULL REFERENCES mystery_cases(id) ON DELETE CASCADE,
  slug        text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label       text NOT NULL,
  description text NOT NULL,   -- public
  feedback    text NOT NULL,   -- private
  is_answer   boolean NOT NULL DEFAULT false,
  sort_order  smallint NOT NULL,
  UNIQUE (case_id, slug),
  UNIQUE (case_id, sort_order)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mystery_one_answer ON mystery_explanations (case_id) WHERE is_answer;

CREATE TABLE IF NOT EXISTS mystery_resolutions (
  case_id         bigint PRIMARY KEY REFERENCES mystery_cases(id) ON DELETE CASCADE,
  headline        text NOT NULL,
  diagnosis       text NOT NULL,
  ecological_role text NOT NULL,
  taxonomy        text NOT NULL,
  misconception   text NOT NULL
);

CREATE TABLE IF NOT EXISTS mystery_evidence_steps (
  case_id        bigint   NOT NULL REFERENCES mystery_cases(id) ON DELETE CASCADE,
  sequence_index smallint NOT NULL CHECK (sequence_index BETWEEN 0 AND 9),
  step_text      text NOT NULL,
  PRIMARY KEY (case_id, sequence_index)
);

CREATE TABLE IF NOT EXISTS mystery_rejected_alternatives (
  case_id        bigint   NOT NULL REFERENCES mystery_cases(id) ON DELETE CASCADE,
  sequence_index smallint NOT NULL CHECK (sequence_index BETWEEN 0 AND 9),
  alternative_text text NOT NULL,
  PRIMARY KEY (case_id, sequence_index)
);

CREATE TABLE IF NOT EXISTS mystery_sources (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_id bigint NOT NULL REFERENCES mystery_cases(id) ON DELETE CASCADE,
  label   text NOT NULL,
  url     text NOT NULL CHECK (url LIKE 'https://%')
);

CREATE OR REPLACE VIEW mystery_cases_public AS
SELECT c.id AS case_id, c.pool_id, c.species_id, c.slug, c.title, c.incident, c.atmosphere, c.question,
       e.slug AS explanation_slug, e.label, e.description, e.sort_order
FROM mystery_cases c
JOIN mystery_explanations e ON e.case_id = c.id
WHERE c.review_status = 'reviewed';
