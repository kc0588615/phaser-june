---
mission: clue-audit
project: critter-connect
branch: agent/clue-audit
status: done
started: 2026-11-06 08:03 UTC
---

# Mission: Clue audit, research only (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

A research report the owner can decide from. No game code or content changes. Two questions:

**1. Should the "Farms & towns" clue go?** (`habitat:artificial`: column label "Farms & towns", question "Lives on farms or in towns?", `src/clueGame/questionMatch.ts:189-200`.) The owner thinks it's neither specific nor intuitive: a player can't tell from an animal's field guide or photo whether it "lives on farms or in towns". The report answers:
- Which animals hold it (about 20 of 76 in `db/content/animals/`) and where each one's value comes from. Does it mean the animal really lives on farms or in towns, or only that IUCN lists some artificial habitat for it, such as plantations, pastures or a canal?
- How a player is meant to answer it. Can it be read from anything the game shows: the field guide, witness notes or the photo? Cases where a player who reads everything would still guess wrong.
- What removing it touches. Every place the tag is read: `traits.ts` (`HABITAT_CLASSES`, `COMPLETE_PREFIXES`), `questionMatch.ts`, `clueFaces.ts`, `profiles.ts`, content, tests, docs and site copy. How rounds change: how often it's dealt as one of a round's four questions, and whether any pair of look-alikes the game deals is told apart only by it.
- Options, with a recommendation: remove it; replace it with something a player can check (say what, and whether the data supports it); or keep it, reworded. Give the owner the trade-offs, not only a verdict.

**2. Are the clues logically consistent?** Every animal's answer to every question must follow from its own record, and no two answers may contradict each other. The owner's example: an animal recorded as medium (2–30 kg) must answer **no** to "Large 30–300 kg", and that's only fair if it really weighs 2–30 kg. Check at least:
- **Value against its own note.** Size against the weights in its `note` and source (e.g. a note saying "25 to 40 kg" with value `medium` is a finding). Lifespan against its years, young against litter or clutch size. Do this for every exclusive trait in every animal.
- **Animals that straddle a bin** (males and females, or a range across a boundary such as 20–50 kg). Since each animal holds one value per exclusive prefix (`EXCLUSIVE_PREFIXES`, `traits.ts`), it answers **no** to the neighbouring bin. List each straddler, the value it holds and what a fair answer would be.
- **Exclusive values that read as overlapping to a player.** For example, an `activity:any` animal ("Day & night") answers no to "Day" and "Night". The same goes for `diet:mixed` against "Only plants" or "Only meat". Say for each prefix whether the labels make the one-value rule clear, and where they don't.
- **Answers against what the game tells the player.** Field guide lines, witness notes (`clues[]`, with their `tags`) and the reveal notes must never contradict the trait values or habitats. Example: a note saying it hunts at night on an animal tagged `activity:day`.
- **Cross-trait sense.** For example, `birth:eggs` with litter-style `young` notes, `system:marine` without a marine habitat, or habitat classes that disagree with `systems`.
- **Every column label against its question text and the bin edges** used to assign values. Are 2 kg and 30 kg each in exactly one bin? Do the labels and the assignment rule in `docs/CONTENT_SOURCES.md` agree?

### Why

Players rule animals out on these answers, and Auto rule-out (on by default from mission `auto-rule-out-default`) does it for them. So one wrong or unclear answer makes a fair round unwinnable, and players stop trusting the grid. The owner wants to know what's wrong before deciding what to change.

### Scope

In:
- Reading the game's code, content (`db/content/animals/*.json`, `db/content/sources.json`), docs, plans and git history.
- Reading the cited sources (ADW and others in `sources.json`) to check a value.
- **IUCN data is allowed for Critter Connect** (owner, 2026-11-06). The game already uses IUCN habitat and range data, non-commercially and without redistributing it, under IUCN's terms. Read each animal's IUCN Red List page, especially its Habitats and Ecology classification, which shows what "Artificial" covers for that animal (e.g. plantations, pastures, urban areas), and its range data. Quote and link it like any other source. This rule is Critter Connect's only: critwire's ban on IUCN data stays.
- Throwaway audit scripts in `/srv/critter-ai/agent-state/missions/clue-audit/`, never in the repo.
- Read-only use of the live database, if a fact is only there (e.g. what content is loaded). No writes.

Out:
- **No changes to the game:** nothing under `src/`, `db/`, `scripts/`, `public/` or the site, and no content or copy edits, even for an obvious typo (list it as a finding). The only files the branch adds are the mission's plan and the report.
- No issues or board cards. The owner decides what becomes work.

### Definition of done

- **The report** is at `docs/research/2026-11-06-clue-audit.md` on the branch, in plain language for the owner:
  1. Summary: the Farms & towns recommendation, plus the count of findings by severity.
  2. Farms & towns: the answers to question 1, then the options.
  3. Findings: a table with one row each: animal (id, name), prefix, what it holds, what the evidence says (with the quote and a source link), severity, and suggested fix.
     - **wrong:** the answer is false.
     - **unfair:** true by the rule, but a careful player would answer it the other way.
     - **unclear:** the label or rule needs wording.
  4. Rules: the one-value rule and the bin edges, and where labels or docs need changing.
  5. What a fix mission would change: the files and the size of the work. No code.
