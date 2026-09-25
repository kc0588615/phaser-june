-- A map layer for QGIS: each playable species' range (the one the game uses),
-- with its realm clues, ready to style by realm or by species.
--
-- In QGIS: Database > DB Manager > PostGIS > your connection > SQL Window, paste
-- this, Execute, tick "Load as new layer", geometry column = geom, unique id =
-- species_id. Put it over the oneearth.oneearth_bioregion layer (realm field) to
-- see why a species got its Range clues.
--
-- Practice: ST_Union to merge polygons, string_agg, casting.
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
)
SELECT
  s.id AS species_id,
  s.common_name,
  s.scientific_name,
  s.conservation_code,
  (SELECT string_agg(c.label, ' | ' ORDER BY c.reveal_order)
     FROM species_deduction_clues c
    WHERE c.species_id = s.id AND c.category = 'geography' AND c.compare_tags::text LIKE '%realm:%') AS realm_clues,
  ST_Multi(ST_Union(k.geom))::geometry(MultiPolygon, 4326) AS geom
FROM kept k
JOIN species s ON s.id = k.species_id
GROUP BY s.id, s.common_name, s.scientific_name, s.conservation_code;
