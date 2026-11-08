---
mission: fact-sources
project: critter-connect
branch: agent/fact-sources
status: active
started: 2026-11-07 23:41 UTC
---

# Mission: numbered sources on facts, AmphibiaWeb facts from Wayback (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief

### Owner's picks

Owner, 2026-11-07: the defaults below, unchanged.

```
Where:            after the round only (round-end card, Field Journal page)
Numbering:        one number per source, repeated on every line it backs (owner, 2026-11-07)
Sources:          all sources now (IUCN, ADW, Wikipedia etc. are owed credit already), not only AmphibiaWeb
AmphibiaWeb data: fetch AmphibiaWeb species pages from Wayback Machine snapshots for the 15 amphibians and add their facts (owner, 2026-11-07); cite the 12 existing ones too. Access email sent; if AmphibiaWeb replies with access, use that instead.
Order vs moves-and-signs-build: run this one first
```


### Goal

Where a player reads an animal's facts after a round, each fact line ends with a small superscript number, and a **Sources** section below (closed by default) lists each source once, numbered:

```
Lives in cold forest streams¹
Lays eggs on moss²
The father carries tadpoles in his throat pouch¹

▸ Sources (2)
```

Opened, each entry is a full citation in the form its source asks for, e.g. AmphibiaWeb's species-account citation, a link to the page, the licence where there is one (CC BY-NC, CC BY-SA), the date accessed, and "Reworded for this game." when the text was changed.

- **One number per source**, repeated on every line it backs (owner: no guessing by position). Numbers run 1..n in order of first use on that card.
- **Tapping a number** opens Sources and highlights its entry (focus moves there; keyboard and screen reader work).
- **Unobtrusive:** small (`text-xxs`), neutral-7 or stronger (the lint's contrast check), no layout shift while closed. Collapse with native `<details>`/`<summary>`.
- **Player word is "Sources"** (`CONTEXT.md`: avoid "citation", "reference" in player copy). Copy for grades 6-12.

### Why

The facts carry a source today (`source_name`, `source_url` reach the client, `src/clueGame/pool.ts:59-60`, `:80`, `:85`), but the live animal board never shows them: only photo credits (`PhotoCredit` in `AnimalSheets.tsx`, `JournalSheet.tsx`). `SourceLine` in `src/components/clueGame/LogEntryText.tsx` belongs to the old clue game. AmphibiaWeb's text is CC BY-NC and asks for a citation; Wikipedia's is CC BY-SA; IUCN and ADW ask for citations too. Content uses: adw 797, iucn 392, wikipedia 198, smithsonian 35, ngo 32, literature 23, sdzwa 19, tftsg 16, news 16, government 12, amphibiaweb 12, britannica 9 (`"source"` keys in `db/content/animals/*.json` at `2b2838b2`).

### Scope

In:
- Round-end card (`RoundEndSheet` in `src/components/animalBoard/AnimalSheets.tsx`): field notes and any facts it shows.
- Field Journal page (`src/components/clueGame/JournalSheet.tsx`; `keyFacts` drops the source today, keep it).
- Wherever else facts show after a round, if the mission finds one.
- Citation data: `db/content/sources.json` (a citation template per source key) and what each profile needs (author/year for per-species accounts like AmphibiaWeb and ADW, date accessed), through the content pipeline (`npm run content`), with `npm run content -- check` failing on an AmphibiaWeb or Wikipedia fact without a full citation.
- `docs/CONTENT_SOURCES.md`: how to record a citation, and the Wayback route below (a stopgap until AmphibiaWeb grants access).
- **AmphibiaWeb facts from the Wayback Machine** (owner, 2026-11-07), for the 15 amphibian profiles: `03-darwins-frog`, `05-wallaces-flying-frog`, `06-red-eyed-tree-frog`, `07-hairy-frog`, `08-coastal-tailed-frog`, `09-dyeing-poison-dart-frog`, `10-suriname-toad`, `11-goliath-frog`, `13-tomato-frog`, `14-desert-rain-frog`, `16-purple-frog`, `62-chinese-giant-salamander`, `74-axolotl`, `75-hellbender`, `76-golden-poison-frog` (`db/content/animals/`).
  - For each, find the newest snapshot of its AmphibiaWeb species page (`http://archive.org/wayback/available?url=amphibiaweb.org/species/<id>`, or the CDX API), fetch it, and save the page in the mission's state folder.
  - Fill what AmphibiaWeb settles: the profile's "no record" traits first (the ones blocking questions), then clues and facts the profile lacks, by the profile workflow and tag vocabulary in `docs/CONTENT_SOURCES.md`. Every value has a quote found word for word in the saved snapshot. AmphibiaWeb is tier 2: it doesn't override IUCN (tier 1); where they disagree, keep IUCN and note both.
  - Also record what AmphibiaWeb says about living in trees, per amphibian (yes / no / no record, with the quote), in `docs/research/2026-11-07-amphibiaweb-wayback.md`, for `moves-and-signs-build` to use (its "Does it live in trees?" question doesn't exist yet; don't add it here).
  - Citation for these facts: AmphibiaWeb's species-account citation from the snapshot, plus the live page URL, the snapshot URL and its date (e.g. "archived copy of 12 Mar 2026"), CC BY-NC, "Reworded for this game."
  - Load: a few pages per species, one request at a time, a pause between requests. No `amphib_dump.xml`, no web services, no other AmphibiaWeb pages in bulk (their data-use policy). A species with no snapshot: say so in the research file; don't fetch it elsewhere.
- E2E checks.

Out:
- During play, unless the owner's pick says otherwise: a source page names the animal (plan 041), and the pencil bonus (plan 054) rewards knowing hidden answers.
- AmphibiaWeb pages beyond the 15 species accounts; any non-amphibian content work beyond citations.
- Running the prod content build (owner only).
- Rules, scoring, board, globe, website.

### Definition of done

- The 15 amphibians: each has its snapshot saved (or "no snapshot" noted), its new facts and filled traits quoted in `docs/research/2026-11-07-amphibiaweb-wayback.md`, and `npm run content -- check` passes. The Summary lists, per animal, the no-records filled and the facts added.
- Every fact line in scope shows its source's number; the numbers and the list match (each number has one entry, each entry is used).
- E2E (`scripts/e2e.mjs`): after a round, the card's and the journal's numbers resolve to entries; tapping one opens Sources and focuses its entry; closed by default; an AmphibiaWeb-sourced animal shows the CC BY-NC citation. Screenshots closed and open, light and dark, in the mission's state folder.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run e2e:fresh` pass on the final commit.
- **Release:** merge, deploy, check live (`version.txt` shows the merge commit). If content changed, the owner runs the prod content build (`npm run content -- build`, owner only, from WSL); say so in the Summary.

### Decision rules

- Simplest data shape that cites correctly. Prefer deriving the citation from `sources.json` templates + species + `source_url` + a date; add per-profile fields only where a source needs per-species authors. A DB schema change needs a fresh dump first (`deploy/backup/pg-backup.sh`) and `db/schema.sql` updated; say why in the plan.
- Use each source's own published citation guidance (AmphibiaWeb: "AmphibiaWeb. <year>. <https://amphibiaweb.org> University of California, Berkeley, CA, USA. Accessed <date>.", and the species page's own citation line). Record where each format came from.
- AmphibiaWeb itself times out from the VPS and challenges scripts from home: reach it only through Wayback snapshots, as in Scope.
- Content first, UI second: land the AmphibiaWeb facts and the citation data, check them (`npm run content -- check`, `preview`), then build the numbers and Sources list on real data.
- Never hand-edit content rows.

### Notes