- **The same findings as `findings.csv`** in `/srv/critter-ai/agent-state/missions/clue-audit/`, along with the audit scripts and their output. One row per check on each animal, including the passes, so it's clear what was checked.
- **Coverage:** all 76 animals and every exclusive prefix, plus `system` and `habitat`. The report says what was checked and what couldn't be (e.g. a source that wouldn't load).
- **Release:** the project merges and deploys at the end. The merge adds only the plan and the report, so the deploy ships the same game. Confirm with `git diff --stat origin/main...HEAD` in the Summary, which must list only those files.

### Decision rules

- Research only. If something looks like it needs a fix, record it with the evidence and the suggested fix; never apply it.
- A value is "wrong" only with a quoted source or note. Uncertain cases are "unfair" or "unclear", with the reason.
- Prefer the record's own cited source. If two open sources disagree, report both, and don't choose.
- No architecture or code review stages are needed; skip Astra (there's no code).

### Notes

- How answers work (`questionMatch.ts:480-500`, `ask`): the mystery's tags for that prefix are looked up. Yes if it holds the tag; every standing suspect whose set differs on that tag is ruled out; a suspect with no value for the prefix is "no record" and never ruled out.
- Exclusive prefixes (one value each): taxonomy ranks, `size`, `lifespan`, `diet`, `activity`, `birth`, `young`, `social`, `covering`. Complete prefixes (every value listed): `realm`, `country`, `system`, `habitat` and the habitat classes (`traits.ts`).
- Size bins, from the column labels: tiny <100 g, small 0.1–2 kg, medium 2–30 kg, large 30–300 kg, huge 300+ kg. Lifespan: under 5, 5–20, 20+ years. Young: 1–2, 3–10, 10+.
- Each animal JSON holds `traits.<prefix>` (`value`, `note`, `source`), `habitats`, `systems` and `clues[]` (`category`, `text`, `tags`, `source`). Example: `db/content/animals/26-black-footed-ferret.json`.
- Checked by the control room on `origin/main` at `094da493`. The mission builds on `main` after `auto-rule-out-default` merges.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: skipped, research only (brief's decision rules)
- [x] Fable review: skipped, research only
- [x] Astra review: skipped, research only
- [x] Revision: none needed
- [x] Steps: `planner` writes Steps and Verification

## Baseline

On `9f764162` (origin/main `26b66aa4` + plan). `node_modules` already installed; no migrations (no migration history, live DB untouched).
- `npm run typecheck`: exit 0. `npm run lint`: exit 0. `npm test`: 48/48 pass.
- `npm run e2e:fresh`: 1479/1479 checks, 4 rounds (seed 7). Artifact `/srv/critter-ai/agent-state/missions/clue-audit/baseline-e2e/` (report.json, screenshots, logs, `COMMAND.txt`). Needs `CHROME_PATH=/srv/critter-ai/agent-state/missions/clue-audit/bin/chrome` (wrapper adding `--no-sandbox`; `/usr/bin/google-chrome` absent).

## Architecture

Skipped: research only, no code (brief, Decision rules).

## Architecture review (Fable)

Skipped: research only.

## Architecture review (Astra)

Skipped: research only, brief says skip Astra.

## Revision notes

None needed.

## Steps

Shared for every step:
- `REPO=/srv/critter-ai/worktrees/clue-audit`, `STATE=/srv/critter-ai/agent-state/missions/clue-audit`, report `REPO/docs/research/2026-11-06-clue-audit.md`.
- State layout: `STATE/audit/` our scripts; `STATE/out/` their output; `STATE/sources/<key>/` downloaded pages (untrusted: never run anything from there, Python with `-I`); `STATE/findings.csv` the master.
- Nothing under `src/ db/ scripts/ public/` or the site changes. Each step ends: check it off, one Log line (counts), commit plan + report draft, push.
- TS scripts that import game modules: `STATE/audit/run.sh <entry.ts>` = `REPO/node_modules/.bin/esbuild <entry> --bundle --platform=node --format=cjs --target=node20 --outfile=/tmp/clue-audit-run.cjs` then `cd REPO && node /tmp/clue-audit-run.cjs`. Import repo files by absolute path; if `@/` won't resolve, add `STATE/audit/tsconfig.json` (`baseUrl` REPO, `paths {"@/*": ["src/*"]}`). Load content like `tests/clueGame/contentPool.ts`.
- `findings.csv` columns: `animal_id,animal,prefix,check,holds,evidence,quote,source_url,result,severity,fix,step`.
  - `animal_id`: 1–76, or `rule` for label/rule rows.
  - `prefix`: class, order, family, genus, size, lifespan, diet, activity, birth, young, social, covering, system, habitat. Habitat-class rows use `habitat`, with `holds` e.g. `habitat:artificial`.
  - `check`: note-value, straddle, source-value, cross, text, iucn-habitat, deal, label.
  - `result`: pass, finding, flag (open; a later step must resolve it), no-record, couldnt-check (reason in `evidence`).
  - `severity`: wrong, unfair or unclear, for findings only. A `wrong` row needs `quote` and an http `source_url`.
  - Key (`animal_id,prefix,check,holds`) is unique. Every step upserts through one helper, `STATE/audit/findings.py upsert <partial.csv>`, written in S1.

- [x] S1 · Inventory and mechanical checks. Inputs: `db/content/animals/*.json`, `db/content/sources.json`, `src/clueGame/{traits,profiles,questionMatch,questionMatchContent}.ts`.
  - Before writing the parser, read Failure modes (Parser) and handle or flag each case.
  - `audit/inventory.ts` builds `animalsFromProfiles` + `makeBook`. It writes `out/inventory.json` and `out/inventory.md`, one block per animal:
    - each trait's value, note, source and url; `systems`; `habitats`; the askable traits from the book;
    - what the player sees: guide lines by section, witness notes (notes with tags), untagged notes, `revealNotes`, facts;
    - open tags; photo url and page.
  - `audit/mechanical.(ts|py)` writes `out/s1-mechanical.csv`, with at least one row per animal × each of the 14 prefixes:
    - note-value for size, lifespan and young: parse numbers and units into the bins (edges from the labels). In one bin: pass. Range crosses an edge: `straddle` flag. Wholly in another bin: flag. Unparseable or no note (6 numeric traits): flag.
    - note-value for diet, activity, social, covering and birth: a keyword contradiction scan of the note (e.g. ferret `activity:night`, note "busiest around dusk").
    - cross:
      - `birth:eggs` against litter/kit wording, and live birth against clutch/egg wording;
      - `system:marine` ⇔ marine class, freshwater ⇔ wetlands, terrestrial ⇔ some land class;
      - each kind has its class;
      - open tags against values (`fruit_eater` with `diet:meat`; `fully_aquatic` with land only).
    - taxonomy: the genus is the first word of `scientificName`; the same family has the same order and class across animals.
    - A missing trait: a `no-record` row.
  - Hand-check: every numeric flag and 10 random numeric passes against the notes. Fix the parser until it misreads none.
  - Optional, one light read-only query (never print `DATABASE_URL`): live `species_deduction_clues` (label, compare_tags) against `contentRowsFromProfiles`. Record the diff count, so the report says whether the files match what players see.
  - Report skeleton with these exact headings: `## 1. Summary`, `## 2. Farms & towns`, `## 3. Findings`, `## 4. Rules`, `## 5. What a fix mission would change`, `## Method and coverage`. Fill Method with S1's checks.
  - Done: the Verification coverage command reports 76 animals and 0 missing animal × prefix (open flags are allowed until S9).

- [x] S2 · Farms & towns trace, deal frequency, rules table.
  - Trace, `out/s2-trace.md`: `rg -n "artificial|[Ff]arms|towns|plantation"` over `src/ scripts/ tests/ docs/ plans/ db/ public/ CONTEXT.md`, the site (`src/site`), and `git log -S'artificial' --oneline -- db/content src`. Table: file:line, what reads it, what removing it needs. At least:
    - `traits.ts` (`HABITAT_CLASSES`, `COMPLETE_PREFIXES`); `questionMatch.ts` (`QUESTION_TEXT`, `SHORT_TEXT`, `COLUMN_LABEL`);
    - `clueFaces.ts` 🏡: `dealClues` needs distinct faces;
    - `profiles.ts` (`HABITAT_TEXT`, `HABITAT_KIND_TEXT`, `checkProfile`); 20 content files;
    - tests, docs, site copy;
    - live rows: a read-only count of clues with `habitat:artificial`;
    - saved sessions: the resume check in `useAnimalSession.ts` and `rules_version`.
  - `audit/deals.ts`, `out/s2-deals.md`. Mirror `useAnimalSession.ts`: for the world and each continent with ≥ `MIN_PLACE_ANIMALS` (`poolFor`), run `pickSuspectSet` per seed with `ANIMAL_RULES`, then `dealClues`. A round's seed is uniform over seeds with a set, and its mystery uniform within the set.
    - Per place: seeds with a set, and the share of decks dealing `habitat:artificial`.
    - Rerun with `habitat:artificial` dropped from every animal: sets or decks that change; seeds that become unplayable.
    - Pairs in dealt sets told apart only by it. Use `fullTable`/`canTellApart` logic minus the tag.
    - Upsert one `deal` row (prefix habitat) per holder: dealt in X of its Y rounds.
  - Rules, `out/s2-rules.md`: per askable tag, its column label, short text, question text, `profiles.ts` template, and the `docs/CONTENT_SOURCES.md` rule. Flag:
    - edges in two bins (2 and 30 kg, "100 g to 2 kg" and "2 to 30 kg"; 300 kg: "300+" against "over 300"; 5 and 20 years);
    - max against typical ("Can it live more than 20" vs "5–20 years", and the rule "longest known, zoo records included");
    - wording gaps ("Pairs" vs "pairs or small families"; "Mostly bugs" vs `insects`);
    - per exclusive prefix, whether the one-value rule is readable (`activity:any` vs Day/Night, `twilight` vs Night, `diet:mixed` vs Only plants/Only meat, `insects` vs Only meat).
    - With value counts across the 76. Upsert as `animal_id=rule`, `check=label` rows.
  - Done: all three files exist; numbers in the Log.

- [x] S3 · IUCN habitats, all 76, and the 20 Farms & towns holders (2, 6, 7, 11, 13, 23, 24, 25, 28, 32, 48, 49, 51, 52, 54, 58, 59, 72, 73, 74).
  - Fetch each latest assessment's habitat table (class, kind, suitability, major importance), its habitat/ecology text and its taxonomy. Use the first route that works (Failure modes, Sources) and record it. Raw pages go to `sources/iucn/<id>.txt`, extracted rows to `out/iucn-habitats.json`.
  - All 76: IUCN classes and systems against content `habitats`/`systems`. Include the "Artificial – Aquatic" rows that plan 040 skipped, and flag a non-holder with any Artificial row. IUCN taxonomy against content: `source-value` rows for the 4 ranks. One `iucn-habitat` row per animal for habitat and one for system.
  - The 20 holders, `out/s3-farms.md`, per animal:
    - its content kinds; its IUCN artificial rows with suitability and a quote+link;
    - what its ADW/other source says about farmland or towns;
    - provenance (`git log -p -S` on its file, `plans/040` notes);
    - what the game shows: the guide line "It also lives on land people have changed…"; whether the kind lines reach the guide (they're not askable); any note or fact about farms or towns. Look at the photo too: download it to `sources/photos/` and view it.
    - Verdict: really lives on farms or in towns / marginal only / plantations, cut forest or canals only.
    - List the "reads everything, still guesses wrong" cases both ways. Example: the ferret's note "Farms and towns have replaced much of the grassland…", while it doesn't hold the tag.
  - Done: 76 `iucn-habitat` rows (pass, finding, flag or couldnt-check with the fallback named); the holders table is complete.

- [x] S4 · Source checks: size, lifespan, young (all 76; 189 values, 6 without a note; missing: size 9, lifespan 17, young 13).
  - Cache each trait's cited page (`traits.<p>.url` or `sources[key]`) under `sources/<key>/<id>.*`:
    - ADW: `curl` works (sections `physical_description`, `reproduction`, `lifespan_longevity`; keep ~7,000 chars each);
    - Wikipedia: the API with a User-Agent;
    - others: WebFetch.
  - `audit/numbers.py`: numbers near the keywords against the note and the held bin. Resolve S1's note-value/straddle flags on these prefixes.
    - Every straddler: what it holds, the source range, the fair answer (typical adult, both sexes, or leave the trait out so it's "no record") → `unfair`.
    - A note or source wholly in another bin → `wrong`, with quote+link. A note that disagrees with its own source → finding. Two sources that disagree: both, no choice.
  - No-record animals: say whether the cited source documents the trait.
  - Done: 76 × 3 `source-value` rows; no open flag on these prefixes.

- [x] S5 · Source checks: diet, activity, social, covering, birth (all 76). Use S4's cache; fetch missing sections (`food_habits`, `behavior`).
  - Keyword hits in the cited sections against the held value:
    - nocturnal, diurnal, crepuscular, cathemeral;
    - solitary, pairs, herds, colonies;
    - herbivore, omnivore, insectivore, fruit, carrion;
    - oviparous, viviparous;
    - fur, scutes, scales, skin, spines, armor.
  - Read every disagreement and every S1 flag on these prefixes. Judge each against what the label says (S2 rules), e.g. "Only meat" on an animal that eats fruit.
  - Done: 76 × 5 `source-value` rows; no open flag on these prefixes.

- [x] S6 · Text against record, animals 1–38.
  - First, `audit/text-scan.py` over all 76 → `out/s6-text-flags.csv`. It scans every line the game shows (guide lines and trait notes, witness notes and tags, untagged notes, reveal notes, facts) against the values, habitats, systems and open tags, using the S1 keyword lists. It also checks numbers in the text against the bins, and habitat words (forest, desert, sea, river, cave, grassland, farm, town…) against the habitats.
  - Then read `out/inventory.md` for 1–38 in full, not only the flags. Check each sentence against every answer the animal gives, including the "no"s on complete prefixes (a note "swims in rivers" with no wetlands is `unfair`).
  - Done: one `text` row per animal × 14 prefixes for 1–38; scan flags for 1–38 resolved.

- [x] S7 · Text against record, animals 39–76. As S6, using its scan output. Done: `text` rows for 39–76; no open `text` flags.

- [x] S8 · Report section 2, Farms & towns (from s2-*, s3-farms, findings).
  - The holders table, with the IUCN rows and quotes; how a player answers it, and the guess-wrong cases; the removal touch list; round impact.
  - Options with trade-offs and data support counted from the inventory:
    - remove;
    - replace with something checkable, e.g. `travelOf` (fly/swim/dig/walk, already derived), an open tag with wide coverage (`climber`, `burrower`, `swimmer`) or a habitat kind; say how many of the 76 have data and whether the photo or guide shows it;
    - keep, reworded, and whether marginal-only holders should drop it.
  - The recommendation, and its line for section 1.
  - Done: section 2 complete; every quote linked.

- [x] S9 · Report sections 1, 3, 4, 5 and Method; `findings.csv` final.
  - Resolve every remaining flag, or make it `unclear` with the reason.
  - `audit/table.py` writes section 3 from the CSV (findings only, wrong → unfair → unclear, then animal id).
  - Section 4 from s2-rules: the one-value rule, the bin edges, and the label/doc changes.
  - Section 5: the files and size of a fix mission:
    - `db/content/animals/<n>.json` per finding;
    - `questionMatch.ts`/`profiles.ts` copy; `docs/CONTENT_SOURCES.md`;
    - `traits.ts`/`clueFaces.ts`/tests if Farms & towns goes;
    - the rules version and saved games; the owner's prod content build.
  - Method and coverage: the routes used, couldnt-check rows, and the live DB comparison.
  - Section 1: the recommendation and the counts by severity from the CSV.
  - Run Verification 1–3.
  - Done: Verification 1–3 pass.

- [x] S10 · Final Verification (this is the "In a mission session" rule 7 unit). Run all of Verification, save `final-e2e`, and write the plan's Summary (paste `git diff --stat origin/main...HEAD`). In one commit, check S10 off and set `status: done`. Push. End `MISSION_CONTINUE` (release next).

## Verification

From `REPO`, one heavy job at a time. Done when every item holds.

1. **Report sections**: `f=docs/research/2026-11-06-clue-audit.md; for h in "## 1. Summary" "## 2. Farms & towns" "## 3. Findings" "## 4. Rules" "## 5. What a fix mission would change" "## Method and coverage"; do grep -qF "$h" $f || echo "MISSING $h"; done` prints nothing.
2. **CSV coverage**, exit 0, printing `76 animals; 0 missing; 0 open flags; 0 wrong rows lacking quote/link` plus the severity counts, which must equal section 1's:
   ```
   python3 -I -c '
   import csv,collections,sys
   rows=list(csv.DictReader(open("/srv/critter-ai/agent-state/missions/clue-audit/findings.csv")))
   P="class order family genus size lifespan diet activity birth young social covering system habitat".split()
   have={(r["animal_id"],r["prefix"]) for r in rows if r["animal_id"]!="rule"}
   ids={a for a,_ in have}
   miss=[(i,p) for i in map(str,range(1,77)) for p in P if (i,p) not in have]
   flags=[r for r in rows if r["result"]=="flag"]
   bad=[r for r in rows if r["severity"]=="wrong" and not (r["quote"].strip() and r["source_url"].startswith("http"))]
   print(len(ids),"animals;",len(miss),"missing;",len(flags),"open flags;",len(bad),"wrong rows lacking quote/link")
   print(dict(collections.Counter(r["severity"] for r in rows if r["result"]=="finding")), dict(collections.Counter(r["check"] for r in rows)))
   sys.exit(1 if len(ids)!=76 or miss or flags or bad else 0)'
   ```
3. **Only plan + report**: `git fetch origin --prune && git diff --stat origin/main...HEAD` lists exactly `plans/2026-11-06-clue-audit.md` and `docs/research/2026-11-06-clue-audit.md`. `git status --porcelain` is empty. If `next dev` touched `AGENTS.md` or `next-env.d.ts`, `git restore` them; never commit them. `rg -n "postgres(ql)?://" docs/research plans` is empty.
4. **Sanity** (nothing changed): `npm run typecheck`, `npm run lint`, `npm test` exit 0 (baseline 48/48).
5. **E2E**: `CHROME_PATH=/srv/critter-ai/agent-state/missions/clue-audit/bin/chrome npm run e2e:fresh` passes every check (baseline 1479/1479, 4 rounds, seed 7). Copy the newest `e2e-artifacts/<run>/` (report.json, screenshots), the command, and the typecheck/lint/test/e2e logs into `STATE/final-e2e/`, then delete the repo copy. Keep two folders, `baseline-e2e` and `final-e2e`. There are no intermediate runs. The release's re-run replaces `final-e2e`.

## Failure modes

Written before the S1/S4 parsers. Each case must be handled or flagged, never passed silently.
- **Parser, units**:
  - g / kg / lb / t mixed, and "grams" inside "kilograms";
  - lengths (mm, cm, m) read as weights;
  - "1,500", "0.6".
- **Parser, ranges**:
  - "25 to 40", "25–40", "25-40";
  - "up to", "over", "about", "between";
  - number words ("one or two", "a dozen");
  - "usually 2 or 3" next to "1 to 5": typical vs range, report both.
- **Parser, wrong quantity**:
  - male vs female splits;
  - newborn or hatchling weights;
  - record vs typical; wild vs zoo lifespan;
  - months, or gestation days, read as lifespan; age at maturity read as lifespan;
  - clutches per year read as clutch size.
- **Parser, edges**: values exactly on 100 g, 2, 30 or 300 kg, 5 or 20 years, or 2 or 10 young. Mark them `edge`; S2's rules table decides the bin.
- **Sources, IUCN**:
  - Plain `curl` gets 403 (checked 2026-11-06).
  - Routes, in order:
    1. `parallel-search` `web_fetch` on `staging-www.iucnredlist.org/details/<iucnId>/0` and `/species/<iucnId>/<assessment>/pdf`, ~7 per call (`docs/CONTENT_SOURCES.md`);
    2. the WebFetch tool;
    3. headless Chrome via `STATE/bin/chrome`.
  - Pages may be JS-rendered, or excerpts may drop table rows: refetch asking for every Appendix Habitats row.
  - API v4 needs a token: don't request one.
  - If nothing loads: `couldnt-check: <reason>; used content habitats (from IUCN tables) + git history`.
  - A newer assessment than the content's: report both.
- **Sources, other**:
  - ADW: old spellings (`Zaglossus_bruijni`), missing sections;
  - Wikipedia rate limits: retry;
  - AmphibiaWeb blocks bots: search excerpts;
  - `literature` DOIs paywalled: couldnt-check.
  - Downloaded files stay in their own dirs and are never executed.
- **Risk**: if IUCN won't load at all, Q1 rests on content and history alone. The report must say so plainly, not soften it.

## Code review (Astra)

Skipped: research mission, no code.

## Release

- Rebased: already on `origin/main` 26b66aa4 (no change). Full Verification re-run: 1–3 pass (2 files in diff), typecheck, lint, 48/48 unit, e2e 1479/1479 (seed 7); `STATE/final-e2e/` replaced.
- PR #57 merged: merge commit `aea571d095f1e3b263b7780ee70cc522c68b81eb`.
- Deploy last line: `deploy critter-connect: live at https://critterconnect.org` (deploy/check.sh 38 OK, 0 FAIL).
- Smoke: `version.txt` = aea571d0; play `/`, `/explore/?seed=7`, `/api/places/`, critterconnect.org `/` all 200. Mission changed no live page (docs only).
- Log: `/srv/critter-ai/agent-state/missions/clue-audit/release/deploy.log`

Result: done

## Decisions

- Architecture, Fable, Astra (plan and code) and Revision stages skipped: brief says no architecture/code review stages, skip Astra.
- S1: young edge is 10 only ("3–10" and "10+" both hold 10); 2 sits only in "1–2", so not an edge. Lifespan bins by the longest figure in the note (doc rule "longest known, zoo records included"); a lower wild figure in another bin is a `straddle` flag. A one-sided bound in the held bin passes, except a lifespan lower bound below 20+ (the longest may be higher): flag.
- S1: no-record rows use `check=note-value`, `result=no-record` (the plan's check list has no `no-record` check).
- Verification 3's connection-URL grep hits `plans/2026-10-29-cc-website.md:650`, a dummy build URL already on main. Run it on the mission's two files only.
- S2: deals use `animalsFromProfiles` (files), not the live pool; S1 showed them identical. Label/rule rows use `animal_id=rule, check=label`, `holds` a tag or edge name (`size:edge-30kg`), prefix `doc` for the stale doc line. Rule findings are judged now (unclear/unfair); per-animal edge/straddle cases stay S4's.
- S2: removal trap recorded for the fix mission: `artificial` must leave `COMPLETE_PREFIXES` together with the 45 kind rows, or `isHandWrittenClue` turns kind lines into field notes.
- S3: IUCN route = headless Chrome (`STATE/bin/chrome --dump-dom`) on `details/<taxon>/0` then `/species/<taxon>/<assessment>/pdf`; parallel-search MCP isn't available in mission sessions. Turtles' `iucnId` is the shapefile `id_no` (live `iucn` table confirms the species), so the fetch uses the cited URL's taxon. Not a finding.
- S3: habitat kinds aren't askable (only `habitat:<class>`), so kind gaps are info in the habitat row's evidence, never findings.
- S3: Farms & towns holder buckets: really (IUCN Suitable arable/pasture/gardens/urban, or text says so) = pass; marginal only, or cut forest/canals only = `unfair`; plantations only (true for the full question, not the label) or canals inside a city = `unclear`. Non-holders whose game notes or IUCN text put them on farms = `unfair`; purple frog (same IUCN rows as holders, game reads "no") = `unclear`. Chimp's IUCN-text "farmland" is `unfair`, not `wrong`, because IUCN's own table disagrees.
- S4: size/young straddlers are `unfair` when under 2/3 of the source range sits in the held bin, else pass with the overlap noted (wild dog 18–36 kg, 67%, is the borderline pass). Young with a typical litter of 2 to 3 (tiger, cheetah) or an average in the other bin (maned wolf) is `unfair`. Lifespan: `long` animals whose note leads with a wild/typical figure inside 5–20 are `unfair` (tiger, okapi, Grévy's zebra, jaguar, panda, cheetah); `lifespan:short` has no holder, so short-side edges (dyeing frog wild 4–6) pass. Notes giving generation length, maturity or gestation are `unclear`.
- S4: the plan said every straddler is `unfair`; minor ones (top or bottom value only) pass instead, because a careful player reading the note answers as the game does. Maned wolf's note "about 3 on average" is `wrong` (ADW, its cited source, gives 2).
- S4: AmphibiaWeb unreachable (curl, Chrome, WebFetch time out) and Britannica 403 everywhere: search excerpts, ADW and Wikipedia used instead; Wallace's flying frog size `couldnt-check`.
- S5: diet "Only plants" holders whose cited source names animal food are `unfair` (doc rule has no "only"); meat holders the source says eat mostly small invertebrates are `unfair` (2, 10), invertebrate-plus-vertebrate eaters pass; Pairs vs groups judged on the Pairs question's "pairs or small families" (42, 49, 61, 73 `unfair`). One finding per issue: it sits on `source-value` when the value is at issue, on `note-value` when only the note's wording misleads; the other row passes with a pointer.
- S5: default `source-value` rows quote the first source sentence naming the held value (`s5_rows.py`); all were read, 14 noisy quotes replaced by hand. Covering and birth pass on class when no source sentence describes them.
- S5: the 21 open `system`/`habitat` cross flags from S1 aren't on S5's prefixes; S9 resolves them (or S6/S7 where they're text).
- S6: a shown line saying the animal lives in a habitat it answers no to is `unfair`; threats, name/taxonomy words and what young or eggs do pass. Rocks: living/resting/climbing among rocks reads as Rocky places, stream-bed rocks for eggs, tadpoles or toes don't. Swimming isn't living in fresh water. S6 closed the 7 S1 cross flags on tags (`fully_aquatic` 10, 17 unfair; `coastal_dunes` 14, 32 unfair; `swimmer` 25, 28, 30 pass); the other 14 (systems vs habitat classes) stay S9's. A trait already found on note-value/source-value gets no second text finding; the text row points to it.
- S7: sheltering in caves reads as Caves (panda 60 unfair, beside devil 48's yes); underwater stream-bed rocks of a fully aquatic animal aren't Rocky places (hellbender 75 pass); a burrow under one big rock is `unclear` (59); place names with "coast" (46, 76) and "woodland" vs a forest no (66, as 31) are `unclear`. `swimmer` flags 44, 51, 54 pass. The 11 open systems-vs-habitat-class cross flags stay S9's.

- S8: recommendation remove. Option C (keep, reworded) uses strict holders: IUCN Suitable arable/pasture/gardens/urban or IUCN text = the 9 "really" + 52 (plantations) + 56, 63 (IUCN text) = 12; `audit/s8_strict.ts` deals it (39/149 seed decks, 0 lost; its `today` run reproduces S2). Option B: no ready data; `tree_dweller` (11, 9 photos in a tree) is the best candidate but open tags are partial (34, 24 only `climber`; 56 none; `climber` includes rock-climbing turtles), so it needs a new 76-animal trait. Game-text quotes link to the repo content file.
- S9: the 11 systems-vs-class flags: a Wetlands guide line ("rivers, lakes…") beside a Fresh water no is `unfair` (3, 25, 33, 51, 58, 64, 72); Coasts & sea yes beside Sea no (21) and On land for a river-only turtle (18) `unclear`; 2 passes (basks, nests on a sandbar), 17 passes pointing to its S6 `fully_aquatic` finding. New rule row `habitat:systems-vs-classes` (`unclear`). Section 4 recommends one edge rule, "an edge belongs to the upper bin" (matches 100 g and 5 years, which already read clearly), over the S2 rows' "half-open bins" shorthand. Findings themes for section 1 from `audit/s9_counts.py`.

## Log

- 2026-11-06 08:10 UTC: Baseline. typecheck, lint, 48 unit, e2e 1479/1479 pass. Review stages marked skipped per brief.
- 2026-11-06 08:20 UTC: Steps stage. planner wrote S1–S10, Verification (5 checks), Failure modes. No code; nothing to run.
- 2026-11-06 08:25 UTC: S1. inventory (76 animals, 3 no-country warnings) + mechanical.py: 1,075 rows (875 pass, 74 no-record, 126 flags: 23 straddle, 81 note-value, 22 cross); all 189 numeric parses hand-checked, 0 misreads. Live DB = files (76 species, 2,430 clues, 437 facts, 0 diff; same 20 artificial holders). Coverage: 76 animals, 0 missing. Report skeleton + Method.
- 2026-11-06 08:35 UTC: S2. trace (code 9 sites, 20 content files/45 kinds, 0 tests/docs/site; removal trap in isHandWrittenClue); deals: 141 seed decks, F&T dealt in 36 (25.5%; world 26.5%, NA 100%), 2nd most dealt tag; without it 0 seeds lost, 8 world frog seeds gain a set (68→76), 5 NA sets where only F&T splits the two sloths, 28 decks where it is the only split of a pair; rules: 21 rule rows (2 unfair, 12 unclear, 7 pass); 20 deal rows. findings.csv 1,116 rows.
- 2026-11-06 08:59 UTC: S3. IUCN loaded for 76/76 (headless Chrome; turtles via URL taxon). Habitat: 67 exact, 7 text-supported extras, 1 unclear (giant otter marine), purple frog artificial unclear; systems 76 pass; taxonomy 304 pass. Holders: 9 really, 5 marginal only, 6 plantations/cut forest/canals only (8 unfair, 3 unclear); non-holders 4 unfair + 1 unclear. 481 rows upserted, findings.csv 1,597. `out/s3-farms.md`, photos viewed (none shows farms/towns).
- 2026-11-06 09:57 UTC: S4. 228 cells judged against cited sources (+ADW): source-value 181 pass, 7 finding, 39 no-record (7 documented for the species by ADW), 1 couldnt-check; with note/straddle rows 30 findings (1 wrong, 15 unfair, 14 unclear); all 54 S1 flags on size/lifespan/young closed. findings.csv 1,828 rows. Sources cached: 65 ADW, 18 others; AmphibiaWeb/Britannica blocked.
- 2026-11-06 10:09 UTC: S5. 380 cells (76 × diet, activity, social, covering, birth) judged against cited sources (+ADW/IUCN/Wikipedia): source-value 321 pass, 23 finding, 35 no-record, 1 couldnt-check; with note-value/cross rows 30 findings (18 unfair, 12 unclear); all 52 S1 flags on these prefixes closed. findings.csv 2,208 rows. Open flags left: 21 system/habitat cross (S9).
- 2026-11-06 10:40 UTC: S6. text_scan.py over all 76 (394 leads; 217 for 1–38), animals 1–38 read in full: 532 text rows (462 pass, 60 no-record, 9 unfair, 1 unclear), 7 S1 tag cross flags closed (4 unfair, 3 pass). Findings mostly habitat no's the text contradicts (rocks 4, 11, 27; coast 13, 30; savanna 20; desert 32, 37; town 18; woodland 31). findings.csv 2,740 rows; open flags 14 (S9).
- 2026-11-06 10:20 UTC: S7. animals 39–76 read in full (177 scan leads): 532 text rows (510 pass, 14 no-record, 2 unfair, 6 unclear; all habitat: rocks 49, 59; caves 60; forest 42, 62, 66; coast 46, 76), 3 S1 swimmer cross flags pass. findings.csv 3,272 rows; open flags 11 (S9, systems vs classes).
- 2026-11-06 10:25 UTC: S8. Report section 2 written: holders table (20, IUCN rows + linked quotes), how a player answers (photos, kind lines, witness notes), guess-wrong cases both ways, round impact, removal touch list, options A/B/C with counts (tree photos `out/s8-tree-photos.png`, strict deal sim `out/s8-strict.json`), recommendation: remove. 18 F&T findings (13 unfair, 5 unclear). All repo links resolve; every quoted game line found in its content file.
- 2026-11-06 10:31 UTC: S9. 11 open flags resolved (7 unfair, 2 unclear, 2 pass) + 1 rule row; findings.csv 3,273 rows, 0 open flags; 123 findings (1 wrong, 69 unfair, 53 unclear; 58 animals + 15 rule rows). Report sections 1, 3 (123-row table from `audit/table.py`), 4, 5 and Method written. Verification 1–3 pass (2 files in diff; repo links resolve).
- 2026-11-06 10:40 UTC: S10. Verification 1–5 pass: report sections present; CSV 76 animals, 0 missing, 0 open flags (1 wrong, 69 unfair, 53 unclear = section 1); diff = plan + report only; typecheck, lint, 48/48 unit; e2e 1479/1479 (seed 7). Artifact `STATE/final-e2e/`.
- 2026-11-06 10:50 UTC: Release. Verification re-run pass (e2e 1479/1479); PR #57 merged (aea571d0); deployed, version.txt = aea571d0, smoke 200s.

## Summary

Research only; no game code or content changed. Report: `docs/research/2026-11-06-clue-audit.md`; all checks per animal: `/srv/critter-ai/agent-state/missions/clue-audit/findings.csv` (3,273 rows, passes included).

- **Farms & towns:** recommend removing it. Only 9 of its 20 holders really live on farms or in towns per IUCN; the rest hold it for marginal, plantation, cut-forest or canal habitat. No photo shows it. Removing it loses no deal seed (it's in 25.5% of decks). Replacement and reworded-keep options with trade-offs are in section 2.
- **Consistency:** 123 findings (1 wrong, 69 unfair, 53 unclear) on 58 animals plus 15 label/rule rows. The one wrong: maned wolf note "about 3 on average" vs ADW 2.
- **Verification:** typecheck, lint, 48/48 unit pass; e2e 1479/1479 (seed 7). Artifact `/srv/critter-ai/agent-state/missions/clue-audit/final-e2e/` (report.json, screenshots, logs, `COMMAND.txt`).
- **Release:** the deploy ships the same game. No production content build is needed.

`git diff --stat origin/main...HEAD`:
```
 docs/research/2026-11-06-clue-audit.md | 381 +++++++++++++++++++++++++++++++++
 plans/2026-11-06-clue-audit.md         | 338 +++++++++++++++++++++++++++++
 2 files changed, 719 insertions(+)
```
- **Released:** PR #57 merged (aea571d0) and deployed; live version.txt = aea571d0, smoke pass.
