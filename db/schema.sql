-- Critter Connect: the Postgres objects the app uses, as they stand on
-- 2026-09-25. This is a baseline, not a migration history: migrations 001-044
-- were squashed into it (git log --all -- src/db/migrations).
--
-- To change the schema, apply the change (./scripts/db -1 -f change.sql), then
-- edit this file to match. On an existing database this file fails at the first
-- CREATE, inside its transaction, so running it by mistake changes nothing.
--
-- Also needed, imported from their sources and not defined here:
--   iucn                         IUCN range polygons (docs/SHAPEFILE_BEST_PRACTICES.md)
--   oneearth.oneearth_bioregion  OneEarth bioregions: realm, sub_realm, wkb_geometry
--   natural_earth.countries      Natural Earth countries (scripts/import-natural-earth.mjs)
-- Extensions: postgis, pgcrypto (init/01-extensions.sql).
BEGIN;
SET LOCAL search_path = public;

-- Content ---------------------------------------------------------------------
-- Built from db/content/ by `npm run content -- build` (docs/CONTENT_SOURCES.md).

-- Where facts come from, tier 1 (the IUCN Red List) first.
CREATE TABLE content_sources (
  id     serial PRIMARY KEY,
  key    text NOT NULL UNIQUE,
  tier   smallint NOT NULL CHECK (tier BETWEEN 1 AND 4),
  name   text NOT NULL,
  url    text NOT NULL,
  notes  text NOT NULL DEFAULT ''
);

