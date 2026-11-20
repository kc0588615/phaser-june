-- Critter Connect: the Postgres objects the app uses. A baseline taken on 2026-09-25
-- and edited to match each change since, not a migration history: migrations 001-044
-- were squashed into it (git log --all -- src/db/migrations).
--
-- To change the schema, apply the change (./scripts/db -1 -f change.sql), then
-- edit this file to match. On an existing database this file fails at the first
-- CREATE, inside its transaction, so running it by mistake changes nothing.
--
-- Also needed, imported from their sources and not defined here:
--   iucn                         IUCN range polygons (docs/SHAPEFILE_BEST_PRACTICES.md)
--   oneearth.oneearth_bioregion  OneEarth bioregions: realm, wkb_geometry
--   natural_earth.countries      Natural Earth countries (scripts/import-natural-earth.mjs)
-- Extensions: postgis. init/01-extensions.sql also installs pgcrypto, which no SQL in the repo calls.
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

-- Fun facts: field notes in the field guide, after the hand-written clues (src/clueGame/questionMatchContent.ts).
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

-- Range maps ------------------------------------------------------------------

-- Each playable species' IUCN range as a small SVG path (lon/lat degrees, y
-- flipped as ST_AsSVG writes it), so the game never runs geometry at request
-- time. The range is the extant range (IUCN presence 1-2), or the historical
-- range for an extinct species. Specks under 0.05 square degrees are dropped (the
-- largest part always stays) and bigger ranges are simplified more. geojson is
-- the same shape for the globe (SVG can't tell holes from parts). lon/lat is a
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
  WHERE r.presence IN (1, 2)
     OR NOT EXISTS (SELECT 1 FROM ranges x WHERE x.species_id = r.species_id AND x.presence IN (1, 2))
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
), simple AS (
  SELECT species_id, main_part, ST_SimplifyPreserveTopology(geom, LEAST(0.3, GREATEST(0.01, sqrt(ST_Area(geom)) / 30))) AS geom
  FROM shapes
)
SELECT sh.species_id,
       ST_AsSVG(sh.geom, 0, 1) AS svg_path,
       ST_AsGeoJSON(sh.geom, 1) AS geojson,
       round(ST_X(ST_PointOnSurface(sh.main_part))::numeric, 2)::float8 AS lon,
       round(ST_Y(ST_PointOnSurface(sh.main_part))::numeric, 2)::float8 AS lat,
       round(ST_Area(m.geom::geography) / 1e6)::bigint AS area_km2
FROM simple sh
JOIN merged m USING (species_id);

-- Unique, so the view can refresh CONCURRENTLY (readers keep the old rows meanwhile).
CREATE UNIQUE INDEX clue_match_ranges_species_id ON clue_match_ranges (species_id);

-- Globe places ----------------------------------------------------------------

-- One row per continent (built from natural_earth.countries) where at least two
-- playable animals live. An animal lives in a place when the place holds at
-- least 5% of its range, or at least 5,000 km² of it (so a big range brushing a
-- border doesn't count). Ranges as in clue_match_ranges.
-- scripts/content.ts (content -- ranges) builds its countries from the same country parts (Russia split at 60°E, Indonesia split along Lydekker's Line, France's overseas parts, no open ocean or Antarctica) with the same 5% or 5,000 km² rule: change both together. country_parts below is its copy, unused columns included, so the two read alike.
--
-- Natural Earth files all of Russia under Europe and French Guiana under France,
-- which would put tigers and Amazon frogs in Europe. So Russia is split at the
-- Urals (60°E: west is Europe, east is Asia), and France's overseas parts count
-- for the continent they sit on. It also files all of Indonesia under Asia, so
-- its parts east of Lydekker's Line (> 133.2°E, or > 130°E north of 3.5°S: New
-- Guinea, Raja Ampat, Aru) become IDP, Indonesian New Guinea, in Oceania (the
-- project's own code; regions.ts names it). Ranges are IUCN presence 1-2.
--
-- bbox and center use the continent's largest part. outline is simplified for drawing.
--
-- Refresh after range, clue-species or place changes (about 45 s, dev copy 2026-11-15):
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
  WHERE r.presence IN (1, 2)
     OR NOT EXISTS (SELECT 1 FROM ranges x WHERE x.species_id = r.species_id AND x.presence IN (1, 2))
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
  WHERE c.continent NOT IN ('Seven seas (open ocean)', 'Antarctica') AND c.adm0_a3 NOT IN ('RUS', 'IDN')
  UNION ALL
  SELECT c.adm0_a3, c.name, 'Asia', ST_Intersection(ST_MakeValid(c.geom), ST_MakeEnvelope(60, -90, 180, 90, 4326)), 'Asia'
  FROM natural_earth.countries c WHERE c.adm0_a3 = 'RUS'
  UNION ALL
  SELECT c.adm0_a3, c.name, 'Asia', ST_Intersection(ST_MakeValid(c.geom), ST_MakeEnvelope(-180, -90, 60, 90, 4326)), 'Europe'
  FROM natural_earth.countries c WHERE c.adm0_a3 = 'RUS'
  UNION ALL
  -- Indonesia west of Lydekker's Line (Sumatra through Maluku/Wallacea: Seram, Halmahera, Gorong/Watubela, Kai, Tanimbar) stays Asia.
  SELECT c.adm0_a3, c.name, c.continent, d.geom, c.continent
  FROM natural_earth.countries c CROSS JOIN LATERAL ST_Dump(ST_MakeValid(c.geom)) d
  WHERE c.adm0_a3 = 'IDN'
    AND NOT (ST_X(ST_Centroid(d.geom)) > 133.2 OR (ST_X(ST_Centroid(d.geom)) > 130 AND ST_Y(ST_Centroid(d.geom)) > -3.5))
  UNION ALL
  -- Its parts east of Lydekker's Line (mainland Papua, Raja Ampat, Cenderawasih Bay, Adi/Karas, Aru) are Oceania,
  -- under the project code IDP (regions.ts: melanesia). Same name literal as regions.ts.
  SELECT 'IDP', 'Indonesian New Guinea', 'Oceania', d.geom, 'Oceania'
  FROM natural_earth.countries c CROSS JOIN LATERAL ST_Dump(ST_MakeValid(c.geom)) d
  WHERE c.adm0_a3 = 'IDN'
    AND (ST_X(ST_Centroid(d.geom)) > 133.2 OR (ST_X(ST_Centroid(d.geom)) > 130 AND ST_Y(ST_Centroid(d.geom)) > -3.5))
), areas AS (
  SELECT 'continent'::text AS kind, 'continent:' || lower(replace(continent, ' ', '-')) AS key, continent AS name, 'Continents' AS grp, ST_Union(geom) AS geom
  FROM country_parts
  GROUP BY continent
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

-- Recreating a view drops its grants; give the app role (deploy/db/app-role.sql)
-- its read back, or /api/places returns 500.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'critter_app') THEN
    GRANT SELECT ON clue_match_places, clue_match_ranges TO critter_app;
  END IF;
END $$;

COMMIT;
