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

- [ ] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

## Architecture

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

## Summary
