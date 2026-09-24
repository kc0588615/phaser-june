-- Clue Match content fixes found by `npm run clue:pool -- --check`.
-- Idempotent; species are found by scientific name so this replays on any database.
BEGIN;
SET LOCAL search_path = public;

-- Purple Frog: behavior 2 says males call, so "buried and silent" is not voiceless.
UPDATE species_deduction_clues
SET compare_tags = ARRAY['burrower', 'ambush_predator']
WHERE species_id = (SELECT id FROM species WHERE scientific_name = 'Nasikabatrachus sahyadrensis')
  AND category = 'behavior' AND reveal_order = 1;

-- Tiger and Addax: replace the untagged "mammalian genus" placeholder with a real
-- class/order clue, revealed first (broad), and move the family clue second.
UPDATE species_deduction_clues SET reveal_order = 9
WHERE category = 'taxonomy' AND reveal_order = 1 AND compare_tags && ARRAY['family:felidae', 'family:bovidae']
  AND species_id IN (SELECT id FROM species WHERE scientific_name IN ('Panthera tigris', 'Addax nasomaculatus'));

UPDATE species_deduction_clues c
SET reveal_order = 1, label = v.label, compare_tags = v.tags, is_filtering = true
FROM species s, (VALUES
  ('Panthera tigris', 'Class: MAMMALIA, Order: CARNIVORA', ARRAY['mammalia', 'carnivora']),
  ('Addax nasomaculatus', 'Class: MAMMALIA, Order: ARTIODACTYLA', ARRAY['mammalia', 'artiodactyla'])
) AS v(scientific_name, label, tags)
WHERE s.scientific_name = v.scientific_name AND c.species_id = s.id
  AND c.category = 'taxonomy' AND c.reveal_order = 2 AND c.label = 'Its classification includes a mammalian genus.';

UPDATE species_deduction_clues SET reveal_order = 2
WHERE category = 'taxonomy' AND reveal_order = 9
  AND species_id IN (SELECT id FROM species WHERE scientific_name IN ('Panthera tigris', 'Addax nasomaculatus'));

-- Tiger and Addax had no habitat clues at all.
INSERT INTO species_deduction_clues (species_id, category, label, compare_tags, reveal_order, is_filtering)
SELECT s.id, 'habitat', v.label, v.tags, v.reveal_order, true
FROM species s
JOIN (VALUES
  ('Panthera tigris', 'Lives in forests, grasslands and mangrove swamps.', ARRAY['forest', 'grassland', 'wetland', 'terrestrial'], 1),
  ('Panthera tigris', 'Needs thick cover to stalk its prey unseen.', ARRAY['forest', 'terrestrial'], 2),
  ('Addax nasomaculatus', 'Lives in sandy and stony deserts.', ARRAY['arid', 'terrestrial'], 1),
  ('Addax nasomaculatus', 'Roams open desert far from any water.', ARRAY['arid', 'terrestrial'], 2)
) AS v(scientific_name, label, tags, reveal_order) ON s.scientific_name = v.scientific_name
ON CONFLICT (species_id, category, reveal_order) DO NOTHING;

COMMIT;
