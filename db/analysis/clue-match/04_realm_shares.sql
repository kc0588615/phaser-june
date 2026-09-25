-- Where each species lives, by biogeographic realm: the share of its IUCN range
-- in each OneEarth realm. db/realm-clues.sql turns shares of 10% or more into Range
-- clues; this query shows the numbers behind them (it takes ~20 s).
--
-- Practice: PostGIS joins (ST_Intersects), geometry math (ST_Intersection,
--           ST_Area on geography for square meters), ST_MakeValid, window
--           functions (sum() OVER (PARTITION BY ...)).
-- Question: which species sit on a realm border? What happens to their clues if
--           the 10% cut becomes 5%?
WITH playable AS (
  SELECT DISTINCT species_id FROM species_deduction_clues
), ranges AS (
  SELECT s.id AS species_id, i.wkb_geometry AS geom, i.presence
  FROM species s
  JOIN playable p ON p.species_id = s.id
  JOIN iucn i ON i.id_no = s.iucn_id
), kept AS (
  -- IUCN presence 1-3 = extant; extinct species keep their historical range.
  SELECT r.species_id, ST_MakeValid(r.geom) AS geom
  FROM ranges r
  WHERE r.presence IN (1, 2, 3)
     OR NOT EXISTS (SELECT 1 FROM ranges x WHERE x.species_id = r.species_id AND x.presence IN (1, 2, 3))
), realm_area AS (
  SELECT k.species_id, b.realm,
         sum(ST_Area(ST_Intersection(ST_MakeValid(b.wkb_geometry), k.geom)::geography)) AS area_m2
  FROM kept k
  JOIN oneearth.oneearth_bioregion b ON ST_Intersects(b.wkb_geometry, k.geom)
  GROUP BY k.species_id, b.realm
)
SELECT
  s.common_name,
  ra.realm,
  round((ra.area_m2 / 1e6)::numeric)                                            AS km2,
  round((100 * ra.area_m2 / sum(ra.area_m2) OVER (PARTITION BY ra.species_id))::numeric, 1) AS pct
FROM realm_area ra
JOIN species s ON s.id = ra.species_id
ORDER BY s.common_name, pct DESC;
