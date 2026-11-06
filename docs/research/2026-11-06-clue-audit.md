# Clue audit: Farms & towns, and clue consistency (2026-11-06)

Research only (mission `clue-audit`). Nothing in the game changed. Draft: sections fill in as the mission's steps finish.

## 1. Summary

To be written (S9).

## 2. Farms & towns

To be written (S8).

## 3. Findings

To be written (S9).

## 4. Rules

To be written (S9).

## 5. What a fix mission would change

To be written (S9).

## Method and coverage

Every check has a row in `findings.csv` (`/srv/critter-ai/agent-state/missions/clue-audit/`, with the audit scripts in `audit/` and their output in `out/`), passes included.

**Content and what players see (S1).** The 76 animal files (`db/content/animals/`) were loaded through the game's own code (`animalsFromProfiles` and `makeBook`), so the inventory (`out/inventory.md`) shows exactly what a round holds: each trait's value, note and source; systems and habitats; the askable answers; the field guide lines; witness notes (with tags), untagged notes, reveal-only notes and facts; open tags; the photo. A read-only comparison with the live database on 2026-11-06 found the files and the live rows identical: 76 species, 2,430 clue rows and 437 facts, 0 differences. The same 20 animals hold `habitat:artificial` live and in the files.

**Mechanical checks (S1, `audit/mechanical.py`).** 1,075 rows: each of the 76 animals × 14 prefixes at least once.
- Size, lifespan and young: the numbers in each note are parsed into the bins the column labels give (size: under 100 g, 0.1–2 kg, 2–30 kg, 30–300 kg, 300+ kg; lifespan: under 5, 5–20, 20+ years; young: 1–2, 3–10, 10+). One bin: pass. A range across an edge: straddle. A value on an edge, a bound only, a record or the wrong quantity (generation length, age at maturity, gestation), a length instead of a weight, or no number: flagged for the source check. All 189 parsed values were read by hand against their notes; the parser misreads none.
- Diet, activity, social, covering and birth: a keyword scan of each note against its value (for example an "Only plants" animal whose note names insects or eggs).
- Cross-checks: eggs against litter wording and live birth against clutch wording; systems against habitat classes (sea against Coasts & sea, fresh water against Wetlands, land against a land class); every habitat kind has its class; open tags against values (`town_dweller` without Farms & towns, `fruit_eater` with Only meat, `coastal_dunes` without Coasts & sea, and others); taxonomy (genus is the first word of the scientific name; one order per family and one class per order across the 76).
- Missing traits are `no-record` rows: size 9, lifespan 17, young 13, diet 1, activity 14, social 20; birth and covering are recorded for all 76.

S1 left 126 open flags (23 straddles, 81 note-value flags, 22 cross-check flags). Later steps resolve each against the cited sources.

**Farms & towns trace, deals and rules (S2).** Every read of `habitat:artificial` in code, content, tests, docs, the site and git history (`out/s2-trace.md`). Rounds were dealt as the game deals them (`audit/deals.ts`, mirroring `useAnimalSession`: the world and every continent with at least 12 animals, each animal as a seed, `pickSuspectSet` then `dealClues` with rules `053-1`), once as is and once with the tag removed from every animal (`out/s2-deals.md`): 141 seed decks across 5 places. The rules table (`out/s2-rules.md`, `out/s2-rules-table.md`, `audit/rules.ts`) sets each askable tag's column label, legend, question and field guide line beside the content rule, with value counts across the 76; label and rule problems are `rule` rows in `findings.csv`.

**IUCN habitats, systems and taxonomy (S3, `audit/fetch_iucn.py`, `parse_iucn.py`, `compare_iucn.py`, `s3_rows.py`).** Each animal's latest Red List assessment was read on 2026-11-06 through headless Chrome (the site refuses plain downloads): the species page for the latest assessment id, then its print page with the Appendix habitat table (class, kind, suitability, major importance), the Habitat and Ecology text and the taxonomy. All 76 loaded; each content assessment is still the latest except the African forest elephant's (IUCN published a 2026 one; same habitat classes). For the 9 turtles and tortoises the content's `iucnId` is the range shapefile's id, not the Red List taxon id in the cited link, so the cited link was used (the live range table confirms each id is the right species). Content classes and systems were compared with the IUCN table, and every class IUCN's table lacks was checked against IUCN's own text or ADW. Habitat kinds aren't askable, so kind gaps are listed (`out/s3-compare.md`) but change no answer. For the 20 Farms & towns holders, `out/s3-farms.md` has each one's IUCN Artificial rows and suitability, the IUCN and ADW text, every line the game shows, provenance from git history, and a look at its photo (`out/s3-holder-photos.png`). Rows: 76 habitat, 76 system, 304 taxonomy (class, order, family, genus), 20 holder verdicts and 5 non-holder findings.

