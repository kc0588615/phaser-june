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
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

From `2a725a40` (origin/main `35baf89b` + plan), 2026-11-07, DB = live `phaser_june` (`.env.local`).

- `npm ci`: ok. `npm run typecheck`: pass. `npm run lint`: pass. `npm test`: 48/48 pass.
- `npm run content -- check`: 0 errors, 0 warnings (76 playable species, 2430 clues, 437 facts).
- `npm run e2e:fresh`: **1526/1527**, one check fails, same on two runs (deterministic, seed 7): `round 3 move 10: a right guess just scouted sparkles` (`{"sparkling":[],"calledNow":["57:region:southern-africa"]}`; round 3 Golden-rumped Sengi; check at `scripts/e2e.mjs:1403`). Pre-existing on main, not this mission's code; the final Verification needs `e2e:fresh` green, so the plan must fix or settle it (cause unknown yet: test timing vs the sparkle UI vs current live content).
- Needs `CHROME_PATH=/srv/critter-ai/agent-state/missions/fact-sources/bin/chrome` (wrapper adding `--no-sandbox`; `/usr/bin/google-chrome` absent), as in clue-audit.
- Artifact: `/srv/critter-ai/agent-state/missions/fact-sources/baseline-e2e/` (report.json, screenshots, `e2e.log`, `COMMAND.txt`).

## Architecture

Read at `20b697d1` (origin/main `35baf89b` + plan). Wayback tested from the VPS 2026-11-08 (§4).

### Findings (by impact)

1. **No source shows after a round.** Round-end field notes (`src/components/animalBoard/AnimalSheets.tsx:535`, list `:635-642`) render `note.full ?? note.text` only, though every `FieldNote` carries `source` (`src/clueGame/questionMatch.ts:36`, built `questionMatchContent.ts:128-135`). Journal: `keyFacts` (`src/clueGame/pool.ts:101-106`) returns `string[]`, dropping `fact.source`; `JournalSheet.tsx:69-71` shows bare text. No other post-round fact surface: the field guide can't open while reviewing (`AnimalGame.tsx:474`, `onGuide={reviewing ? undefined : …}`), ticker and witness notes are during play, the globe shows no facts, the website is out. Fix: §3.
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

- **`db/content/sources.json`**: every entry gains `citeAs` (a template). Entries whose source has a licence also gain `license`. Placeholders: `{name}` (the registry name), `{cite}` (the page's line), `{title}` (the URL's last path segment, decoded, with `_` turned into spaces; Wikipedia only) and `{accessed}` (formatted `8 Nov 2026`). A placeholder the page lacks counts as a missing field; an unknown placeholder is an error.
- **New `db/content/citations.json`**: `{ "<page url>": { accessed, cite?, archive? } }`, with one entry per page that a profile's clue or fact cites. Traits are left out (they show only in the field guide during play), and so is iucn_range, as today. Keys are the exact URL the build writes to `source_url` (`pageUrl`). It is one global file because a citation belongs to its page: pages are shared across animals, override URLs need a home, and the server bundles one file instead of 76.
  - `accessed` (`YYYY-MM-DD`): the day the page, or its archived copy, was read for this content. For existing pages, use the date the URL first entered `db/content/animals/` (`git log --reverse --format=%as -S<url>`), set by a one-off script kept in the state folder. For new pages, use the day read.
  - `cite`: the page's own published citation line, verbatim, without its trailing "Accessed …" (the template adds ours).
  - `archive`: `https://web.archive.org/web/<14-digit ts>/<url>` (the viewer URL). Its date is parsed from the timestamp, and a bad format is an error.
- **Templates and where each form comes from.** Record each guidance URL in `docs/CONTENT_SOURCES.md`.

| key | `citeAs` | `cite` comes from | `license` |
|---|---|---|---|
| amphibiaweb | `{cite} Accessed {accessed}.` | the species page's "Citation:" line on the snapshot (site form: brief) | CC BY-NC, version from the snapshot footer |
| iucn | `{cite} Accessed on {accessed}.` | the assessment's "Citation" on the staging details page (CONTENT_SOURCES "Research access"); IUCN "How to cite" | none |
| adw | `{cite} Accessed {accessed}.` | the account's "To cite this page:" block (curl works) | look up ADW's terms |
| wikipedia | `"{title}." Wikipedia, The Free Encyclopedia. Accessed {accessed}.` | Wikipedia:Citing Wikipedia; Wikipedia:Reusing Wikipedia content | CC BY-SA 4.0 |
| literature | `{cite}` | `curl -LH 'Accept: text/x-bibliography; style=apa' https://doi.org/<doi>` | none |
| tftsg, sdzwa | `{cite} Accessed {accessed}.` | the account's suggested citation; the fact sheet's "How to cite" | none |
| news, ngo, government | `{cite} Accessed {accessed}.` | `<Publisher>. <Year>. <Title>.` from the page (the registry names are generic) | none |
| smithsonian and unused keys | `{name}. Accessed {accessed}.` | none | none |

