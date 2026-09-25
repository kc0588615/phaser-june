-- Range clues computed from range maps, so the blue gem narrows the candidates
-- too. Run it after adding species (it skips species that already have realm
-- clues), then refresh the views (db/schema.sql):
--   ./scripts/db -f db/realm-clues.sql
--
-- Each playable species' IUCN range (iucn, joined on species.iucn_id = iucn.id_no)
-- is split by OneEarth biogeographic realm (oneearth.oneearth_bioregion). Every
-- realm holding at least 10% of the range becomes one Range clue, biggest share
-- first ("Lives in Africa south of the Sahara (the Afrotropical realm).") tagged
-- realm:<key>. The 10% cut drops slivers where a range map brushes a neighboring
-- realm. A range too small to touch any realm polygon (a tiny island) takes the
-- nearest realm. Existing Range notes move after the new clues.
--
-- Every species gets its realms from the same data, so the game treats realms as
-- complete: a candidate that lives in other realms but not this one is ruled out
-- (src/clueGame/traits.ts, complete families).
--
-- To redo one species, delete its realm clues (compare_tags && ARRAY['realm:...'])
-- and rerun.
BEGIN;
SET LOCAL search_path = public;

CREATE TEMP TABLE kept_range ON COMMIT DROP AS
WITH playable AS (
  SELECT DISTINCT species_id FROM species_deduction_clues
), ranges AS (
  SELECT s.id AS species_id, i.wkb_geometry AS geom, i.presence
  FROM species s
  JOIN playable p ON p.species_id = s.id
  JOIN iucn i ON i.id_no = s.iucn_id
)
-- Where it lives now (IUCN presence 1-3: extant, probably, possibly extant);
-- an extinct species keeps its historical range.
SELECT r.species_id, ST_MakeValid(r.geom) AS geom
FROM ranges r
WHERE r.presence IN (1, 2, 3)
   OR NOT EXISTS (SELECT 1 FROM ranges x WHERE x.species_id = r.species_id AND x.presence IN (1, 2, 3));

CREATE TEMP TABLE realm_share ON COMMIT DROP AS
WITH realm_area AS (
  SELECT k.species_id, b.realm,
         sum(ST_Area(ST_Intersection(ST_MakeValid(b.wkb_geometry), k.geom)::geography)) AS area_m2
  FROM kept_range k
  JOIN oneearth.oneearth_bioregion b ON ST_Intersects(b.wkb_geometry, k.geom)
  GROUP BY k.species_id, b.realm
)
SELECT species_id, realm, area_m2 / sum(area_m2) OVER (PARTITION BY species_id) AS share
FROM realm_area;

-- A tiny island range can miss every realm polygon: take the nearest one
-- (<-> is PostGIS's distance operator, used for nearest-neighbor ORDER BY).
INSERT INTO realm_share (species_id, realm, share)
SELECT k.species_id,
       (SELECT b.realm FROM oneearth.oneearth_bioregion b ORDER BY b.wkb_geometry <-> k.geom LIMIT 1),
       1.0
FROM (SELECT species_id, ST_Collect(geom) AS geom FROM kept_range GROUP BY species_id) k
WHERE NOT EXISTS (SELECT 1 FROM realm_share r WHERE r.species_id = k.species_id);

CREATE TEMP TABLE realm_clue ON COMMIT DROP AS
SELECT r.species_id,
       v.tag,
       (CASE WHEN rank() OVER w = 1 THEN 'Lives in ' ELSE 'Also lives in ' END)
         || v.place || ' (the ' || v.adjective || ' realm).' AS label,
       rank() OVER w AS reveal_order
FROM realm_share r
JOIN (VALUES
  ('Nearctic',    'realm:nearctic',     'North America',                        'Nearctic'),
  ('Neotropics',  'realm:neotropical',  'Central or South America',             'Neotropical'),
  ('Palearctic',  'realm:palearctic',   'Europe, North Africa or northern Asia', 'Palearctic'),
  ('Afrotropics', 'realm:afrotropical', 'Africa south of the Sahara',           'Afrotropical'),
  ('IndoMalay',   'realm:indomalayan',  'South or Southeast Asia',              'Indomalayan'),
  ('Australasia', 'realm:australasian', 'Australia or New Guinea',              'Australasian'),
  ('Oceania',     'realm:oceanian',     'the Pacific islands',                  'Oceanian'),
  ('Antarctic',   'realm:antarctic',    'Antarctica',                           'Antarctic')
) AS v(realm, tag, place, adjective) ON v.realm = r.realm
WHERE r.share >= 0.10
  AND NOT EXISTS (
    SELECT 1 FROM species_deduction_clues c
    WHERE c.species_id = r.species_id AND c.category = 'geography'
      AND c.compare_tags && ARRAY['realm:nearctic', 'realm:neotropical', 'realm:palearctic', 'realm:afrotropical',
                                  'realm:indomalayan', 'realm:australasian', 'realm:oceanian', 'realm:antarctic'])
WINDOW w AS (PARTITION BY r.species_id ORDER BY r.share DESC, v.tag);

-- Existing Range notes move after the realm clues. Two steps keep
-- (species_id, category, reveal_order) unique throughout.
UPDATE species_deduction_clues c
SET reveal_order = c.reveal_order + 100
WHERE c.category = 'geography' AND c.species_id IN (SELECT species_id FROM realm_clue);

UPDATE species_deduction_clues c
SET reveal_order = c.reveal_order - 100 + (SELECT count(*) FROM realm_clue r WHERE r.species_id = c.species_id)
WHERE c.category = 'geography' AND c.reveal_order > 100 AND c.species_id IN (SELECT species_id FROM realm_clue);

INSERT INTO species_deduction_clues (species_id, category, label, compare_tags, reveal_order, is_filtering)
SELECT species_id, 'geography', label, ARRAY[tag], reveal_order, true
FROM realm_clue;

COMMIT;