**Size, lifespan and young against the sources (S4, `audit/fetch_s4.py`, `source_text.py`, `numbers.py`, `s4_rows.py`).** Each trait's cited page was downloaded on 2026-11-06 (ADW, Wikipedia through its API, Smithsonian, San Diego Zoo, TFTSG, AnAge, USGS, Queensland government, AWC, the news story; the 13 IUCN citations reuse S3's pages), plus the animal's ADW account as a second source when it cites something else. `audit/numbers.py` pulls every sentence with a weight, a span of years or a count of young into `out/s4-excerpts.md`; every one of the 228 animal × trait cells was then judged by hand (`audit/s4_judgments.psv`), and all 54 S1 flags on these traits were closed.
- Rules used. Size and young: a range with less than two thirds inside the held bin is a straddle, `unfair`; a smaller overlap passes, with the overlap noted. Young: when the typical litter sits on the 1–2/3–10 edge (an average of 2 to 3), it is `unfair`. Lifespan: the game's rule is the longest known, so the value is checked against that, but a note that leads with a typical or wild figure inside "5–20 years" on a `long` animal is `unfair`. A note that gives a different quantity (generation length, age at maturity, gestation) is `unclear`. Two sources that disagree are both reported (`unclear` or `unfair`), never settled.
- Couldn't load: AmphibiaWeb (curl, Chrome and WebFetch all time out from the server) for 3 cells: Darwin frog's and red-eyed tree frog's young were checked from a search excerpt of the AmphibiaWeb page and ADW, and Wallace's flying frog's size is `couldnt-check` (no source gives a weight). Britannica (403 to every route) for the two Galápagos tortoises: checked against Wikipedia instead. The two `literature` DOIs are paywalled: the Sunda pangolin's size was checked against Wikipedia and the giant pangolin's against ADW and Wikipedia.
- Traits the game leaves out (39 `no-record` cells): 7 are documented for the species by ADW and could be added (Blanding's turtle 3–19 eggs, coastal tailed frog 44–85, dyeing poison dart frog 5–10, pig-nosed turtle 22.5 kg, brown-throated sloth 30–40 years, giant otter 1–5 young, golden poison frog up to 5 years in zoos); two of those would land on an edge (Blanding's turtle's average of 10 eggs, the giant otter's usual 2–3). The other 32 aren't in the source, or only as a relative's figure.

**Diet, activity, social life, covering and birth against the sources (S5, `audit/behavior.py`, `s5_rows.py`).** S4's cached pages, read for these traits' sections (ADW food habits, behavior, reproduction and physical description; the whole IUCN, Wikipedia and other pages). `audit/behavior.py` pulls every sentence with a diet, activity, social, covering or birth word (nocturnal, diurnal, crepuscular, cathemeral; solitary, pairs, herds, colonies, families; herbivore, omnivore, insectivore, fruit, carrion, prey; eggs, clutch, gestation, litter; fur, shell, scales, skin, spines, armor) into `out/s5-excerpts.md`, sentences naming another value first. Every one of the 380 animal × trait cells has a `source-value` row: hand judgments (`audit/s5_judgments.psv`) for every disagreement and all 52 S1 flags on these traits; the rest quote the first source sentence naming the held value (each quote read by hand; 14 noisy ones replaced).
- Rules used. Diet: an "Only plants" animal whose cited source names animal food, or a meat animal the source says eats mostly small invertebrates, is `unfair` (the doc's diet rule has no "only", the column has); two sources that disagree are `unclear`. Activity: a note that names a second activity (the legend drops the question's "mainly") is `unclear`; a note whose emphasis points to another column is `unfair`. Social: a groups animal its source describes as a pair with young is `unfair`, because the Pairs question says "pairs or small families". Covering: a note that calls the coat by another column's name (the echidnas' fur, the armadillo's shell) is `unfair`; how much hair makes fur is `unclear` (no rule).
- Couldn't load: AmphibiaWeb for Darwin frog's activity (`couldnt-check`; ADW and IUCN say nothing), and Wallace's flying and purple frogs' covering (passed on their class: frogs have bare skin; ADW and IUCN only mention it). Britannica for the Galápagos tortoises' diet and birth and the spiny hill turtle's birth, and the purple frog's paywalled DOI: checked against Wikipedia.
- Traits the game leaves out (35 `no-record` cells): diet 1, activity 14, social 20. Two are documented and could be added: the Floreana and Pinta tortoises are active by day (Wikipedia). Blanding's turtle (ADW lists both day and night), the Andean bear (sources disagree) and Goodfellow's tree-kangaroo (solitary only at genus level) are fairer left out.
