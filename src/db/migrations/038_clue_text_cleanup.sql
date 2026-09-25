-- Clue Match text cleanup: what players read should be complete, plain and
-- consistent. Found by reviewing every clue and fact (`npm run clue:pool -- --check`
-- now flags the same problems).
--
--   1. Delete placeholder facts ("None", "N/A") that showed up as notes.
--   2. Rewrite habitat openers that said "freshwater aquatic environments" for
--      species whose tags say forest, mountains or land; fix text an old import
--      cut off at 100 characters or garbled (lost dashes and apostrophes).
--   3. Spell out Red List codes ("Status: EN." -> "Status: Endangered.").
--   4. Capitalize consistently: "Class: REPTILIA" -> "Class: Reptilia",
--      "Diet type: insectivore" -> "Diet type: Insectivore".
--
-- Idempotent: each rewrite matches the exact old text (or pattern), so replaying
-- this file changes nothing. Species are matched by scientific name.
BEGIN;
SET LOCAL search_path = public;

-- 1. Placeholder facts.
DELETE FROM species_facts WHERE lower(btrim(fact_text)) IN ('none', 'n/a', 'unknown', '');

-- 2. Clue rewrites: (scientific name, category, reveal order, old label, new label).
UPDATE species_deduction_clues c
SET label = v.new_label
FROM species s, (VALUES
  ('Emydoidea blandingii', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in wetlands, moving between the water and land.'),
  ('Apalone spinifera', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in rivers, lakes and wetlands, and basks on land.'),
  ('Rhinoderma darwinii', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in cool, temperate forests near streams and bogs.'),
  ('Platysternon megacephalum', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in rocky mountain streams in forests.'),
  ('Rhacophorus nigropalmatus', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in tropical rainforests and breeds at forest pools.'),
  ('Agalychnis callidryas', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in tropical rainforests near ponds and streams.'),
  ('Trichobatrachus robustus', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in forests along fast-flowing rivers.'),
  ('Ascaphus truei', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in cold mountain streams in forests.'),
  ('Dendrobates tinctorius', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives on the floor of tropical rainforests near water.'),
  ('Pipa pipa', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in still and slow water in forests and swamps.'),
  ('Conraua goliath', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in and beside fast, rocky rivers.'),
  ('Heosemys spinosa', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in hilly rainforests near streams.'),
  ('Dyscophus antongilii', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in lowland forests, swamps and shallow pools.'),
  ('Nasikabatrachus sahyadrensis', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in forests near streams, mostly underground.'),
  ('Carettochelys insculpta', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in tropical rivers, lagoons and lakes.'),
  ('Rafetus swinhoei', 'habitat', 1, 'Lives in freshwater aquatic environments',
   'Lives in large rivers and lakes.'),
  ('Breviceps macrops', 'habitat', 1, 'Exclusively land-dwelling',
   'Lives only on land, in dry coastal dunes and scrub.'),
  ('Malacochersus tornieri', 'habitat', 1, 'Exclusively land-dwelling',
   'Lives only on land, in dry rocky scrubland.'),
  ('Chelonoidis niger', 'habitat', 1, 'Exclusively land-dwelling',
   'Lives only on land, on dry volcanic islands.'),
  ('Centrochelys sulcata', 'habitat', 1, 'Exclusively land-dwelling',
   'Lives only on land, in dry grassland and scrub.'),
  ('Astrochelys radiata', 'habitat', 1, 'Exclusively land-dwelling',
   'Lives only on land, in dry spiny forest.'),
  ('Chelonoidis abingdonii', 'habitat', 1, 'Exclusively land-dwelling',
   'Lived only on land, in the forests of a volcanic island.'),
  ('Platysternon megacephalum', 'conservation', 1, 'Status: CR. Intense demand for the pet, food and traditional-medicine trades has decimated populations across it',
   'Status: Critically Endangered. Demand for the pet, food and traditional-medicine trades has wiped out populations across its range.'),
  ('Carettochelys insculpta', 'conservation', 1, 'Status: EN. Populations declining due to illegal egg and adult harvest for pet and meat trade, habitat alteratio',
   'Status: Endangered. Populations are declining due to illegal egg and adult harvest for the pet and meat trade, and habitat change.'),
  ('Rafetus swinhoei', 'conservation', 1, 'Status: CR. With only one confirmed male in China and  3 turtles in Vietnam, species is functionally extinct; in',
   'Status: Critically Endangered. With one confirmed male in China and no more than three turtles in Vietnam, the species is functionally extinct.'),
  ('Chelonoidis abingdonii', 'conservation', 1, 'Status: EX. Classified as Extinct (EX) by IUCN. Efforts are underway to ''resurrect'' the lineage using recently f',
   'Status: Extinct. Efforts are underway to bring back the lineage using hybrid tortoises found recently.'),
  ('Malacochersus tornieri', 'conservation', 1, 'Status: CR. Over-collection for pet trade & habitat clearing have cut numbers >80 % in 30 yrs.',
   'Status: Critically Endangered. Collecting for the pet trade and habitat clearing have cut numbers by more than 80% in 30 years.'),
  ('Heosemys spinosa', 'conservation', 1, 'Status: EN. Illegal pet trade and habitat loss have cut wild numbers by >50 % in three generations',
   'Status: Endangered. Illegal pet trade and habitat loss have cut wild numbers by more than half in three generations.'),
  ('Chelonoidis niger', 'conservation', 1, 'Status: VU. Head-starting and predator eradication have raised wild numbers from ~3 000 in the 1970s to > 15 000',
   'Status: Vulnerable. Raising young tortoises safely and removing invasive predators have raised wild numbers from about 3,000 in the 1970s to more than 15,000.'),
  ('Malacochersus tornieri', 'habitat', 2, 'Flat-shelled climber that wedges into narrow rock cracks on sun-baked hillsides 301 800 m a.s.l.',
   'Flat-shelled climber that wedges into narrow rock cracks on sun-baked hillsides 30–1,800 m above sea level.'),
  ('Malacochersus tornieri', 'reproduction', 1, 'Reproduction: Oviparous. Clutch: 1 egg per clutch, repeated every 48 wks in season. Lifespan: 30 years',
   'Reproduction: Oviparous. Clutch: 1 egg per clutch, laid every 4–8 weeks in season. Lifespan: 30 years'),
  ('Heosemys spinosa', 'reproduction', 1, 'Reproduction: Oviparous (egg-laying). Clutch: 14 eggs per clutch; up to 3 clutches yr. Lifespan: 40 years',
   'Reproduction: Oviparous (egg-laying). Clutch: 1–4 eggs per clutch; up to 3 clutches a year. Lifespan: 40 years'),
  ('Carettochelys insculpta', 'geography', 1, 'Elevation 0150 m; distribution fragmented into several large river basins across southern New Guinea and the Top End of Australia.',
   'Elevation 0–150 m; distribution fragmented into several large river basins across southern New Guinea and the Top End of Australia.'),
  ('Rafetus swinhoei', 'geography', 1, 'Confirmed remnant sites: Suzhou Zoo (China), Dong Mo & Xuan Khanh Lakes (Vietnam); elevation  0100 m.',
   'Confirmed remnant sites: Suzhou Zoo (China), Dong Mo & Xuan Khanh Lakes (Vietnam); elevation 0–100 m.'),
  ('Chelonoidis niger', 'diet', 2, 'Plant diet: Grasses, forbs, cactus pads, fallen fruit; can survive > 12 months without fresh food or water by sl',
   'Plant diet: Grasses, forbs, cactus pads, fallen fruit; can survive more than 12 months without fresh food or water by slowing its metabolism.'),
  ('Centrochelys sulcata', 'diet', 2, 'Plant diet: Coarse grasses, forbs, succulents, fallen dry-season blooms; gains moisture from drought-resistant p',
   'Plant diet: Coarse grasses, forbs, succulents, fallen dry-season blooms; gains moisture from drought-resistant plants.'),
  ('Astrochelys radiata', 'diet', 2, 'Plant diet: Grazes on grasses, fruit, and succulent plants. A favorite food is the Opuntia cactus. Prefers new g',
   'Plant diet: Grazes on grasses, fruit, and succulent plants. A favorite food is the Opuntia cactus. Prefers new growth over mature growth.'),
  ('Chelonoidis niger', 'diet', 1, 'Diet type: Herbivore. Preys on: N/A',
   'Diet type: Herbivore. Eats only plants.'),
  ('Astrochelys radiata', 'diet', 1, 'Diet type: Herbivore. Preys on: N/A',
   'Diet type: Herbivore. Eats only plants.'),
  ('Chelonoidis abingdonii', 'diet', 1, 'Diet type: Herbivore. Preys on: N/A',
   'Diet type: Herbivore. Eats only plants.'),
  ('Chelonoidis niger', 'key_fact', 1, 'Island-specific shell shapes inspired Charles Darwins ideas on adaptive radiation in 1835',
   'Island-specific shell shapes inspired Charles Darwin''s ideas on adaptive radiation in 1835.'),
  ('Chelonoidis niger', 'key_fact', 2, 'Genomic evidence shows the lineage rafted >1 000 km from South America 23 Myr ago',
   'Genetic evidence shows its ancestors rafted more than 1,000 km from South America 2–3 million years ago.'),
  ('Centrochelys sulcata', 'key_fact', 1, 'Third-largest tortoise on Earthand the heaviest found on a continent rather than an island.',
   'Third-largest tortoise on Earth, and the heaviest found on a continent rather than an island.'),
  ('Malacochersus tornieri', 'key_fact', 2, 'Instead of hiding inside, it *dashes* and wedges tightpredators cant pry it free.',
   'Instead of hiding inside its shell, it dashes into a crack and wedges itself so tight that predators can''t pry it free.'),
  ('Rafetus swinhoei', 'key_fact', 1, 'Possibly the worlds rarest vertebrate fewer than five individuals remain.',
   'Possibly the world''s rarest vertebrate: fewer than five individuals remain.'),
  ('Heosemys spinosa', 'key_fact', 1, 'Juveniles wear a jagged crown of shell spines, nature scaltrops in the leaf litter',
   'Juveniles wear a jagged crown of shell spines, like nature''s caltrops in the leaf litter.'),
  ('Pipa pipa', 'key_fact', 2, 'Gives birth to live froglets that erupt from pockets in mums back',
   'Live froglets burst out of pockets in the mother''s back.'),
  ('Conraua goliath', 'key_fact', 2, 'Stone-moving parents males drag rocks half their weight to craft safe pools',
   'Stone-moving parents: males drag rocks half their weight to build safe pools.')
) AS v(scientific_name, category, reveal_order, old_label, new_label)
WHERE s.scientific_name = v.scientific_name AND c.species_id = s.id
  AND c.category = v.category AND c.reveal_order = v.reveal_order AND c.label = v.old_label;

-- Fact rewrites: (scientific name, category, sort order, old text, new text).
UPDATE species_facts f
SET fact_text = v.new_text
FROM species s, (VALUES
  ('Chelonoidis niger', 'diet_flora', 1, 'Grasses, forbs, cactus pads, fallen fruit; can survive > 12 months without fresh food or water by slowing metabolism',
   'Grasses, forbs, cactus pads, fallen fruit; can survive more than 12 months without fresh food or water by slowing its metabolism.'),
  ('Chelonoidis niger', 'key_fact', 1, 'Island-specific shell shapes inspired Charles Darwins ideas on adaptive radiation in 1835',
   'Island-specific shell shapes inspired Charles Darwin''s ideas on adaptive radiation in 1835.'),
  ('Chelonoidis niger', 'key_fact', 2, 'Genomic evidence shows the lineage rafted >1 000 km from South America 23 Myr ago',
   'Genetic evidence shows its ancestors rafted more than 1,000 km from South America 2–3 million years ago.'),
  ('Chelonoidis niger', 'life_description', 2, 'Hatchlings remain in warmer coastal zones 510 yrs before moving upslope.',
   'Hatchlings stay in warmer coastal zones for 5–10 years before moving upslope.'),
  ('Centrochelys sulcata', 'key_fact', 1, 'Third-largest tortoise on Earthand the heaviest found on a continent rather than an island.',
   'Third-largest tortoise on Earth, and the heaviest found on a continent rather than an island.'),
  ('Malacochersus tornieri', 'key_fact', 2, 'Instead of hiding inside, it *dashes* and wedges tightpredators cant pry it free.',
   'Instead of hiding inside its shell, it dashes into a crack and wedges itself so tight that predators can''t pry it free.'),
  ('Rafetus swinhoei', 'key_fact', 1, 'Possibly the worlds rarest vertebrate fewer than five individuals remain.',
   'Possibly the world''s rarest vertebrate: fewer than five individuals remain.'),
  ('Rafetus swinhoei', 'life_description', 2, 'Captive pair produced > 100 eggs between 20082015 but none hatched.',
   'A captive pair produced more than 100 eggs between 2008 and 2015, but none hatched.'),
  ('Heosemys spinosa', 'key_fact', 1, 'Juveniles wear a jagged crown of shell spines, nature scaltrops in the leaf litter',
   'Juveniles wear a jagged crown of shell spines, like nature''s caltrops in the leaf litter.'),
  ('Pipa pipa', 'key_fact', 2, 'Gives birth to live froglets that erupt from pockets in mums back',
   'Live froglets burst out of pockets in the mother''s back.'),
  ('Pipa pipa', 'life_description', 2, 'Fully formed froglets burst through mothers back skin after around three months',
   'Fully formed froglets burst through the mother''s back skin after around three months.'),
  ('Conraua goliath', 'key_fact', 2, 'Stone-moving parents males drag rocks half their weight to craft safe pools',
   'Stone-moving parents: males drag rocks half their weight to build safe pools.')
) AS v(scientific_name, category, sort_order, old_text, new_text)
WHERE s.scientific_name = v.scientific_name AND f.species_id = s.id
  AND f.category = v.category AND f.sort_order = v.sort_order AND f.fact_text = v.old_text;

-- 3. Red List codes, then the repeat some labels are left with
--    ("Status: Endangered. Endangered" -> "Status: Endangered.").
UPDATE species_deduction_clues c
SET label = regexp_replace(c.label, '^Status: ' || v.code || '\.\s*', 'Status: ' || v.name || '. ')
FROM (VALUES
  ('LC', 'Least Concern'), ('NT', 'Near Threatened'), ('VU', 'Vulnerable'), ('EN', 'Endangered'),
  ('CR', 'Critically Endangered'), ('EW', 'Extinct in the Wild'), ('EX', 'Extinct'), ('DD', 'Data Deficient')
) AS v(code, name)
WHERE c.category = 'conservation' AND c.label ~ ('^Status: ' || v.code || '\.');

UPDATE species_deduction_clues
SET label = regexp_replace(label, '^Status: ([A-Za-z ]+)\. \1\.?\s*$', 'Status: \1.')
WHERE category = 'conservation' AND label ~ '^Status: ([A-Za-z ]+)\. \1\.?\s*$';

-- 4. Capitalization. initcap() also lowercases the rest of each word, which is
--    what "REPTILIA" -> "Reptilia" needs; genus names are already capitalized.
UPDATE species_deduction_clues
SET label = initcap(label)
WHERE category = 'taxonomy' AND label ~ '^(Class|Family): ' AND label <> initcap(label);

UPDATE species_deduction_clues
SET label = overlay(label PLACING upper(substr(label, 12, 1)) FROM 12 FOR 1)
WHERE category = 'diet' AND label ~ '^Diet type: [a-z]';

UPDATE species_deduction_clues
SET label = overlay(label PLACING upper(substr(label, 15, 1)) FROM 15 FOR 1)
WHERE category = 'reproduction' AND label ~ '^Reproduction: [a-z]';

COMMIT;
