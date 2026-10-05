# 040: More animals per place (and the habitat legend)

Handoff for a fresh agent. Written 2026-09-26 by the agent that built the 50-animal content pipeline. Read `docs/CONTENT_SOURCES.md` and `docs/CLUE_MATCH.md` first; this file adds what those docs don't say: what was learned doing it, and what's blocked.

## Goal

Before batch 1, 51 of 88 country/wildlife-area places had only 2 animals, so a place ran out fast and falls back to its region. Add animals, preferably ones that make good look-alikes for existing animals (shared traits make rounds harder and more fun). Secondary: a habitat color legend on the place card (Part B, blocked).

## Blocker: range polygons

The `iucn` table (public schema) holds IUCN range polygons for **only the current 50 animals** (103 rows, `id_no` = IUCN taxon id). A new animal needs its polygons there first, because:

- `clue_match_places` (globe places) and `clue_match_ranges` (reveal-card range maps) join `species.iucn_id = iucn.id_no`;
- `npm run content -- ranges` computes a profile's realms and countries from those polygons;
- the unit tests require every animal to have Range clues (`validatePool` warns without them, and `poolData.test.ts` fails on any warning).

IUCN range shapefiles need a logged-in IUCN Red List account (Spatial Data Download, per-species or per-group, non-commercial terms). **The owner must download them.** The agent can't.

### Importing polygons

Unblocked 2026-09-27: the owner's Red List group downloads are in `~/data/iucn/shp`, and `npm run iucn -- find|import` loads one species at a time. How, and the gotchas: `docs/SHAPEFILE_BEST_PRACTICES.md`.

## Batch 1: done 2026-09-27

12 animals, ids 51-62: jaguar, giant anteater, lowland tapir, brown-throated sloth, giant pangolin, chimpanzee, aardvark, cheetah, Indian pangolin, giant panda, indri, Chinese giant salamander (IUCN now lists *A. davidianus* as taxon 179010104; *A. sligoi* is split off). Profiles were researched by parallel agents, one per look-alike cluster, so shared tags stayed consistent: `raids_termite_mounds` (anteater, aardvark, both new pangolins), `walks_on_knuckles` (anteater, giant pangolin, chimp), `spots`, `bamboo_eater` (+ red panda), `black_and_white`, `carries_young_on_back`, `loud_calls`.

Picked by measuring, not guessing: 35 candidate ranges were imported and run through the places rules against the current animals (the query is `clue_match_places` with unlinked `iucn` rows added as extra species), scoring thin places joined and new places created; the unpicked 23 were deleted from `iucn`. Result: countries 43 -> 73 (only-2-animal ones 20 -> 15), wildlife areas 45 -> 68 (31 -> 14), about 4 animals per place. The original list's red wolf, Tonkin snub-nosed monkey, ploughshare tortoise and hirola each filled almost no thin place.

## Batch 2: done 2026-09-29

