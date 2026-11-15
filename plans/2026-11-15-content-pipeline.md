---
mission: content-pipeline
project: critter-connect
branch: agent/content-pipeline
status: active
started: 2026-11-15 06:23 UTC
---

# Mission: Content pipeline: one build to add an animal, and the content's terms written down (Critter Connect, audit M10)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Mission M10 of the codebase audit (vault `research/critter-connect/codebase-audit.md`: read findings D20, A1, S12 and S9, K11 and K13, and the M10 entry in full). The audit's M10 also had D7; the owner dropped it (Notes). Quote text when you find a site: the line numbers in the audit are from the pinned commit `4fa92a8e`, and M6, M1, M3, M4, M7 and M8 merge before this mission (M9 runs after it) and shift them. When it's done:

1. **D20:** the entry `"https://doi.org/10.1098/rspb.2017.1347"` (Ihle, Hutter and Tschirren 2017) is gone from `db/content/citations.json`, and nothing else in the file changes. The file then holds 261 entries (262 at `2aa3bd2c`).
2. **A1 and K11: the terms are written down.**
   - **A new file `CONTENT_LICENSE.md`** at the repo root, beside `LICENSE`, says:
     - which licence covers what. The code is MIT (`LICENSE`). In `db/content/`, the licence is set **per item, by its source** (review, 2026-11-14: Creative Commons share-alike licences require adaptations to keep the same licence, so one blanket licence can't cover the folder). The licensor is Haunted Pavement LLC.
       - Items the project wrote itself, and items adapted from Animal Diversity Web (CC BY-NC-SA 3.0, which allows a later version): **CC BY-NC-SA 4.0** (https://creativecommons.org/licenses/by-nc-sa/4.0/; owner, 2026-11-14).
       - Items adapted from Wikipedia: **CC BY-SA 4.0**, as share-alike requires. Not NC-SA: the two licences don't mix.
       - Items adapted from AmphibiaWeb: CC BY-NC 4.0 terms apply. Offered under CC BY-NC-SA 4.0, which keeps those terms.
       - **IUCN-derived fields** (each profile's `redList`, `habitats` and `range`, and items sourced `iucn` or `iucn_range`): no Creative Commons licence. They are offered only under the IUCN Red List Terms of Use, which forbid reposting or redistribution; the file says so and links the terms.
       - One Earth bioregions: CC BY-NC 4.0, with its citation (below). Natural Earth: public domain. Photos: each under the licence its profile's `photo` records.
       - How to tell an item's source: each item's `sources`/`src` key and `db/content/sources.json` (say which field, after reading the files).
     - the facts about money, without a legal conclusion: Critter Connect is free and will never take money: no ads, no donations, no paid version (owner, 2026-11-14). Don't write "this use is non-commercial". The IUCN terms' meaning of commercial use (by or for a for-profit entity, or use that generates revenue) isn't settled for a free game run by an LLC, so the file states the facts and links the terms.

     It claims no permission, waiver or agreement from any source, and says nothing about correspondence with one.
   - **One Earth's citation**, in the form One Earth's datasets page gives (it reads "One Earth. {2023} Los Angeles…"; copy its punctuation, don't add any), shown here as `One Earth Bioregions Framework, One Earth. 2023. Los Angeles, CA. oneearth.org`, appears in `CONTENT_LICENSE.md`, in `docs/CONTENT_SOURCES.md`, on the website's Terms page and in the game's journal:
     - `src/site/pages/Terms.tsx`: "Maps use data from the IUCN Red List and other credited sources." becomes `Maps use data from the IUCN Red List and Natural Earth. Realms come from the One Earth Bioregions Framework, One Earth. 2023. Los Angeles, CA. oneearth.org.` The page's `updated="…"` date becomes the merge day. Nothing else on the page changes, and the smoke check expects the new date.
     - `src/components/clueGame/JournalSheet.tsx`: the line "Range maps: IUCN Red List" becomes `Range maps: IUCN Red List. Realms: One Earth Bioregions Framework, One Earth. 2023. Los Angeles, CA. oneearth.org`, in the same element with the same classes and the same condition.
   - **`docs/CONTENT_SOURCES.md`** gets a short "Map data" list under `## Citations` (One Earth with its licence and citation, Natural Earth's public-domain terms, the IUCN range maps under IUCN's terms) and a link to `CONTENT_LICENSE.md`.
   - **`LICENSE`:** the line "Copyright (c) 2025 Phaser" becomes two lines: `Copyright (c) 2025-2026 Haunted Pavement LLC` and `Portions copyright (c) 2025 Phaser (the Phaser Next.js template this project started from)`. The name is the site's operator, `OPERATOR = 'Haunted Pavement LLC'` in `src/site/config.ts`; the plan says that is where it came from. After the MIT text, one closing line: `This licence covers the code. The game content in db/content/ is licensed separately: see CONTENT_LICENSE.md.` The MIT text itself doesn't change, and the file keeps its CRLF line endings.
   - **`README.md`** gets one line naming both licence files. **`AGENTS.md`**'s "Content:" bullet gets one sentence: the game never takes money (no ads, donations or paid version), because most of its sources allow non-commercial use only (`CONTENT_LICENSE.md`).
   - `package.json`'s `"license": "MIT"` stays.
3. **S12: `npm run content -- ranges` works out each animal's realms and countries itself.**
   - It takes the animals (`id`, `iucnId`) from the profile files, passed to the query as a parameter, and reads only `iucn`, `oneearth.oneearth_bioregion` and `natural_earth.countries`. It reads neither `species` nor `clue_match_places`, so an animal with a profile and an imported range gets its realms and countries before any build.
   - **Bounded on the shared server:** the query runs in a transaction with `SET LOCAL statement_timeout = '15min'`. The dev copy shares its Postgres server with the live game. Keep `ORDER BY name` in the SQL, so the committed country order follows the database's collation as today.
   - The realm rules don't change. The country rules are those of `clue_match_places` in `db/schema.sql`, applied over the animals of the profiles: a country holds an animal when it holds at least 5% or 5,000 km² of its range; it is listed only when it holds at least two of the animals; Russia is one country (split at 60°E in the view only for its continent), France's overseas parts don't count for France, and "Seven seas (open ocean)" and Antarctica are left out.
   - A profile with no rows in `iucn` is still printed as "no range map" and left unchanged.
   - A comment over the query says it repeats the view's country rules. One comment line in the `clue_match_places` block of `db/schema.sql` says the same from the other side: change both together, until mission M13 (S17) takes the country rows out of the view.
   - The build's last message, "Built. Refresh the views if ranges or the set of animals changed (docs/CLUE_MATCH.md).", points at the new section of `docs/SHAPEFILE_BEST_PRACTICES.md` (Goal 4).
   - The comment on `range` in `src/clueGame/profiles.ts` ("Written by `npm run content -- ranges` from the range maps (realms with at least 10% of the range; globe countries).") stops calling them globe countries: after D13 they are country clues.
4. **S9: one order for adding an animal, and the content docs' smaller fixes.**
   - **The order** lives in one new section of `docs/SHAPEFILE_BEST_PRACTICES.md`, `## Adding or changing an animal`, which replaces `## After an import`. It says who runs each step. For a new animal:
     1. Owner, WSL: a fresh dump (`ssh play.critterconnect.org /opt/critter-connect/deploy/backup/pg-backup.sh`; `AGENTS.md` asks for one before a bulk write).
     2. Owner, WSL: `npm run iucn -- find|import` (the shapefiles are on his machine only).
     3. Agent or owner: the profile, with its `citations.json` entries in the same commit; `npm run content -- preview` with no `PROBLEM` lines.
     4. Agent or owner: `npm run content -- ranges`, once, off-peak, against the database that holds the import (the live one). It rewrites every profile's realms and countries; older animals can gain countries (keep the batch 2 example).
     5. Agent or owner: `npm run content -- photos`, and look at every photo.
     6. `npm test`, the balance bot, the PR, the merge and the app deploy, which goes out before the content build (the app bundles `citations.json`).
     7. Owner, WSL: a fresh dump, then `npm run content -- build`, once.
     8. Owner, WSL, straight after the build: refresh `clue_match_ranges`, then `clue_match_places`; then `npm run content -- check` (0 errors, 0 warnings) and play `/explore/?seed=1`.

     Changing an existing profile is steps 3, 6, 7 and 8, with the refresh only when the set of animals or a range changed. **If S12 doesn't merge** (Decision rules), the order is the one the code needs today: steps 1 to 3, then the owner's build and refresh, then `ranges` and `photos`, then the owner's second build and `check`, each with who runs it.
   - `docs/CONTENT_SOURCES.md`'s `## Workflow` and `docs/CLUE_MATCH.md`'s numbered list under "Content: the human in the loop" are replaced by a pointer to that section. Keep the heading `## Workflow`, and the anchors `#citations`, `#signs` and `#research-access`. Copy-writing rules in those sections (grades 6 to 12, the glossary) stay where they are.
   - **The smaller fixes:**
     - `docs/CONTENT_SOURCES.md` "Look-alike decoys are the animals sharing the most traits, rare ones weighted most (`similarity` in `src/clueGame/round.ts`)." says how suspects are chosen today: `pickSuspectSet` in `src/clueGame/animalBoard.ts`, relatives first, then `likeness`.
     - `docs/CONTENT_SOURCES.md` "refuses on any `checkCitations` error" adds every `checkProfile` problem.
     - `docs/CONTENT_SOURCES.md` "The `parallel-search` MCP `web_fetch` can read …": keep the line and its tips, and reword it to say that the tool is one the owner has used in his own sessions and that the repo's `.mcp.json` doesn't set it up (Q31 is unanswered). Do the same for the "parallel-search `web_search` hits a free-tier rate limit" line.
     - `docs/SHAPEFILE_BEST_PRACTICES.md` "The views use 1 to 3 and fall back to all polygons only for extinct species" says they fall back to all polygons for any animal with no polygon of presence 1 to 3.
     - `docs/CLUE_MATCH.md` "Countries come from the range maps for now; plan 041 (review fix 6) moves them to IUCN countries of occurrence." says countries come from the IUCN range maps wherever IUCN has assessed the species (owner, 2026-11-14), with no move to countries of occurrence.
     - `docs/DEPLOY.md`: only the sentence "Content changes don't need a redeploy: `npm run content -- build` from a dev machine updates the database, which the app reads live." changes. It says that a content change needs the owner's content build, and a change that cites a new page also needs an app deploy first (`docs/CONTENT_SOURCES.md#citations`, Release order). The rollback sentence before it is S7's (mission M5): leave it as you find it.
     - `src/lib/contentCitations.ts` "(JSON infers `tier: number`; the content check keeps it 1-4)" says only the table's `CHECK` holds `tier` to 1 to 4.
5. **The second range source (Q15) is a note, not code.** The plan's Summary says which animals in `db/content/animals/` have no IUCN range today, read from the files (a profile with no `range` block or empty `range.realms`) and checked against the dev-copy run's "no range map" lines; and what the code would need to take ranges from a second source (the query's key, the `clue_match_ranges` view's join, the `iucn` table's shape and its importer, the `iucn_range` source key and the "IUCN Red List" credit it shows, and the two credit lines of Goal 2). No code for it.

### Why

The next animal is the first one added under the rule that only the owner runs the production content build, and today it needs two of his builds with a refresh and a range step between them, in an order two of the three docs get wrong. After S12 it needs one build, with one written order that says who does what. The content rests on sources that allow non-commercial use only, while the repo's one licence file grants the right to sell it under a template author's name. Writing the terms down puts the no-money condition where the next person who adds a donate button will read it, and the credit One Earth's licence asks for goes where players see the maps.

### Scope

In:
- `db/content/citations.json` (the one entry)
- `LICENSE`, the new `CONTENT_LICENSE.md`, `README.md` (one line), `AGENTS.md` (the "Content:" bullet)
- `scripts/content.ts` (the range query, its comment, the build's last message)
- `db/schema.sql` (one comment line in the `clue_match_places` block)
- `src/components/clueGame/JournalSheet.tsx` (the credit line), `src/site/pages/Terms.tsx` (the credit sentence)
- `src/clueGame/profiles.ts` and `src/lib/contentCitations.ts` (one comment each)
- `docs/SHAPEFILE_BEST_PRACTICES.md`, `docs/CONTENT_SOURCES.md`, `docs/CLUE_MATCH.md`, `docs/DEPLOY.md` (the content sentence)

Out:
- **The database.** No table, view, grant or row changes, live or dev copy: no content build, no view refresh, no import. `ranges` reads the dev copy and writes only the worktree's profile files.
- **Every file under `db/content/animals/`, and `db/content/sources.json`.** The profiles `ranges` rewrites are a proof, never committed.
- `scripts/import-natural-earth.mjs` and the `natural_earth.countries` line in `db/schema.sql`'s header (D7, dropped by the owner).
- The four tools K13 keeps (`scripts/iucn.ts`, `scripts/photos.ts`, `scripts/clue-world-map.ts`, the `photos` mode), beyond the range query.
- **A second range source** (GBIF, AmphibiaWeb or another): it needs the owner's choice of source and its licence. Only Goal 5's note.
- `clue_match_places`'s country and wildlife-area rows (S17, mission M13).
- The rest of A1: `FULL_CITATION_KEYS` in `src/clueGame/citations.ts`, the photo credits on the board's tiles and the grid's cards, a clue's own source name, the site's other pages, `package.json`'s `license`, retaking the site's screenshots (`npm run site:shots`; the owner set them aside), and any message to a licensor.
- `plans/` (records), the rollback sentence of `docs/DEPLOY.md` (S7) and every other audit finding.

### Definition of done

- **Baseline, before any change:**
  - **What merged first.** On a fresh `origin/main`, check that `loadPlaces` in `src/lib/places.ts` returns continents only (M6's D13). If it doesn't, skip S12 (Decision rules) and say so in the plan.
  - **Fresh greps.** Re-run the greps under "Roots checked" and "Prove it's safe first" in D20, A1, S12 and S9, and record their output in the plan. Expect `git grep -n "rspb.2017.1347" -- db/content/animals` to print nothing, and `git grep -n -E "kind = 'country'" -- src scripts` to give one line, the range query.
  - **Live pool.** One GET of `/api/clue-game/pool/`: record the lengths of `species`, `clues`, `facts` and `citations`, save the sorted `citations` keys to `/srv/critter-ai/agent-state/missions/content-pipeline/pool-citations-before.txt`, and check that `https://doi.org/10.1098/rspb.2017.1347` isn't among them. If it is, stop D20 and note it.
  - **The range tool, unchanged.** Run today's `npm run content -- ranges` once in the dev-copy block below, timed, and record `git diff --stat db/content/animals`, then `git checkout -- db/content/animals`. Today's tool reads the dev copy's `species` and `clue_match_places`, so a non-empty diff here means the dev copy's content is stale: record it, don't fix it.
  - **Content check.** `npm run content -- check` once in the dev-copy block; save its output to `…/content-pipeline/content-check-before.txt`.
  - **Tests.** Record `npm test`'s pass count.
  - **Baseline E2E.** `npm run e2e:fresh` once in the dev-copy block; copy its artifact to `…/content-pipeline/baseline-e2e/` and record its check count.
- **The dev-copy block.** Every `ranges`, `check` and E2E run goes **against the dev copy `phaser_june_dev`, never `.env.local`** (the live database):
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    CHROME_PATH=~/.local/bin/chrome-nosandbox npm run e2e:fresh )
  ```
  (with `time npm run content -- ranges` or `npm run content -- check` in place of the last command). Never print a connection string or `cat` that file. If the guard fails, stop that part and add a handoff item. `scripts/connect.ts` loads `.env.local` with dotenv, which doesn't override an exported `DATABASE_URL`.
- **S12's proof, on the final code:**
  - Empty every profile's `range` to `{ "realms": [], "countries": [] }` in the worktree with a throwaway script, then run `ranges` in the dev-copy block, timed. `git diff --exit-code db/content/animals` must exit 0: every realm and country of all 76 profiles is rebuilt as it is. Save the tool's output to `…/content-pipeline/ranges-after.txt`; it prints a line for every profile. At `2aa3bd2c` the profiles hold 83 realm tags and 414 country tags over 77 countries.
  - `git grep -n -E "clue_match_places|(FROM|JOIN) species( |$)" -- scripts/content.ts` prints nothing.
  - Record every run's wall time in the plan.
- **After the code changes**, run `rm -rf .next .next-e2e .test-dist` before the typecheck: `tsconfig.json` includes the generated `.next-e2e` types (M4 removes the `clean` script).
- **On the final commit:**
  - `npm run typecheck`, `npm run lint`, `npm test` (the baseline's pass count), `npm run site:build` and `npm run e2e:site` exit 0.
  - `npm run content -- check` in the dev-copy block prints the same summary line and the same error and warning counts as `content-check-before.txt`.
  - `git diff --exit-code origin/main -- db/content/animals db/content/sources.json scripts/import-natural-earth.mjs` exits 0, and `git diff origin/main -- db/content/citations.json` removes exactly the one entry's 4 lines and adds none.
  - The comment-only files change comments only: `git diff -U0 origin/main -- src/clueGame/profiles.ts src/lib/contentCitations.ts db/schema.sql | grep -E '^[+-]' | grep -v -E '^(\+\+\+|---)' | grep -v -E '^[+-]\s*(//|/?\*|--)'` prints nothing.
  - `git ls-files --eol LICENSE` still shows `i/crlf`.
  - `git grep -n -E "round\.ts|similarity|for now; plan 041|only for extinct|keeps it 1-4|don't need a redeploy" -- docs src scripts ':!docs/research' ':!docs/playtests'` prints nothing, and every `CONTENT_SOURCES.md#` and `SHAPEFILE_BEST_PRACTICES.md#` link in the repo (`git grep -n -E "(CONTENT_SOURCES|SHAPEFILE_BEST_PRACTICES)\.md#" -- . ':!plans'`) names an anchor that exists.
- **`npm run e2e:fresh` passes** in the dev-copy block with the baseline's check count. Look at the journal screenshots (`05-journal.png`, `09-journal-sharp-eye.png`, `11-journal-sources-open.png`): the credit line shows in full at the E2E's widths and nothing else moved. Save the final run's artifact as `/srv/critter-ai/agent-state/missions/content-pipeline/final-e2e/`.
- **Release** (critter-connect's release rules: CI's `check` job must pass, a failed `e2e` job is rerun once and then reported, and a failed deploy or smoke test is reverted). Just before the merge, record from the live sites, in the plan: the four lengths and the sorted `citations` keys of `/api/clue-game/pool/`; the `key` list of `/api/places/`; the status codes of `/`, `/explore/` and `/api/clue-game/journal/` on `play.critterconnect.org` and of `/`, `/terms/`, `/privacy/` and `/teachers/` on `critterconnect.org`; and the text of `/terms/` with its tags stripped. After the deploy, each must match that record:
  - `bash deploy/check.sh` passes, and `version.txt` shows the merge commit.
  - `/api/clue-game/pool/` has the same four lengths and the same `citations` keys (the removed entry was cited by no live row, so the pool doesn't change), and `/api/places/` the same keys.
  - Every status code is the same.
  - `/terms/`'s text differs from the record only in the one sentence, which now holds One Earth's citation.
  - Recorded, not a gate: whether the scripts `/explore/` loads, and the chunks they name, hold "One Earth Bioregions Framework" (0 before; the journal is in a lazy chunk, so a miss here alone isn't a failed smoke test).
- **The Summary** lists the changed files; the D20 checks; the copyright holder's name and where it came from; the dev-copy runs of `ranges` (the baseline's diff, the final empty diff, each run's time); the content-check and test comparisons; the E2E runs; the smoke results; Goal 5's note; and whether a production content build is needed. It isn't, if nothing under `db/content/animals/` or `sources.json` changed and the live pool never cited the removed page: say so and why.

### Decision rules

- **If S12's diff isn't empty,** `git checkout -- db/content/animals` and fix the query; never change a profile to match. Before reading it as the query's fault, compare the dev copy's `iucn`, `natural_earth.countries` and `oneearth.oneearth_bioregion` with the live ones, once, read-only, outside the dev-copy block, with `./scripts/db "<query>"` (it uses `.env.local`, the live database as `postgres`, so reads only): `SELECT count(*), count(DISTINCT id_no), sum(ST_NPoints(wkb_geometry)) FROM iucn` and the row counts of the other two. If they differ, stop S12 and add a handoff item.
- **Dropping S12.** If M6's D13 hasn't merged, the guard fails, or no query reaches an empty diff within eight full runs on the dev copy, revert the range query's changes (keep the doc fixes), add a handoff item, and write the order for today's code (Goal 4). The rest of the mission goes on. Reverting S12 also reverts its comment in `db/schema.sql`, its `profiles.ts` comment and the build-message change. In the two-build order for today's code, the PR's merge and the app deploy come **before** the owner's first content build, as the release order in `docs/CONTENT_SOURCES.md` requires for rows that cite new pages.
- **Load.** The dev copy is on the same Postgres server as the live game, behind the same PgBouncer, so each full `ranges` run (the places refresh it replaces took 90 to 150 s) shares that server with players. Never two runs at once, at most eight in all, and never one alongside the E2E. The eight count every full `ranges` run on the dev copy, the baseline and any retake after a rebase included. After every run, crashed ones too, restore the profiles (`git checkout -- db/content/animals`) before the next, and judge each run with `git diff --exit-code HEAD -- db/content/animals`. No profile lists RUS or FRA today, so an empty diff doesn't exercise the Russia and France rules: add a unit case or a scratch-profile check for each of the Russia, overseas-France, open-ocean and Antarctica rules, and record it.
- **The terms' wording** states the facts above and the sources' own terms, linked; it doesn't interpret them, promise compliance or claim any permission. Where a source's page can't be fetched, quote its terms as the audit's A1 records them (read 2026-11-10) and say so.
- Delete only D20's entry. Anything else that looks dead or wrong is a note in the plan, not an edit.
- **Flaky E2E steps:** audit A10 records three timing checks that fail by themselves (the globe spin among them). If a local E2E fails only there, rerun it once.
- If the release rebase brings changes to `db/content/` or `scripts/content.ts`, retake the `ranges` proof and the content check on the new base.

### Notes

- **Owner answers (Danby, 2026-11-14), which override the audit.**
  - Q14 (A1): he holds nothing in writing from IUCN, One Earth, AmphibiaWeb or Animal Diversity Web. The game will never take money: no ads, donations or paid version. `db/content/` is CC BY-NC-SA 4.0 where the sources allow it (first CC BY 4.0; changed on 2026-11-14 because several sources are non-commercial; narrowed per source by the review, Goal 2), attributed to each source as `citations.json` does; the code stays MIT.
  - Q15: more animals are coming. No move to IUCN countries of occurrence: keep the IUCN range maps wherever IUCN has assessed the species, so S12 goes ahead. Species with no IUCN map will need another range source, which needs his choice; not this mission.
  - Q5: keep `scripts/import-natural-earth.mjs`: it loads `natural_earth.countries`, which `clue:world-map` and the views read. D7 is dropped.
  - Q31 is unanswered (does he run research searches in parallel when adding an animal), so the `parallel-search` lines stay, reworded only.
  - The production content build stays his. The game isn't released to the public yet.
- **What merged first.** M2 (PR #71, `2aa3bd2c`), then M6 (server cleanup: `/api/places/` continents only, so the range query is the last reader of the view's country rows; it also edits `docs/SHAPEFILE_BEST_PRACTICES.md`, `docs/DATABASE_ACCESS.md` and `AGENTS.md`), M1, M3 (agent files: it may have rewritten `AGENTS.md`), M4 (toolchain: removes the `clean` script), M7 (rules cleanup), M8 and M9 (which shares `docs/CLUE_MATCH.md`). M5 (`docs/DEPLOY.md`'s rollback sentence) may or may not have. This brief was checked at `2aa3bd2c`; re-read every site on a fresh `origin/main`.
- **Checked at `2aa3bd2c`:**
  - All 76 profiles have an `iucnId` and at least one realm, so none lacks an IUCN range. Three have no countries (Darwin's frog, Livingstone's flying fox, the Hispaniolan solenodon) because no country holds two animals' ranges there: that isn't a missing range.
  - The dev copy holds `iucn` (202 rows), `natural_earth.countries` (258), `oneearth.oneearth_bioregion` (827), `species` (76) and `clue_match_places` (156).
  - The live pool has 76 species, 2,478 clues, 491 facts and 261 citations, without `rspb.2017.1347`; live `version.txt` was `4fa92a8e`.
  - The site says "Made by {OPERATOR}" and "Critter Connect is run by {OPERATOR}", from `src/site/config.ts`. Git authors include "Kari Cummings", "hauntedpavement" and the agents; the owner chose the site's name, Haunted Pavement LLC (2026-11-14).
  - The initial commit `48d84499` brought `LICENSE` with the Phaser template, and some of the template's files are still in the tree (`src/game/main.ts`, `src/game/EventBus.ts`, `src/pages/_app.tsx` among them), which is why the template's notice stays.
  - One Earth's download page gives the year as "{2023}"; the citation drops the braces.
- **The edit hook** (`.claude/hooks/guard-edits.sh`) blocks Edit and Write on env files (`.env`, `.env.*`, and `*.env` after M3), on `*.prisma` files, and on text holding a Supabase or Prisma package name. Nothing in this scope hits it.
- **Tests first** is the repo's rule (`AGENTS.md`, Testing). No unit test reaches the range SQL; the dev-copy runs with emptied ranges are its test, and the baseline run comes first.
- **Chrome for the E2E:** the shared wrapper `~/.local/bin/chrome-nosandbox`. Don't write your own copy.
- **The pre-push hook** runs typecheck and lint. The PR changes `.ts`, `.tsx` and `.json`, so CI runs.
- **Size:** about 13 sessions (the audit's 14, less D7).

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: consult the advisor (Fable 5.2) on the Architecture section
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

At `94049996` (= `origin/main` `aabc91d5` + mission start), 2026-11-15 06:20-06:42 UTC. State folder `S=/srv/critter-ai/agent-state/missions/content-pipeline`.

- **What merged first:** `loadPlaces` (`src/lib/places.ts:15`) reads `FROM clue_match_places WHERE kind = 'continent'`: D13 is in, S12 goes ahead.
- **Fresh greps** (full output `$S/baseline-greps.txt`):
  - `git grep -n "rspb.2017.1347" -- .`: `db/content/citations.json:389,391`, `plans/2026-11-07-fact-sources.md:539,689`, and this plan. `-- db/content/animals`: nothing (exit 1). As expected.
  - `git grep -n -E "kind = 'country'" -- src scripts`: one line, `scripts/content.ts:64` (the range query). As expected.
  - `-w clue_match_places -- src scripts`: `scripts/content.ts:64`, `src/app/api/places/route.ts:6` (comment), `src/clueGame/places.ts:2` (comment), `src/lib/places.ts:1` (comment), `:15` (continents), `:36` (outline by key).
  - `FROM species\b|JOIN species\b -- scripts`: `scripts/content.ts:44`.
  - `content -- ranges|RANGES_SQL -- .github .githooks tests`: nothing.
  - `CONTENT_SOURCES|SHAPEFILE_BEST_PRACTICES` (no plans, no research): `AGENTS.md:59,63,65`, `README.md:32,34`, `db/schema.sql:10,18`, `docs/CLUE_MATCH.md:25,59,67`, `docs/CONTENT_SOURCES.md:84`, `docs/SHAPEFILE_BEST_PRACTICES.md:3`, `src/clueGame/citations.ts:3`, `src/clueGame/traits.ts:3`. (No `docs/_sidebar.md` hits any more.)
  - `CONTENT_SOURCES.md#`: `AGENTS.md:59` (`#citations`), `docs/CLUE_MATCH.md:67` (`#signs`), `plans/040-more-animals-per-place.md:70` (`#research-access`).
  - `non-?commercial|terms of use|redistribut`: `docs/SHAPEFILE_BEST_PRACTICES.md:7`, `docs/research/2026-11-07-amphibiaweb-wayback.md:11`, the three fonts' `OFL.txt`. Same as the audit.
- **Live pool** (`play.critterconnect.org/api/clue-game/pool/`, 200): species 76, clues 2478, facts 491, citations 261; `rspb.2017.1347` not among them. Sorted keys: `$S/pool-citations-before.txt` (261 lines). Live `version.txt` `aabc91d5`. `citations.json` holds 262 entries.
- **Range tool, unchanged:** run 1 (06:26 UTC) failed after 60.6 s, "canceling statement due to statement timeout": the dev role's `ALTER ROLE critter_dev SET statement_timeout = '60s'` (`deploy/db/dev-role.sql:16`). Run 2 (06:27 UTC): the same query with only `sql.begin` + `SET LOCAL statement_timeout = '15min'` around it (uncommitted, `git checkout -- scripts/content.ts` right after): exit 0, **65.1 s**, `git diff --stat db/content/animals` empty, 0 "no range map" lines (`$S/ranges-before-timeout15.txt`; run 1: `$S/ranges-before.txt`). Dev copy's content isn't stale. **2 of the 8 `ranges` runs used.**
- **Profiles at baseline:** 76 profiles, 83 realm tags, 414 country tags over 77 countries; none without realms; no countries: Darwin Frog, Livingstone's Flying Fox, Hispaniolan Solenodon (as the brief says).
- **Content check** (dev copy, 0.8 s): `Pool: 76 playable of 76 species, 2478 clues (2086 deductive), 491 facts.` / `0 errors, 0 warnings.` (`$S/content-check-before.txt`).
- **Install / typecheck / lint / tests:** `npm ci` ok; `rm -rf .next .next-e2e .test-dist`; `npm run typecheck` exit 0; `npm run lint` exit 0; `npm test` **64/64 pass**. No migrations (no migration history; the mission changes no database object).
- **Baseline E2E** (dev copy, `CHROME_PATH=~/.local/bin/chrome-nosandbox npm run e2e:fresh`, 06:28 UTC, 12 m 41 s): **1579/1579 checks passed**, seed 7. Artifact `$S/baseline-e2e/` (`report.json`, screenshots, `run.log`).

## Architecture

Read at `911cd426` (`origin/main` `aabc91d5` + Baseline). Merged before: M2 #71, M6 #72, M1 #73, M3 #74, M4 #75, M7 #76, M8 #77. **M5 (deploy-ci) hasn't merged.** ✓ = site as the brief says; ✗ = brief off, with the fix.

### Findings

**Goal 1 (D20).** ✓ `db/content/citations.json:389-392`, between `…rspb.2017.0347` (:385-388) and `…aje.13279` (:393). Deleting exactly those 4 lines leaves valid JSON (neighbours keep their `},`). 262 entries now.

**Goal 2 (A1, K11).**
- ✗ **IUCN-derived fields.** Brief lists `redList`, `habitats`, `range`. The build credits more to IUCN: generated clues from `taxonomy`, `systems`, `habitats`, `elevation` and `redList` carry source `iucn`, and `range` carries `iucn_range` (`src/clueGame/profiles.ts:242-256,260-265,281-282`; `sources.json:2` notes name systems and elevation; `profiles.ts:44` "Metres above sea level, from the Red List"). Fix: `CONTENT_LICENSE.md` lists the fields the build credits to IUCN: `taxonomy`, `redList`, `systems`, `habitats`, `elevation`, `range`. Read from code, not interpreted.
- ✗ **"each item's `sources`/`src` key".** No `src` exists. Every trait, clue and fact has `source` (a `key` of `db/content/sources.json`) and optional `url`; its page is `url`, else the profile's `sources[<key>]` (`profiles.ts:28,58-62`; `docs/CONTENT_SOURCES.md:23,108`). Source default licence: `sources.json` `license` (:5 amphibiaweb, :8 adw, :15 wikipedia). Page licence: `citations.json` `license` (8 entries, all CC BY 3.0/4.0, so none forces share-alike). Photo: `photo.license`, `photo.credit`, `photo.page`.
- ✓ `src/site/pages/Terms.tsx:24-25`: the sentence spans two lines, "Maps use data from⏎        the IUCN Red List and other credited sources." (JSX joins with one space). `updated="November 6, 2026"` at `:6`; `Privacy.tsx:6` has the same date: leave it.
- ✓ `src/components/clueGame/JournalSheet.tsx:99`: `{found.length > 0 && <li className="pb-xs text-center text-xxs text-neutral-7">Range maps: IUCN Red List</li>}`. No E2E asserts the text.
- ✓ `LICENSE`: 21 lines, all CRLF incl. the last (`SOFTWARE.\r\n`); `i/crlf w/crlf`, no `.gitattributes`, and `.editorconfig` sets `end_of_line = lf`, so an editor may convert it. Copyright is line 3.
- ✓ `src/site/config.ts:7` `OPERATOR = 'Haunted Pavement LLC'`; `package.json:10` `"license": "MIT"`; `AGENTS.md:59` is the "Content:" bullet (M3 kept it); `README.md` has no licence line.
- `docs/CONTENT_SOURCES.md` `## Citations` is :103-147 (licence table :121-132, "Wikipedia share-alike" :134), then `### AmphibiaWeb via Wayback` :149.
- ✗ **Release smoke.** The brief changes Terms' `updated=` and then says `/terms/` text "differs from the record only in the one sentence". It differs twice: "Last updated …" (`src/site/LegalArticle.tsx:12`) and the sentence. Planner: the smoke expects both.

**Goal 3 (S12).**
- ✓ `scripts/content.ts:41-66` `RANGES_SQL`. Animals: `FROM species s JOIN iucn i ON i.id_no = s.iucn_id` (:44), every `species` row, no playable filter. Countries: a correlated subquery `FROM clue_match_places p WHERE p.kind = 'country' AND a.species_id = ANY (p.species_ids)`, building `json_build_object('code', substr(p.key, 9), 'name', p.name) ORDER BY p.name` (:63-64). Run at :117 as a bare `sql.unsafe(RANGES_SQL)`, no transaction, so `critter_dev`'s 60 s timeout (`deploy/db/dev-role.sql:16`) kills it (Baseline run 1). "no range map" :121 (no row for the id); write :122-123.
- ✓ Build's last message :144: `'Built. Refresh the views if ranges or the set of animals changed (docs/CLUE_MATCH.md).'` ✓ `profiles.ts:56` comment as quoted.
- **The view's country rules**, `db/schema.sql`: header :191-208; animals = `species` with clue rows :210-216; `kept` :217-222 (same text as `RANGES_SQL`'s); `country_parts` :223-239 (France's polygons with centroid x < -30 or > 40 get another continent :227-228; Seven seas and Antarctica out, Russia apart :233; Russia cut at 60°E into two rows, both `home = 'Asia'` :235-239); country branch of `areas` :241-244 (`WHERE continent = home OR adm0_a3 = 'RUS'`: overseas France drops out, Russia's halves rejoin; `GROUP BY adm0_a3, name, home`); `lives_in` :254-258; `place_species` :259-263 (`HAVING count(*) >= 2`).
- **Area:** `ST_Area(ST_Intersection(a.geom, k.geom)::geography) >= LEAST(0.05 * ST_Area(k.geom::geography), 5e9)` (:258): the intersection is planar in SRID 4326, the area is taken on the spheroid (geography cast, m²). Copy it verbatim; no `ST_Transform`, no `use_spheroid` change.
- ✗ **DoD grep `clue_match_places|(FROM|JOIN) species( |$)`** covers all of `scripts/content.ts`, comments and SQL comments included. The "repeats the view's rules" comment must say "the places view in db/schema.sql", never its name.
- `iucn.id_no` is `numeric` (`docs/SHAPEFILE_BEST_PRACTICES.md:57`, `scripts/iucn.ts:137`) and today compares with `species.iucn_id bigint`; a `bigint` parameter keeps that comparison.
- Same animals either way today: 76 profiles = 76 `species` rows = 76 playable (Baseline).

**Goal 4 (S9).**
- `docs/SHAPEFILE_BEST_PRACTICES.md:42-51` `## After an import` (order :44-49; batch 2 example :48, which also says "globe place"; candidate note :51). No `#after-an-import` link exists (`git grep -i after-an-import` empty); nothing links `#workflow` either.
- `docs/CONTENT_SOURCES.md` `## Workflow` :80-87; copy rule :89 stays. ✗ "refuses on any `checkCitations` error" (:85) sits inside the replaced Workflow: the fix ("and every `checkProfile` problem", `scripts/content.ts:131-132`) travels with the sentence into the new section's build step.
- ✗ partly: :78 "(`similarity` in `src/clueGame/round.ts`)". `pickSuspectSet` is `src/clueGame/animalBoard.ts:147-151` (closest in the family tree first), but `likeness` is `src/clueGame/questionMatch.ts:165` (+1 per shared trait category, −1 per differing one; no rarity weight, so "rare ones weighted most" goes too). The new line must not contain "similarity" or "round.ts".
- ✓ :93 and :94 (parallel-search). ✓ SHAPEFILE :35 "only for extinct species"; `ranges` now applies the same fallback, so: "The views and `content -- ranges` use 1 to 3 and fall back to all polygons for any animal with no polygon of presence 1 to 3".
- ✓ `docs/CLUE_MATCH.md`: heading :57, intro :59 ends "…and the workflow:", list :61-65, "for now; plan 041" :67, Plain words :69 (stays).
- ✓ `docs/DEPLOY.md:45`: one line, rollback sentence first, content sentence second. M5 isn't merged: if it lands before the release rebase, this line conflicts; keep M5's first sentence and ours second.
- ✓ `src/lib/contentCitations.ts:8`.
- Anchors that must survive (all present): `#citations` (`AGENTS.md:59`, `CONTENT_SOURCES.md:7`), `#signs` (`CLUE_MATCH.md:67`), `#research-access` (`plans/040…:70`), `#amphibiaweb-via-wayback` (`CONTENT_SOURCES.md:97`, in-page). The DoD five-pattern grep hits exactly the five sites above today.
- Notes, not edits (Decision rules): `CONTENT_SOURCES.md:38` also says "the globe countries" and omits the two-animal rule; `README.md:32` and `AGENTS.md:63,65` still describe the docs as before S9.

**Goal 5 (Q15 note), sites.** Key `iucn.id_no` = profile `iucnId` (`RANGES_SQL` `ranges` CTE); `clue_match_ranges` `JOIN iucn i ON i.id_no = s.iucn_id` (`db/schema.sql:156`); `iucn` shape `SHAPEFILE_BEST_PRACTICES.md:30-36`, importer `scripts/iucn.ts`; `iucn_range` `sources.json:3`, its clues `profiles.ts:260,265`; credits `JournalSheet.tsx:99`, `Terms.tsx:24-25`. All 76 profiles have realms today, so the "no IUCN range" list is empty.

### Target design

**S12: `ranges` (scripts/content.ts)**

TS, the `ranges` branch:
```ts
const profiles = await readProfiles();
const animals = profiles.map(({ profile }) => ({ id: profile.id, iucn_id: profile.iucnId }));
// Read only and bounded: critter_dev stops statements at 60 s, and its Postgres serves the live game.
const rows = await sql.begin('read only', async tx => {
  await tx.unsafe("SET LOCAL statement_timeout = '15min'");
  return tx.unsafe<RangeRow[]>(RANGES_SQL, [tx.json(animals)]);
});
// then today's loop over `profiles`, unchanged (no-range-map line, REALM_TAG, writeProfile)
```
- One JSON parameter, as `load` (:31-33) passes rows (`tx.json` + `$1::json`): one way to pass rows in this file.
- `'read only'` (postgres.js `begin(options, fn)` appends it to `BEGIN`): the tool can't write whatever database it points at. `SET LOCAL` works in a read-only transaction; PgBouncer is transaction-mode, and Baseline run 2 proved this wrapper.
- Profiles are read once, before the query (today: after); the same files are written.

SQL: today's realm CTEs verbatim; only `ranges` changes (two lines); country CTEs copied from the view minus continents, wildlife areas, `largest` and the bbox/outline columns.
```sql
WITH ranges AS (
  SELECT p.id AS species_id, i.wkb_geometry AS geom, i.presence
  FROM json_to_recordset($1::json) AS p(id integer, iucn_id bigint)
  JOIN iucn i ON i.id_no = p.iucn_id
), kept AS (
  SELECT r.species_id, ST_Union(ST_MakeValid(r.geom)) AS geom
  FROM ranges r
  WHERE r.presence IN (1, 2, 3)
     OR NOT EXISTS (SELECT 1 FROM ranges x WHERE x.species_id = r.species_id AND x.presence IN (1, 2, 3))
  GROUP BY r.species_id
), realm_area AS (
  SELECT k.species_id, b.realm, sum(ST_Area(ST_Intersection(ST_MakeValid(b.wkb_geometry), k.geom)::geography)) AS area
  FROM kept k JOIN oneearth.oneearth_bioregion b ON ST_Intersects(b.wkb_geometry, k.geom)
  GROUP BY k.species_id, b.realm
), shares AS (
  SELECT species_id, realm, area / sum(area) OVER (PARTITION BY species_id) AS share FROM realm_area
), nearest AS (
  SELECT k.species_id, (SELECT b.realm FROM oneearth.oneearth_bioregion b ORDER BY b.wkb_geometry <-> k.geom LIMIT 1) AS realm, 1.0 AS share
  FROM kept k WHERE NOT EXISTS (SELECT 1 FROM shares s WHERE s.species_id = k.species_id)
), country_parts AS (
  SELECT c.adm0_a3, c.name, c.continent AS home, d.geom,
         CASE
           WHEN c.adm0_a3 = 'FRA' AND ST_X(ST_Centroid(d.geom)) < -30 THEN 'South America'
           WHEN c.adm0_a3 = 'FRA' AND ST_X(ST_Centroid(d.geom)) > 40 THEN 'Africa'
           ELSE c.continent
         END AS continent
  FROM natural_earth.countries c
  CROSS JOIN LATERAL ST_Dump(ST_MakeValid(c.geom)) d
  WHERE c.continent NOT IN ('Seven seas (open ocean)', 'Antarctica') AND c.adm0_a3 <> 'RUS'
  UNION ALL
  SELECT c.adm0_a3, c.name, 'Asia', ST_Intersection(ST_MakeValid(c.geom), ST_MakeEnvelope(60, -90, 180, 90, 4326)), 'Asia'
  FROM natural_earth.countries c WHERE c.adm0_a3 = 'RUS'
  UNION ALL
  SELECT c.adm0_a3, c.name, 'Asia', ST_Intersection(ST_MakeValid(c.geom), ST_MakeEnvelope(-180, -90, 60, 90, 4326)), 'Europe'
  FROM natural_earth.countries c WHERE c.adm0_a3 = 'RUS'
), country_shapes AS MATERIALIZED (
  SELECT adm0_a3, name, ST_Union(geom) AS geom
  FROM country_parts
  WHERE continent = home OR adm0_a3 = 'RUS'
  GROUP BY adm0_a3, name, home
), country_animals AS MATERIALIZED (
  SELECT c.adm0_a3, c.name, array_agg(k.species_id) AS species_ids
  FROM country_shapes c
  JOIN kept k ON ST_Intersects(c.geom, k.geom)
  WHERE ST_Area(ST_Intersection(c.geom, k.geom)::geography) >= LEAST(0.05 * ST_Area(k.geom::geography), 5e9)
  GROUP BY c.adm0_a3, c.name
  HAVING count(*) >= 2
)
SELECT species_id,
       array_agg(realm ORDER BY share DESC) FILTER (WHERE share >= 0.10) AS realms,
       (SELECT coalesce(json_agg(json_build_object('code', c.adm0_a3, 'name', c.name) ORDER BY c.name), '[]'::json)
          FROM country_animals c WHERE a.species_id = ANY (c.species_ids)) AS countries
FROM (SELECT * FROM shares UNION ALL SELECT * FROM nearest) a
GROUP BY species_id
```

| Rule | View (`db/schema.sql`) | New CTE |
|---|---|---|
| presence 1-3, else all polygons | :217-222 | `kept` (unchanged) |
| France overseas not France | :227-228 + :243 | `country_parts` CASE + `country_shapes` WHERE |
| Seven seas, Antarctica out | :233 | `country_parts` WHERE |
| Russia one country | :233, :235-239, :243 | `country_parts` RUS rows + `OR adm0_a3 = 'RUS'` |
| 5% or 5,000 km² | :258 | `country_animals` WHERE |
| at least 2 animals | :263 | `country_animals` HAVING |
| code, name, order | today's :63 (`substr(key, 9)`, `p.name`) | `adm0_a3`, `c.name`, `ORDER BY c.name` |

- **Why it matches.** `substr('country:' || adm0_a3, 9)` = `adm0_a3`; the view's `name` for country rows is `c.name`, so `ORDER BY c.name` sorts the same column under the same collation. Grouping by `(adm0_a3, name)` in place of `key` differs only if two country rows share an `adm0_a3`, which the view's unique index on `key` (:282) already rules out for any listed country. Same expressions on the same `kept`, so the same areas; `ST_Union`'s input order may differ (float noise), which matters only for a country exactly at a threshold, and the full proof would show it.
- **`MATERIALIZED`** (PG 12+; `docker-compose.yml:4` is 17): each country CTE is referenced once, so Postgres would inline it, and `country_animals` sits under the correlated subquery that runs per animal. Forcing it computes the country geometry once, as the view's `areas` (used three times) was. `ranges` and `kept` are multiply referenced and materialize anyway.
- **"no range map"** keeps today's code: a profile with no `iucn` rows has no `kept` row, so no output row, so :121 prints it and leaves the file. A file missing `iucnId` gets NULL and the same line; `checkProfile` already rejects it in preview/build/test. No new validation.
- **Comments.** Over `RANGES_SQL` (replaces :39-40): each profile's realms (at least 10% of its range; the nearest realm for a range too small to touch one) and countries, from `iucn`, the One Earth bioregions and the Natural Earth countries; `$1` is the profiles' `[{ id, iucn_id }]`, so a new animal needs no build first; the country rules repeat the places view's in db/schema.sql, so change both together. Don't name the view, and don't put `$1` inside the SQL text's own comments. `db/schema.sql`: one `--` line in the places header after :195, e.g. `-- scripts/content.ts (content -- ranges) repeats these country rules: change both together while this view has country rows.` (no audit IDs: the audit isn't in the repo). Build message :144 → `(docs/SHAPEFILE_BEST_PRACTICES.md#adding-or-changing-an-animal)`. `profiles.ts:56` → `(realms with at least 10% of the range; countries for the country clue)`.
- **Load.** Realm part as today (65 s measured) plus the country part. The places refresh, which also unioned 8 continents and the wildlife areas, took 90-150 s, so expect about 1.5-3 min, well under the 15 min cap. If a run passes 5 min, run one plain `EXPLAIN` (it plans only, executes nothing) to check the country CTEs show as `CTE Scan`, before the next full run.

**The four rules no profile reaches** (Decision rules). A unit case can't reach SQL (`npm test` has no database). Instead, a scratch check runs the committed `RANGES_SQL` text over synthetic ranges on the dev copy:
- Harness `scripts/check-country-rules.ts` is untracked and never committed (`run-typescript.mjs` only runs entries under `scripts/`). Keep a copy at `$S/check-country-rules.ts` and its output at `$S/check-country-rules.txt`. Reproduce: copy it back, then run it inside the dev-copy block.
- It reads `RANGES_SQL` out of `scripts/content.ts`'s text (`/const RANGES_SQL = `([^`]*)`/`; throw if absent; importing the file would run the CLI). Then, in one `sql.begin`: `SET LOCAL statement_timeout = '15min'`; `CREATE TEMP TABLE iucn (id_no bigint, presence int, wkb_geometry geometry) ON COMMIT DROP`; insert the cases; run `RANGES_SQL` with their `[{ id, iucn_id }]`. Postgres resolves an unqualified name in `pg_temp` first, so the real SQL runs over synthetic ranges and the real countries and bioregions. Nothing persists: no table, row or grant changes (Scope). `critter_dev` owns the database, so it has TEMP.
- Ways the rules could break (written first), and the cases (presence 1, `id_no` 900000001+, `ST_MakeEnvelope(…, 4326)`):

| Case | Ranges | Pass when | Catches |
|---|---|---|---|
| Russia | A (90,55,100,60) Siberia; B (36,53,44,57) Moscow region | A and B each list `RUS` | Russia split into two countries (neither half holds 2) or dropped |
| Overseas France | C, D (-53.8,3.8,-52.6,5.2) French Guiana | no `FRA` for C, D | overseas parts counted for France |
| Mainland France (control) | E, F (0,45,5,48) | `FRA` for E, F | France dropped; shows the harness can list a country |
| Open ocean | G, H = geometry of one `continent = 'Seven seas (open ocean)'` country, picked by query and printed | its code absent | Seven seas filter lost |
| Antarctica | I, J (0,-85,60,-75) | `ATA` absent | Antarctica filter lost |
| Lone animal | K (100,45,105,48) Mongolia | K lists no country | two-animal rule lost |
| Harness | all | every id has a row | temp table didn't shadow `iucn` |

  Exit 1 on any failure. It's one read-only query, lighter than a full run, but count it in the eight and keep it away from the E2E. Run it before the full proof.
- The full proof (DoD: emptied ranges, empty diff over 83 realm and 414 country tags) covers the rest: realms, threshold, two-animal rule, order, collation.
- If S12 is dropped (Decision rules), revert the query, its two comments, the `profiles.ts` comment and the build message together.

**A1/K11 texts**
- `CONTENT_LICENSE.md`:
  1. Code: MIT, `LICENSE`. (One optional line: fonts under `public/fonts/` keep their `OFL.txt`.)
  2. `db/content/`: licensor Haunted Pavement LLC; the licence is set per item by its source, because share-alike licences make adaptations keep theirs. How to tell the source is the `source` field above. Then a table: written by the project (any other source key, `sources.json`, the profiles' structure) → CC BY-NC-SA 4.0; `adw` (CC BY-NC-SA 3.0, which allows a later version) → CC BY-NC-SA 4.0; `wikipedia` → CC BY-SA 4.0 (not NC-SA: they don't mix); `amphibiaweb` → CC BY-NC 4.0 terms, offered under CC BY-NC-SA 4.0, which keeps them; IUCN (`taxonomy`, `redList`, `systems`, `habitats`, `elevation`, `range`, and items sourced `iucn`/`iucn_range`) → no Creative Commons licence, IUCN Red List Terms of Use only, which forbid reposting or redistribution (quote §4, link); `photo` → its `photo.license`, credited to `photo.credit`, page `photo.page`; `citations.json` `cite` lines are quoted from their pages, so each follows its page's source like any item.
  3. Map data (in the database, not `db/content/`): One Earth CC BY-NC 4.0 with the citation; Natural Earth public domain; IUCN ranges under IUCN's terms.
  4. Money: the owner's facts; IUCN's §3 definition of commercial use quoted and linked; no conclusion, and no permission or correspondence mentioned.
- **Quoting terms.** iucnredlist.org refuses scripts. Fetch the Wayback copy A1 read once (`https://web.archive.org/web/20261101143939/https://www.iucnredlist.org/terms/terms-of-use`); if that fails, use A1's quotes marked "(as read 2026-11-10)". The brief's "by or for a for-profit entity" isn't in A1's quote: take it from the page, or quote only what A1 records.
- `docs/CONTENT_SOURCES.md`: a bold **Map data** label with three bullets (One Earth licence, citation and link; Natural Earth public domain and link; IUCN range maps under the terms link) after :134, ending with the `CONTENT_LICENSE.md` link. No new heading, so no anchor changes.
- `LICENSE`: edit the bytes with a script, not an editor. Line 3 becomes the two copyright lines; append `\r\n` and the closing line with `\r\n`. 24 lines. Check `git ls-files --eol LICENSE` (`i/crlf`) and `grep -c $'\r$' LICENSE` = `wc -l < LICENSE`.
- `README.md`: one line after the Docs list naming `LICENSE` (code, MIT) and `CONTENT_LICENSE.md` (content, per source). `AGENTS.md:59`: append the brief's sentence.
- Terms (`:24-25` → the brief's two sentences; `:6` → merge day, `Month D, YYYY`) and Journal (`:99` text only) as the brief says. The merge day isn't known while implementing: set the expected day, and the release unit corrects it before the merge if it slips.

**S9 docs**
- `docs/SHAPEFILE_BEST_PRACTICES.md`: `## Adding or changing an animal` (anchor `#adding-or-changing-an-animal`) replaces :42-51 with the brief's 8 steps, each led by **who**. Fold the moved details in: step 3 gets the next-id rule, "ids never change" and the `PROBLEM`-line meaning (from `CONTENT_SOURCES.md:82-83`); step 4 says what `ranges` reads, its measured time on the dev copy (from the final proof), its own 15 min cap, and the batch 2 example reworded without "globe place"; step 7 says the build "refuses on any `checkProfile` problem or `checkCitations` error"; step 8 has both `REFRESH … CONCURRENTLY` lines (places 90-150 s) and `check` erroring on an uncited fact. Then the "changing an existing profile" line, and :51's candidate note ("A range row with no profile is ignored by `ranges`; one with no `species` row is invisible to the game…").
- `CONTENT_SOURCES.md` `## Workflow`: keep the heading; replace :82-87 with one pointer to `docs/SHAPEFILE_BEST_PRACTICES.md#adding-or-changing-an-animal`; keep :89. `CLUE_MATCH.md:59-65`: the intro names the source tiers and tag vocabulary, then points to the same section; the list goes.
- The smaller fixes go where the brief says, worded as in Findings. `DEPLOY.md:45`: the second sentence only, linking `docs/CONTENT_SOURCES.md#citations`.

### Rejected alternatives
- Keep reading `species` and `clue_match_places`: that's the two-build loop S12 removes.
- `unnest($1::int[], $2::bigint[])`: works, but `load` already passes rows as one JSON parameter, and one file should have one way.
- One SQL function or view holding the country rules for both: a database change (out of scope), and S17 removes the view's copy anyway.
- Ranges from `clue_match_ranges`: simplified shapes, specks dropped, playable only, and it needs a build and refresh first. Different numbers and the same loop.
- Countries in TypeScript (turf): a new dependency, different numerics, and 10m country shapes over PgBouncer.
- A unit test of the rules: no database in `npm test`, and a copy of the SQL would only test the copy.
- Synthetic rows in the real `iucn`: a row change (Scope says none). A shadowing temp table does the same with nothing persisted.
- Duplicated real animals as the rule check: no profile's range reaches Russia, Antarctica or an open-ocean country.
- Exporting `RANGES_SQL` from a new module so the check can import it: a new file for a throwaway check.
- Committing the check: another script nothing runs (D10). The state folder keeps it repeatable.
- A `### Map data` heading: a new anchor for three bullets.

### Risks
1. **Shared server.** Each full run holds one backend for about 1.5-3 min on the server that serves players (2 of 8 runs used; the scratch check makes 3). One at a time, never beside the E2E, record every wall time. `MATERIALIZED` is what keeps the country geometry from running per animal: if the first run is far slower than the estimate, stop and `EXPLAIN`.
2. **Behavior.** The animal set is now the profiles, not `species`/playable. That's the same set today; afterwards an unbuilt profile counts toward the two-animal rule, which is the point of S12. "no range map" now means no `iucn` rows only. `ranges` no longer reads a materialized view, so it no longer depends on a fresh refresh, and the build no longer depends on `ranges` being run after it.
3. **Profiles.** Every run rewrites all 76 files in the worktree; restore with `git checkout -- db/content/animals` after each run, crashed runs too. DoD `git diff --exit-code origin/main -- db/content/animals …` guards the commit. A wrong query would show as a non-empty diff, never as a committed change.
4. **Rule drift.** The country rules exist twice until S17. Comments on both sides; the proof binds them today.
5. **LICENSE detection.** GitHub's detector compares `LICENSE` with MIT's text. The "Portions copyright" and closing lines may make the repo show "Other". The owner set the text: record `gh api repos/kc0588615/phaser-june/license --jq .license.spdx_id` after the merge in the Summary. Not a gate.
6. **Journal line** wraps to 2-3 lines at `text-xxs`; the DoD screenshots check it.
7. **DEPLOY.md:45** conflicts if M5 merges first (Findings).

## Architecture review (Fable)

2026-11-15, advisor (Fable 5.2), each point checked against the code at `58becdf8`.

VERDICT: APPROVE_WITH_CHANGES

Confirmed: the copied country CTEs match `db/schema.sql:223-263` (column order of the three `country_parts` branches included); `begin('read only', fn)` passes postgres.js's `[^a-z ]` filter (`node_modules/postgres/src/index.js:242`); the build credits `taxonomy`, `systems`, `habitats`, `elevation`, `redList` to `iucn` and `range` to `iucn_range` (`profiles.ts:242-282`); items carry `source`, no `src`; `citations.json` has 8 `license` entries, all CC BY; `MATERIALIZED` on `country_animals` is needed (one reference, under the per-animal correlated subquery). Checks run: `contentCitations.ts:8` is a standalone `/** … */` line, so the DoD comment-only grep can pass; no test, script or deploy check asserts Terms' sentence, its date or the Journal line (`git grep` hits only `Terms.tsx`, `Privacy.tsx`, `LegalArticle.tsx`); every doc line saying `ranges` needs a build or the view first is inside a replaced section (`CLUE_MATCH.md:62`, `CONTENT_SOURCES.md:84`, `SHAPEFILE_BEST_PRACTICES.md:44,48`) or the build message; `scripts/iucn.ts` says nothing about it.

MUST-FIX:
1. `CONTENT_LICENSE.md` interprets in two places, against the brief's Decision rule ("doesn't interpret"): (a) the "any other source key → written by the project" row: word it as the owner's default instead (everything not listed below is offered under CC BY-NC-SA 4.0; `source` names where its facts come from); (b) drop the sentence that `citations.json` `cite` lines "follow their page's source": state only what each entry's `license` field records.

MISSED:
- One Earth citation: its page reads `One Earth. {2023} Los Angeles`; the brief says "copy its punctuation, don't add any" but its own string, given four times and expected by the release smoke, has `2023.`. Use the brief's literal string; record the mismatch under Decisions and in the Summary.
- CI's `e2e` job runs against the same dev copy: a `ranges` proof retake after the release rebase finishes before the push, or waits until `gh pr checks` is done (the Load rule's "never alongside the E2E").
- The IUCN field list grows past the brief (`taxonomy`, `systems`, `elevation`): keep it (read from code, grants less), and log it as a Decision.

SHOULD-CONSIDER:
1. With no continents in the query, the Russia split at 60°E and its re-union is a no-op costing two intersections of Russia's 10m shape per run. Either collapse `country_parts`+`country_shapes` (dump, drop Seven seas/Antarctica, drop FRA polygons with centroid x < -30 or > 40, group by `adm0_a3, name`), or keep the verbatim copy with a comment that the split is inert here. The scratch Russia case covers either.
2. The harness tests only France's `< -30` branch: add a pair of boxes on Réunion for `> 40`.
3. Delete the harness from `scripts/` right after its run (the pre-push typecheck and lint may pick it up); stage files by name.
4. Step order: the doc's step 4 quotes the proof's measured time, so run the proof before that text is final.
5. `country_shapes AS MATERIALIZED` is redundant under a materialized `country_animals`: harmless, keep or drop.

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

- 2026-11-15 Baseline: today's `ranges` can't finish on the dev copy (60 s role timeout), so the baseline's diff comes from the unchanged SQL with only the brief's `SET LOCAL statement_timeout = '15min'` transaction added. That's the wrapper Goal 3 asks for anyway, so it confirms the need. Both runs count toward the eight.

## Log

- 2026-11-15 06:42 UTC Baseline: D13 in; greps as expected; live pool 76/2478/491/261 without rspb.2017.1347; ranges baseline empty diff in 65 s (run 2 of 8, after a 60 s timeout on run 1); content check 0/0; tests 64/64; e2e:fresh 1579/1579.
- 2026-11-15 06:59 UTC Architecture: architect wrote findings + target design (S12 query from profiles JSON param, read-only tx + 15min cap, MATERIALIZED country CTEs; scratch temp-table check for RUS/FRA/ocean/ATA rules; licence/doc texts). No code changed, no DB runs.
- 2026-11-15 07:20 UTC Fable review: APPROVE_WITH_CHANGES; 1 MUST-FIX (CONTENT_LICENSE.md wording interprets: other-source-key row, cite-lines rule), 3 MISSED, 5 SHOULD-CONSIDER; three read-only greps checked (comment-only DoD passable, no test asserts Terms/Journal text, no stale `ranges` doc line outside replaced sections). No code changed, no DB runs.

## Summary
