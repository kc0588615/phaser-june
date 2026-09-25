-- Clue Match: range maps for the reveal card and field journal.
--
-- A materialized view caches each playable species' IUCN range as a small SVG
-- path (lon/lat degrees, y flipped as ST_AsSVG does), so the game never runs
-- geometry at request time. Same range rules as migration 039: extant range
-- (IUCN presence 1-3), or the historical range for an extinct species.
-- Specks under 0.05 square degrees are dropped (a world map can't show them;
-- the largest part always stays) and the outline is simplified more for bigger
-- ranges. lon/lat is a point inside the largest part, for a marker.
--
-- Refresh after range or clue changes (runs the geometry again, ~10 s):
--   REFRESH MATERIALIZED VIEW CONCURRENTLY clue_match_ranges;
BEGIN;
SET LOCAL search_path = public;

CREATE MATERIALIZED VIEW IF NOT EXISTS clue_match_ranges AS
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
CREATE UNIQUE INDEX IF NOT EXISTS clue_match_ranges_species_id ON clue_match_ranges (species_id);

COMMIT;
