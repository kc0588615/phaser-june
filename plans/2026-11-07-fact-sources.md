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
- [ ] Steps: `planner` writes Steps and Verification

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

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-08 00:05 UTC: Baseline. typecheck, lint, test (48/48), content check pass; e2e:fresh 1526/1527 (pre-existing sparkle check fails at round 3 move 10, deterministic).
- 2026-11-08 00:40 UTC: Architecture. `architect` wrote findings + design: citation templates in `sources.json` + new `citations.json` joined at read time (no schema change), shared `FactsWithSources` UI, sparkle E2E failure = reveal clear-timer race in `AnimalGame.tsx` (one-line fix), Wayback via CDX (availability API 429). Plan-only, no checks needed.
- 2026-11-08 01:00 UTC: Fable review. APPROVE_WITH_CHANGES, 2 MUST-FIX (non-AmphibiaWeb/Wikipedia cite = warning not error; settle ADW licence CC BY-NC-SA 3.0) + stale-pool tolerance note. Plan-only, no checks needed.

- 2026-11-08 00:33 UTC: Astra review. APPROVE_WITH_CHANGES, 3 MUST-FIX (stale cached pool without `citations`; page-level licence overrides; StatusTicker/NotesList post-round coverage). Plan-only, no checks needed.
- 2026-11-08 00:41 UTC: Revision. `architect` resolved 5 MUST-FIX + Fable MISSED: cite errors only AmphibiaWeb/Wikipedia (others warn); ADW CC BY-NC-SA 3.0 (terms at /about/use_conditions/); absent `citations` → `{}` in pool loader; page-level licence override; hide StatusTicker facts/NotesList during review. Plan-only, no checks needed.

## Summary
