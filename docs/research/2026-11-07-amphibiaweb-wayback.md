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

#### Filled traits

#### New clues

#### New facts

#### Disagreements

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

#### Filled traits

#### New clues

#### New facts

#### Disagreements

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

#### Filled traits

#### New clues

#### New facts

#### Disagreements

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

#### Filled traits

#### New clues

#### New facts

#### Disagreements

### 14 Desert Rain Frog (*Breviceps macrops*)

- AmphibiaWeb ID 2375, from Wikidata; live page https://amphibiaweb.org/species/2375
- Snapshot: [archived copy of 12 Dec 2025](https://web.archive.org/web/20251212174423/https://amphibiaweb.org/species/2375)
- Citation: AmphibiaWeb 2019 Breviceps macrops: Desert Rain Frog <https://amphibiaweb.org/species/2375> University of California, Berkeley, CA, USA.

#### Trees

#### Filled traits

#### New clues

#### New facts

#### Disagreements

### 16 Purple Frog (*Nasikabatrachus sahyadrensis*)

- AmphibiaWeb ID 6197, from the profile, matches Wikidata; live page https://amphibiaweb.org/species/6197
- Snapshot: [archived copy of 6 Feb 2025](https://web.archive.org/web/20250206190752/https://amphibiaweb.org/species/6197)
- Citation: AmphibiaWeb 2021 Nasikabatrachus sahyadrensis: Purple Frog <https://amphibiaweb.org/species/6197> University of California, Berkeley, CA, USA.

#### Trees

#### Filled traits

#### New clues

#### New facts

#### Disagreements

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
