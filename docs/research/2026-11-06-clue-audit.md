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
