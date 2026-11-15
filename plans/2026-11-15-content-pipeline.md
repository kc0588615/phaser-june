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
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: consult the advisor (Fable 5.2) on the Architecture section
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

## Architecture review (Fable)

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

## Summary