CREATE TABLE species (
  id                 serial PRIMARY KEY,
  iucn_id            bigint NOT NULL UNIQUE,  -- joins iucn.id_no (range maps)
  scientific_name    text NOT NULL,
  common_name        text NOT NULL,
  class              text,
  taxon_order        text,
  family             text,
  genus              text,
  conservation_code  text,                    -- IUCN Red List category, e.g. 'EN'
  redlist_url        text,                    -- the species' Red List assessment
  photo_url          text,                    -- Wikimedia Commons, reusable with credit
  photo_credit       text,
  photo_license      text,
  photo_page         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- One row per clue. The gem colors map to these categories in
-- src/clueGame/categories.ts. Tagged clues (is_filtering) compare candidates.
CREATE TABLE species_deduction_clues (
  id            serial PRIMARY KEY,
  species_id    integer NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  category      text NOT NULL CHECK (category IN ('habitat', 'morphology', 'diet', 'behavior', 'reproduction', 'taxonomy', 'key_fact', 'geography', 'conservation')),
  label         text NOT NULL,
  compare_tags  text[],
  reveal_order  smallint NOT NULL DEFAULT 1,
  is_filtering  boolean NOT NULL DEFAULT true,
  source_key    text REFERENCES content_sources(key),
  source_url    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_deduction_clues_species_cat_order ON species_deduction_clues (species_id, category, reveal_order);
CREATE INDEX ix_deduction_clues_species ON species_deduction_clues (species_id);
CREATE INDEX ix_deduction_clues_category ON species_deduction_clues (species_id, category);
CREATE INDEX ix_deduction_clues_compare ON species_deduction_clues USING gin (compare_tags);

-- Fun notes, shown once a color's clues run out.
CREATE TABLE species_facts (
  id          serial PRIMARY KEY,
  species_id  integer NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  category    text NOT NULL,
  fact_text   text NOT NULL,
  sort_order  smallint NOT NULL DEFAULT 1,
  source_key  text REFERENCES content_sources(key),
  source_url  text,
  UNIQUE (species_id, category, sort_order)
);
CREATE INDEX ix_species_facts_species ON species_facts (species_id);
CREATE INDEX ix_species_facts_category ON species_facts (species_id, category);

-- Legend of the habitat raster behind the globe's habitat pictures: pixel value
-- -> IUCN habitat class and kind (e.g. 106 = Forest - Subtropical-tropical moist lowland).
CREATE TABLE habitat_colormap (
  value  integer,
  label  text
);

-- Players ---------------------------------------------------------------------

-- One row per signed-in player (a Clerk user), created on their first solve.
CREATE TABLE profiles (
  user_id        uuid PRIMARY KEY,
  clerk_user_id  text,
  created_at     timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at     timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uq_profiles_clerk_user_id ON profiles (clerk_user_id);

-- One row per solved mystery (POST /api/clue-game/solves), for analysis with SQL
-- (db/analysis/clue-match/07_solve_stats.sql). Anonymous play has no player_id.
-- The bounds match src/clueGame/solveReport.ts.
CREATE TABLE clue_match_solves (
  id               bigserial PRIMARY KEY,
  player_id        uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  session_seed     bigint NOT NULL CHECK (session_seed BETWEEN 1 AND 4294967295),
  round            smallint NOT NULL CHECK (round BETWEEN 1 AND 10000),
  species_id       integer NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  moves            smallint NOT NULL CHECK (moves BETWEEN 0 AND 10000),
  wrong_guesses    smallint NOT NULL CHECK (wrong_guesses BETWEEN 0 AND 5),
  clues_seen       smallint NOT NULL CHECK (clues_seen BETWEEN 0 AND 1000),
  relatives        smallint NOT NULL CHECK (relatives BETWEEN 0 AND 5),
  points           integer NOT NULL CHECK (points BETWEEN 0 AND 1000),
  revealed_by_gem  jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(revealed_by_gem) = 'object'),
  solved_at        timestamptz NOT NULL DEFAULT now(),
  -- clue_match_places.key when played from the globe.
  place_key        text CHECK (place_key IS NULL OR place_key ~ '^(country|area|continent):[A-Za-z0-9-]{1,80}$')
);
CREATE INDEX ix_clue_match_solves_species ON clue_match_solves (species_id);
CREATE INDEX ix_clue_match_solves_player ON clue_match_solves (player_id) WHERE player_id IS NOT NULL;
CREATE INDEX ix_clue_match_solves_place ON clue_match_solves (place_key) WHERE place_key IS NOT NULL;

-- Range maps ------------------------------------------------------------------

-- Each playable species' IUCN range as a small SVG path (lon/lat degrees, y
-- flipped as ST_AsSVG writes it), so the game never runs geometry at request
-- time. The range is the extant range (IUCN presence 1-3), or the historical
-- range for an extinct species. Specks under 0.05 square degrees are dropped (the
-- largest part always stays) and bigger ranges are simplified more. lon/lat is a
-- point inside the largest part, for a marker.
--
-- Refresh after range or clue changes (~10 s):
--   REFRESH MATERIALIZED VIEW CONCURRENTLY clue_match_ranges;
CREATE MATERIALIZED VIEW clue_match_ranges AS
WITH playable AS (
  SELECT DISTINCT species_id FROM species_deduction_clues
), ranges AS (
  SELECT s.id AS species_id, i.wkb_geometry AS geom, i.presence
  FROM species s
  JOIN playable p ON p.species_id = s.id
  JOIN iucn i ON i.id_no = s.iucn_id
), kept AS (
  SELECT r.species_id, ST_MakeValid(r.geom) AS geom
  FROM ranges r
  WHERE r.presence IN (1, 2, 3)
     OR NOT EXISTS (SELECT 1 FROM ranges x WHERE x.species_id = r.species_id AND x.presence IN (1, 2, 3))
), merged AS (
  SELECT species_id, ST_Union(geom) AS geom FROM kept GROUP BY species_id
), parts AS (
  SELECT species_id, part, ST_Area(part) AS area, max(ST_Area(part)) OVER (PARTITION BY species_id) AS biggest
  FROM (SELECT species_id, (ST_Dump(geom)).geom AS part FROM merged) dumped
), shapes AS (
  SELECT species_id,
         ST_Collect(part) FILTER (WHERE area >= 0.05 OR area = biggest) AS geom,
         (array_agg(part ORDER BY area DESC))[1] AS main_part
  FROM parts
  GROUP BY species_id
)
SELECT sh.species_id,
       ST_AsSVG(ST_SimplifyPreserveTopology(sh.geom, LEAST(0.3, GREATEST(0.01, sqrt(ST_Area(sh.geom)) / 30))), 0, 1) AS svg_path,
       round(ST_X(ST_PointOnSurface(sh.main_part))::numeric, 2)::float8 AS lon,
       round(ST_Y(ST_PointOnSurface(sh.main_part))::numeric, 2)::float8 AS lat,
       round(ST_Area(m.geom::geography) / 1e6)::bigint AS area_km2
FROM shapes sh
JOIN merged m USING (species_id);

-- Unique, so the view can refresh CONCURRENTLY (readers keep the old rows meanwhile).
CREATE UNIQUE INDEX clue_match_ranges_species_id ON clue_match_ranges (species_id);

-- Globe places ----------------------------------------------------------------

-- One row per continent, country (natural_earth.countries) and wildlife area
-- (OneEarth bioregion, the sub_realm level) where at least two playable animals
-- live. An animal lives in a place when the place holds at least 5% of its
-- range, or at least 5,000 km² of it (so a big range brushing a border doesn't
-- count). Ranges as in clue_match_ranges.
--
-- Natural Earth files all of Russia under Europe and French Guiana under France,
-- which would put tigers in Europe and Amazon frogs in France. So Russia is split
-- at the Urals (60°E: west is Europe, east is Asia, and Russia is listed under
-- Asia), and France's overseas parts count for the continent they sit on, not
-- for France.
--
-- bbox and center use the place's largest part, so France flies to France, not
-- to a box that also holds French Guiana. outline is simplified for drawing.
--
-- Refresh after range, clue-species or place changes (~90 s):
--   REFRESH MATERIALIZED VIEW CONCURRENTLY clue_match_places;
CREATE MATERIALIZED VIEW clue_match_places AS
WITH playable AS (
  SELECT DISTINCT species_id FROM species_deduction_clues
), ranges AS (
  SELECT s.id AS species_id, i.wkb_geometry AS geom, i.presence
  FROM species s
  JOIN playable p ON p.species_id = s.id
  JOIN iucn i ON i.id_no = s.iucn_id
), kept AS (
  SELECT r.species_id, ST_Union(ST_MakeValid(r.geom)) AS geom
  FROM ranges r
  WHERE r.presence IN (1, 2, 3)
     OR NOT EXISTS (SELECT 1 FROM ranges x WHERE x.species_id = r.species_id AND x.presence IN (1, 2, 3))
  GROUP BY r.species_id
), country_parts AS (
  -- Each polygon of each country, with the continent it actually sits on.
  SELECT c.adm0_a3, c.name, c.continent AS home, d.geom,
         CASE
           WHEN c.adm0_a3 = 'FRA' AND ST_X(ST_Centroid(d.geom)) < -30 THEN 'South America'
           WHEN c.adm0_a3 = 'FRA' AND ST_X(ST_Centroid(d.geom)) > 40 THEN 'Africa'
           ELSE c.continent
         END AS continent
  FROM natural_earth.countries c
  CROSS JOIN LATERAL ST_Dump(ST_MakeValid(c.geom)) d
  WHERE c.continent NOT IN ('Seven seas (open ocean)', 'Antarctica') AND c.adm0_a3 <> 'RUS'
  UNION ALL
  SELECT c.adm0_a3, c.name, 'Asia', ST_Intersection(ST_MakeValid(c.geom), ST_MakeEnvelope(60, -90, 180, 90, 4326)), 'Asia'
  FROM natural_earth.countries c WHERE c.adm0_a3 = 'RUS'
  UNION ALL
  SELECT c.adm0_a3, c.name, 'Asia', ST_Intersection(ST_MakeValid(c.geom), ST_MakeEnvelope(-180, -90, 60, 90, 4326)), 'Europe'
  FROM natural_earth.countries c WHERE c.adm0_a3 = 'RUS'
), areas AS (
  SELECT 'country'::text AS kind, 'country:' || adm0_a3 AS key, name, home AS grp, ST_Union(geom) AS geom
  FROM country_parts
  WHERE continent = home OR adm0_a3 = 'RUS'
  GROUP BY adm0_a3, name, home
  UNION ALL
  SELECT 'continent', 'continent:' || lower(replace(continent, ' ', '-')), continent, 'Continents', ST_Union(geom)
  FROM country_parts
  GROUP BY continent
  UNION ALL
  SELECT 'wildlife_area', 'area:' || lower(regexp_replace(b.sub_realm, '[^A-Za-z0-9]+', '-', 'g')), b.sub_realm, min(b.realm), ST_Union(ST_MakeValid(b.wkb_geometry))
  FROM oneearth.oneearth_bioregion b
  WHERE btrim(coalesce(b.sub_realm, '')) <> ''
  GROUP BY b.sub_realm
), lives_in AS (
  SELECT a.key, k.species_id
  FROM areas a
  JOIN kept k ON ST_Intersects(a.geom, k.geom)
  WHERE ST_Area(ST_Intersection(a.geom, k.geom)::geography) >= LEAST(0.05 * ST_Area(k.geom::geography), 5e9)
), place_species AS (
  SELECT key, array_agg(species_id ORDER BY species_id) AS species_ids
  FROM lives_in
  GROUP BY key
  HAVING count(*) >= 2
), largest AS (
  SELECT a.key, (SELECT d.geom FROM ST_Dump(a.geom) d ORDER BY ST_Area(d.geom) DESC LIMIT 1) AS part
  FROM areas a
  JOIN place_species ps USING (key)
)
SELECT a.kind, a.key, a.name, a.grp,
       ps.species_ids,
       round(ST_XMin(l.part)::numeric, 3)::float8 AS west,
       round(ST_YMin(l.part)::numeric, 3)::float8 AS south,
       round(ST_XMax(l.part)::numeric, 3)::float8 AS east,
       round(ST_YMax(l.part)::numeric, 3)::float8 AS north,
       round(ST_X(ST_PointOnSurface(l.part))::numeric, 3)::float8 AS lon,
       round(ST_Y(ST_PointOnSurface(l.part))::numeric, 3)::float8 AS lat,
       ST_SimplifyPreserveTopology(a.geom, LEAST(0.1, GREATEST(0.01, sqrt(ST_Area(a.geom)) / 100))) AS outline
FROM areas a
JOIN place_species ps USING (key)
JOIN largest l USING (key);

CREATE UNIQUE INDEX clue_match_places_key ON clue_match_places (key);

COMMIT;
