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
