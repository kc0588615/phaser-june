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

**No.** It lives on the ground, in leaf litter and by slow streams.
> "In each terrestrial clutch, deposited in the leaf-litter"
> "along cool (5-21 degrees C) and wet stream banks of slowly moving streams"

#### Filled traits

None: it has no no-records.

#### Existing AmphibiaWeb values (checked)

- `activity: day`, note "It often sits in patches of sunlight.", found.
  > "This species is mainly diurnal, and often basks in sunlight"
- `young: many`, note "A female lays about 40 eggs, though fewer in the far south.", found.
  > "there are about 40 large (4 mm), unpigmented eggs"
  > "Clutch size in the far south of the range may be smaller (3-7 eggs"
- Fact "In the cold months it shelters under logs and moss.", found.
  > "During the colder months, Rhinoderma darwinii shelters under cover of logs or moss"
- Fact "Females lay their eggs in damp leaf litter on the forest floor.": **"damp" not found**. The account says only that the clutch is laid on land in leaf litter. Rewritten to "Females lay their eggs in the leaf litter on the forest floor."
  > "In each terrestrial clutch, deposited in the leaf-litter"

Agrees with ADW (same tier, kept as ADW): pointed fleshy snout, brown or green back, black-and-white belly, eats insects, the father raises the young in his vocal sac.
> "It has a pronounced, fleshy proboscis"
> "with the dorsum being either uniform brown (tan, brown, or reddish brown), uniform green (pale or dark)"
> "The underside is black and white, with large blotches"
> "Rhinoderma darwinii consumes insects and other small invertebrates"
> "larval development and metamorphosis take place within the vocal sac of the male parent"

#### New clues

- behavior, no tag: "When threatened, it rolls onto its back and plays dead."
  > "This frog has the unusual defensive strategy of playing dead when threatened; it rolls over on its back and remains motionless."
- diet, no tag: "It sits still and waits for insects to come close."
  > "using a sit-and-wait predation strategy"

#### New facts

- key_fact: "The father feeds the tadpoles in his pouch with a thick liquid he makes."
  > "The male not only shelters the tadpoles but nourishes them via viscous secretions within the vocal sac"
- key_fact: "When they are done changing, the froglets come out through their father's mouth."
  > "At the end of metamorphosis the froglets move from the male's vocal sac into the mouth, and emerge from the mouth"
- behavior: "A scared frog near a stream may jump in and float on its back."
  > "If it is near a stream when frightened, it may jump into the stream and float in the water on its back"
- life_description: "As many as 19 young have been found in one father's pouch."
  > "As many as 19 embryos have been found within a male's vocal sac"

#### Disagreements

- Time in the pouch: the ADW key fact says about 6 weeks; AmphibiaWeb says 50 to 70 days after hatching (plus about 3 days before). Same tier, ADW kept.
  > "This post-hatching period of development lasts for about 50-70 days"
- Size: ADW (trait note) 2.5 to 3.5 cm; AmphibiaWeb males 22 to 28 mm, females 25 to 31 mm. Same tier, ADW kept; `tiny` either way.
  > "males 22-28 mm, females 25-31 mm"

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

**Yes.** It lives in trees and sleeps on leaves.
> "This frog is arboreal and shelters on the underside of a broad leaf during the day"

#### Filled traits

None. Its no-record (social) isn't settled by the account: it says only that males defend calling spots.
> "Males make aggressive calls, to deter other males from intruding onto their territories"

#### Existing AmphibiaWeb values (checked)

- `young: many`, note "A clutch has about 40 green eggs.", found.
  > "Clutches consist of about 40 green eggs"
- Clue "It lays its eggs on a leaf over water, so the tadpoles drop into the pond when they hatch." (`eggs_over_water`), found.
  > "Since the egg clutches are attached to vegetation overhanging the water, hatching tadpoles generally fall into the water below as soon as they hatch"
- Fact "If a snake or wasp attacks its eggs, the tadpoles can hatch up to 30% early and escape into the water.", found.
  > "Snake attack induces embryos to hatch up to 30% early"
  > "Wasp predation, like snake predation, induces early and rapid hatching"

Agrees with ADW (same tier, kept as ADW): red eyes, orange feet, active at night, froglets that change color, males shaking branches.
> "orange hands and feet"
> "Agalychnis callidryas is nocturnal."
> "they are green by day and change to purplish or reddish brown at night"
> "perform tremulation displays by shaking a branch rapidly with their hind legs"