- **Code.**
  - `src/clueGame/citations.ts` (pure, new):
    - types `CitedPage` and `Citation { text; url; license: string | null; archive: { url; date } | null }`;
    - `renderCitation(source, url, page)` returns `{ citation } | { missing: string[] }`;
    - `formatDay(iso)` uses a fixed month list, no `toLocale*`;
    - `numberSources` (§3).
  - `src/lib/contentCitations.ts` (new) imports both JSON files, typed. JSON imports are bundled by Next and esbuild, and the run image has no `db/` folder (`Dockerfile:29-38`). It is used by `buildCluePool`, `content.ts` and the tests, which drop their own `sources.json` reads.
- **Checks.** Both fail on an AmphibiaWeb or Wikipedia line without a full citation, and on any other source.
  - `checkProfile(profile, registry, pages)` (`profiles.ts:305`, run by `preview`, `build` and `npm test`): for each clue and fact page, `renderCitation` must miss nothing. Example problem: `facts[4]: no full amphibiaweb citation for <url> (missing cite)`.
  - `validatePool` (`content -- check` on the live DB): each fact and hand-written clue (`isHandWrittenClue`) that has a `source` needs `pool.citations[source.url]`. On live, this proves `citations.json` covers every live row.
- **Reworded:** no flag. Every line is rewritten for grades 6 to 12 (CONTENT_SOURCES copy rule), so every entry ends with "Reworded for this game."
- **If AmphibiaWeb grants access later:** same shape, with no `archive`.

**§2 Data flow**

Profiles and `citations.json` go through `content -- build`, whose rows (`source_key`, `source_url`) don't change, into the DB.

On read:
- `buildCluePool` (`src/lib/cluePool.ts:17`, `:20`) also selects `source_key` (`ContentRows` gains `source_key?`).
- It calls `poolFromRows(rows, { registry, pages })`, which adds `citations: Record<url, Citation>`: one entry for each distinct (key, url) among clue and fact rows that renders completely. That is about 260 pages, roughly 60 KB; text on every row would add about 0.5 MB.
- `PoolClue.source` and `PoolFact.source` stay `{ name, url }`, and the rules types (`Source`, `FieldNote`) don't change. The join is for display only, so saved sessions don't grow (`savedGame.ts:19`; witness notes hold `source`).
- `CluePool.citations` is required; the `tests/clueGame/testPool.ts` fixture gets `{}`.

On the client:
- `AnimalGame` passes `pool.citations` to `RoundEndSheet` as a new prop; `JournalSheet` already has `pool`.
- `keyFacts` returns `Array<{ text: string; source: Source | null }>`, de-duplicated by text with the first source kept.

When it goes live: citations for existing rows ship with the deploy. The new AmphibiaWeb rows reach players only after the owner's prod content build, and their pages are already in the deployed `citations.json`. No existing URL may change in this mission, or that live row would lose its citation until the build. The live `check` catches it.

**§3 UI**

- **`numberSources(sources) → { marks: Array<number | null>; list: Source[] }`** (in `citations.ts`): a source's identity is its `url`, or its `name` if it has no URL. That gives one number per cited page (two Wikipedia articles are two sources), numbered 1..n in order of first use.
- **`src/components/clueGame/FactsWithSources.tsx`**: takes `{ facts: Array<{ key; text: ReactNode; source }>; citations; className?; itemClassName? }`. It renders the `<ul>` of lines and, below it, a closed `<details><summary>Sources (n)</summary><ol>…`. This is the same native disclosure as the journal's "Words you've learned" (`JournalSheet.tsx:81-91`).
  - **Mark:** `<sup class="text-xxs text-neutral-7 leading-[0]">` (the zero line-height avoids layout shift) wrapping `<a href="#<id>-<n>" aria-label="Source <n>">`. A transparent `after:` box enlarges the tap area without moving layout (inline targets are exempt from WCAG 2.5.8 anyway).
  - **Click or Enter on a mark:** call `preventDefault` (no hash, no page scroll), open the `<details>`, then `entry.focus({ preventScroll: true })` and `scrollIntoView({ block: 'nearest' })`. This is plain DOM work, with no React state.
  - **Entry:** `<li id tabIndex={-1}>`, text-xxs, neutral-8, with a `focus:` highlight in cc tokens; that is "highlights its entry". It shows the citation text, a link to the page, an "archived copy of 12 Mar 2026" link when there is one, `License: …`, and "Reworded for this game." Without a citation it shows the source name and link. Links open in a new tab with `rel=noopener noreferrer` (PhotoCredit pattern). The id prefix comes from `useId()`, because the journal holds many lists. Copy uses US spelling, like "color".
