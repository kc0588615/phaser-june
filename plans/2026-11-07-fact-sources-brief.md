# Build brief: numbered sources on facts (Critter Connect)

Owner, 2026-11-07 (chat in WSL). Each fact a player reads after a round gets a small number that names its source, with a collapsible **Sources** list below, so every fact is credited the way its source asks (AmphibiaWeb's CC BY-NC terms first, and the rest) without cluttering the card.

**For the control room:** save the brief below (from `# Mission brief` to the end) as `/srv/critter-ai/agent-state/missions/briefs/2026-11-07-fact-sources.md`, with the **Owner's picks** block pasted at its top, edited to the owner's answers. Then `mission start critter-connect <file>`.

## Owner's picks

Defaults are the WSL session's recommendations; change a line before starting.

```
Where:            after the round only (round-end card, Field Journal page)   # or: also numbers in the field guide during play, links locked until the round ends
Numbering:        one number per source, repeated on every line it backs (owner, 2026-11-07)
Sources:          all sources now (IUCN, ADW, Wikipedia etc. are owed credit already), not only AmphibiaWeb
AmphibiaWeb data: no new AmphibiaWeb facts; access email sent 2026-11-07, waiting on their reply. Cite the 12 existing AmphibiaWeb facts.
Order vs moves-and-signs-build: run this one first   # both touch AnimalSheets.tsx; never at the same time
```

---

# Mission brief: numbered sources on facts (Critter Connect)

## Goal

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

## Why

The facts carry a source today (`source_name`, `source_url` reach the client, `src/clueGame/pool.ts:59-60`, `:80`, `:85`), but the live animal board never shows them: only photo credits (`PhotoCredit` in `AnimalSheets.tsx`, `JournalSheet.tsx`). `SourceLine` in `src/components/clueGame/LogEntryText.tsx` belongs to the old clue game. AmphibiaWeb's text is CC BY-NC and asks for a citation; Wikipedia's is CC BY-SA; IUCN and ADW ask for citations too. Content uses: adw 797, iucn 392, wikipedia 198, smithsonian 35, ngo 32, literature 23, sdzwa 19, tftsg 16, news 16, government 12, amphibiaweb 12, britannica 9 (`"source"` keys in `db/content/animals/*.json` at `2b2838b2`).

## Scope

In:
- Round-end card (`RoundEndSheet` in `src/components/animalBoard/AnimalSheets.tsx`): field notes and any facts it shows.
- Field Journal page (`src/components/clueGame/JournalSheet.tsx`; `keyFacts` drops the source today, keep it).
- Wherever else facts show after a round, if the mission finds one.
- Citation data: `db/content/sources.json` (a citation template per source key) and what each profile needs (author/year for per-species accounts like AmphibiaWeb and ADW, date accessed), through the content pipeline (`npm run content`), with `npm run content -- check` failing on an AmphibiaWeb or Wikipedia fact without a full citation.
- `docs/CONTENT_SOURCES.md`: how to record a citation.
- E2E checks.

Out:
- During play, unless the owner's pick says otherwise: a source page names the animal (plan 041), and the pencil bonus (plan 054) rewards knowing hidden answers.
- New AmphibiaWeb facts or scraping (waiting on their reply; no Wayback copies).
- Rules, scoring, board, globe, website.

## Definition of done

- Every fact line in scope shows its source's number; the numbers and the list match (each number has one entry, each entry is used).
- E2E (`scripts/e2e.mjs`): after a round, the card's and the journal's numbers resolve to entries; tapping one opens Sources and focuses its entry; closed by default; an AmphibiaWeb-sourced animal shows the CC BY-NC citation. Screenshots closed and open, light and dark, in the mission's state folder.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run e2e:fresh` pass on the final commit.
- **Release:** merge, deploy, check live (`version.txt` shows the merge commit). If content changed, the owner runs the prod content build (`npm run content -- build`, owner only, from WSL); say so in the Summary.

## Decision rules

- Simplest data shape that cites correctly. Prefer deriving the citation from `sources.json` templates + species + `source_url` + a date; add per-profile fields only where a source needs per-species authors. A DB schema change needs a fresh dump first (`deploy/backup/pg-backup.sh`) and `db/schema.sql` updated; say why in the plan.
- Use each source's own published citation guidance (AmphibiaWeb: "AmphibiaWeb. <year>. <https://amphibiaweb.org> University of California, Berkeley, CA, USA. Accessed <date>.", and the species page's own citation line). Record where each format came from.
- A source the mission can't reach from the VPS (AmphibiaWeb times out there): use the format above, don't fetch.
- Never hand-edit content rows.

## Notes

- Work from the newest `origin/main` (`git fetch origin --prune`; rebase before the PR).
- `moves-and-signs-build` (not started; waiting on the owner's picks) also edits `AnimalSheets.tsx` (sign chips, guide headings). Don't run both at once.
- Checked in WSL on `origin/main` at `2b2838b2`.