#### New clues

- morphology, `vertical_pupils` (as 08): "Its red eyes have vertical, slit-shaped pupils."
  > "protuberant red eyes, with vertical pupils"
- morphology, no tag: "When it shuts its eyes, see-through lower eyelids with a gold net pattern cover them."
  > "When this frog closes its eyes, transparent lower eyelids marked with a network of gold are apparent"
- behavior, no tag: "By day it rests under a broad leaf with its legs tucked under its body."
  > "shelters on the underside of a broad leaf during the day and during the dry season, with limbs folded underneath its body"

#### New facts

- key_fact: "Its unhatched tadpoles can tell a snake attack from a rainstorm by the pattern of the shaking."
  > "Embryos are able to distinguish between the potentially lethal event of a snake attack and the relatively non-dangerous event of a rainstorm by the duration and timing of resulting vibrations"
- key_fact: "Its tadpoles can survive out of water for up to 20 hours."
  > "Tadpoles are able to live out of water for up to 20 hours"
- behavior: "A female can lay up to five clutches of eggs in one night."
  > "Females may lay multiple clutches (up to five) in a single night"
- life_description: "Before laying, the female carries the male into the pond and soaks up water through her skin to make the jelly around her eggs."
  > "Once amplexed, a female will carry the amplectant male into the water"
  > "allow the female to absorb water through her skin, into her bladder, in order to make the jelly mass surrounding the clutch of eggs"

#### Disagreements

- CITES: the IUCN clue says trade has been controlled since 2008; AmphibiaWeb says the Appendix II listing came on 21 March 2010. IUCN (tier 1) kept; noted under Decisions.
  > "received CITES protection, under Appendix II on March 21, 2010"

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

**No.** It lives in and beside cold, fast streams.
> "Tailed frogs are primarily aquatic"
> "Associated with cold, fast-moving streams with cobbled bottoms and emergent boulders"

#### Filled traits

None. Its no-records (young, social) aren't in the account: it says the eggs go "in strings" but gives no count.
> "Eggs are deposited in strings under rocks in fast-moving streams."

Agrees with ADW (same tier, kept as ADW): no eardrums, vertical pupils, no call, the male's "tail", the sucker-mouth tadpoles, cold streams, internal fertilization, 1 to 4 years as a tadpole, active at night.
> "Head lacks tympanum, pupil is vertical"
> "Ascaphus is non-vocal."
> "Males have a tail-like extension of the cloaca"
> "Larvae have a distinctively large, round mouth, modified for suction, which they use to cling to streamside rocks"
> "Larvae take between 1 to 4 years to metamorphose"
> "adults may emerge to forage on land in cool, wet conditions, especially at night"

Kept as the COSEWIC report (tier 3): the key fact on its old family. AmphibiaWeb states the first half, not the second (the Rocky Mountain tailed frog), so the whole line stays with its source.
> "Ascaphus is the only living representative of a basal lineage of anurans"

#### New clues

- morphology, no tag: "In the breeding season, males' forearms grow much bigger."
  > "during breeding season show greatly enlarged forearms"
- morphology, no tag: "Its back can be cream, gray, red or black, often with dark streaks and blotches."
  > "ground color may be cream, grey, red, or black"
  > "Dorsum may show a variable pattern of dark streaks and blotches"

#### New facts

- key_fact: "Fertilizing its eggs inside the body makes sure they get fertilized in fast-flowing streams."
  > "Its internal fertilization (an adaption to ensure fertilization in fast moving streams) is unique among frogs."
- life_description: "Young frogs take 7 to 8 years to be ready to breed."
  > "Juveniles are sexually mature in 7-8 years."
- behavior: "It spends most of its life in water, but adults may come onto land to hunt on cool, wet nights."
  > "Tailed frogs are primarily aquatic; adults may emerge to forage on land in cool, wet conditions, especially at night."
- threat: "Logging near its streams may be a major cause of its decline. More frogs live where a strip of trees is left along the bank."
  > "Habitat modification due to timber harvesting may be a major cause of declines in Ascaphus."
  > "the presence of a tree-lined buffer zone was significantly correlated with Tailed frog abundance"

#### Disagreements

None. "Unique among frogs" is AmphibiaWeb's wording; the new fact leaves it out, since the existing clue already says "unlike most frogs".

### 09 Dyeing Poison Dart Frog (*Dendrobates tinctorius*)

