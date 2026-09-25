-- Clue Match: places to explore from the globe. One row per continent, country
-- (natural_earth.countries) and wildlife area (OneEarth bioregion, the
-- `sub_realm` level of oneearth.oneearth_bioregion) where at least two playable
-- animals live. An animal lives in a place when the place holds at least 5% of
-- its range, or at least 5,000 km² of it (so a big range brushing a border
-- doesn't count). Ranges follow migrations 039/040: IUCN presence 1-3, or the
-- historical range for an extinct species.
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
-- Takes about 90 s. Refresh after range, clue-species or place changes:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY clue_match_places;
BEGIN;
SET LOCAL search_path = public;

CREATE MATERIALIZED VIEW IF NOT EXISTS clue_match_places AS
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

-- Unique, so the view can refresh CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS clue_match_places_key ON clue_match_places (key);

COMMIT;
