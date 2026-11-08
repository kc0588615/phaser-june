# AmphibiaWeb facts from Wayback snapshots (2026-11-07)

Mission `fact-sources`. AmphibiaWeb's species accounts for the game's 15 amphibians, read from Internet Archive snapshots, and what each one settles for the profiles. A stopgap until AmphibiaWeb answers the owner's access request. The saved pages are in `/srv/critter-ai/agent-state/missions/fact-sources/wayback/` on the agents' server, called `STATE` below.

## Route

- **Why Wayback:** amphibiaweb.org times out from the VPS and challenges scripts from home. AmphibiaWeb's own data-use page says "Need to Access AmphibiaWeb Archives? Try the Wayback Machine".
- **IDs:** 4 from the profiles' `sources.amphibiaweb` (03, 05, 06, 16); all 15 from one Wikidata SPARQL query on P5036 ("AmphibiaWeb Species ID", label checked) matched on P225 (taxon name) = the profile's `scientificName`. The 4 profile IDs match Wikidata. No request went to AmphibiaWeb.
- **Snapshots:** for each `amphibiaweb.org/species/<id>`, one CDX query (`web.archive.org/cdx/search/cdx?url=…&output=json&filter=statuscode:200&limit=-1`, the newest status-200 capture), then the raw page `https://web.archive.org/web/<ts>id_/<original>`. The availability API returned 429 on its first try, so CDX only. One request at a time, 6 s apart. 2026-11-08: 30 requests for the 15 pages, 0 429s, every species had a snapshot (no `amphib_query` fallback needed); plus 2 for the data-use page below.
- **Saved:** `STATE/wayback/<profile>.html` (raw, some gzip), `<profile>.txt` (text from `STATE/tools/wayback_text.py`, run with `python3 -I`; the fetched files are never executed), `index.json` (per profile: `id`, `idFrom`, `original`, `timestamp`, `archive`, `citeLine`, `license`, `read`: the day the snapshot was read). Every quote below is found word for word in its animal's `.txt` (`STATE/tools/check_quotes.py`, from step 6, whitespace normalized).
- **Licence:** the species pages carry no licence footer; each links "AmphibiaWeb's policy on data use" (`/data/datause.html`). Its snapshot [20251006003414](https://web.archive.org/web/20251006003414/https://amphibiaweb.org/data/datause.html) says: "AmphibiaWeb's page content, including original graphics, are available under a Creative Commons Attribution-NonCommercial (CC-BY-NC) license", and links `creativecommons.org/licenses/by-nc/4.0`. So: **CC BY-NC 4.0**. The same page asks that "AmphibiaWeb must by cited in all copies" and that a website link to AmphibiaWeb. Photos are excluded (their own licence); the game uses none from AmphibiaWeb.
- **Citation:** each page's "Species Account Citation:" line, verbatim without its trailing "Accessed <snapshot date>." (that date is the page generating itself for the crawler; the game adds its own). The site-wide form on the same page is "AmphibiaWeb. <year>. <https://amphibiaweb.org> University of California, Berkeley, CA, USA. Accessed <date>."; the species line is the more specific one, so it is the one used.
- **Tier:** AmphibiaWeb is tier 2. IUCN (tier 1) wins a disagreement (keep it, note both here); against ADW keep the existing value and note both; against Wikipedia, AmphibiaWeb replaces it.

## Animals

### 03 Darwin Frog (*Rhinoderma darwinii*)

- AmphibiaWeb ID 4322, from the profile, matches Wikidata; live page https://amphibiaweb.org/species/4322
- Snapshot: [archived copy of 17 Jun 2025](https://web.archive.org/web/20250617172314/https://amphibiaweb.org/species/4322)
- Citation: AmphibiaWeb 2023 Rhinoderma darwinii: Darwin's Frog <https://amphibiaweb.org/species/4322> University of California, Berkeley, CA, USA.

#### Trees

#### Filled traits

#### New clues

#### New facts

#### Disagreements

### 05 Wallace's Flying Frog (*Rhacophorus nigropalmatus*)

- AmphibiaWeb ID 4524, from the profile, matches Wikidata; live page https://amphibiaweb.org/species/4524
- Snapshot: [archived copy of 4 Dec 2024](https://web.archive.org/web/20241204224823/https://amphibiaweb.org/species/4524)
- Citation: AmphibiaWeb 2022 Rhacophorus nigropalmatus: Wallace's Flying Frog <https://amphibiaweb.org/species/4524> University of California, Berkeley, CA, USA.

#### Trees

**Yes.**
> "Habitat ranges from trees, bushes, palms, etc. in primary rain forests and logged rain forests."

#### Filled traits

None. Its no-records (lifespan, activity, young, social) aren't in the account.

#### Existing AmphibiaWeb values (checked)

- `covering: skin`, found.
  > "Skin is smooth or finely granulated above"
- `size: tiny`, note "Its body is 9 to 10 cm long", found. The note's old tail "big for a tree frog" isn't in the snapshot, so it was dropped (Decisions).
  > "This flying frog is about 90-100 mm in total length"
- Clue "Its huge hands and feet are webbed right to the fingertips.", found ("huge" is the game's word for the large discs and webbing; kept).
  > "Hands and feet are fully webbed."
  > "Finger tips are expanded into large, oval discs"

#### New clues

- morphology, no tag: "The webbing between its fingers and toes is jet black at the base and yellow near the edges."
  > "The interdigital membranes are jet black at the base. These membranes are yellow and veined with black towards the border."

#### New facts

- key_fact: "Young frogs start out bright red. They turn green and brown with white spots, then bright green as adults."
  > "dramatic ontogenetic shift in coloration from bright red in recently metamorphosed juveniles, to green and brown with extensive white spotting in older juveniles, to vivid green with black and yellow webbing and yellow flanks in adults"
- key_fact: "It needs color pigments from its food to turn bright green. Without them it stays blue-green."
  > "dietary carotenoid supplementation was necessary for this species to achieve its natural vivid green adult coloration. Individuals without a source of dietary carotenoids, or reduced carotenoid intake, were blue-green in color."
- behavior: "It can change color fast when it is stressed or when the light changes."
  > "R. nigropalmatus was capable of extensive rapid color changes associated with either the stress of handling or the light regime experienced by the individual frog"

#### Disagreements

- Elevation: AmphibiaWeb gives feet; IUCN (tier 1) gives 0 to 600 m. Kept IUCN.
  > "Can be found at elevations ranging from 700 to 1800 feet"

### 06 Red-eyed Tree Frog (*Agalychnis callidryas*)

- AmphibiaWeb ID 616, from the profile, matches Wikidata; live page https://amphibiaweb.org/species/616
- Snapshot: [archived copy of 9 Mar 2026](https://web.archive.org/web/20260309190537/https://amphibiaweb.org/species/616)
- Citation: AmphibiaWeb 2026 Agalychnis callidryas: Red-Eyed Tree Frog <https://amphibiaweb.org/species/616> University of California, Berkeley, CA, USA.

#### Trees

#### Filled traits

#### New clues

#### New facts

#### Disagreements

### 07 Hairy Frog (*Trichobatrachus robustus*)

- AmphibiaWeb ID 1506, from Wikidata; live page https://amphibiaweb.org/species/1506
- Snapshot: [archived copy of 16 Jan 2025](https://web.archive.org/web/20250116222721/https://amphibiaweb.org/species/1506)
- Citation: AmphibiaWeb 2022 Trichobatrachus robustus: Hairy Frog <https://amphibiaweb.org/species/1506> University of California, Berkeley, CA, USA.

#### Trees

**No record.** The account ties it to streams and the forest floor and says nothing about climbing.
> "Trichobatrachus robustus is primarily associated with streams"

#### Filled traits

None. Its no-records (size, lifespan, activity, young, social) aren't settled:
- size: the account gives lengths, not weight, and a 9 to 13 cm stout frog sits near the 100 g line between tiny and small, so it stays out (Decisions).
  > "male snout–vent lengths averaging 130 mm compared to 90 mm in females"
- young: no clutch size.
  > "Eggs are deposited as clutches attached to stones below water and are guarded by males"

#### Re-sourced from Wikipedia (same claim, higher tier)

- `covering: skin`
  > "The dorsal integument is smooth to granulated and covered with small, round tubercules"
- `birth: eggs`, and clue "Eggs are laid on rocks in streams, and the male stays to guard them." (`egg_guarding`)
  > "Eggs are deposited as clutches attached to stones below water and are guarded by males"
- Clue "In the breeding season, males grow thin, hair-like frills of skin on their sides and thighs." (`hair_like_frills`)
  > "In breeding males, the upper surfaces of the thighs and lower flanks have long hair-like papillae made of vascularized skin"
- Clue "Males grow to about 13 cm long, bigger than females."
  > "male snout–vent lengths averaging 130 mm compared to 90 mm in females"
- Clue "If it is grabbed, it can push sharp bone claws out through the skin of its toes." (`bone_claws`)
  > "The last phalanx of toes II–V is recurved and can protrude through the ventral skin of the toe to defend the frog by scratching potential predators"

#### New clues

- morphology, no tag: "Its sides and legs are black, and its belly is white."
  > "The side of the body and limbs are black. The ventral coloration is white"
- behavior, no tag: "In the breeding season, males stay mostly in the water, while females live in the leaf litter on the forest floor."
  > "males are primarily aquatic and females are found in forest leaf litter"

#### New facts

- key_fact: "It may be the only frog whose males and females have different lungs."
  > "Trichobatrachus robustus may be unique among frogs in having sexually dimorphic lungs."
- behavior: "No one has ever reported hearing its mating call."
  > "To date, there are no reported observations of advertisement calls in T. robustus"

#### Disagreements

None. Diet: the account only notes a captive meal, so the Wikipedia invertebrate list stays.
> "Durrell (1960) reported that T. robustus would eat neonate mice in captivity."

### 08 Coastal Tailed Frog (*Ascaphus truei*)

- AmphibiaWeb ID 2049, from Wikidata; live page https://amphibiaweb.org/species/2049
- Snapshot: [archived copy of 7 Dec 2024](https://web.archive.org/web/20241207072556/https://amphibiaweb.org/species/2049)
- Citation: AmphibiaWeb 2021 Ascaphus truei: Pacific Tailed Frog <https://amphibiaweb.org/species/2049> University of California, Berkeley, CA, USA.

#### Trees

#### Filled traits

#### New clues

#### New facts

#### Disagreements

### 09 Dyeing Poison Dart Frog (*Dendrobates tinctorius*)

- AmphibiaWeb ID 1646, from Wikidata; live page https://amphibiaweb.org/species/1646
- Snapshot: [archived copy of 18 Sep 2025](https://web.archive.org/web/20250918023541/https://amphibiaweb.org/species/1646)
- Citation: AmphibiaWeb 2024 Dendrobates tinctorius: Dyeing Poison Frog <https://amphibiaweb.org/species/1646> University of California, Berkeley, CA, USA.

#### Trees

#### Filled traits

#### New clues

#### New facts

#### Disagreements

### 10 Suriname Toad (*Pipa pipa*)

- AmphibiaWeb ID 5234, from Wikidata; live page https://amphibiaweb.org/species/5234
- Snapshot: [archived copy of 13 Feb 2026](https://web.archive.org/web/20260213194920/https://amphibiaweb.org/species/5234)
- Citation: AmphibiaWeb 2020 Pipa pipa: Surinam Toad <https://amphibiaweb.org/species/5234> University of California, Berkeley, CA, USA.

#### Trees

**No.** It lives its whole life in water.
> "Pipa pipa is entirely aquatic, living on the muddy bottom of tropical rivers."

#### Filled traits

None. Its no-records (size, activity, social) aren't in the account: it gives no adult size, only the young's.

#### Re-sourced from the USGS fact sheet (same claim, higher tier)

- Clue "Its eggs sink into pockets in the mother's back and hatch there as tiny toads, with no tadpole stage." (`mother_carries_young`, `no_tadpoles`)
  > "the male fertilizes the eggs and then attaches them to the female's back. The skin of the female then encloses the fertilized eggs. Larval development occurs within the egg and fully metamorphosed individuals"
- Fact "Its babies climb out of little pockets in their mother's back after 3 to 4 months."
  > "emerge from incubation after 3 to 4 months"

Agrees with ADW (same tier, kept as ADW): flat body and triangle head, star fingertips, no tongue, lives in water.
> "large triangular head, small eyes with rounded pupils"
> "Its body is flat, brown or olive-colored, and covered by many tubercles."
> "Using star-shaped tactile organs on its fingertips to detect food, the tongueless Pipa pipa lunges at its prey"

#### New clues

- morphology, no tag: "Its nostrils sit at the ends of two thin tubes on its snout."
  > "nostrils found at the end of two narrow tubes on the snout"
- morphology, `webbed_feet` (reused: Wallace's flying frog, desert rain frog, giant otter): "Its front legs are short and weak, with long thin fingers. Its back legs are long and strong, with webbed feet."
  > "The front limbs are short and weak with long slender fingers, and the hind limbs are long, strong with webbed feet."
- habitat, no tag: "It lives in slow rivers and canals with muddy bottoms."
  > "Found in sluggish rivers and canals with muddy bottoms"

#### New facts

- key_fact: "Its babies are only about 2 cm long when they leave their mother's back."
  > "fully metamorphosed individuals approximately 2 cm in length emerge from incubation after 3 to 4 months"
- behavior: "It finds food by touch, with the stars on its fingertips, then lunges at it."
  > "Using star-shaped tactile organs on its fingertips to detect food, the tongueless Pipa pipa lunges at its prey"
- life_description: "The male presses the eggs onto the female's back, and her skin grows over them."
  > "the male fertilizes the eggs and then attaches them to the female's back. The skin of the female then encloses the fertilized eggs."

#### Disagreements

- Diet: ADW (same tier) lists worms, insects, crustaceans and small fish (`diet: meat`); AmphibiaWeb says mostly invertebrates, which would be `insects`. Kept ADW.
  > "consisting mostly of invertebrates"
- Countries: AmphibiaWeb also lists French Guiana and Trinidad and Tobago; the profile's countries come from the IUCN range polygon (tier 1). Kept IUCN.
  > "Bolivia, Brazil, Colombia, Ecuador, French Guiana, Guyana, Peru, Suriname, Trinidad and Tobago, Venezuela"

### 11 Goliath Frog (*Conraua goliath*)

- AmphibiaWeb ID 4691, from Wikidata; live page https://amphibiaweb.org/species/4691
- Snapshot: [archived copy of 8 Dec 2024](https://web.archive.org/web/20241208045710/https://amphibiaweb.org/species/4691)
- Citation: AmphibiaWeb 2023 Conraua goliath: Goliath Frog <https://amphibiaweb.org/species/4691> University of California, Berkeley, CA, USA.

#### Trees

#### Filled traits

#### New clues

#### New facts

#### Disagreements

### 13 Madagascar Tomato Frog (*Dyscophus antongilii*)

- AmphibiaWeb ID 5530, from Wikidata; live page https://amphibiaweb.org/species/5530
- Snapshot: [archived copy of 27 Jan 2025](https://web.archive.org/web/20250127090915/https://amphibiaweb.org/species/5530)
- Citation: AmphibiaWeb 2018 Dyscophus antongilii: Tomato Frog <https://amphibiaweb.org/species/5530> University of California, Berkeley, CA, USA.

#### Trees

**No record.** Gardens, ponds and ditches; nothing on climbing.
> "it inhabits most gardens and breeds in ponds and ditches"

#### Filled traits

None. Its no-records (activity, social) aren't in the account.
> "can be observed all-year round after rains"

Agrees with ADW (same tier, kept as ADW): size, breeding after rain, sticky skin.
> "M 60-65 mm, F 85-105 mm"
> "Specimens breed regularly after rainfalls"
> "These frogs have very sticky skin secretions"

#### New clues

- behavior, no tag: "Its call is a string of short, low notes, repeated after short breaks."
  > "A series of short low-pitched notes which is repeated after some intervals."
- reproduction, no tag: "Its small black eggs hatch only 36 hours after they are laid."
  > "1000-1500 small black eggs are laid and hatch 36 hours later"

#### New facts

- key_fact: "Its Malagasy name, Sangongon, comes from the sound of its call."
  > "The Malagasy name for this frog “Sangongon” is based on these sounds"
- key_fact: "Its sticky skin ooze can make a person's skin swell up."
  > "These frogs have very sticky skin secretions which can produce local swellings in humans"
- behavior: "In the town of Maroantsetra it lives in most gardens, and locals can find one fast to show tourists."
  > "especially in the town of Maroantsetra where it inhabits most gardens"
  > "locals are familiar with this frog and can quickly find them when required as tourist attraction"

#### Disagreements

- Male color: ADW's clue says males look more brown; AmphibiaWeb says males are yellow-orange. Same tier, kept ADW.
  > "Colour uniformly yellow-orange in males, orange-red in females"
- Clutch: ADW says several thousand eggs; AmphibiaWeb 1,000 to 1,500. Same tier, kept ADW (both `young: many`).
  > "1000-1500 small black eggs are laid"

### 14 Desert Rain Frog (*Breviceps macrops*)

- AmphibiaWeb ID 2375, from Wikidata; live page https://amphibiaweb.org/species/2375
- Snapshot: [archived copy of 12 Dec 2025](https://web.archive.org/web/20251212174423/https://amphibiaweb.org/species/2375)
- Citation: AmphibiaWeb 2019 Breviceps macrops: Desert Rain Frog <https://amphibiaweb.org/species/2375> University of California, Berkeley, CA, USA.

#### Trees

**No.** A burrower of nearly bare coastal dunes that can't even hop.
> "This frog is fossorial, meaning it is adapted to burrowing and underground living."
> "an arid coastal desert in the Succulent Karoo ecoregion with large sand dunes and sparse desert vegetation"

#### Filled traits

- `size: tiny`, note "It is only about 5 cm long." (a 5 cm frog is far under 100 g; the same call as the 2 to 5 cm coastal tailed frog)
  > "Breviceps macrops is a short and stout frog, with a body length of about 48 mm"
  > "Eyes are strikingly large and prominent in this small frog"
- `diet: insects`, note "It looks for animal dung at night and eats the beetles and moths there."
  > "It searches for dung, where it feeds on beetles and moths"

Still no record: young (the account says the clutch size isn't known), lifespan, social.
> "Clutch size is not known for B. macrops"

Agrees with the existing `activity: night` (IUCN):
> "This frog is nocturnal, emerging after dark from under the sand on both misty and clear nights."

#### New clues

- morphology, `webbed_feet` (reused: Wallace's flying frog, giant otter): "Its feet are shaped like paddles, with thick, fleshy webbing that may help it grip loose sand."
  > "specialized feet, which are paddle-like and smooth and have thick fleshy webbing"
  > "conjecture that the foot webbing enables traction on loose sand"
- morphology, no tag: "Its legs are so short that it cannot hop. It walks instead."
  > "The extremely short limbs make it impossible for this frog to hop, although it can walk"

#### New facts

- key_fact: "Part of the skin on its belly is see-through."
  > "The venter has a transparent vascular window in the central and posterior regions of the abdomen."
- key_fact: "Its Afrikaans name, Melkpadda, means 'milk frog', for its pale back."
  > "The Afrikaans name Melkpadda ("milk frog") refers to the pale color of the dorsum"
- behavior: "You can find a buried one by the small cone of sand it leaves on top of the dune."
  > "A buried frog can be located by a small conical mound of sand on the dune surface"

#### Disagreements

None.

### 16 Purple Frog (*Nasikabatrachus sahyadrensis*)

- AmphibiaWeb ID 6197, from the profile, matches Wikidata; live page https://amphibiaweb.org/species/6197
- Snapshot: [archived copy of 6 Feb 2025](https://web.archive.org/web/20250206190752/https://amphibiaweb.org/species/6197)
- Citation: AmphibiaWeb 2021 Nasikabatrachus sahyadrensis: Purple Frog <https://amphibiaweb.org/species/6197> University of California, Berkeley, CA, USA.

#### Trees

**No.** A burrower that lives underground nearly all year.
> "N. sahyadrensis is fossorial and comes to the surface only for a few weeks a year to breed"
> "Most recently it has been found 3 feet underground"

#### Filled traits

- `young: many`, note "One pair laid about 3,600 eggs in one night."
  > "One mating pair deposited about 3600 eggs in one night"

Still no record:
- size: lengths only (5.3 to 9 cm, a bloated frog near the 100 g line between tiny and small), so it stays out, as for 07 (Decisions).
  > "Snout-vent length ranges from 52.8 mm to 89.9 mm"
- activity: adults stay underground; only the breeding chorus is timed, and a captive one stayed in the soil "even at night".
  > "Choruses typically occur on rainy evenings (lasting until dawn) from late April to mid-May"
  > "During five months of captivity, the frog did not emerge from the soil, even at night"
- lifespan, social: not in the account.

#### Re-sourced from Wikipedia (same claim, higher tier)

- `diet: insects`, note "Mostly termites, which it catches underground."
  > "this species is likely to be a completely underground feeder specializing in termites"

#### Existing AmphibiaWeb values (checked)

- `covering: skin`, found.
  > "This species has smooth, black skin dorsally which fades into gray ventrally"
- Clue "Its body is round and puffy, with a small head and a pointy, pig-like snout.", found ("pig-like" from its other common name).
  > "a relatively large burrowing frog with a distinct, bloated appearance"
  > "The head is small and relatively short in comparison with the rest of the body."
  > "The pointed snout is touch-sensitive."
  > "Purple Frog, Pignose Frog"

#### New clues

- morphology, no tag: "Its snout ends in a small white knob."
  > "The snout ends in a white, knob-like protrusion."
- morphology, no tag: "Each back foot has a big, white, shovel-like bump that it uses for digging."
  > "Each hindfoot possesses a large, white, shovel-like inner metatarsal tubercle, used for digging."
- reproduction, no tag: "The male is much smaller than the female. She carries him on her back to the spot where she lays her eggs."
  > "Males are about one third the size of females"
  > "During amplexus, the male grasps the female's spine"
  > "The female then carries the male to suitable oviposition sites"

#### New facts

- key_fact: "Its family line may go back 130 to 180 million years, to the age of dinosaurs."
  > "estimated to have originated in the Jurassic, 130-180 million years ago"
- key_fact: "Its scientific name comes from Sanskrit: nasika means 'nose' and batrachus means 'frog'."
  > "In Sanskrit, nasika means "nose" and batrachus means "frog,""
- behavior: "Its tadpoles leave the water at night, wriggling onto wet rock to feed."
  > "tadpoles are known to feed out of the water at night, using their strengthened abdominal muscles to move onto surfaces with extremely shallow water flow"
- threat: "People catch and eat thousands of its tadpoles each year."
  > "thousands of tadpoles were harvested per year, as well as adults"
- Rewritten (replaces the Wikipedia line "…its tadpoles were first found in 1917."): "Scientists only described it in 2003, though its tadpoles had been described in 1918, with no adults to go with them."
  > "Nasikabatrachus sahyadrensis Biju & Bossuyt, 2003"
  > "N. sahyadrensis tadpoles were first described in Annandale (1918), without specimens of adults."

#### Disagreements

- Color: Wikipedia's clue says "dark purplish gray" (tag `purple_gray`); AmphibiaWeb says black above, gray below. Kept, not replaced: it is the color its English name (AmphibiaWeb's too) comes from, a description rather than a conflicting fact (Decisions).
  > "smooth, black skin dorsally which fades into gray ventrally"
- Time above ground: IUCN (tier 1) says a few hours a year; AmphibiaWeb says a few weeks. Kept IUCN.
  > "comes to the surface only for a few weeks a year to breed"
- Digging: the literature clue (PMC4814056, tier 2) says it digs head first; AmphibiaWeb saw a captive one burrow with its back legs. Same tier, kept the paper.
  > "In captivity, the frog used its hindlimbs for burrowing"
- Red List: AmphibiaWeb's page shows Endangered, an older assessment; IUCN 2022 says Near Threatened. Kept IUCN.
  > "Endangered (EN)"
- Elevation: AmphibiaWeb 60 to 1,100 m; IUCN 30 to 1,400 m. Kept IUCN.
  > "It inhabits an elevational range of 60-1100 meters above sea level"

### 62 Chinese Giant Salamander (*Andrias davidianus*)

- AmphibiaWeb ID 3858, from Wikidata; live page https://amphibiaweb.org/species/3858
- Snapshot: [archived copy of 24 Jan 2025](https://web.archive.org/web/20250124031302/https://amphibiaweb.org/species/3858)
- Citation: AmphibiaWeb 2022 Andrias davidianus: Chinese Giant Salamander <https://amphibiaweb.org/species/3858> University of California, Berkeley, CA, USA.

#### Trees

#### Filled traits

#### New clues

#### New facts

#### Disagreements

### 74 Axolotl (*Ambystoma mexicanum*)

- AmphibiaWeb ID 3842, from Wikidata; live page https://amphibiaweb.org/species/3842
- Snapshot: [archived copy of 15 Feb 2026](https://web.archive.org/web/20260215184743/https://amphibiaweb.org/species/3842)
- Citation: AmphibiaWeb 2025 Ambystoma mexicanum: Mexican Axolotl <https://amphibiaweb.org/species/3842> University of California, Berkeley, CA, USA.

#### Trees

#### Filled traits

#### New clues

#### New facts

#### Disagreements

### 75 Hellbender (*Cryptobranchus alleganiensis*)

- AmphibiaWeb ID 3861, from Wikidata; live page https://amphibiaweb.org/species/3861
- Snapshot: [archived copy of 3 Dec 2025](https://web.archive.org/web/20251203195611/https://amphibiaweb.org/species/3861)
- Citation: AmphibiaWeb 2020 Cryptobranchus alleganiensis: Hellbender <https://amphibiaweb.org/species/3861> University of California, Berkeley, CA, USA.

#### Trees

#### Filled traits

#### New clues

#### New facts

#### Disagreements

### 76 Golden Poison Frog (*Phyllobates terribilis*)

- AmphibiaWeb ID 1707, from Wikidata; live page https://amphibiaweb.org/species/1707
- Snapshot: [archived copy of 28 Nov 2025](https://web.archive.org/web/20251128151145/https://amphibiaweb.org/species/1707)
- Citation: AmphibiaWeb 2025 Phyllobates terribilis: Golden Poison Frog <https://amphibiaweb.org/species/1707> University of California, Berkeley, CA, USA.

#### Trees

#### Filled traits

#### New clues

#### New facts

#### Disagreements