- Work from the newest `origin/main` (`git fetch origin --prune`; rebase before the PR).
- `moves-and-signs-build` (not started; waiting on the owner's picks) also edits `AnimalSheets.tsx` (sign chips, guide headings). Don't run both at once.
- Checked in WSL on `origin/main` at `2b2838b2`.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

From `2a725a40` (origin/main `35baf89b` + plan), 2026-11-07, DB = live `phaser_june` (`.env.local`).

- `npm ci`: ok. `npm run typecheck`: pass. `npm run lint`: pass. `npm test`: 48/48 pass.
- `npm run content -- check`: 0 errors, 0 warnings (76 playable species, 2430 clues, 437 facts).
- `npm run e2e:fresh`: **1526/1527**, one check fails, same on two runs (deterministic, seed 7): `round 3 move 10: a right guess just scouted sparkles` (`{"sparkling":[],"calledNow":["57:region:southern-africa"]}`; round 3 Golden-rumped Sengi; check at `scripts/e2e.mjs:1403`). Pre-existing on main, not this mission's code; the final Verification needs `e2e:fresh` green, so the plan must fix or settle it (cause unknown yet: test timing vs the sparkle UI vs current live content).
- Needs `CHROME_PATH=/srv/critter-ai/agent-state/missions/fact-sources/bin/chrome` (wrapper adding `--no-sandbox`; `/usr/bin/google-chrome` absent), as in clue-audit.
- Artifact: `/srv/critter-ai/agent-state/missions/fact-sources/baseline-e2e/` (report.json, screenshots, `e2e.log`, `COMMAND.txt`).

## Architecture

Read at `20b697d1` (origin/main `35baf89b` + plan). Wayback tested from the VPS 2026-11-08 (§4). Revised at `4fde20d6` after both reviews (see Revision notes).

### Findings (by impact)

1. **No source shows after a round.** Round-end field notes (`src/components/animalBoard/AnimalSheets.tsx:535`, list `:635-642`) render `note.full ?? note.text` only, though every `FieldNote` carries `source` (`src/clueGame/questionMatch.ts:36`, built `questionMatchContent.ts:128-135`). Journal: `keyFacts` (`src/clueGame/pool.ts:101-106`) returns `string[]`, dropping `fact.source`; `JournalSheet.tsx:69-71` shows bare text. Two play surfaces also stay on screen beside the card on md+ screens (on phones the card covers the ticker): the status line (`StatusTicker`, `AnimalGame.tsx:502`) keeps rotating the round's answers and witness notes, and from 64rem the desktop witness notes (`NotesList`, `:504-509`) keep listing the notes, both still blanked. Every note they show is one of the card's field notes (witness notes are drawn from `animal.notes`, `src/clueGame/animalBoard.ts:167-168`; the card lists `animal.notes` + `revealNotes`, `AnimalSheets.tsx:535`); answers are traits, which stay uncited like the field guide. No other post-round fact surface: the field guide can't open while reviewing (`AnimalGame.tsx:474`, `onGuide={reviewing ? undefined : …}`), nor can the phone notes drawer (`onNotes`, same line); the globe shows no facts; the website is out. Fix: §3 (number the card and journal, and hide the two duplicates during review).
2. **No citation data.** Registry rows are `{key, tier, name, url, notes}` (`db/content/sources.json`, `db/schema.sql:21-28`); profiles map key → URL (`profiles.ts:58-59`); item `url` overrides add more pages. Clues and facts cite 250 distinct pages (iucn 74, adw 65, wikipedia 53, literature 15, news 10, ngo 8, government 7, smithsonian 6, sdzwa 6, amphibiaweb 4, tftsg 2). No author, year, licence or access date anywhere. Fix: §1.
3. **E2E red on main: a timer race drops the sparkle (UI bug; not test logic, not content).** `AnimalGame.tsx:213-217`: the previous reveal's clear timer calls `setReveal(NO_REVEAL)`. If it fires between move N's `setReveal(before => before ∪ scouted)` (`:333`, run in a passive effect) and the commit whose effect cleanup would cancel it, React applies the add and then the clear, so the right guess just scouted never sparkles. Evidence from the baseline report: in round 3, move 8 scouted (re-arming the 3,100 ms timer), move 9 scouted nothing, and move 10 scouted `57:region:southern-africa` about 3.1 to 3.5 s later (settles 965,056 and 968,552 ms). At move 10 `sparkling` is `[]`, without even the older keys, and only an emptied set explains that. `data-guess="right"` was set (the "shows right or wrong" check passed), so content and `called` are correct, and every other sparkle check in the run passes. It repeats because seed 7 replays the same timings. Fix: clear only the set the timer was armed for: `setTimeout(() => setReveal(current => (current === reveal ? NO_REVEAL : current)), REVEAL_MS)`. The check at `scripts/e2e.mjs:1403` stays as written, because it states the product rule. If it still fails after the fix, log reveal add and clear times on a narrow run (`E2E_ROUNDS=3`) before changing anything else.
4. **New `sources.json` fields would break the owner's prod content build.** `load()` (`scripts/content.ts:26-36`) inserts every key of `rows[0]` as a column. `content_sources` has no column for a template or licence, so the build would fail with "column does not exist". Fix: at `content.ts:134`, load an explicit, typed pick of the table's six columns. The proof is a scratch-DB build (§7), because the mission may not build into live.
5. **Dead code beside the new work.** In `LogEntryText.tsx:10-26` and `:43-87`, `plural`, `rankName`, `isLive`, `SourceLine` and `LogEntryText` have no importers. Only `WithBlanks` is used (`AnimalGame.tsx:21`, `AnimalSheets.tsx:15`). `SourceLine` is the old clue game's unnumbered "Source: name" link with a during-play lock, so it can't be reused here. Fix: delete them and move `WithBlanks` to `src/components/clueGame/WithBlanks.tsx` (2 imports).
6. **The page-URL rule is written three times (DRY, low).** `profiles.ts:310` (check), `:370` and `:381` (rows) each compute `url ?? profile.sources[key]`, and citations must key on exactly that URL. Fix: one exported `pageUrl(profile, key, url?)` in `profiles.ts`, used by those three and the citation check. (`animalsFromProfiles`, `questionMatchContent.ts:173-176`, maps iucn_range to the Red List URL. That path serves only the bot and prototype and never shows a citation, so leave it.)

Fine as is:
- The on-device journal stores no facts (`journal.ts:8-22`), so it needs no format change or migration.
- A saved game rebuilds `book` from the fresh pool (`useAnimalSession.ts:130`).
- `/api/clue-game/journal` carries no facts.
- No DB schema change is needed, so no dump.

### Target design

**§1 Citation data (no schema change; joined at read time)**

- **`db/content/sources.json`**: every entry gains `citeAs` (a template). Entries whose source has one licence for all its pages also gain `license` (the default). Placeholders: `{name}` (the registry name), `{cite}` (the page's line), `{title}` (the URL's last path segment, decoded, with `_` turned into spaces; Wikipedia only) and `{accessed}` (formatted `8 Nov 2026`). A placeholder the page lacks counts as a missing field; an unknown placeholder is an error.
- **New `db/content/citations.json`**: `{ "<page url>": { accessed, cite?, archive?, license? } }`, with one entry per page that a profile's clue or fact cites. Traits are left out (they show only in the field guide during play), and so is iucn_range, as today. Keys are the exact URL the build writes to `source_url` (`pageUrl`). It is one global file because a citation belongs to its page: pages are shared across animals, override URLs need a home, and the server bundles one file instead of 76.
  - `accessed` (`YYYY-MM-DD`): for a new page, the day it (or its archived copy) was read. For an existing page, the date its URL first entered `db/content/animals/` (`git log --reverse --format=%as -S<url>`), set by a one-off script kept in the state folder: the day the content was taken from it, a proxy, not a re-verified read. `CONTENT_SOURCES.md` says so, and re-reading a page later moves the date to that day.
  - `cite`: the page's own published citation line, verbatim, without its trailing "Accessed …" (the template adds ours).
  - `archive`: `https://web.archive.org/web/<14-digit ts>/<url>` (the viewer URL). Its date is parsed from the timestamp, and a bad format is an error.
  - `license`: the page's own licence, when it declares one; it overrides the registry default. Mixed-publisher keys (literature, government, ngo, news) have no default, so only pages that state a licence show one (e.g. the Frontiers aardvark paper, `10.3389/fphys.2020.00637`: CC BY, version from the page).
- **Templates and where each form comes from.** Record each guidance URL in `docs/CONTENT_SOURCES.md`.

| key | `citeAs` | `cite` comes from | default `license` |
|---|---|---|---|
| amphibiaweb | `{cite} Accessed {accessed}.` | the species page's "Citation:" line on the snapshot (site form: brief) | CC BY-NC, version from the snapshot footer |
| iucn | `{cite} Accessed on {accessed}.` | the assessment's "Citation" on the staging details page (CONTENT_SOURCES "Research access"); IUCN "How to cite" | none |
| adw | `{cite} Accessed {accessed}.` | the account's "To cite this page:" block (curl works) | CC BY-NC-SA 3.0 (`https://animaldiversity.org/about/use_conditions/`, which links `creativecommons.org/licenses/by-nc-sa/3.0/`; checked 2026-11-08) |
| wikipedia | `"{title}." Wikipedia, The Free Encyclopedia. Accessed {accessed}.` | Wikipedia:Citing Wikipedia; Wikipedia:Reusing Wikipedia content | CC BY-SA 4.0 |
| literature | `{cite}` | `curl -LH 'Accept: text/x-bibliography; style=apa' https://doi.org/<doi>` | none (page `license`) |
| tftsg, sdzwa | `{cite} Accessed {accessed}.` | the account's suggested citation; the fact sheet's "How to cite" | none |
| news, ngo, government | `{cite} Accessed {accessed}.` | `<Publisher>. <Year>. <Title>.` from the page (the registry names are generic) | none (page `license`) |
| smithsonian and unused keys | `{name}. Accessed {accessed}.` | none | none |

- **Code.**
  - `src/clueGame/citations.ts` (pure, new; client-safe, imports nothing from `profiles.ts`):
    - types `CitedPage` and `Citation { text; url; license: string | null; archive: { url; date } | null }`;
    - `FULL_CITATION_KEYS = ['amphibiaweb', 'wikipedia']`: the keys whose citation must be complete (the brief; their licences require attribution);
    - `renderCitation(source, url, page)` returns `{ citation: Citation | null; missing: string[] }`. No page entry: `citation: null`, `missing: ['accessed']`. A placeholder the page lacks: for a full-citation key, `citation: null`; for any other key, the fallback `{name}. Accessed {accessed}.` with `missing` naming what fell back. `license` is `page.license ?? source.license ?? null`. An unknown placeholder or a bad `accessed`/`archive` throws (a data bug; `npm test` hits it);
    - `formatDay(iso)` uses a fixed month list, no `toLocale*`;
    - `numberSources` (§3).
  - `src/lib/contentCitations.ts` (new) imports both JSON files, typed. JSON imports are bundled by Next and esbuild, and the run image has no `db/` folder (`Dockerfile:29-38`). It is used by `buildCluePool`, `content.ts` and the tests, which drop their own `sources.json` reads.
- **Checks.** Errors only where the brief asks (AmphibiaWeb, Wikipedia) plus a dated entry for every page; a missing `cite` elsewhere is a warning, so the owner's `content -- build` never waits on ~190 hand-collected lines.
  - `checkCitations(profile, registry, pages) → { errors; warnings }` (new, in `profiles.ts` beside `checkProfile`, whose signature stays as is; uses `pageUrl`): for each clue and fact page, `renderCitation`. `citation: null` is an error (`facts[4]: no full amphibiaweb citation for <url> (missing cite)`, or `clues[2]: no citations.json entry for <url>`); a non-empty `missing` with a citation is a warning (`clues[2]: iucn page <url> has no cite line yet; shows the fallback`). `preview` prints both per animal; `build` throws on errors (as `checkProfile`) and prints the warning count; `npm test` (`tests/clueGame/content.test.ts`) asserts no errors.
  - `validatePool` (`content -- check`): every fact and hand-written clue (`isHandWrittenClue`) needs a `source` with a URL (a missing one is an error, not skipped) and `pool.citations[url]`. Non-full keys always render once their page has an entry, so this errors exactly where `checkCitations` errors.
  - On live, `check` reads rows from the owner's last prod build. An error there for a row this branch's profiles no longer have (his build lags `main`) is not this mission's to fix: record it under Decisions and in the Summary as "needs the prod content build", not a blocker. This branch's content is gated by the scratch-DB build and check (§7).
- **Reworded:** no flag. Every line is rewritten for grades 6 to 12 (CONTENT_SOURCES copy rule), so every entry ends with "Reworded for this game."
- **If AmphibiaWeb grants access later:** same shape, with no `archive`.

**§2 Data flow**

Profiles and `citations.json` go through `content -- build`, whose rows (`source_key`, `source_url`) don't change, into the DB.

On read:
- `buildCluePool` (`src/lib/cluePool.ts:17`, `:20`) also selects `source_key` (`ContentRows` gains `source_key?`).
- It calls `poolFromRows(rows, { registry, pages })`, which adds `citations: Record<url, Citation>`: one entry for each distinct (key, url) among clue and fact rows for which `renderCitation` gives a citation (full keys only when complete, others with the fallback if need be). That is about 260 pages, roughly 60 KB; text on every row would add about 0.5 MB.
- `PoolClue.source` and `PoolFact.source` stay `{ name, url }`, and the rules types (`Source`, `FieldNote`) don't change. The join is for display only, so saved sessions don't grow (`src/components/animalBoard/savedGame.ts:18`, `session`; witness notes hold `source`).
- `CluePool.citations` is required on what the server builds; the `tests/clueGame/testPool.ts` fixture gets `{}`.

On the client:
- **Old cached pools.** `/api/clue-game/pool/` is `max-age=60, stale-while-revalidate=600` (`route.ts:13`), and `getJson` keeps the first answer for the page load, so for about 11 min after the deploy a new client can get a pool without `citations`. The one client loader (`useAnimalSession.ts:101`) normalizes it: it reads the response as `Omit<CluePool, 'citations'> & Partial<Pick<CluePool, 'citations'>>` and builds `{ ...fetched, citations: fetched.citations ?? {} }`, with a comment saying why. Everything after it (`AnimalGame`, `RoundEndSheet`, `JournalSheet`, `keyFacts`) sees a required map; a page without an entry already renders as numbered name + link (§3), so an old pool shows numbers and plain entries and never throws. Old clients ignore the new field.
- `AnimalGame` passes `pool.citations` to `RoundEndSheet` as a new prop; `JournalSheet` already has `pool`.
- `keyFacts` returns `Array<{ text: string; source: Source | null }>`, de-duplicated by text with the first source kept.

When it goes live: citations for existing rows ship with the deploy. The new AmphibiaWeb rows reach players only after the owner's prod content build, and their pages are already in the deployed `citations.json`. No existing URL may change in this mission, or that live row would lose its citation until the build; the live `check` catches it. The standing rule, written into `CONTENT_SOURCES.md`: a page's `citations.json` entry lands in the same commit as the profile that cites it, the app deploy goes out before (or with) the content build that adds those rows, and an entry stays while any live row still cites its page (until the owner's next build).

**§3 UI**

- **`numberSources(sources) → { marks: Array<number | null>; list: Source[] }`** (in `citations.ts`): a source's identity is its `url`, or its `name` if it has no URL. That gives one number per cited page (two Wikipedia articles are two sources), numbered 1..n in order of first use. Its comment says so, because the brief's "one number per source" could be read as one per registry key; per page is what lets each entry be one full citation.
- **`src/components/clueGame/FactsWithSources.tsx`**: takes `{ facts: Array<{ key; text: ReactNode; source }>; citations; className?; itemClassName? }`. It renders the `<ul>` of lines and, below it, a closed `<details><summary>Sources (n)</summary><ol>…`. This is the same native disclosure as the journal's "Words you've learned" (`JournalSheet.tsx:81-91`).
  - **Mark:** `<sup class="text-xxs text-neutral-7 leading-[0]">` (the zero line-height avoids layout shift) wrapping `<a href="#<id>-<n>" aria-label="Source <n>">`. A transparent `after:` box enlarges the tap area without moving layout (inline targets are exempt from WCAG 2.5.8 anyway).
  - **Click or Enter on a mark:** call `preventDefault` (no hash, no page scroll), open the `<details>`, then `entry.focus({ preventScroll: true })` and `scrollIntoView({ block: 'nearest' })`. This is plain DOM work, with no React state.
  - **Entry:** `<li id tabIndex={-1}>`, text-xxs, neutral-8, with a `focus:` highlight in cc tokens; that is "highlights its entry". Keep `focus:`, not `focus-visible:`: Chrome doesn't match `:focus-visible` on programmatic focus after a tap. It shows the citation text, a link to the page, an "archived copy of 12 Mar 2026" link when there is one, `License: …` (page licence, else the registry default), and "Reworded for this game." Without a citation (no entry, or an old cached pool) it shows the source name and link. Links open in a new tab with `rel=noopener noreferrer` (PhotoCredit pattern). The id prefix comes from `useId()`, because the journal holds many lists. Copy uses US spelling, like "color".
- **RoundEndSheet:** the component replaces `AnimalSheets.tsx:635-642`, and its bullets become `list-disc marker:text-neutral-6`.
- **JournalSheet:** the component replaces `:69-71`.
- **During review, the card is the one place facts are read** (the brief's "after the round only (round-end card, Field Journal page)"). In `AnimalGame.tsx`:
  - desktop witness notes: `{wide && round && !reviewing && …}` (`:504`). The side area is the grid's last cell, so nothing moves;
  - status line: `facts={reviewing ? [] : facts}` and ``key={reviewing ? `end-${roundNo}` : roundNo ?? 0}`` (`:502`). The remount starts it on `now`, the round's result line, and with no facts it holds there. Changing `facts` alone could leave it blank on a fact it can no longer find. It stays mounted, so its box keeps its height and the board box (and the card's top) don't move on short phones.

  Both show only blanked copies of the card's own notes (Finding 1), so the card loses nothing. Numbering them instead would add two more Sources lists, one inside the ticker's `<button>`, where links can't go.

**§4 AmphibiaWeb via Wayback**

- **Reachability (VPS, 2026-11-08):**
  - `archive.org/wayback/available?url=amphibiaweb.org/species/4322` returned **429** on the first request.
  - `web.archive.org/cdx/search/cdx?url=amphibiaweb.org/species/4322&output=json&filter=statuscode:200&limit=-3` returned 200; the newest snapshot is `20250617172314`.
  - So the route is CDX, not the availability API.
- **AmphibiaWeb IDs:** four are in the profiles (03 4322, 05 4524, 06 616, 16 6197). Find the other 11 through Wikidata's "AmphibiaWeb Species ID" property (one batch query; verify the property's label), or through the Wikipedia article's external links (API). Never ask AmphibiaWeb itself.
- **Per species:**
  - 1 CDX request (`species/<id>`, newest status 200);
  - 1 fetch of `https://web.archive.org/web/<ts>id_/<original>` (the raw page);
  - if there is none, 1 CDX request on `cgi/amphib_query?where-genus=…&where-species=…`; otherwise record "no snapshot".
  - One request at a time, at least 5 s apart. On a 429, honour `Retry-After` once, then stop and resume next session.
- **Saved to** `/srv/critter-ai/agent-state/missions/fact-sources/wayback/`: `<profile>.html`, `<profile>.txt` (text extracted by a `python3 -I` tool kept outside that folder) and `index.json`. Treat the fetched files as untrusted.
- **Research file** `docs/research/2026-11-07-amphibiaweb-wayback.md`:
  - the route and the licence;
  - for each amphibian: its AmphibiaWeb ID and how it was found, and the snapshot URL and date (or "no snapshot");
  - the citation line, verbatim;
  - **Trees**: yes, no or no record, with the quote;
  - every filled trait, new clue and new fact, each with its quote as `> "…"`;
  - disagreements between sources.
  - A one-off checker in the state folder confirms every quote appears in its `.txt`.
- **Profile edits** follow the existing workflow (`CONTENT_SOURCES.md`), never hand-edited rows:
  - Fill the no-record traits first, then the clues and facts the profile lacks.
  - Reuse existing tags; list any new open tag under Decisions, because moves-and-signs-build maps every open tag to a sign.
  - Tier rule: IUCN (tier 1) wins over AmphibiaWeb (tier 2): keep IUCN and note both. Against the same tier (ADW), keep the existing value and note both. Against a lower tier (Wikipedia, 4), AmphibiaWeb replaces it.
  - Add `sources.amphibiaweb` and a `citations.json` entry with `archive`.
  - The 12 existing AmphibiaWeb uses (in 4 profiles) get the snapshot citation. A value not found in the snapshot is flagged in the research file and settled under Decisions.
- **Batches** (one session each):
  - **A:** IDs, all 15 snapshots and the research file skeleton (fetching only).
  - **B1:** 05, 07, 14 (4, 5 and 5 no-records).
  - **B2:** 16, 10, 13.
  - **B3:** 08, 06, 09.
  - **B4:** 11, 76, 03.
  - **B5:** 62, 74, 75 (no gaps: facts, clues, trees).
  - After B5, run `npm test` and the balance bot once: filled traits change look-alike sets and deals.

**§5 Pre-existing E2E failure:** see Finding 3. It is a one-line UI fix, landed first so later E2E runs are a clean signal.

**§6 E2E (`scripts/e2e.mjs`)**

- **Every round-end card in the main loop (4 rounds) and the journal (section 3), one DOM read each:**
  - every fact line has exactly one mark;
  - the set of mark numbers equals the set of entry numbers;
  - numbers run 1..n in order of first use;
  - `<details>` is closed at first;
  - the summary reads `Sources (n)`.
  - Then click one mark and press Enter on another: the details open, `document.activeElement` is that entry, and the entry is inside the scroller's view.
  - While the card is open: no `#side-notes` section, and the status line shows no "Clue n of m".
- **AmphibiaWeb, data-driven:**
  - From `/api/clue-game/pool/`, the candidates are species with a fact whose `source.url` is on `amphibiaweb.org` and has a `citations[url]` entry (every fact is a field note on the card). Match on the host, not the licence: ADW's CC BY-NC-SA would also match "CC BY-NC". FAIL if there are none.
  - Take the continent with the most candidates and probe `?seed=1..40&place=`. Clear `sessionStorage` `cc:explore:game` and localStorage first, then read `__cc.clue().mysteryId`, with no moves and no waiting for the board, until a candidate is the mystery.
  - Name it right, reusing the pencil-bonus flow.
  - On the card, assert the entry linking to `amphibiaweb.org` contains "AmphibiaWeb", `License: CC BY-NC` and "Reworded for this game.". Record the seed in the report.
  - This works on live now, on the dev copy in CI, and after the owner's build.
- **Screenshots** of that card: `10-sources-closed-light.png`, `10-sources-open-light.png` and the same two in dark (set `data-theme` and the theme key, restore afterwards), plus `11-journal-sources-open.png`. The final run is copied to `/srv/critter-ai/agent-state/missions/fact-sources/final-e2e/` with `COMMAND.txt`.
- **Budget:** the E2E takes about 10 min locally, and the CI e2e job times out at 15 (`.github/workflows/ci.yml`). Measure the probe; it must stay cheap.

**§7 Order and risks**

Order:
1. Sparkle fix.
2. Wayback batch A.
3. Batches B1 to B5.
4. Citation data for all 261 pages: the accessed-date script; ADW lines by curl (confirm the CC BY-NC-SA 3.0 on its Conditions of Use page; a change goes under Decisions); IUCN lines in staging batches of 7; DOIs; about 33 pages by hand; a page `license` wherever a literature, government, ngo or news page states one. Outside AmphibiaWeb and Wikipedia a missing `cite` is only a warning, so this aims at zero warnings without gating the build.
5. `citations.ts`, the templates, `checkCitations` and the `validatePool` rule, the `load()` pick, the pool join and the client loader's `citations ?? {}`.
6. UI: component, card, journal, hiding the ticker's facts and the desktop notes during review, dead code.
7. E2E.
8. Docs: `CONTENT_SOURCES.md` (how to record a citation, with each source's guidance and licence URL; what `accessed` means for pages from before this mission; the release order in §2; a line that Wikipedia's CC BY-SA share-alike applies to facts reworded from it; the Wayback route as a stopgap), the content line in `AGENTS.md`, and the pool shape in `docs/CLUE_MATCH.md` if it is documented there.
9. Verification.

Risks:
- **Prod content build** (Finding 4). Prove it on a scratch DB on the VPS's PostgreSQL 16:
  1. `createdb`;
  2. apply the DDL of the four content tables from `db/schema.sql` (they need no PostGIS);
  3. run `DATABASE_URL=postgres:///<scratch> npm run content -- build`, then `-- check` (dotenv doesn't override a `DATABASE_URL` that is already set, `connect.ts:8`);
  4. `dropdb`.

  This is the gate for "`content -- check` passes" in the Definition of done: it proves this branch's content checks clean in a real DB, and it never touches live. Run `content -- check` on live too (read-only); a live-only error is handled as in §1 "Checks".
- **CI dev copy.** The AmphibiaWeb E2E check needs an AmphibiaWeb-cited fact in `phaser_june_dev`. Before the E2E step, count those rows read-only using the dev-copy env file, without echoing its URL. If there are none, build this branch's content into the dev copy (as moves-and-signs-build does) and record it under Decisions.
- **IUCN lines** depend on the staging pages (parallel-search `web_fetch`). If those are unreachable, fall back to IUCN's own citation for the Red List as a whole (`IUCN. <year>. The IUCN Red List of Threatened Species. Version <v>. https://www.iucnredlist.org.`) plus the species link, and record it under Decisions.
- **Wayback 429s:** handled as in §4.
- **moves-and-signs-build overlap.** It also edits `AnimalSheets.tsx` (signs and guide headings in SuspectSheet), `profiles.ts` and `traits.ts`. This mission touches only RoundEndSheet's notes block, its props and one import in `AnimalSheets.tsx`, plus a new `checkCitations` and `pageUrl` in `profiles.ts` (`checkProfile`'s signature no longer changes). New open tags are listed under Decisions. Don't add its `trees` question here; the research file hands it the trees data.

### Rejected alternatives

- **DB column or `content_pages` table:** needs a schema change, a dump and the owner's prod build before any citation shows, and can't be verified on live. The bundled JSON join avoids all three.
- **Per-profile citation fields (`sources` values as objects):** reshapes 76 files, leaves override-URL pages without a home, and makes the server bundle every profile.
- **Citation text on each pool row:** adds about 0.5 MB of repeats; a map keyed by URL is about 60 KB.
- **Rendering citations in the browser from a bundled `citations.json`:** ships the whole file to every player and splits the join away from `content -- check`.
- **Reusing `SourceLine`:** it is unnumbered, carries during-play lock logic, and is dead code.
- **A "reworded" flag:** it would always be true.
- **Per-key formatter functions in TS:** the brief asks for templates in `sources.json`, and four placeholders cover every key.
- **Hard-coded E2E seed for the AmphibiaWeb card:** content changes reshuffle deals; the probe is data-driven.
- **`:target` or hash highlight:** changes the URL and scrolls the page; focus works without either.
- **Availability API, direct AmphibiaWeb, `amphib_dump.xml`:** the first returned 429, and the brief rules out the other two.
- **A full citation required for every key:** gates the owner's `content -- build`, and every future profile, on ~190 hand-collected lines; the brief asks it only of AmphibiaWeb and Wikipedia.
- **Licence only in the registry:** can't represent mixed publishers under one key (the CC BY Frontiers paper under `literature`).
- **Versioning the pool endpoint for old caches:** one absent field, normalized at the one client loader, degrades to plain numbered entries for about 11 min; a new URL adds a route or an ignored query for no lasting gain.
- **Numbering the status line and desktop notes during review:** two more Sources lists for blanked copies of the card's notes, and the ticker is a `<button>`, so it can't hold links.
- **Hiding the status line during review (unmount):** frees its row, so on short phones the board box and the card's top can move; the remount on `now` keeps the box.

## Architecture review (Fable)

Read at `97d1fa30`. Checked every cited line: Findings 1-6 are real (notes block `AnimalSheets.tsx:635-642` shows `note.full ?? note.text` only; `keyFacts` returns `string[]`; `load()` inserts `Object.keys(rows[0])` so a new `sources.json` key breaks the owner's build; `url ?? profile.sources[key]` written 3x; `SourceLine`/`LogEntryText` unimported). The 12 AmphibiaWeb uses = 6 traits + 3 hand-written clues + 3 facts in 4 profiles, so live already has AmphibiaWeb field notes for the E2E probe. The reveal-timer race (Finding 3) is a coherent reading of `AnimalGame.tsx:213-217` + `:333` and the fix is safe either way. No schema change, no dump needed: correct. JSON-join-at-read-time is the simplest shape that cites correctly and keeps the owner's build path intact.

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **Check strictness overshoots the brief and can block every future build.** §1 "Checks" fails `checkProfile` (run by `build`) and `validatePool` on *any* source's line without a full citation. The brief asks for errors only on AmphibiaWeb and Wikipedia. As designed, ~190 iucn/adw/news/ngo/government/literature pages each need a hand-collected `cite` before `content -- build` runs at all, and every future profile the owner adds with a news/IUCN source fails his prod build until he writes a citation line. Make it: error for `amphibiaweb` and `wikipedia` (missing `cite`/`accessed`/`archive` where required); for every other key require only an `accessed` entry (error if absent) and treat a missing `cite` as a **warning**, rendering the `{name}. Accessed {accessed}.` fallback so the line still gets a number and a dated entry. Step 4's 261-page effort stays, but no longer gates the build.
2. **ADW licence is left as "look up ADW's terms"** (table in §1). ADW is the largest source (797 uses) and the entry's `License:` line depends on it; a placeholder in the design is not acceptable. Settle it now: ADW's copyright page (`https://animaldiversity.org/about/copyright/`) licenses its text CC BY-NC-SA 3.0; record that URL in `docs/CONTENT_SOURCES.md` beside the others and put `CC BY-NC-SA 3.0` in `sources.json`. Verify on the page during step 4 and note any deviation under Decisions.

MISSED:
- **Stale pool in the browser after deploy.** `/api/clue-game/pool/` is served with `max-age=60, stale-while-revalidate=600` and `getJson` caches per page load. For up to ~11 min after the deploy, clients hold a pool without `citations`. `CluePool.citations` is "required" in TS but the UI must still treat it as possibly undefined (`citations ?? {}`), or the round-end card throws on the first live rounds. Same in `keyFacts` callers.
- **Live `content -- check` may fail for reasons outside this mission.** The live rows come from the owner's last prod build; if any live `source_url` is no longer in profiles (his build lags `main`), the new `validatePool` rule reports a missing citation that only his build can fix. Plan says "the live check catches it" but not what to do: record it under Decisions and in the Summary as "needs the prod content build", don't treat it as a blocker.
- Path slip only: `savedGame.ts` is `src/components/animalBoard/savedGame.ts`, not under `src/clueGame/`. Conclusion (session stores no pool) is right.

SHOULD-CONSIDER:
1. E2E AmphibiaWeb probe: up to 40 full page loads is 1-2 min on a 15-min CI budget already at ~10. The deal is pure and seeded (`deal(data, 1, [])`, `mulberry32(hash32(seed))`); expose the mystery-for-seed through `window.__cc` (dev bridge) so the probe is one `evaluate` loop, not 40 navigations.
2. Wikipedia is CC BY-SA: reworded facts are derivatives, so share-alike technically applies to the game's fact text. Not an architecture problem; put a one-line note in `CONTENT_SOURCES.md` so the owner knows what he's accepting.
3. `accessed` from `git log -S<url>` is a reasonable proxy for existing pages; say so in `CONTENT_SOURCES.md` ("the date the page entered the content") so nobody later mistakes it for a verified read date.
4. The entry's "highlight" relies on `focus:` (not `focus-visible:`); keep it that way, since Chrome won't match `:focus-visible` on programmatic focus after a mouse tap.
5. `numberSources` numbers per page, so two Wikipedia articles get two numbers. That matches "no guessing by position", but say it in the component comment, because the brief's wording ("one number per source") reads as per registry key.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **Cached-pool compatibility (§2).** Existing cached responses lack `citations`; making it required creates a crash path for new clients. Define compatibility explicitly: normalize absent metadata or version the endpoint. An individual missing-entry fallback is insufficient.
2. **Licences belong to pages too (§1).** Registry-only licensing cannot represent mixed publishers under `literature`, `government`, or `ngo`. The existing [aardvark paper](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.00637/full) declares CC BY, while the plan assigns literature no licence. Allow page-level licence overrides with registry defaults.
3. **Post-round coverage is incomplete (Finding 1, §3).** `StatusTicker` and desktop `NotesList` remain visible after rounds ([AnimalGame.tsx](/srv/critter-ai/worktrees/fact-sources/src/components/animalBoard/AnimalGame.tsx:502)). Include their completed-round facts in the sourcing design, or hide those duplicate surfaces during review.

SHOULD-CONSIDER:

1. Distinguish Git introduction dates from verified access dates; they represent different provenance.
2. Document the ongoing release dependency: deploy citation metadata before publishing content that references it, and retain metadata needed by existing live rows.
3. Reject missing source identities during content validation; checking only rows already carrying `source` allows uncited facts through.

## Revision notes

One round, 2026-11-08, edits in place above.

MUST-FIX:
- **Fable 1 (check strictness):** `FULL_CITATION_KEYS` = amphibiaweb, wikipedia; every page needs a dated `citations.json` entry (error); elsewhere a missing `cite` is a warning with the `{name}. Accessed {accessed}.` fallback. New `checkCitations → { errors, warnings }` beside `checkProfile` (§1 Checks).
- **Fable 2 (ADW licence):** CC BY-NC-SA 3.0, checked 2026-11-08 from the VPS. Fable's `/about/copyright/` is a 404; the terms are at `https://animaldiversity.org/about/use_conditions/`, which links `by-nc-sa/3.0`. In the §1 table; step 4 re-confirms it, and any change goes under Decisions. Consequence: the E2E probe now matches the AmphibiaWeb host, not "CC BY-NC" (§6).
- **Astra 1 (cached pool):** the one client loader (`useAnimalSession.ts:101`) normalizes absent `citations` to `{}`; downstream types stay required, and missing entries render as numbered name + link (§2). No endpoint versioning (Rejected).
- **Astra 2 (page licences):** optional `license` per `citations.json` page overrides the registry default; mixed-publisher keys have no default (§1).
- **Astra 3 (post-round coverage):** hide, don't number. During review, the desktop witness notes are not rendered and the status line remounts with no facts, on the round's result line. Both are blanked copies of the card's notes, so the card and journal are the only post-round fact surfaces, as the brief picks (Finding 1, §3, E2E §6).

MISSED (Fable):
- Stale pool: same fix as Astra 1.
- Live `check` lagging the owner's build: recorded under Decisions and the Summary as "needs the prod content build", not a blocker. The scratch-DB build and check gate this branch (§1 Checks, §7).
- `savedGame.ts` path: corrected to `src/components/animalBoard/savedGame.ts:18` (§2).

SHOULD-CONSIDER taken: Astra SC1 + Fable SC3 (`accessed` for old pages is the git-entry date, a proxy, and the docs say so); Astra SC2 (release order rule in §2 and the docs); Astra SC3 (`validatePool` errors on a fact or hand-written clue with no source URL); Fable SC2 (Wikipedia share-alike line in the docs); Fable SC4 (`focus:`, not `focus-visible:`); Fable SC5 (per-page numbering comment).

Declined: Fable SC1 (a dev-bridge seed → mystery hook). `deal` draws from the session's stateful `rng` ref (`useAnimalSession.ts:83-89`), so the hook would mean duplicating or refactoring dealing. The probe loads no board and makes no moves, stops at the first hit (40 seeds at most), and §6 already measures it against the CI budget. If the measurement says otherwise, revisit it then.

## Steps

`$STATE` = `/srv/critter-ai/agent-state/missions/fact-sources`. Order follows §7, except Wayback A (step 2) goes before the citation code, because the 4 existing AmphibiaWeb pages need their snapshot `cite` before `checkCitations` can pass.

Every step:
- **Start** with `git fetch origin --prune`. **End** with `npm run typecheck` and `npm run lint`. Add `npm test` when `src/`, `tests/`, `scripts/` or `db/content/` changed, and run E2E where the step says.
- **E2E run:** `CHROME_PATH=$STATE/bin/chrome npm run e2e:fresh 2>&1 | tee /tmp/fact-sources-e2e.log`. Move the new `e2e-artifacts/<run>/` to `$STATE/e2e-s<N>/` and add `e2e.log` and `COMMAND.txt` (command, commit, seed). Delete the previous `e2e-s*`, so there are at most two artifact folders: the latest intermediate and `final-e2e/`. Run heavy jobs one at a time: no dev server, build or test beside an E2E run.
- **DB:** `.env.local` is the live `phaser_june`, and it stays read-only here (`content -- check`, counts). Never run `content -- build` into live; the prod content build is the owner's. Builds go to a scratch DB (`$STATE/tools/scratch-check.sh`, made in step 3). No schema change is planned. If one turns out to be needed, or any bulk write: take a fresh dump first (`ssh play.critterconnect.org /opt/critter-connect/deploy/backup/pg-backup.sh`), update `db/schema.sql` and say why under Decisions.
- **Content:** edit only the `db/content/` files, following the `CONTENT_SOURCES.md` workflow. Never hand-edit rows. Never delete a `citations.json` entry: a live row can still cite that page until the owner's build (§2).
- **Wayback:**
  - CDX only, one request at a time, at least 5 s apart.
  - Only the 15 species pages, plus one `amphib_query` CDX fallback for each species with no page snapshot.
  - On a 429, honour `Retry-After` once, then stop and finish next session.
  - Fetched files are untrusted: parse them with `python3 -I` tools kept in `$STATE/tools/`, and never execute them.

- [x] 1. **Sparkle fix (Finding 3).**
  - Change `src/components/animalBoard/AnimalGame.tsx:215` to `setTimeout(() => setReveal(current => (current === reveal ? NO_REVEAL : current)), REVEAL_MS)`. `scripts/e2e.mjs:1403` stays as it is.
  - Check: E2E, every check passes (baseline was 1526/1527), including `round 3 move 10: a right guess just scouted sparkles`. Artifact `$STATE/e2e-s1/`.
  - Keep the baseline's `report.json` as `$STATE/baseline-report.json`, then delete `$STATE/baseline-e2e/`.
  - Still red: do a narrow run (`E2E_ROUNDS=3`) with temporary add/clear timestamps (not committed), fix what it shows, and record it under Decisions.
- [x] 2. **Wayback batch A: IDs, 15 snapshots, research skeleton (no app code).**
  - **IDs:** 03 4322, 05 4524, 06 616 and 16 6197 come from the profiles. Find the other 11 with one Wikidata SPARQL query on the "AmphibiaWeb Species ID" property (confirm its label first), matching on `scientificName`. Fallback: the Wikipedia API's external links. Never ask AmphibiaWeb.
  - **Per species (§4):** a CDX query for the newest status-200 snapshot, then fetch `https://web.archive.org/web/<ts>id_/<original>` into `$STATE/wayback/<profile>.html`. If there is none, try the `amphib_query` CDX; failing that, record "no snapshot". About 30 to 45 requests in all.
  - **Extract:** `$STATE/tools/wayback_text.py` turns each `.html` into `<profile>.txt`. `$STATE/wayback/index.json` holds, per profile: `{ id, idFrom, original, timestamp, archive, citeLine, license }`, with the licence and its version taken from the page footer.
  - **Research file:** new `docs/research/2026-11-07-amphibiaweb-wayback.md` with the route and the licence. Per amphibian: its ID and how it was found, the snapshot URL and date (or "no snapshot"), and the citation line verbatim. Add empty headings per animal for Trees, Filled traits, New clues, New facts and Disagreements.
  - Check: `index.json` has 15 entries; every snapshot's `.txt` contains its `citeLine` (`grep -F`); typecheck and lint pass. Log the request count, any 429s and any no-snapshot species.
- [x] 3. **Citation renderer, templates, safe `load()` (tests first).**
  - First write `tests/clueGame/citations.test.ts` with F1 to F10 (Failure modes). `npm test` must fail, on the missing module. Then write the code:
  - `src/clueGame/citations.ts`: `CitedPage`, `Citation`, `FULL_CITATION_KEYS`, `renderCitation` and `formatDay` (§1). Client-safe: no import from `profiles.ts`.
  - `db/content/sources.json`:
    - `citeAs` on all 16 entries (§1 table);
    - `license` on amphibiaweb (CC BY-NC, version from step 2's footer), adw (`CC BY-NC-SA 3.0`) and wikipedia (`CC BY-SA 4.0`);
    - `ContentSource` (`profiles.ts:64`) gains optional `citeAs` and `license`.
  - `scripts/content.ts:134`: `load()` gets an explicit pick of the six `content_sources` columns (Finding 4).
  - `$STATE/tools/scratch-check.sh`:
    - `createdb fact_sources_scratch`;
    - apply the DDL for `content_sources`, `species`, `species_deduction_clues` and `species_facts` (plus their sequences) from `db/schema.sql`;
    - `DATABASE_URL=<local socket URL> npm run content -- build`, then `-- check`;
    - `dropdb` in a trap.

    Find the socket URL that postgres.js accepts (`postgres:///…` or `?host=/var/run/postgresql`) and hard-code it in the script.
  - Check: `npm test` passes (F1 to F10 and the 48 existing tests); typecheck and lint pass; `scratch-check.sh` builds and reports `0 errors`.
- [x] 4. **`citations.json`, `pageUrl`, `checkCitations` (tests first).**
  - First add F11 to F15 to `citations.test.ts`; they must fail. Then write the code:
  - **`pageUrl(profile, key, url?)`** in `profiles.ts`, used at `:310`, `:370` and `:381` (Finding 6). The rows must not change: dump `contentRowsFromProfiles(profiles)` as JSON before and after (tool in `$STATE/tools/`), and `cmp` must find them equal.
  - **`$STATE/tools/accessed-dates.mjs`** takes every distinct clue and fact page (`pageUrl`; traits and iucn_range left out). It sets `accessed` to the first date from `git log --reverse --format=%as -S<url> -- db/content/animals/`, and writes `db/content/citations.json` with sorted keys and 2-space indent. The 4 existing AmphibiaWeb pages get `cite` (the `citeLine`), `archive`, and `accessed` (the date the snapshot was read), all from `index.json`.
  - **`src/lib/contentCitations.ts`:** typed imports of `sources.json` and `citations.json`. `scripts/content.ts` and `tests/clueGame/contentPool.ts` use it instead of reading the files themselves.
  - **`checkCitations(profile, registry, pages) → { errors, warnings }`**, beside `checkProfile`. In `content.ts`:
    - `preview` prints errors as `PROBLEM …` and warnings as `cite warn …`;
    - `build` throws on errors and prints `<n> citation warnings`.

    `content.test.ts` asserts `checkCitations` gives no errors.
  - Check:
    - `npm test`, typecheck and lint pass;
    - `npm run content -- preview | grep -c PROBLEM` prints 0;
    - log the count from `grep -c 'cite warn'` (non-full keys with no `cite` yet);
    - `scratch-check.sh` passes;
    - the entry count equals the distinct page count (about 250).
- [x] 5. **Pool join, `validatePool` rule, old-pool tolerance (tests first).**
  - First add F16 to F18 to `citations.test.ts`; they must fail. Then write the code:
  - **Pool join:**
    - `ContentRows` clues and facts gain `source_key?`;
    - `buildCluePool` (`src/lib/cluePool.ts:17`, `:20`) selects `c.source_key` and `f.source_key`, and calls `poolFromRows(rows, { registry, pages })` with the data from `contentCitations`;
    - `poolFromRows` adds `citations: Record<url, Citation>` (§2), and `CluePool.citations` is required;
    - the `tests/clueGame/testPool.ts` fixture gets `citations: {}`, and `contentPool.ts` passes the registry and pages.
  - **`validatePool`:** every fact and every hand-written clue (`isHandWrittenClue`) needs a `source.url` with an entry in `pool.citations`; a missing one is an error.
  - **Old cached pools:** `useAnimalSession.ts:101` reads the response as `Omit<CluePool, 'citations'> & Partial<Pick<CluePool, 'citations'>>` and builds `{ ...fetched, citations: fetched.citations ?? {} }`, with a comment saying why (§2).
  - Check:
    - `npm test`, typecheck and lint pass;
    - `npm run content -- check` on live (read-only) shows 0 errors. A live-only error, for a row this branch's profiles no longer have, goes under Decisions as "needs the prod content build";
    - `scratch-check.sh` reports 0 errors;
    - `npm run build` passes, and `grep -rl 'amphibiaweb.org/species' .next/server` finds the bundled citations (the run image has no `db/`). Then `rm -rf .next`;
    - E2E is green. Artifact `$STATE/e2e-s5/`.
- [x] 6. **AmphibiaWeb B1: 05 Wallace's flying frog, 07 hairy frog, 14 desert rain frog** (4, 5 and 5 no-records). For each animal, working from `$STATE/wayback/<profile>.txt`:
  - **Fill** the no-record traits first, then the clues and facts the profile lacks. Follow the `CONTENT_SOURCES.md` workflow and tag vocabulary, with copy for grades 6 to 12. Every value needs a quote found word for word in the `.txt`.
  - **Tier rule (§4):** IUCN wins (keep it, note both). Against ADW, keep the existing value and note both. Against Wikipedia, AmphibiaWeb replaces it, and the old page's `citations.json` entry stays.
  - **Tags:** reuse existing ones. List any new open tag under Decisions, because moves-and-signs-build maps every open tag to a sign.
  - **Source and citation:** set `sources.amphibiaweb` to `https://amphibiaweb.org/species/<id>`, and add its `citations.json` entry with `cite`, `archive` and `accessed` (the date the snapshot was read).
  - **Existing AmphibiaWeb values** (05): check each against the snapshot. A value not found there is flagged in the research file and settled under Decisions.
  - **Research file:** Trees (yes, no or no record, with the quote), filled traits, new clues and new facts, each with its quote as `> "…"`, and any disagreements.
  - **First batch only:**
    - write `$STATE/tools/check_quotes.py`: every `> "…"` under an animal must appear in that animal's `.txt`, comparing with whitespace normalized;
    - run the balance bot before editing (`node scripts/run-typescript.mjs scripts/balance-044.ts`) and log its summary.
  - Check:
    - `npm run content -- preview <name>` for each animal, with no `PROBLEM` lines;
    - `npm test`, typecheck and lint pass;
    - `scratch-check.sh` reports 0 errors;
    - `check_quotes.py` finds 0 misses.

    No E2E: the live DB doesn't get these rows, and the app code is unchanged. Log, per animal: the traits filled and the clues and facts added.
- [x] 7. **B2: 16 purple frog, 10 Suriname toad, 13 tomato frog.** As step 6. For 16, check its 2 existing AmphibiaWeb values against the snapshot.
- [x] 8. **B3: 08 coastal tailed frog, 06 red-eyed tree frog, 09 dyeing poison dart frog.** As step 6. For 06, check its 3 existing AmphibiaWeb values.
- [x] 9. **B4: 11 Goliath frog, 76 golden poison frog, 03 Darwin's frog.** As step 6. For 03, check its 4 existing AmphibiaWeb values.
- [x] 10. **B5: 62 Chinese giant salamander, 74 axolotl, 75 hellbender** (no gaps: only facts, clues and trees). As step 6, then:
  - the research file covers all 15 animals: Trees for each, and the "no snapshot" ones stated as such;
  - run `check_quotes.py` over the whole file;
  - run the balance bot again and compare it with step 6's run in the Log. A worse deal or look-alike set goes under Decisions.
- [x] 11. **ADW cite lines (65 pages).**
  - Re-confirm that `https://animaldiversity.org/about/use_conditions/` still gives CC BY-NC-SA 3.0. A change goes into `sources.json` and under Decisions.
  - `curl` each ADW account page in `citations.json` into `$STATE/adw/`, one at a time, about 2 s apart.
  - A tool extracts the "To cite this page:" block into `cite`, without its trailing "Accessed …".
  - Check: preview prints no adw `cite warn` lines; `npm test`, typecheck and lint pass.
- [x] 12. **IUCN cite lines (74 pages).**
  - Read the staging details page (CONTENT_SOURCES.md, "Research access") through parallel-search `web_fetch`, 7 URLs per call.
  - Take the assessment's "Citation" into `cite`, stripping "Accessed on …" (F10 catches a miss).
  - If the pages can't be reached, use the §7 fallback (`IUCN. <year>. The IUCN Red List of Threatened Species. Version <v>. https://www.iucnredlist.org.`) and record it under Decisions.
  - Check: preview prints no iucn `cite warn` lines; `npm test`, typecheck and lint pass.
- [x] 13. **Remaining cite lines and page licences.**
  - **Literature (15):** `curl -LH 'Accept: text/x-bibliography; style=apa' https://doi.org/<doi>`.
  - **By hand (about 33):** news, ngo, government, sdzwa and tftsg pages, in the forms in §1.
  - **Page `license`** wherever a page states one, e.g. the Frontiers paper `10.3389/fphys.2020.00637` (CC BY, version from the page).
  - smithsonian and britannica keep the `{name}` template.
  - Check:
    - `npm run content -- preview | grep -c 'cite warn'` prints 0; any line left goes under Decisions with the reason;
    - `npm test`, typecheck and lint pass;
    - `scratch-check.sh` reports 0 errors.
- [x] 14. **UI: `FactsWithSources` on the round-end card.**
  - **`numberSources`** in `citations.ts`: a source's identity is its URL, or its name when it has no URL. Its comment says numbering is per page (SC5).
  - **New `src/components/clueGame/FactsWithSources.tsx` (§3):**
    - **Mark:** a `sup` with `text-xxs text-neutral-7 leading-[0]`, wrapping `a href="#<id>-<n>" aria-label="Source <n>"`, with an `after:` box for the tap area.
    - **Click or Enter on a mark:** `preventDefault`, open the `<details>`, then `focus({ preventScroll: true })` and `scrollIntoView({ block: 'nearest' })`.
    - **List:** a closed `<details><summary>Sources (n)</summary><ol>`.
    - **Entry:** `li id tabIndex={-1}`, text-xxs, neutral-8, with a `focus:` highlight. It shows the citation text, a link to the page, an "archived copy of <date>" link, `License: …` and "Reworded for this game.". Without a citation it falls back to the source's name and link.
    - Links open in a new tab with `rel="noopener noreferrer"`. Ids are prefixed from `useId()`. Use the cc tokens, per `GUI.md`.
  - **Card:** the component replaces `AnimalSheets.tsx:635-642`. `RoundEndSheet` gets a `citations` prop, and its bullets become `list-disc marker:text-neutral-6`. `AnimalGame.tsx` passes `pool.citations`.
  - Check:
    - typecheck, lint (including the theme's contrast check) and `npm test` pass;
    - E2E is green, layout checks included ("the round-end card covers the board only"). Artifact `$STATE/e2e-s14/`;
    - look at `04-round-*-end.png`.
- [ ] 15. **UI: journal, hiding during review, dead code.**
  - **Journal:** `keyFacts` (`src/clueGame/pool.ts:101`) returns `Array<{ text; source }>`, de-duplicated by text with the first source kept. `JournalSheet.tsx:69-71` uses `FactsWithSources`, applied after `slice(0, LEARNED_FACTS)` and given `pool.citations`.
  - **During review**, in `AnimalGame.tsx`:
    - desktop witness notes: `{wide && round && !reviewing && …}` (`:504`);
    - `StatusTicker`: `facts={reviewing ? [] : facts}` and ``key={reviewing ? `end-${roundNo}` : roundNo ?? 0}`` (`:502`).
  - **Dead code** in `LogEntryText.tsx`:
    - delete `plural`, `rankName`, `isLive`, `SourceLine` and `LogEntryText` (`rg` for importers first);
    - move `WithBlanks` to `src/components/clueGame/WithBlanks.tsx` and update its 2 imports (`AnimalGame.tsx:21`, `AnimalSheets.tsx:15`);
    - delete the old file.
  - Check: typecheck, lint and `npm test` pass; E2E is green (artifact `$STATE/e2e-s15/`); look at `05-journal.png`.
- [ ] 16. **E2E: Sources checks and screenshots (`scripts/e2e.mjs`, §6).**
  - **CI data first.** Count the AmphibiaWeb-cited facts in `phaser_june_dev`, read-only and without echoing the URL: `( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; psql "$DATABASE_URL" -Atc "SELECT count(*) FROM species_facts WHERE source_key='amphibiaweb'" )`. If it is 0, build this branch's content into the dev copy (never into live) and record it under Decisions.
  - **One helper** reads a facts list in a single DOM read. It runs on each of the 4 round-end cards and on the journal, and checks:
    - one mark per line;
    - the set of marks equals the set of entries;
    - numbers run 1..n in order of first use;
    - the `<details>` is closed at first, with the summary `Sources (n)`.

    Then it clicks one mark and presses Enter on another: the details open, `document.activeElement` is that entry, and the entry is inside the scroller's view. For the journal, run it where section 3 opens the journal and where the sharp-eye scenario opens it. FAIL if no journal fact list is seen.
  - **Hiding during review.** While each card is open, sample the status line for one dwell (about 4 s): it never shows "Clue n of m", and there is no `#side-notes`. Once, on round 1's card, switch to 1280x800 non-mobile and assert there is no `#side-notes`, then go back to 390x844. The phone check alone proves nothing, because `wide` is false at 390 px.
  - **AmphibiaWeb probe (§6):**
    - candidates: species in `/api/clue-game/pool/` with a fact whose `source.url` host is `amphibiaweb.org` and which has a `citations[url]` entry; FAIL if there are none;
    - take the continent with the most candidates, and probe `?seed=1..40&place=`: clear `cc:explore:game` and localStorage first, then read `__cc.clue().mysteryId`;
    - name the mystery right, using the pencil-bonus flow;
    - assert the entry linking to `amphibiaweb.org` contains "AmphibiaWeb", `License: CC BY-NC` and "Reworded for this game.";
    - record `report.sources = { amphibiaweb: { seed, place, speciesId, probeMs } }`.
  - **Screenshots** of that card: `10-sources-closed-light.png`, `10-sources-open-light.png`, `10-sources-closed-dark.png` and `10-sources-open-dark.png` (set `data-theme` and the localStorage key `critter-connect:theme`, and restore them afterwards), plus `11-journal-sources-open.png`.
  - Every new check's name contains `sources:` (for the Verification grep). Update the file's header comment.
  - Check:
    - typecheck and lint pass, and E2E is green;
    - the report has the new checks, all ok;
    - the 5 screenshots exist and show closed and open in both themes (look at them);
    - log `probeMs` and the total run time. The CI e2e job times out at 15 min, so keep the local run at or under about 11 min;
    - artifact `$STATE/e2e-s16/`.
- [ ] 17. **Docs.**
  - **`docs/CONTENT_SOURCES.md`**, a new "Citations" section:
    - the `citations.json` fields and how to record each: `cite` verbatim, without its "Accessed …"; what `accessed` means (for pages from before this mission it is the date the page entered the content, a proxy, not a verified read); the `archive` viewer URL; the page licence override;
    - the §1 table, with each source's guidance URL and licence URL;
    - what is an error (amphibiaweb, wikipedia, a missing entry) and what is a warning;
    - the release order (§2);
    - a line that Wikipedia's CC BY-SA share-alike applies to facts reworded from it;
    - the Wayback route (CDX, the load rules, no `amphib_dump.xml` or web services), as a stopgap until AmphibiaWeb grants access.

    Also replace the "AmphibiaWeb blocks bots…" line under "Research access", and mention `checkCitations` and `cite warn` in the workflow steps.
  - **`AGENTS.md`:** add `citations.json` to the "Content:" line.
  - **`docs/CLUE_MATCH.md`:** add the pool's `citations`, if the file documents the pool shape (`rg`).
  - **Research file:** a final pass, with all 15 animals and the trees table; `check_quotes.py` finds 0 misses.
  - Check: lint passes; `check_quotes.py` passes; `rg citations.json` hits all three docs.
- [ ] 18. **Final Verification.** Do this once `## Code review (Astra)` is recorded and its MUST-FIX steps are done.
  - Run `## Verification` and save the artifact to `$STATE/final-e2e/`.
  - Write the Summary:
    - per animal, the no-records filled and the clues and facts added;
    - new open tags;
    - both review verdicts;
    - "the owner runs `npm run content -- build` from WSL";
    - any live-check lag.
  - Set `status: done`.

## Verification

E2E first. Run on the final commit, from `/srv/critter-ai/worktrees/fact-sources`, one command at a time:

```
git fetch origin --prune && git status --short           # clean
npm run typecheck                                         # exit 0
npm run lint                                              # exit 0 (eslint + theme contrast)
npm test                                                  # all pass (48 existing + citations.test.ts)
npm run content -- preview > /tmp/fact-sources-preview.txt
grep -c PROBLEM /tmp/fact-sources-preview.txt             # 0
grep -c 'cite warn' /tmp/fact-sources-preview.txt         # 0, or each one under Decisions
/srv/critter-ai/agent-state/missions/fact-sources/tools/scratch-check.sh   # build ok, "0 errors": the gate for "content -- check passes"; never touches live
npm run content -- check                                  # live, read-only: 0 errors (a live-only lag goes under Decisions and in the Summary)
npm run build && grep -rlq 'amphibiaweb.org/species' .next/server && rm -rf .next
CHROME_PATH=/srv/critter-ai/agent-state/missions/fact-sources/bin/chrome npm run e2e:fresh 2>&1 | tee /tmp/fact-sources-e2e.log   # "N/N checks passed", exit 0
python3 -I /srv/critter-ai/agent-state/missions/fact-sources/tools/check_quotes.py docs/research/2026-11-07-amphibiaweb-wayback.md /srv/critter-ai/agent-state/missions/fact-sources/wayback   # 0 misses
```

The E2E run must show every check ok in `report.json`:
- **Each round-end card** in the seed-7 main loop (4 rounds):
  - one mark per fact line;
  - the marks and entries are equal sets;
  - numbers run 1..n in order of first use;
  - Sources is closed at first, with the summary `Sources (n)`;
  - a click and an Enter each open Sources and focus that entry, in view;
  - during review, no "Clue n of m" and no `#side-notes`, at 390x844 and at 1280x800.
- **The journal:** the same Sources checks.
- **An AmphibiaWeb-sourced animal's card:** "AmphibiaWeb", `License: CC BY-NC` and "Reworded for this game.", with its seed in `report.sources.amphibiaweb`.
- **Every check that was already there**, including `round 3 move 10: a right guess just scouted sparkles`, plus no console errors and no failed requests.

Report check:
```
node -e 'const r=require(process.argv[1]);const bad=r.checks.filter(c=>!c.ok);const src=r.checks.filter(c=>c.name.includes("sources:"));console.log({failed:bad.length,sources:src.length,aw:r.sources?.amphibiaweb})' /srv/critter-ai/agent-state/missions/fact-sources/final-e2e/report.json
```
It must print `failed: 0`, a `sources` count covering the 4 cards, the journal and AmphibiaWeb, and `aw.seed` set.

**Artifact:** move `e2e-artifacts/<run>/` to `/srv/critter-ai/agent-state/missions/fact-sources/final-e2e/`. Add `e2e.log` (from `/tmp/fact-sources-e2e.log`) and `COMMAND.txt`, which says: `CHROME_PATH=/srv/critter-ai/agent-state/missions/fact-sources/bin/chrome npm run e2e:fresh   # from /srv/critter-ai/worktrees/fact-sources at <commit>, seed 7`. Then delete the last `e2e-s*`.
- **Screenshots it must hold:** `10-sources-closed-light.png`, `10-sources-open-light.png`, `10-sources-closed-dark.png`, `10-sources-open-dark.png` and `11-journal-sources-open.png`, plus the existing set.
- **Repeatable:** the same command on the same seed replays the same rounds, and the AmphibiaWeb probe's seed is in the report.

**Definition of done, content:**
- `$STATE/wayback/index.json` has 15 entries;
- the research file has each animal, with its snapshot (or "no snapshot"), Trees, and every fill quoted;
- `check_quotes.py` finds 0 misses, and the scratch build and check give 0 errors;
- the Summary lists the fills per animal.

**Release smoke** (the Release unit, after `gh pr merge` and `deploy critter-connect`):
```
curl -s https://play.critterconnect.org/version.txt       # the merge commit
for p in / /explore/ /api/places/ /api/clue-game/pool/; do curl -s -o /dev/null -w "%{http_code} $p\n" "https://play.critterconnect.org$p"; done   # all 200
curl -s https://play.critterconnect.org/api/clue-game/pool/ | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const c=JSON.parse(s).citations??{};const aw=Object.entries(c).filter(([u,v])=>new URL(u).hostname.endsWith("amphibiaweb.org")&&(v.license??"").startsWith("CC BY-NC"));console.log(Object.keys(c).length,aw.length)})'   # >= 250, >= 1
```
For about 11 min after the deploy, an old cached pool without `citations` can answer (§2); retry after that. The Summary says the owner's prod content build (`npm run content -- build`, WSL) is what puts the new AmphibiaWeb rows live.

## Failure modes

Only the citation renderer and the content checks are tested in isolation: they are content checks a playtest can't see (AGENTS.md, "Testing"). The tests go in `tests/clueGame/citations.test.ts` and are written before the code, in steps 3 to 5. Everything else is covered by E2E.

`renderCitation` and `formatDay` (step 3):
- F1. A page with no entry gives `citation: null`, `missing: ['accessed']`.
- F2. An unknown placeholder in `citeAs` (e.g. `{author}`) throws.
- F3. A bad `accessed` (`2026-13-01`, `2026-02-30`, `8 Nov 2026`) throws.
- F4. A bad `archive` throws: not of the form `https://web.archive.org/web/<14 digits>/…`, or an impossible timestamp. A good one gives `archive.date` from its timestamp (`20250617172314` → `17 Jun 2025`).
- F5. A full key (amphibiaweb) with no `cite` gives `citation: null`, `missing: ['cite']`.
- F6. Wikipedia's `{title}` is the last path segment, percent-decoded, with `_` turned into spaces (`Darwin%27s_frog` → `Darwin's frog`); the query and fragment are ignored. With no segment, `title` is missing and `citation` is `null`.
- F7. A non-full key (iucn) with no `cite` falls back to `{name}. Accessed {accessed}.`, with `missing: ['cite']`.
- F8. A page's licence beats the registry's; with neither, the licence is `null`.
- F9. `formatDay`: `2026-01-01` → `1 Jan 2026`, `2026-12-31` → `31 Dec 2026`. It uses no `Date` or locale, so there's no timezone shift.
- F10. A `cite` that still ends in "Accessed …" throws, because the date would print twice (IUCN's and ADW's lines carry one).

`checkCitations` (step 4):
- F11. A clue or fact page with no `citations.json` entry is an error naming `clues[i]` or `facts[i]` and the URL.
- F12. An override `url` is checked on that URL, not on the profile's `sources[key]` page (`pageUrl`).
- F13. Traits and `iucn_range` are not checked.
- F14. A non-full key with no `cite` is a warning, not an error.
- F15. An entry that no profile cites gives nothing: live rows may still cite it (§2).

Pool join and `validatePool` (step 5):
- F16. A fact or hand-written clue with no `source`, or no `source.url`, is an error; a template clue without one is not.
- F17. A cited URL missing from `pool.citations` is an error.
- F18. In `poolFromRows`, an incomplete full-key page gets no `citations` entry, and a non-full key missing `cite` gets the fallback entry.

## Risks / open questions (steps)

- **The main loop runs at 390 px**, where `#side-notes` never renders. Step 16 adds a 1280x800 check so the hiding is really tested.
- **postgres.js may not reach the local socket from `postgres:///…`.** Step 3 finds the form that works and fixes it in `scratch-check.sh`.
- **IUCN's and ADW's own lines end in "Accessed …".** Steps 11 and 12 strip it, and F10 fails loudly on a miss.
- **A batch that replaces a Wikipedia value changes that row's URL.** The old entry stays (never deleted), so the live row keeps its citation until the owner's build.
- **CI budget:** the probe, 5 screenshots and the journal checks add time, measured in step 16. If the run goes over about 11 min locally, revisit Fable SC1 (a dev-bridge seed-to-mystery hook) and record it under Decisions.

## Code review (Astra)

## Release

## Decisions

- 2026-11-08 (steps): Wayback fetch (step 2) before citation code: the 4 existing AmphibiaWeb pages need snapshot `cite` before `checkCitations` passes. Added `citations.test.ts` (content checks a playtest can't see; failure modes F1-F18 written first), a 1280x800 E2E check (main loop at 390 px never renders `#side-notes`), and `npm run build` in steps 5/18 (proves citations bundle without `db/`).

- 2026-11-08 (step 2): AmphibiaWeb licence = **CC BY-NC 4.0**. Species pages have no licence footer (plan assumed one); they link `/data/datause.html`, so read its one Wayback snapshot (`20251006003414`, 2 extra requests), which states CC-BY-NC and links `creativecommons.org/licenses/by-nc/4.0`. Not bulk; the policy page itself points to Wayback for archived species pages.
- 2026-11-08 (step 2): `citeLine` = the page's "Species Account Citation:" line minus its trailing "Accessed <snapshot date>." (crawler's render date; F10 would reject it). `index.json` `read` = 2026-11-08, the `accessed` for step 4.
- 2026-11-08 (step 3): scratch DB URL = `PGHOST=/var/run/postgresql DATABASE_URL=postgres:///fact_sources_scratch` (peer auth). postgres.js ignores `?host=` and takes the socket dir from `PGHOST` only when the URL has no host. Every source has a `citeAs`; a source without one would fall back to `{name}. Accessed {accessed}.`. F10 rejects any `cite` containing the word "Accessed", not only a trailing one (simpler, and no real line uses it otherwise).
- 2026-11-08 (step 4): `checkCitations` turns a `renderCitation` throw (bad date, archive, placeholder) into an error naming the item, so `preview` lists it per animal instead of crashing; `build` still refuses. `scripts/balance-044.ts` also reads the registry through `contentCitations` (DRY; it was the third `sources.json` reader). `CONTENT_DIR` lost its last outside importer, so it's no longer exported. Old pages' `accessed` = first `git log -S` date in `db/content/animals/` (2026-09-25 154, 09-27 49, 09-29 43); the 4 AmphibiaWeb pages = snapshot read date 2026-11-08. Tool: `$STATE/tools/accessed-dates.mjs` (keeps existing entries if re-run).
- 2026-11-08 (step 5): `poolFromRows` takes the citation data as a required second argument and names a row's source from the registry by `source_key` when the row has no `source_name` (DB rows get it from the join; rows built from profiles carry only the key). Without it the content-built test pool had no sources at all, so the new `validatePool` rule would have been vacuous in `npm test`; now it checks every fact and hand-written clue for real. A row whose key isn't in the bundled registry gets no citation (shows name + link; `validatePool` reports it).
- 2026-11-08 (step 6): Where AmphibiaWeb states the same claim as a Wikipedia trait or clue, the line is re-sourced to AmphibiaWeb (CONTENT_SOURCES rule: "take each fact from the highest tier that states it"); text unchanged. 07: covering, birth and 4 clues. Old Wikipedia `citations.json` entry stays (§2). Facts keep Wikipedia where AmphibiaWeb doesn't state the whole line.
- 2026-11-08 (step 6): 07 hairy frog `size` stays out: AmphibiaWeb gives lengths only (males 13 cm, females 9 cm) and a stout 9 to 13 cm frog sits near the 100 g tiny/small line. 14 desert rain frog `size: tiny` from its 48 mm length (far under 100 g), the same call as 08's 2 to 5 cm.
- 2026-11-08 (step 6): 05's size note lost "big for a tree frog" (not in the snapshot, its cited source); the "huge" in its webbed-feet clue stays (AmphibiaWeb: fully webbed, large discs). No new open tags in B1: 14's paddle-feet clue reuses `webbed_feet` (05, giant otter).
- 2026-11-08 (step 7): 16 purple frog's Wikipedia color clue "dark purplish gray" (`purple_gray`) stays though AmphibiaWeb says black above, gray below: the color its name (AmphibiaWeb's too) comes from, a description not a conflicting fact; replacing it would drop a tag moves-and-signs-build maps. 16 `size` stays out (lengths only, 5.3 to 9 cm bloated frog near the 100 g line), as 07. 16's Wikipedia fact "tadpoles first found in 1917" rewritten to AmphibiaWeb's "described in 1918" (tier rule). 10 Suriname toad: USGS (tier 3) clue + fact re-sourced to AmphibiaWeb (same claim); `diet: meat` (ADW) kept vs AmphibiaWeb "mostly invertebrates", same tier, noted. 13: male color and clutch size differ from ADW, same tier, kept ADW. No new open tags in B2: 10's legs clue reuses `webbed_feet`.
- 2026-11-08 (step 8): 09 dyeing poison dart frog `young: few` (AmphibiaWeb 2 to 6 eggs; ADW's 5 to 10, per the clue audit, agrees) splits it from 76 golden poison frog (`many`, 8 to 18). `animalBoard.test.ts` pinned the two as never sharing a set; its guard now uses the other documented inseparable pair, Saola and Sumatran Orangutan (probe: still inseparable in world/asia/south-america; the frogs now share sets in south-america and world play). `ANIMAL_BOARD_PAPER.md` updated. The moves-and-signs-build brief planned the same test change (Climbs trees splits them too). Step 10's balance run will show the effect.
- 2026-11-08 (step 8): 06 CITES date: the IUCN clue says trade controlled since 2008; AmphibiaWeb says Appendix II from 21 Mar 2010. IUCN tier 1 kept (tier rule), noted in the research file; worth the owner's check against the IUCN page when its cite line is collected (step 12). 09: IUCN says the father carries tadpoles, AmphibiaWeb both parents; IUCN kept. 06 new morphology clue reuses `vertical_pupils` (08). No new open tags in B3. 08's COSEWIC key fact keeps its source (AmphibiaWeb states only half the line).
- 2026-11-08 (step 9): 11 Goliath frog's ADW `voiceless` clue ("can't croak") kept (same tier) though AmphibiaWeb says the old no-call claims were wrong (whistles, chirps, a deep roar); flagged for the owner in the research file, since `voiceless` also tags 08, which truly can't call. 76: Wikipedia size note (5 to 6 cm) → AmphibiaWeb 4.5 cm (`tiny` unchanged); Wikipedia poison fact ("most poisonous animal on Earth … 10 to 20 people") → AmphibiaWeb's "most poisonous of all frogs … about 10 people"; geography clue re-sourced to AW. 03: existing AW fact lost "damp" (not in the snapshot), as 05's size note. 03 pouch time: ADW 6 weeks vs AW 50 to 70 days, ADW kept. No new open tags in B4: 11's nest clue reuses `egg_guarding` (07, 62, 75), 76's young clue `striped_young` (tapirs).

- 2026-11-08 (step 10): 74 axolotl: 3 Wikipedia facts AmphibiaWeb also states moved to it (name, banknote, Xochimilco counts), reworded to what it says; the banknote line drops its date (Wikipedia 2021 vs AW "as of Feb 2020", likely the announcement), so it's true either way. 62: AmphibiaWeb's account predates the 2019 split (includes the Pearl River); IUCN range fact kept. 75: IUCN "avoids water warmer than 20 °C" kept vs AW "sometimes 25 to 30 °C". No new open tags in B5: 74's diet clue reuses `ambush_hunter` (25, 51, 62), 75's tail clue `paddle_tail` (73).
- 2026-11-08 (step 10): Balance vs step 6's run: careful found 98%→99% (africa), 97% (asia, same); 3★ 74%→75% / 55%→56%; expert same; moves-left percentiles same. Africa distinct suspect sets 23→22 (from B1 to B4; B5 itself changed nothing: `balance-before-b5` = `balance-after-b5`). Not a worse deal; no look-alike set got worse. The bot runs only africa and asia, so 74/75 (North America) aren't measured; e2e plays them.
- 2026-11-08 (step 11): ADW licence re-checked 2026-11-08: `/about/use_conditions/` still links `creativecommons.org/licenses/by-nc-sa/3.0/`; `sources.json` unchanged. `cite` = the "To cite this page:" line up to "Animal Diversity Web." (ADW's own form `<Author> <year>. "<Species>" (On-line), Animal Diversity Web. Accessed <date> at <url>`; our template adds "Accessed <date>." and the link shows the URL). All 65 match that form. Tools: `$STATE/tools/adw_fetch.sh`, `adw_cite.py` (fails on a missing block or a URL mismatch).
- 2026-11-08 (step 12): IUCN staging pages unreachable here: Cloudflare challenge (403) on staging and live, and this session has no parallel-search `web_fetch`. Route instead, no IUCN request: (1) the page's own "js-citation" line from its newest Wayback snapshot (71 of 74 have one; 14 in the current layout carry the line, the rest are the old JS-only layout); (2) else IUCN's own form rebuilt from the assessment's Crossref DOI record (prefix 10.2305; title `<species>: <assessors>`, Red List year/version from the DOI). Format checked against the snapshots: identical where both exist, except that Crossref drops "(errata version …)" / "(amended version …)" notes and some middle initials; the snapshot line wins, and gets Crossref's DOI appended when the snapshot predates it (3). Result: 14 snapshot, 56 Crossref, 4 §7 fallback (`IUCN. 2026. The IUCN Red List of Threatened Species. Version 2026-1. https://www.iucnredlist.org.`, version from the newest snapshots) for 15933 chimpanzee, 22066 Andean bear, 4819 maned wolf, 714 red panda (errata/amended assessments with no own-id DOI and no new-layout snapshot). 7 Crossref lines may lack IUCN's errata/amended note (another DOI for the taxon shares their assessment date): 121097935/259045437, 18597/166485696, 18711/244867206, 18732/276948980, 219/259025524, 7709/155088836, 9017/217759270; still the right assessment id and DOI. Owner can check these 11 on the live pages. 06's CITES date (step 8) not checkable: its snapshot is the old layout. `accessed` stays the first-cited date. Tools: `$STATE/tools/iucn_wayback.py` (73 CDX/snapshot requests, 5 s apart, 0 429s, one 520 left to Crossref), `iucn_crossref.py`, `iucn_cite.py`.
- 2026-11-08 (step 13): Literature: 14 DOIs via doi.org APA, plus PMC4814056 via PMC idconv → `10.1371/journal.pone.0151114` (the page's article). APA lines tidied, not reworded: `<i>` markup and Crossref's " Portico." deposit note removed, Zootaxa's all-caps authors set in normal case, DOI case as cited. Page `license` from each DOI's Crossref `license` entry with content-version `vor` (publisher deposit, read as "the page states it"): CC BY 4.0 on 6 (ece3.5257, ecy.4470, s10531-023-02728-2, cub.2025.04.019, fphys.2020.00637 (the Frontiers one), pone.0151114), CC BY 3.0 on zookeys.255.3774; Wiley/Elsevier/Springer/RS terms-only links get none. 33 by hand: the page's own suggested citation where it has one (USGS NAS "Citation Information", both TFTSG accounts, 3 SDZWA fact sheets' "How to cite"), minus its access date and the URL the entry already links; else `<Author>. <Year>. <Title>. <Publisher>.` when bylined (news, 2 NGO posts), else §1's `<Publisher>. <Year>. <Title>.`, "n.d." without a date (3 SDZ animal pages, NatGeo Kids, whose `published_time` is the render date). Author-first is a small change to §1's form: the byline is the credit a news story asks for. Page licence: qld.gov.au states `DCTERMS.license` CC BY 4.0; no other page does (USGS's public-domain note covers its images only). Fetch: 33 pages direct, 2 s apart; 5 blocked (Cloudflare 403 or timeout: canada.ca, worldwildlife.org, detsi.qld.gov.au, smithsonianmag.com, science.org) read from their newest Wayback snapshot (CDX, 6 s apart, 0 429s); The Guardian blocks both, so its headline, byline and date came from its public `api.nextgen.guardianapps.co.uk/<path>.json`. smithsonian/britannica keep `{name}`. Tools: `$STATE/tools/pages_fetch.sh`, `pages_wayback.py`, `pages_meta.py`, `pages_grep.py`, `step13_cites.mjs`.
- 2026-11-08 (step 14): Sources entries number themselves inside the entry (`<ol class=list-none>` + a `n.` span) instead of `list-decimal`: the focus highlight then covers the number, and a global `:focus` outline needed `outline-none!` (both seen in a manual look on a dev server). Entry link text = the page's host (`en.wikipedia.org`), not the full URL (long URLs wrap badly at 390 px). `RoundEndSheet` renders only once `pool` is loaded (`session && pool && …`), so `citations` is never a fallback. The 04-round-*-end screenshots stop above the field notes; step 16's `10-sources-*` shots cover them. Live rows don't have this branch's AmphibiaWeb facts yet (owner's content build), so the hairy frog card shows Wikipedia + IUCN only.

## Log

- 2026-11-08 00:05 UTC: Baseline. typecheck, lint, test (48/48), content check pass; e2e:fresh 1526/1527 (pre-existing sparkle check fails at round 3 move 10, deterministic).
- 2026-11-08 00:40 UTC: Architecture. `architect` wrote findings + design: citation templates in `sources.json` + new `citations.json` joined at read time (no schema change), shared `FactsWithSources` UI, sparkle E2E failure = reveal clear-timer race in `AnimalGame.tsx` (one-line fix), Wayback via CDX (availability API 429). Plan-only, no checks needed.
- 2026-11-08 01:00 UTC: Fable review. APPROVE_WITH_CHANGES, 2 MUST-FIX (non-AmphibiaWeb/Wikipedia cite = warning not error; settle ADW licence CC BY-NC-SA 3.0) + stale-pool tolerance note. Plan-only, no checks needed.

- 2026-11-08 00:33 UTC: Astra review. APPROVE_WITH_CHANGES, 3 MUST-FIX (stale cached pool without `citations`; page-level licence overrides; StatusTicker/NotesList post-round coverage). Plan-only, no checks needed.
- 2026-11-08 00:41 UTC: Revision. `architect` resolved 5 MUST-FIX + Fable MISSED: cite errors only AmphibiaWeb/Wikipedia (others warn); ADW CC BY-NC-SA 3.0 (terms at /about/use_conditions/); absent `citations` → `{}` in pool loader; page-level licence override; hide StatusTicker facts/NotesList during review. Plan-only, no checks needed.
- 2026-11-08 00:52 UTC: Steps. `planner` wrote 18 steps, Verification, Failure modes F1-F18, risks. Plan-only, no checks needed.
- 2026-11-08 01:04 UTC: Step 1. Sparkle fix: reveal clear-timer only clears the set it was armed for (`AnimalGame.tsx:216`). typecheck, lint, test pass; e2e:fresh 1527/1527 (round 3 move 10 sparkle check now ok). Artifact `$STATE/e2e-s1/`; baseline kept as `baseline-report.json`.
- 2026-11-08 01:10 UTC: Step 2. IDs: 4 profile + 11 Wikidata P5036 (all 15 agree). 15/15 snapshots via CDX (newest 2024-12 to 2026-03), 30 requests + 2 for data-use page, 0 429s, no no-snapshot species. `index.json` 15 entries, every `citeLine` in its `.txt` (grep -F 15/15). Research skeleton `docs/research/2026-11-07-amphibiaweb-wayback.md`. typecheck, lint pass.
- 2026-11-08 01:35 UTC: Step 3. `src/clueGame/citations.ts` (`renderCitation`, `formatDay`, `FULL_CITATION_KEYS`), tests F1-F10 first (failed on the missing module); `citeAs` on all 16 sources, `license` on amphibiaweb (CC BY-NC 4.0), adw, wikipedia; `load()` picks the six `content_sources` columns (without it the scratch build fails: `column "citeas" … does not exist`). `$STATE/tools/scratch-check.sh`: build 76 species / 2430 clues / 437 facts, check 0 errors 0 warnings, DB dropped. typecheck, lint pass; test 58/58.
- 2026-11-08 02:05 UTC: Step 4. Tests F11-F15 first (failed: no `checkCitations`). `pageUrl` used by `checkProfile` + both row builders (rows dump `cmp` equal before/after); `checkCitations` beside `checkProfile`; `db/content/citations.json` 250 entries = 250 distinct clue/fact pages (adw 65, iucn 74, wikipedia 53, literature 15, news 10, ngo 8, government 7, smithsonian 6, sdzwa 6, amphibiaweb 4, tftsg 2); `src/lib/contentCitations.ts` used by content.ts, contentPool.ts, balance bot. preview: 0 PROBLEM, 823 `cite warn` (187 pages: adw, iucn, literature, news, ngo, government, sdzwa, tftsg; steps 11-13). scratch-check: build ok (823 citation warnings), check 0 errors. typecheck, lint pass; test 63/63.
- 2026-11-08 01:33 UTC: Step 5. Tests F16-F18 first (failed). Pool join: `poolFromRows(rows, { registry, pages })` adds `citations` (DB query selects `source_key`); `validatePool` errors on a fact or hand-written clue without a source page or citation; client loader normalizes an old cached pool to `citations: {}`. test 66/66, typecheck, lint pass; live `content -- check` 0 errors 0 warnings; scratch-check build ok, 0 errors; `npm run build` ok, citations bundled in `.next/server`; e2e:fresh 1527/1527. Artifact `$STATE/e2e-s5/` (e2e-s1 deleted).
- 2026-11-08 02:20 UTC: Step 6 (B1). Balance bot before edits (`$STATE/balance-before-b1.txt`): careful found 98%/97%, 3★ 74%/55% (africa/asia). 05: filled none (lifespan, activity, young, social not in account); 3 existing AW values found; +1 clue, +3 facts. 07: filled none (size length-only, rest absent); covering, birth + 4 clues re-sourced Wikipedia→AW; +2 clues, +2 facts. 14: filled size tiny, diet insects; +2 clues (one `webbed_feet`), +3 facts. Trees: 05 yes, 07 no record, 14 no. `check_quotes.py` 36 quotes 0 misses (tested on a planted miss); preview 0 PROBLEM, 823 cite warn (unchanged); scratch build 2437 clues / 445 facts, check 0 errors; typecheck, lint pass; test 66/66.

- 2026-11-08 02:45 UTC: Step 7 (B2). 16: filled young many; diet re-sourced Wikipedia→AW; 2 existing AW values found; 1917 fact rewritten (AW 1918); +3 clues, +4 facts. 10: filled none (size, activity, social absent); USGS clue + fact re-sourced to AW; +3 clues (one `webbed_feet`), +3 facts. 13: filled none (activity, social absent); +2 clues, +3 facts. Trees: 16 no, 10 no, 13 no record. `check_quotes.py` 91 quotes 0 misses; preview 0 PROBLEM, 821 cite warn (2 USGS lines now AW); scratch build 2446 clues / 455 facts, check 0 errors; typecheck, lint pass; test 66/66.

- 2026-11-08 03:20 UTC: Step 8 (B3). 08: filled none (young, social absent); +2 clues, +4 facts. 06: filled none (social unsettled); 3 existing AW values found; +3 clues (one `vertical_pupils`), +4 facts. 09: filled young few; +4 clues, +4 facts. Trees: 08 no, 06 yes, 09 no (ground; climbs to 5 m). Poison-frog inseparable test moved to Saola/orangutan (Decisions). `check_quotes.py` 145 quotes 0 misses; preview 0 PROBLEM, 821 cite warn; scratch build 2456 clues / 467 facts, check 0 errors; typecheck, lint pass; test 66/66.

- 2026-11-08 03:50 UTC: Step 9 (B4). 11: filled none (no no-records); +3 clues (one `egg_guarding`), +4 facts. 76: filled none (no no-records); size note + poison fact Wikipedia→AW, geography clue re-sourced; +2 clues (one `striped_young`), +4 facts. 03: filled none (no no-records); 4 existing AW values checked, 3 found, "damp" dropped from the 4th; +2 clues, +4 facts. Trees: 11 no, 76 no, 03 no. `check_quotes.py` 210 quotes 0 misses; preview 0 PROBLEM, 821 cite warn; scratch build 2463 clues / 479 facts, check 0 errors; typecheck, lint pass; test 66/66.

- 2026-11-08 04:25 UTC: Step 10 (B5). 62: filled none (no no-records); +3 clues, +4 facts. 74: filled none; name, banknote, census facts Wikipedia→AW; +3 clues (one `ambush_hunter`), +4 facts. 75: filled none; +3 clues (one `paddle_tail`), +4 facts. Trees: 62 no, 74 no, 75 no; research file now covers all 15 (all had snapshots). `check_quotes.py` whole file 274 quotes 0 misses; preview 0 PROBLEM, 821 cite warn; scratch build 2472 clues / 491 facts, check 0 errors; typecheck, lint pass; test 66/66; balance unchanged by B5, vs step 6 flat or better (Decisions; `$STATE/balance-after-b5.txt`).
- 2026-11-08 02:11 UTC: Step 11. ADW licence unchanged (CC BY-NC-SA 3.0). 65/65 account pages fetched (`$STATE/adw/`, 66 requests incl. use conditions, 2 s apart, all 200); 65 `cite` lines into `citations.json`. preview 0 PROBLEM, 395 cite warn (0 adw; iucn 307, rest literature/news/ngo/sdzwa/government/tftsg); scratch build 2472 clues / 491 facts, check 0 errors; typecheck, lint pass; test 66/66.
- 2026-11-08 02:34 UTC: Step 12. 74/74 IUCN `cite` lines (14 Wayback page line, 56 Crossref DOI record, 4 whole-Red-List fallback; Decisions). preview 0 PROBLEM, 88 cite warn (0 iucn; rest literature/news/ngo/government/sdzwa/tftsg); scratch build 2472 clues / 491 facts, check 0 errors; typecheck, lint pass; test 66/66.
- 2026-11-08 02:44 UTC: Step 13. 48 `cite` lines (15 literature, 33 by hand) and 8 page licences into `citations.json` (Decisions). preview 0 PROBLEM, 0 cite warn; scratch build 2472 clues / 491 facts, 0 citation warnings, check 0 errors 0 warnings; typecheck, lint pass; test 66/66.
- 2026-11-08 03:12 UTC: Step 14. `numberSources` (per page, 1..n first use) in `citations.ts`; new `FactsWithSources` (marks, closed `<details>` Sources, click/Enter opens + focuses entry); round-end card uses it with `pool.citations`. Manual look (dev server, seed 7 hairy frog): marks 1/2 repeat per page, 2 entries, mark click opens Sources and focuses entry 2. typecheck, lint pass; test 66/66; e2e:fresh 1527/1527, artifact `$STATE/e2e-s14/` (e2e-s5 deleted).

## Summary