- AmphibiaWeb ID 1646, from Wikidata; live page https://amphibiaweb.org/species/1646
- Snapshot: [archived copy of 18 Sep 2025](https://web.archive.org/web/20250918023541/https://amphibiaweb.org/species/1646)
- Citation: AmphibiaWeb 2024 Dendrobates tinctorius: Dyeing Poison Frog <https://amphibiaweb.org/species/1646> University of California, Berkeley, CA, USA.

#### Trees

**No.** It stays on the ground, though it can climb a few metres.
> "It usually stays on the ground, but is also found at heights up to 5 m in trees."

#### Filled traits

- `young: few`, note "A clutch has only 2 to 6 eggs."
  > "a clutch of 2-6 eggs are laid"

Agrees with ADW (same tier, kept as ADW): active by day; eggs hatch in about two weeks.
> "This species is diurnal."
> "The eggs hatch within 14 to 18 days"

#### New clues

- morphology, no tag: "Its arms and legs are a deep blue-black."
  > "blue-black arms and legs"
- morphology, no tag: "Males have bigger finger pads than females."
  > "Males have noticeably larger finger discs than females."
- habitat, no tag: "It needs cool, rocky streams in wet forest, and hides under rocks and moss nearby."
  > "requires rocky streams of running water, which are relatively cool"
  > "is found under cover, such as rocks and moss, near streams"
- reproduction, no tag: "In courtship the female strokes the male's snout and back, then he leads her to a spot to lay eggs."
  > "The female is attracted by his calls and strokes the male's snout and back"
  > "The male then leads the female to his chosen spot"

#### New facts

- key_fact: "Up close its colors warn predators, but from far away the pattern blends into the leaf litter."
  > "the bright color patterns may simultaneously scream "Here I am!" to nearby would-be predators, yet be relatively undetectable to predators farther away"
- key_fact: "A blue form was once named as a separate species, until DNA showed it is the same species."
  > "one that was formerly known as Dendrobates azureus"
  > "DNA analysis has shown that these forms are conspecific"
- behavior: "Its tadpoles often eat each other."
  > "Tadpoles of Dendrobates tinctorius are phytotelmic and often cannibalistic."
- behavior: "Tracked by radio, fathers carried their tadpoles farther, and to more pools, than expected."
  > "they moved their offsprings farther and to many more water sources than expected, with little regard to suitable, nearby pools"
  > "Examining the spatial patterns of the far-ranging fathers"

#### Disagreements

- Who carries the tadpoles: the IUCN clue says the father; AmphibiaWeb says both parents. IUCN (tier 1) kept (`father_carries_young`).
  > "the tadpoles are carried to water pools within bromeliad or other plant leaf axils or crevices by both the female and the male"

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

**No.** It lives in and beside fast rivers, resting on rocks.
> "Adult goliath frogs are found in rapids and cascades of rivers"
> "adults may bask on rocks emerging from streams and rivers"

#### Filled traits

None: it has no no-records.

Agrees with ADW (same tier, kept as ADW): biggest frog, up to 32 cm and about 3.3 kg; active at night; eats insects, snails, shrimp and frogs; hundreds of eggs, stuck to plants underwater; about 3 months as a tadpole; rests on rocks by waterfalls.
> "Conraua goliath is the largest frog in the world, with some individuals weighing as much as 3.3 kilograms and reaching ~32 cm snout–vent length"
> "While adults of C. goliath are generally nocturnal"
> "Most nests contain 150 – 350 eggs, though in some cases might have as many as 2,800 eggs"
> "Egg masses are deposited underwater and attached to vegetation or stones in pools near rapids"
> "Larval development takes approximately 3 months to go through metamorphosis"
> "Large adults are often observed on rocks close to or within waterfalls and rapids"

#### New clues

- morphology, no tag: "Its belly and the undersides of its legs are yellowish orange."
  > "The abdomen and ventral part of the limbs are yellowish orange"
- behavior, no tag: "To escape, it can skitter across the water in up to seven short leaps."
  > "individuals have been observed to skitter across the surface of the water with as many as seven consecutive short leaps"
- reproduction, `egg_guarding` (07, 62, 75): "Adults clear out pools by the river, or dig hollows in the gravel bank, to lay their eggs in, and guard the nests at night."
  > "frogs actively dig depressions into the gravel banks of rivers"
  > "these pools and depressions are actively cleaned of leaf litter and detritus by the frogs"
  > "Camera traps showed that adults guarded nests at night"

#### New facts

- key_fact: "Building its nests means moving large, heavy objects, which may be why it grew so big."
  > "because large, heavy objects must be moved for nest construction, this type of nest construction may have favored large size in this species"
- key_fact: "For such a big frog, its mating call is high-pitched, and it can last up to a minute and a half."
  > "The advertisement call of Conraua goliath is a high frequency sound of long duration (4.1 kHz, and up to 1.5 minutes"
- behavior: "On land it tires after five or six leaps, which makes it easy for people to catch."
  > "On land, however, individuals typically appear exhausted after five or six leaps (Sabater-Pi 1967) making them easy to capture by humans"
- threat: "Hunters prefer the biggest frogs, usually females. Far from towns, goliath frogs are more common and grow bigger."
  > "Hunters prefer to hunt the largest individuals (typically females)"
  > "C. goliath is more abundant and attains larger body sizes farther from human settlements"

#### Disagreements

- Calls: the ADW clue says it "can't croak" (no vocal sac) and males whistle with open mouths (`voiceless`). AmphibiaWeb agrees on the whistles and the open mouth, but says older claims that adults don't call were wrong: it has several calls, even a deep roar. Same tier, ADW clue kept; worth the owner's look, since `voiceless` also tags 08, which truly has no call.
  > "Despite previous assertions that adults do not call"
  > "including brief whistles, chirping, and even a “sighing deep roar”"
  > "the advertisement call of C. goliath is produced with the mouth open"
- Tadpole food: the ADW fact says its tadpoles eat only one water plant. AmphibiaWeb reports the same source (Sabater-Pi 1985) but says the plant's identity is unknown. Not a conflict on the claim; ADW kept.
  > "Thus, the identity of this aquatic plant remains unknown"

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

**No.** It lives its whole life in water.
> "The salamanders spend their whole lives in water."

#### Filled traits

None: it has no no-records.

Agrees with ADW and IUCN (kept as they are): about 1 m long; eggs, guarded by the father until they hatch 50 to 60 days later; eyes with no eyelids; flat head; fully aquatic.
> "Total length about 100 cm"
> "Eggs are fertilized externally and are guarded by the male, until they hatch after 50-60 days at a length of 30 mm."
> "Eyes small, rounded, dorso-lateral in position, and without eyelid."
> "Head strongly depressed"
> "Permanently aquatic."

#### New clues

- morphology, no tag: "Its skin is rough and wrinkled, with folds and little bumps."
  > "Skin rough and porous, with wrinkles, folds and tubercles."
- morphology, no tag: "Its flat tail has a fin along the top that runs forward onto its back."
  > "Tail 59% of the body length, compressed. Dorsal tail fin extending to the trunk."
- reproduction, no tag: "The female lays about 500 eggs in a string inside a male's underwater den, then leaves right away."
  > "The female lays approximately 500 eggs in a string in an underwater cavity, occupied by a male."
  > "Females enter the cavity and leave it directly after spawning."

#### New facts

- key_fact: "Old records tell of ones 1.8 m long, but most found today are much smaller."
  > "Chang (1936) quotes a maximum of 180 cm, but most animals found nowadays are considerably smaller"
- key_fact: "Its skin slime might one day be a glue for closing wounds. In tests on rats it healed them fastest, with little scarring."
  > "explored the use of skin secretions from Andrias davidianus (SSAD), which can be humanely collected twice a month, as a medical adhesive"
  > "in vivo (in rats) experiments"
  > "SSADs had the best wound healing times with regenerative properties and minimal scarring"
- life_description: "Young ones start eating 30 days after hatching, and begin losing their gills at 20 to 25 cm long."
  > "After 30 days post-hatching, the larvae start eating; reduction of gills begins when the larvae are 200-250 mm total length"
- threat: "Wild ones caught today are smaller than they used to be, most likely because so many are collected."
  > "the individuals captured are smaller than they used to be, most probably as a result of over-collecting"

#### Disagreements

- Range: the account (written 2000, edited 2022) still covers the whole of China's giant salamanders, before the 2019 split the literature fact describes, so it includes the Pearl River. The IUCN fact (Yangtze and Yellow River basins only) is the newer view and tier 1; kept.
  > "Middle and lower tributaries of the Yangtze river, Huang He (Yellow river) and Zhu Jiang (Pearl river)"
- Elevation: AmphibiaWeb below 1,500 m, mostly 300 to 800 m; IUCN 100 to 1,700 m. Kept IUCN.
  > "at moderate altitudes (below 1500 m, especially between 300 and 800 m)"
- Hatchling size: the ADW fact says about 3.5 cm; AmphibiaWeb 30 mm. Same tier, ADW kept.
- Eggs: the IUCN young note says 300 to 1,500; AmphibiaWeb about 500. Inside IUCN's range; kept.

### 74 Axolotl (*Ambystoma mexicanum*)

- AmphibiaWeb ID 3842, from Wikidata; live page https://amphibiaweb.org/species/3842
- Snapshot: [archived copy of 15 Feb 2026](https://web.archive.org/web/20260215184743/https://amphibiaweb.org/species/3842)
- Citation: AmphibiaWeb 2025 Ambystoma mexicanum: Mexican Axolotl <https://amphibiaweb.org/species/3842> University of California, Berkeley, CA, USA.

#### Trees

**No.** It stays in the water all its life.
> "it retains an aquatic larval morphology for its entire life and lives in water permanently in the wild"

#### Filled traits

None: it has no no-records.

Agrees with ADW and IUCN (kept): feathery gills kept as an adult; never changes into a land form; lives only in Xochimilco and Chalco; over 10 years in labs; hundreds of eggs.
> "its most notable physical feature is its feathery gills, which protrude from the back of its wide head and remain there throughout adulthood"
> "Wild A. mexicanum can only be found in Lake Xochimilco and Lake Chalco"
> "In the lab, individuals can live over 10 years"
> "In the lab, females can have 2 - 5 clutches a year with hundreds of eggs in each clutch"

Three Wikipedia facts that AmphibiaWeb also states move to it (tier rule), reworded to what it says:
- "Its name comes from Nahuatl, the language of the Aztecs." → "Its name comes from the Aztec language. It may mean 'water dog', 'water twin' or 'water sprite'."
  > "The common name, “axolotl,” originates from the Aztec language, and its meaning can be attributed to several interpretations including: water dog, water twin, water sprite, or water slave."
- "Since 2021 an axolotl has been on the back of Mexico's 50-peso banknote." → "An axolotl is on Mexico's 50-peso banknote." (see Disagreements)
  > "is featured on the Mexican 50 peso bill"
- "Surveys of Lake Xochimilco found about 6,000 per square kilometre in 1998, but only 100 in 2008." → "Counts found about 6,000 per square kilometre in 1998, only 100 in 2008, and later just 35."
  > "a 1998 census found 6,000 axolotls per square kilometer"
  > "By 2008, the census registered 100/km2, and currently the estimate is only 35/km2."

#### New clues

- morphology, no tag: "Wild ones are dark or black with white flecks, but labs have bred many other colors."
  > "In the wild, its coloration in life is dark or black (Humphrey 1975) with white flecks and black spots"
  > "several color mutations have been created in laboratory settings"
- reproduction, no tag: "Its eggs are fertilized inside the female, and she lays them one at a time."
  > "Eggs are internally fertilized"
  > "and laid singly"
- diet, `ambush_hunter` (25, 51, 62): "It waits for prey to come close instead of chasing it, and its tiny teeth can grip food but not chew it."
  > "The species is not an active hunter, having more of a sit-and-wait predator style, and only has rudimentary teeth that are only able to grasp prey but not tear or chew it."

#### New facts

- key_fact: "Lab axolotls all trace back to 34 brought from Mexico City to Paris in 1864."
  > "Lab-reared A. mexicanum can be traced back to 34 stock animals brought from Mexico City to Paris, France in 1864"
- behavior: "Its courtship is called a 'waltz': the pair nudge each other and circle, then the female follows the male."
  > "Their courtship has been described as a “waltz” with a male and female pair first nudging each other with their snouts to the other’s flanks and cloaca leading to a circling behavior."
  > "The female follows"
- life_description: "Very rarely, when stressed, one changes into a land form, but then it can no longer breed."
  > "In rare instances, typically less than 1% in the lab setting, A. mexicanum will metamorphose"
  > "under stressful conditions, but they are unable to reproduce after metamorphosis"
- threat: "Its lakes have shrunk to under 3% of their old size, and are now marshes rather than deep lakes."
  > "the lakes’ area has been reduced to 2.83% of its historic area and has been converted into only wetland ecosystems rather than deep lakes with wetlands"

#### Disagreements

- Banknote date: Wikipedia said since 2021; AmphibiaWeb says "as of Feb 2020" (citing a 2020 news story, likely the note's announcement). The fact now gives no date, so it is true either way.
  > "as of Feb 2020, is featured on the Mexican 50 peso bill"
- Size: the ADW size note says about 23 cm; AmphibiaWeb up to about 40 cm. Same tier, ADW kept; `tiny` either way.
  > "can reach lengths up to about 40 centimeters"
- Color: the ADW covering note says mottled brownish green; AmphibiaWeb dark or black with white flecks. Same tier, ADW kept; the new clue gives AmphibiaWeb's.
- Eggs hatch: the ADW fact says 10 to 14 days; AmphibiaWeb about 20 days in the lab at 20 °C. Same tier, ADW kept.
  > "In the lab at 20°C, embryos take approximately 20 days to develop."

### 75 Hellbender (*Cryptobranchus alleganiensis*)

- AmphibiaWeb ID 3861, from Wikidata; live page https://amphibiaweb.org/species/3861
- Snapshot: [archived copy of 3 Dec 2025](https://web.archive.org/web/20251203195611/https://amphibiaweb.org/species/3861)
- Citation: AmphibiaWeb 2020 Cryptobranchus alleganiensis: Hellbender <https://amphibiaweb.org/species/3861> University of California, Berkeley, CA, USA.

#### Trees

**No.** It lives its whole life in streams.
> "This completely aquatic species"

#### Filled traits

None: it has no no-records.

Agrees with ADW and IUCN (kept): largest salamander in North America; flat body, no eyelids; loose, wrinkly side folds; active at night, hiding under rocks by day; mostly crayfish; the father guards the eggs; lives 20 to 30 years.
> "The largest salamander in North America."
> "dorso-ventrally flattened"
> "the eyes are tiny and lidless"
> "The skin is loose and wrinkled."
> "Hellbenders forage at night, sometimes on overcast days, and they retreat to crevices under rocks during the day"
> "Males tend the eggs after oviposition and fertilization"
> "may reach ages of 20-30 years in the wild"

#### New clues

- morphology, `paddle_tail` (73): "Its big tail is shaped like a paddle, flat from side to side."
  > "The large, paddle-like tail is laterally compressed."
- morphology, no tag: "As an adult it has no gills on the outside, just one gill slit on each side of its head."
  > "Adults have a single gill slit on either side of the head and lack external gills."
- behavior, no tag: "Its skin is very slimy, and the slime puts off many predators."
  > "These salamanders are excessively slimy"
  > "The slime produced by these animals is noxious to many predators"

#### New facts

- key_fact: "Many anglers think it is poisonous and cut their line rather than unhook one."
  > "Many fisherman consider hellbenders to be poisonous and will cut their line rather than unhook them"
- behavior: "Other hellbenders often eat its eggs and young, so the father guards the nest against them."
  > "Eggs and larvae are frequently eaten by conspecifics."
  > "they guard against egg predation by conspecifics"
- life_description: "Several females may lay in the same nest: over 1,900 eggs have been found in one."
  > "Females may share oviposition sites, and over 1900 eggs have been found in a single nest."
- threat: "Traces of its DNA in the water show it is gone from over a third of the West Virginia sites where it once lived. Runoff from roads is a likely cause."
  > "Using environmental DNA (eDNA), they found that over a third of sites in West Virginia that historically harbored hellbenders no longer do."
  > "a higher density of roads surrounding historical populations may have led to population declines and extirpations"

#### Disagreements

- Water temperature: the IUCN clue says it avoids water warmer than 20 °C; AmphibiaWeb says usually about 20 °C, sometimes 25 to 30 °C. Kept IUCN (tier 1).
  > "Water temperature is usually cold (20º C, sometimes as high as 25-30º C)"
- Red List: AmphibiaWeb's page shows Near Threatened; IUCN 2022 says Vulnerable. Kept IUCN.
  > "Near Threatened (NT)"
- Size: ADW 30 to 69 cm long; AmphibiaWeb 30 to 74 cm. Same tier, ADW kept; `small` either way.
  > "(30-74 cm total length)"
- Color: the ADW covering note says brown or black, sometimes with dark orange spots; AmphibiaWeb greenish, yellowish brown or slate gray with black spots. Same tier, ADW kept.
  > "Adult coloration is greenish, yellowish brown or slate gray with black spots or blotches"
- Eggs hatch: ADW 45 to 80 days; AmphibiaWeb 45 to 75. Same tier, ADW kept.
  > "after a developmental period of 45 - 75 days"

### 76 Golden Poison Frog (*Phyllobates terribilis*)

- AmphibiaWeb ID 1707, from Wikidata; live page https://amphibiaweb.org/species/1707
- Snapshot: [archived copy of 28 Nov 2025](https://web.archive.org/web/20251128151145/https://amphibiaweb.org/species/1707)
- Citation: AmphibiaWeb 2025 Phyllobates terribilis: Golden Poison Frog <https://amphibiaweb.org/species/1707> University of California, Berkeley, CA, USA.

#### Trees

**No.** It stays on the ground, at most a few centimetres up on roots.
> "It is also terrestrial, preferring to sit on the ground or perched only a few centimeters above the ground on tree roots or ground litter."

#### Filled traits

None: it has no no-records.

- `size` stays `tiny`; its note, from Wikipedia ("about 5 to 6 cm long"), becomes AmphibiaWeb's "It grows to about 4.5 cm long." (tier rule: AmphibiaWeb replaces Wikipedia).
  > "adult females having a maximum snout-vent length of 47 mm, and adult males reaching 45 mm in snout-vent length"

Re-sourced Wikipedia → AmphibiaWeb, text unchanged (same claim): the geography clue "It lives only on the Pacific coast of Colombia."
> "in Pacific coastal Colombia"
> "Country distribution from AmphibiaWeb's database: Colombia"

Agrees with ADW (same tier, kept as ADW): active by day, alone, bold and out in the open, under 20 eggs, the male carries tadpoles, the long trill call, one known enemy (a small snake that may eat only the young).
> "This species, like all other members of the family Dendrobatidae, is diurnal."
> "While these frogs normally are solitary in the wild"
> "They are noticeably bolder than other poison dart frogs and are found out in the open."
> "Eggs are laid terrestrially in small clutches of less than 20."
> "Their calls are long sustained trills"
> "these snakes may only consume the juvenile P. terribilis and not the adults"

#### New clues

- morphology, `striped_young` (53, 70): "Its young are black with two gold stripes, which fade as they grow up."
  > "Juvenile frogs are black in color, with gold dorsolateral stripes."
  > "As the frogs reach maturity, the dorsolateral stripes disappear"
- morphology, no tag: "Its eyes and the tips of its toes are black."
  > "The eyes, nares and digit tips are black."

#### New facts

- key_fact: "Hunters rub their blowgun darts on the skin of a live frog to load them with poison."
  > "used by native Colombians such as the Chocó and Cofán to poison their blow-gun darts"
  > "the darts are rubbed over the skin of the live frog to collect the poison"
- key_fact: "Its poison might one day help make a medicine for pain."
  > "batrachotoxin might be useful to develop as a topical pain-relief medication"
- behavior: "A father can carry up to nine tadpoles on his back at once."
  > "Male frogs have been observed carrying up to nine larvae simultaneously"
- life_description: "Its tadpoles have no poison. It gets its poison only after it turns into a frog."
  > "Tadpoles did not contain batrachotoxin"
  > "implying that the batrachotoxin alkaloids are synthesized or sequestered after metamorphosis"

#### Disagreements

- Poison: the Wikipedia key fact ("thought to be the most poisonous animal on Earth … deadly to 10 to 20 people") becomes AmphibiaWeb's "It is the most poisonous of all frogs. One frog may hold enough poison to kill about 10 people." (tier rule).
  > "Phyllobates terribilis is the most highly toxic of all frogs"
  > "with a single frog thus potentially holding enough poison to kill about 10 humans"
- Poison from food: the Wikipedia fact ("Its poison comes from its food. Frogs raised in zoos on crickets lose their poison.") stays: AmphibiaWeb agrees that frogs born in captivity have none, and calls the wild source likely, not proven. It adds that wild-caught frogs kept for three years still had about 40% of their poison, so "lose" holds only for frogs raised there.
  > "poison frogs born and reared in captivity do not contain toxins in their skin, although they can accumulate alkaloid toxins if these are part of the diet"
  > "frogs maintained in captivity for three years still maintaining toxicity at about 40% the level of recently captured animals"
- Dart users: the Wikipedia fact names the Emberá; AmphibiaWeb names "the Chocó and Cofán". The Emberá are a Chocó people, so no conflict; the Wikipedia fact stays.