- **RoundEndSheet:** the component replaces `AnimalSheets.tsx:635-642`, and its bullets become `list-disc marker:text-neutral-6`.
- **JournalSheet:** the component replaces `:69-71`.

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
- **AmphibiaWeb, data-driven:**
  - From `/api/clue-game/pool/`, the candidates are species with a field note whose `citations[url].license` starts with `CC BY-NC`. FAIL if there are none.
  - Take the continent with the most candidates and probe `?seed=1..40&place=`. Clear `sessionStorage` `cc:explore:game` and localStorage first, then read `__cc.clue().mysteryId`, with no moves and no waiting for the board, until a candidate is the mystery.
  - Name it right, reusing the pencil-bonus flow.
  - On the card, assert an entry containing "AmphibiaWeb", "CC BY-NC" and "Reworded for this game.". Record the seed in the report.
  - This works on live now, on the dev copy in CI, and after the owner's build.
- **Screenshots** of that card: `10-sources-closed-light.png`, `10-sources-open-light.png` and the same two in dark (set `data-theme` and the theme key, restore afterwards), plus `11-journal-sources-open.png`. The final run is copied to `/srv/critter-ai/agent-state/missions/fact-sources/final-e2e/` with `COMMAND.txt`.
- **Budget:** the E2E takes about 10 min locally, and the CI e2e job times out at 15 (`.github/workflows/ci.yml`). Measure the probe; it must stay cheap.

**§7 Order and risks**

Order:
1. Sparkle fix.
2. Wayback batch A.
3. Batches B1 to B5.
4. Citation data for all 261 pages: the accessed-date script; ADW lines by curl; IUCN lines in staging batches of 7; DOIs; about 33 pages by hand.
5. `citations.ts`, the templates, both checks, the `load()` pick and the pool join.
6. UI: component, card, journal, dead code.
7. E2E.
8. Docs: `CONTENT_SOURCES.md` (how to record a citation; the Wayback route as a stopgap), the content line in `AGENTS.md`, and the pool shape in `docs/CLUE_MATCH.md` if it is documented there.
9. Verification.

Risks:
- **Prod content build** (Finding 4). Prove it on a scratch DB on the VPS's PostgreSQL 16:
  1. `createdb`;
  2. apply the DDL of the four content tables from `db/schema.sql` (they need no PostGIS);
  3. run `DATABASE_URL=postgres:///<scratch> npm run content -- build`, then `-- check` (dotenv doesn't override a `DATABASE_URL` that is already set, `connect.ts:8`);
  4. `dropdb`.

  This also proves the new content checks clean in a real DB, and it never touches live. Run `content -- check` on live too (read-only).
- **CI dev copy.** The AmphibiaWeb E2E check needs an AmphibiaWeb-cited note in `phaser_june_dev`. Before the E2E step, count those rows read-only using the dev-copy env file, without echoing its URL. If there are none, build this branch's content into the dev copy (as moves-and-signs-build does) and record it under Decisions.
- **IUCN lines** depend on the staging pages (parallel-search `web_fetch`). If those are unreachable, fall back to IUCN's own citation for the Red List as a whole (`IUCN. <year>. The IUCN Red List of Threatened Species. Version <v>. https://www.iucnredlist.org.`) plus the species link, and record it under Decisions.
- **Wayback 429s:** handled as in §4.
- **moves-and-signs-build overlap.** It also edits `AnimalSheets.tsx` (signs and guide headings in SuspectSheet), `profiles.ts` and `traits.ts`. This mission touches only RoundEndSheet's notes block, its props and one import in `AnimalSheets.tsx`, plus `checkProfile`'s signature and `pageUrl` in `profiles.ts`. New open tags are listed under Decisions. Don't add its `trees` question here; the research file hands it the trees data.

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

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-08 00:05 UTC: Baseline. typecheck, lint, test (48/48), content check pass; e2e:fresh 1526/1527 (pre-existing sparkle check fails at round 3 move 10, deterministic).
- 2026-11-08 00:40 UTC: Architecture. `architect` wrote findings + design: citation templates in `sources.json` + new `citations.json` joined at read time (no schema change), shared `FactsWithSources` UI, sparkle E2E failure = reveal clear-timer race in `AnimalGame.tsx` (one-line fix), Wayback via CDX (availability API 429). Plan-only, no checks needed.

## Summary
