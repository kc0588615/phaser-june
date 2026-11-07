# Build briefs: a movement clue, linked signs, Farms & towns removed (Critter Connect)

From mission `moves-and-signs-design` (design doc: [`docs/research/2026-11-07-moves-and-signs.md`](../docs/research/2026-11-07-moves-and-signs.md), "the doc" below; its plan: [`plans/2026-11-07-moves-and-signs-design.md`](2026-11-07-moves-and-signs-design.md)). Two briefs, run in order:

- **A. `moves-and-signs-build`**: the build, one mission, about 20–25 sessions (well under 60, so no split).
- **B. `ft-cleanup`**: one session, started only after the owner confirms the production content build that follows A's deploy.

**For the control room:** save each brief below (from its `# Mission brief` heading to the next `---`) as its own file, `/srv/critter-ai/agent-state/missions/briefs/YYYY-MM-DD-moves-and-signs-build.md` and `.../YYYY-MM-DD-ft-cleanup.md`, with the **Owner's picks** block pasted at the top of brief A, edited to the owner's answers. Then `mission start critter-connect <file>`. Start B only when its Notes say so.

`STATE` = `/srv/critter-ai/agent-state/missions/moves-and-signs-design/` on the Oracle VPS (the design mission's evidence, outside git; read-only for these missions).

## Owner's picks

The doc's section 1 explains each. The defaults are the mission's picks; change a line to the owner's answer before starting A.

```
Movement clue:        C  (Lives in trees)        # or D (Climbs trees + Digs burrows)
Swims:                drop
Pencil weight:        (a) Habits, 3 points        # or (b) Body, 1 point; or (c) one-question override
Hide answering signs while a question is dealt (rule 1):   yes
Skip witness notes that answer a dealt question (rule 2):  yes
Link option:          1  (category marks)         # or 2 (signs inside the guide)
travelOf:             unchanged under C           # under D: reads digs:yes
Website shots refresh: later (not in this build)
```

---

# Mission brief: Lives in trees, category marks on signs, Farms & towns removed (Critter Connect)

## Goal

The game asks a new movement question, players can see which kind of question each sign points to, no sign or witness note gives a dealt answer away, and Farms & towns is no longer asked. All per the **Owner's picks** block above and the design doc `docs/research/2026-11-07-moves-and-signs.md` (sections 2, 4 and 5). Checkable outcomes:

1. **Movement clue** (pick C; D in brackets): one `Sourced` yes/no trait `trees` [D: `climbs` and `digs`] in `profile.traits`, prefix in `EXCLUSIVE_PREFIXES` (not complete: missing = no record). Only `trees:yes` [`climbs:yes`, `digs:yes`] is ever asked: one rule, "a value `no` records an answer but is never asked", with `no` named once in `traits.ts`, used by `fullTable` (`animalBoard.ts`) and `questionsFor` (`questionMatch.ts`). Category Habits, keyed after `social` in `PREFIX_CATEGORY` (key order breaks ties; before `system` it would beat "Fresh water"). Texts: question "Does it live in trees?", short "Lives in trees?", column "Lives in trees"; guide lines "It lives in trees." / "It doesn't live in trees." (D: doc section 2, "Words"). One unique non-animal face in `clueFaces.ts` (draft 🌲; D: 🧗, ⛏️), never ❓. Guide line category `behavior` (Habits section). `travelOf` unchanged under C [D: reads `digs:yes` instead of the `burrower` tag].
2. **Content, all 76 animals** in `db/content/animals/*.json`:
   - the trait for the 71 animals with a record (10 yes, 61 no; no record, left out: 13, 24, 45, 56, 71) [D: `climbs` and `digs`, 105 values], from `STATE/research/moves.csv` (`value` = `lives_in_trees` [`climbs_trees`, `digs_burrows`], `verdict` yes/no). Each gets a plain-English `note` written for grades 6–12 (not the source quote; doc section 3 has the facts), `source` = the row's `source_key`, and `url` = the row's `url` when the profile's `sources` has no page for that key (`checkProfile`, `profiles.ts:310`);
   - the 5 retags and 19 note tags in doc section 4 (`STATE/out/retags.csv`, `STATE/out/note-tags.csv`: apply rows whose `variants` include `c` [`d`]; skip the `can_swim`/Swims-only rows);
   - **Farms & towns:** `artificial` and its 45 kinds leave `habitats` in the 20 holders (2, 6, 7, 11, 13, 23, 24, 25, 28, 32, 48, 49, 51, 52, 54, 58, 59, 72, 73, 74). Afterwards `rg -l '"artificial' db/content/animals` finds nothing.
3. **Farms & towns constants stay**: `HABITAT_CLASSES`' `artificial` (`traits.ts:27`), the `questionMatch.ts` entries (`:152`, `:171`, `:200`), 🏡 (`clueFaces.ts:15`), `profiles.ts:93` and `:139-145`, and `isHandWrittenClue` (`profiles.ts:290-295`, reserved check `:331`). Brief B deletes them. Deleting them here breaks the live game between the deploy and the owner's content build (doc section 5; design plan F3).
4. **Signs**: new pure module `src/clueGame/signs.ts`:
   - `SIGNS`: one entry per open tag, generated once from `docs/research/2026-11-07-moves-and-signs/sign-map.csv` (206 rows: 198 content tags, the 7 new ones, `can_swim`; drop `can_swim` unless Swims is built) with `category`, `answers` (only prefixes this game asks: under C drop `climbs`, `digs`, `swims`; under D drop `trees`, `swims`) and `restates` (only when its trait is asked: under C `tree_dweller` → `trees:yes`, `climber` restates nothing);
   - `signPhrase` and `signsOf(tags, asked)` moved from `clueFaces.ts` (it keeps faces only), filtered by rule 1;
   - `answersAsked(tag, asked)` (the query rules 1 and 2 share);
   - `signProblems(...)`, called by `checkProfile`: an open tag missing from `SIGNS`, an `answers` entry that isn't an askable prefix, a restating tag that disagrees with its holder's trait (rule 4).
5. **Leak rules** (doc section 4, "The leak rules"): rule 1, `GuideSigns` shows `signsOf(animal.tags, asked)` (reusing `asked`, `AnimalSheets.tsx:86`); rule 2, `witnessNotes` takes the dealt prefixes from `newAnimalRound` (`animalBoard.ts:282`) and skips a note with any hidden tag; rule 3, "fits N of 5" for a restating tag follows the trait. If the owner said no to rule 1 or 2, leave that rule out and say so in plan 055.
6. **Link option 1** (category marks): new `src/components/animalBoard/CategoryMark.tsx`, one lucide icon per category (Body `Eye`, Habits `PawPrint`, Habitat `Trees`, Range `MapPin`, Life cycle `Baby`) with the category word printed or as the accessible name. Used on sign chips (24 px tap targets, WCAG 2.2 2.5.8; tap scrolls to the chip's guide row and outlines its heading briefly), guide headings, "Its answers" rows, witness notes, and before each question tile's label (`EvidenceGrid.tsx`). No new colour. Reference implementation: `STATE/mockups/mock.patch` (option 1 parts only; it ran under D) and the shots in `docs/research/2026-11-07-moves-and-signs/option-1-*.png`. [Option 2 picked: doc section 4 and the same patch.]
7. `ANIMAL_RULES.version` `'054-1'` → `'055-0'` (`animalBoard.ts:59`; re-read on `origin/main` first; if main has moved past `054-1`, take the next `055-` value after it). Drops saved games, as every rules change does.
8. Pencil weight per the picks: (a) nothing to change (`PENCIL_WEIGHT`, `animalBoard.ts:433`); (b) category `body`, guide line under Body; (c) a one-line override in `PENCIL_WEIGHT`'s use.
9. Docs: `docs/CONTENT_SOURCES.md` gets the trait's row and its written rule (doc section 2, "The values and their rules"), the evidence rule (a no needs a quote; two sources that disagree mean no record, not the higher tier), and says the artificial habitat class is skipped (near its lines 24 and 47); `docs/DATABASE_ACCESS.md:202-203` corrected (the dev copy's settings are also in `/srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy` on the Oracle VPS, not only a `.env.local`); `docs/CLUE_MATCH.md` and `CONTEXT.md` where they list questions or signs; plan `plans/055-<slug>.md` (new).

## Why

Players rule animals out on what they read, so every clue must be checkable from the photo, guide or signs (the clue audit's finding on Farms & towns, `docs/research/2026-11-06-clue-audit.md`). "Lives in trees" was the fairest movement clue measured (2 hard animals, 5 no-records, dealt in 18 of 149 rounds, 0 rounds lost), and the category marks teach "this sign points to this kind of question" without new colour.

## Scope

In:
- `src/clueGame/`: `traits.ts`, `questionMatch.ts`, `animalBoard.ts`, `clueFaces.ts`, `profiles.ts`, new `signs.ts`.
- `src/components/animalBoard/`: `AnimalSheets.tsx`, `EvidenceGrid.tsx`, new `CategoryMark.tsx`.
- `tests/clueGame/animalBoard.test.ts`: the witness-fits test follows rule 3 (D only: "no inseparable pair" must allow the poison frogs 9 and 76, which Climbs trees splits). No new unit tests.
- `scripts/e2e.mjs` only if a check needs to follow rule 1 or the marks (for example a check that reads sign chips).
- All 76 files in `db/content/animals/` (traits, retags, note tags, Farms & towns).
- `docs/CONTENT_SOURCES.md`, `docs/DATABASE_ACCESS.md`, `docs/CLUE_MATCH.md`, `CONTEXT.md`, `plans/055-*.md`.
- Building content into the scrubbed dev copy `phaser_june_dev` (Definition of done, the dev-DB block).

Out:
- Deleting the Farms & towns constants (brief B).
- The production content build (`npm run content -- build` against `phaser_june`): the owner's, from WSL.
- Swims, Hops, Glides: dropped by the design.
- The clue audit's parts 2 and 3 (label wording, bin edges, the misleading signs and text-only cues listed in doc section 4, "Content notes"). Note where they touch; don't fix.
- The website (`src/site/`), including the shots refresh (`src/site/shots.ts:40`), unless the picks say otherwise.
- Gem colours by category (option 3), any schema change, any new question category.

## Definition of done

- `npm run typecheck`, `npm run lint`, `npm test` and `npm run content -- preview` exit 0 (none of these touch a database), with 0 content PROBLEMs and `signProblems` empty on all 76.
- **Database checks, dev copy only, at final verification, just before the PR.** Never run `content -- build`, `content -- check` or `e2e:fresh` against `.env.local` (it points at the live `phaser_june`). Run them exactly like this, from the repo root, which exports the dev copy's settings (both `scripts/connect.ts`'s dotenv and `@next/env` keep a variable that's already set) and stops on any other database:
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    npm run content -- build && npm run content -- check \
      && E2E_SEED=<n> E2E_PLACE=<key> CHROME_PATH=<no-sandbox wrapper> npm run e2e:fresh )
  ```
  Never print `DATABASE_URL` or any connection string, and never `cat` that file (handoff H9 is the last time a URL leaked). If the guard fails (for example the owner rotated the dev password after H9), stop that step and add a handoff item asking for the file to be refreshed.
- **Proof the movement question is dealt.** First a short probe on the dev server against the dev copy: `?seed=N&place=<key>`, reading `window.__cc.clue().orders` through `scripts/cdp.mjs`, until a seed deals `trees:yes` [`climbs:yes` or `digs:yes`] (the design found 7 world and 8 Asia rounds under C: `STATE/deals/move-c.md`). Then the E2E above with that seed: its check "round N: the evidence grid has a row per suspect and a column per clue" (`scripts/e2e.mjs:383`) passes on a round whose stored columns include that tag, and every other check passes. Plan 055 records the seed, place and exact commands.
- The E2E artifact (`e2e-artifacts/<run>/report.json` + screenshots) copied to the mission's state folder; its path in plan 055.
- **Balance bot rerun** (`scripts/balance-044.ts`, 400 rounds per continent, seed 44, as `STATE/bot/summary.md`), numbers in plan 055 beside the design's (careful player's moves left change vs no Farms & towns: Africa −0.7, Asia −0.6, North America −3.9, South America −1.1 under C; find rates within noise). A gap of more than 1.5 moves or 2 points of find rate from those needs a sentence of explanation.
- Plan 055's Summary: what changed, the picks used, the dealt-proof seed, the bot table, `git diff --stat origin/main...HEAD`, and that the production content build is waiting on the owner (handoff item).
- **Handoff item** (owner): "Production content build for 055" — run `npm run content -- build` from WSL **only after** the 055 deploy has succeeded (`curl https://play.critterconnect.org/version.txt` shows the merge commit), then reply `done` so the control room can start brief B. Content first would let old code read the new rows: the movement lines would show as witness notes.
- Release `deploy`: merge the PR and `deploy critter-connect`, then smoke-test `/explore` returns 200 and `version.txt` shows the merge commit.

## Decision rules

- The doc is the design; follow it. Where the code on `origin/main` has moved and a cited line no longer fits, follow the intent and record the deviation under Decisions in plan 055.
- Values come only from `STATE/research/moves.csv`. No new research and no value changes; a value that now looks wrong is a note in plan 055 for the owner, not an edit.
- Texts, faces and the icon set may be polished, within the theme (`GUI.md`; run `graphical-audit` once on the finished sheet), keeping colour never the only cue.
- Keep the engine as it is beyond what the doc lists: no new prefix kind, category or gem rule.
- **Accepted risk, cosmetic:** from the dev-copy content build until merge, other branches' CI plays the new rows with old code. Old code doesn't reserve `trees`, so its lines become witness notes ("It lives in trees."); `signsOf` drops colon tags, so no new sign shows. Don't try to fix it.
- Database writes go only to `phaser_june_dev`, through the guarded block. Read the live DB only if a fact is only there, lightly.

## Notes

- Base: a fresh `origin/main`. The design read `69f45fa6` (rules `054-1`, PR #60); plans went to `054`, so this is plan `055` unless a later one exists.
- **Reference patches** (throwaway copies, measured; not to apply blindly, since main may move): `STATE/patches/move-c.patch` (all game code for C plus a generated `signs.ts`; about 40 lines of code; it skips `signProblems`, whose checks lived in `STATE/tools/probe.ts`), `STATE/patches/move-d.patch` (D), `STATE/mockups/mock.patch` (the three link options' interface, ~160 lines; option 1 is the pick). `STATE/tools/mkpatch.py` shows how each was generated.
- Evidence: `STATE/research/moves.csv` (304 rows, quotes and links), `STATE/research/summary.md`, `STATE/out/{retags,note-tags,sign-map}.csv`, `STATE/deals/metrics.md`, `STATE/bot/summary.md`, `STATE/mockups/README.md`, `STATE/mockups/audit.md`.
- The probe that found the design's seeds: `STATE/tools/probe-seeds.mjs`. Under C the measured copies dealt `trees:yes` in Asia most (8 of 20 rounds) and never in Africa.
- Chrome on this VPS needs `--no-sandbox`: copy `STATE/chrome-nosandbox.sh` into the mission's own state folder and pass it as `CHROME_PATH`. Known VPS flake: 1–3 timing checks (row-slide press, re-order click, sparkle) can fail on a run; a rerun passes.
- The movement prefix being exclusive means a hand-written `trees:no` tag is already rejected by the reserved-tag check (`profiles.ts:331-332`); no new check needed.
- Saved games drop with the version bump; that's expected.
- The production content build is the owner's, from WSL, after the deploy. The build mission never builds content against `phaser_june`.

---

# Mission brief: Farms & towns constants removed (Critter Connect)

## Goal

The code no longer knows the `artificial` habitat class: removed from `HABITAT_CLASSES` (`src/clueGame/traits.ts`, which drops it from `COMPLETE_PREFIXES`), its entries in `src/clueGame/questionMatch.ts` (question, short and column texts), its 🏡 face in `src/clueGame/clueFaces.ts` (free again), and its `profiles.ts` guide-line texts (the class line and the 7 `artificial:` kind lines). `isHandWrittenClue` and the reserved-tag check stay as they are: they read `COMPLETE_PREFIXES`, so they follow the shorter class list by themselves. No content change; `rg -n "artificial" src db/content` finds nothing.

## Why

Plan 055 removed Farms & towns from content but kept these constants so the live game wouldn't misread the old rows between its deploy and the owner's production content build (clue audit's `isHandWrittenClue` trap). Once prod holds no `artificial` rows, they're dead code.

## Scope

In:
- `src/clueGame/traits.ts`, `questionMatch.ts`, `clueFaces.ts`, `profiles.ts`; `docs/CLUE_MATCH.md` / `CONTEXT.md` if they still mention it; plan `plans/056-ft-cleanup.md` (new; or the next free number).

Out:
- Content files, the database, any other rule. No `ANIMAL_RULES.version` bump (nothing a round deals changes: no row holds the class).

## Definition of done

- Before any code: confirm the live rows hold no Farms & towns, one light read-only query through `.env.local`: `select count(*) from species_deduction_clues c, unnest(c.compare_tags) t where t = 'habitat:artificial' or t like 'artificial:%'` (`src/db/schema/species.ts:20-25`) = 0. If not 0, stop and add a handoff item: the owner's content build hasn't reached prod.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run content -- preview` exit 0.
- `npm run e2e:fresh` passes (it reads the live DB through `.env.local`, which now holds no `artificial` rows; it only adds rows to `clue_match_solves`, as every game test does).
- Release `deploy`; smoke `/explore` 200 and `version.txt` = the merge commit.

## Decision rules

- Delete only what names `artificial`; anything else that looks dead is a note in the plan, not an edit.

## Notes

- Start only after the owner answers 055's handoff item "Production content build for 055" with `done`, and at least 11 minutes after that build (the pool route caches 60 s fresh plus 600 s stale, `src/app/api/clue-game/pool/route.ts:13`).
- The sites, as of `69f45fa6`: `traits.ts:27`, `questionMatch.ts:152,171,200`, `clueFaces.ts:15`, `profiles.ts:93` and `:139-145`. Re-read them on `origin/main`.
- One session.