14 animals, ids 63-76: Temminck's pangolin, African savanna elephant, African wild dog, black rhino, eastern long-beaked echidna, hirola, dama gazelle, Baird's tapir, Andean (spectacled) bear, maned wolf, giant otter, axolotl, hellbender, golden poison frog. Ranges imported from MAMMALS_TERRESTRIAL_ONLY, MAMMALS_FRESHWATER, CAUDATA and ANURA_PART2 (42 polygons). New shared tags: `spectacles` (hirola, Andean bear), `electric_sense` (both echidnas, axolotl; added to the western echidna's worm clue), `long_legs` (dama gazelle, maned wolf), `pack_hunter` (wild dog, giant otter); reused `borrowed_burrows`, `grasping_lip`, `white_tail_tip`, `underwater_breathing`, `father_carries_young` and others. New family name: Ambystomatidae.

Result: countries 73 -> 77 (only-2-animal ones 15 -> 7), wildlife areas 68 -> 74 (14 -> 13), about 5 animals per place. South America (10 -> 15) and North America (11 -> 14) passed the 12-animal continent threshold, so both are playable now.

Owner review: black rhino has `desert:cold` only (IUCN table 8.3; its text just says "desert areas in Namibia"); Andean bear has `forest:tropical_moist_montane` (cloud forest, from Wikipedia; the IUCN table omits it); giant otter has `wetlands:permanent_rivers`, `forest:tropical_swamp`, `grassland:tropical_seasonally_wet` and `artificial:ponds` from the IUCN text (its table omits rivers); axolotl `size: tiny` (60 to 110 g); giant otter has no `young` (litters of 1 to 5, usually 2 or 3, straddle one/few); the echidna photo is a museum mount (Commons has no live one); the hirola photo was swapped from an 1894 drawing to a wild photo (Jan Ebr, CC BY 4.0).

Fixed on the way: two OneEarth sub_realms spelled two ways ("Southern Mexican Dry Forests" / "dry forests") collided on the place key and broke the places refresh; wildlife areas now group by key (`db/schema.sql`; the view was rebuilt beside the old one and swapped in one transaction). `photos` re-added a generic Galápagos tortoise to the Floreana tortoise; `"photo": null` now means "checked, none" and `photos` skips it.

Owner review: cheetah has `forest` (IUCN text "dry forest", not its table); Indian pangolin has `desert` (IUCN text "arid areas", Thar); tapir covering is `skin`; giant panda year 2016 (errata); the giant pangolin photo is a museum mount (a live but grainy camera-trap photo exists: Commons `Smutsia_gigantea_464600306.jpg`).

## Workflow for one new animal

Order matters: the places view only includes animals that have clues, and `ranges` reads the places view.

1. Owner downloads the IUCN range; import its polygons into `iucn` (above).
2. Write `db/content/animals/<id>-<slug>.json` (next id 77; ids never change). `iucnId` = the polygon's `id_no`. Copy the shape of an existing profile (e.g. `35-red-panda.json`).
3. `npm run content -- preview <name>` until it prints no `PROBLEM` lines.
4. `npm run content -- build` (deletes and reloads all clues/facts in one transaction; upserts species).
5. `REFRESH MATERIALIZED VIEW CONCURRENTLY clue_match_ranges;` then `... clue_match_places;` (~90 s). Needs the SSH tunnel (`./scripts/db --production "..."`; the owner opens the tunnel, the key has a passphrase).
6. `npm run content -- ranges` (writes realms + countries into every profile).
7. `npm run content -- photos` (fills missing photos; **look at each one**, see gotchas).
8. `npm run content -- build` again, then `npm run content -- check` (must be 0 errors, 0 warnings).
9. `npm test`, `npm run typecheck`, `npm run lint`, then `npm run dev` + `npm run e2e` (headless play; artifact in `e2e-artifacts/`).
10. If a new family or order appears: add it to `FAMILY_NAMES` / `ORDER_NAMES` in `src/clueGame/speciesInfo.ts`, and glossary terms (e.g. `Caudata`) to `src/clueGame/glossary.ts`.

Production (https://play.critterconnect.org) reads the DB live; content changes need no redeploy.

## Writing a profile: rules that proved right

- **Sources, in tier order** (`db/content/sources.json`): IUCN assessment first, then ADW / AmphibiaWeb / TFTSG / papers, then zoos/government/NGOs, then Wikipedia/news only for gaps. Every trait, clue and fact has `source`; add `url` when it isn't the profile's page for that key. Sources can be wrong: ADW gave Asian elephant gestation as "18 to 23 weeks" (it's 18–22 months, Smithsonian) and Wallace's flying frog as 15–20 mm (AmphibiaWeb: 90–100 mm). Cross-check numbers that look odd.
- **Red List**: use the *latest* assessment. The id in old notes can be stale (Sumatran orangutan moved to a 2024 assessment; Livingstone's flying fox to a 2025 errata). `year` = year published. Species 19's old IUCN id label was a different tortoise; check `sci_name` in `iucn` matches the profile.
- **Habitats** are IUCN habitat classes and level-2 kinds, marginal ones included. Kinds are *complete* lists (a candidate with some `forest:` kinds but not the clue's one is ruled out), so add a kind the IUCN *text* supports even if its table omits it (e.g. Sunda pangolin lowland rainforest). Never add one no source supports. Skip artificial-aquatic/"Other" rows.
- **Traits are exclusive axes** (one value; a different value rules a candidate out): size (tiny <100 g, small ≤2 kg, medium ≤30 kg, large ≤300 kg, huge >300 kg), lifespan (longest known, zoo records count: short <5, medium 5–20, long >20 years), young per litter (one = 1–2, few = 3–10, many >10), diet (plants/meat/insects/mixed, by main food), activity, social, birth, covering (`skin` = mostly bare, used for frogs and elephants/rhinos). Leave a trait out when no source documents it; missing never rules anything out.
- **Open tags create the fun.** A tag shared by two animals makes both show a ✓ on that clue; a unique tag is a late "aha" clue (the game orders clues broadest first). Reuse existing tags only when truly the same trait (list them: `npm run content -- preview` or the snippet in `docs/CONTENT_SOURCES.md`). Shared tags in use include `burrower, tree_dweller, climber, pointed_snout, territorial, big_ears, long_tail, digging_claws, pouch, reddish_fur, grazer, poor_eyesight, long_tongue, swimmer, scent_marks, stripes, horns, hooves, one_island, face_markings, toothless, rolls_into_ball, builds_nests, hangs_upside_down, false_thumb, nectar_drinker, fruit_eater, seed_spreader, salt_licks, mud_bather, rarely_drinks, camouflage, leaf_litter`. Don't tag two different concepts the same (a black mask ≠ white face patches).
- **Copy**: grades 6–12, short sentences, no gore or medical words ("a disease that causes lumps", not "cancer"; "hunted", not "killed on sight"). One fact per clue. Every profile needs ≥1 `key_fact`, and every color needs a tagged clue or the check warns.
- Surprising, recent facts make the reveal card (rediscoveries, clones, new behaviors), but source them to the report or paper.

## Research access

What worked for IUCN, ADW, Wikipedia and Commons (and what blocks bots): `docs/CONTENT_SOURCES.md#research-access`.

## Gotchas already fixed (don't re-break)

- `scripts/content.ts` loads rows with `tx.json(rows)` into `json_populate_recordset`. Passing `JSON.stringify(rows)` double-encodes ("cannot call json_populate_recordset on a scalar").
- `scripts/photos.ts`: Wikipedia summaries now give thumbnail URLs (`.../thumb/a/ab/<file>/3840px-<file>?utm...`); take the segment after `thumb/x/xx/`. Photos are kept only if the Commons file names the species; the lead image was once a *different species* (spiny turtle → Asian leaf turtle) and once a range map (Ili pika, file named `... area.png`). No photo beats a wrong one (Floreana tortoise and Ili pika have none). Standard Commons thumb widths (120/250/330/500) work; the UI requests 120 and 500.
- `ranges` countries are only globe places (countries holding ≥5% or 5,000 km² of the range, and only countries that are places), so small countries (Comoros, Chile for Darwin's frog) yield 0 countries. That's consistent across animals, so it never wrongly rules anyone out.
- `src/db/index.ts` parses `DATABASE_URL` at import, so `next build` needs a dummy URL (the Dockerfile does this).
- Content backup: rows are rebuilt from git; the DB is also dumped nightly on the VPS (`deploy/backup/pg-backup.sh`).

## Part B: habitat color legend (blocked)

The place card shows a TiTiler render of the habitat COG with `colormap_name=habitat_custom` (`src/clueGame/places.ts`, `habitatSnapshotUrl`). A legend needs value → color → label:

- labels exist: table `habitat_colormap (value, label)`, IUCN codes (100 Forest, 106 Forest - Subtropical-tropical moist lowland, ... 1000 Marine - Oceanic);
- **colors don't**: the TiTiler deployment (AWS API Gateway, URL in `NEXT_PUBLIC_TITILER_BASE_URL`) has no colormap endpoint (`/openapi.json` lists only `/cog/*`, `/api/habitat-analysis`, `/api/simple-species`, `/health`). `habitat_custom` is registered in its server code.

Ways forward, simplest first: (1) owner finds the `habitat_custom` dict in the TiTiler deployment's source and it's copied into `habitat_colormap` as a `color` column; (2) skip colors and list the place's top habitats by share via `/cog/statistics?categorical=true` over the place bbox, labeled from `habitat_colormap` (this also connects to the habitat clues); (3) render the preview with an `expression` isolating one value and sample its color (fragile, not recommended).
