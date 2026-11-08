# 056: Farms & towns constants removed

Mission `ft-cleanup` (state: `plans/2026-11-08-ft-cleanup.md`). Follows 055, which dropped Farms & towns (`artificial`) from content but kept its constants so the live game wouldn't misread old rows (`isHandWrittenClue`) before the production content build.

## What went
- `src/clueGame/traits.ts`: `'artificial'` from `HABITAT_CLASSES` (so from `COMPLETE_PREFIXES`).
- `src/clueGame/questionMatch.ts`: its `QUESTION_TEXT`, `SHORT_TEXT`, `COLUMN_LABEL` entries.
- `src/clueGame/clueFaces.ts`: its 🏡 face (free again).
- `src/clueGame/profiles.ts`: the `HABITAT_TEXT` class line and the 7 `artificial:` kind lines.
- Docs: `CLUE_MATCH.md` drops "no longer asked"; `CONTENT_SOURCES.md` keeps the skip rule, now "the content check rejects it as an unknown habitat".

## Why now
Owner's production content build for 055 (handoff H10, 2026-11-08, main `36dc1a5d`): the live gate (`habitat:artificial` or `artificial:%` in `species_deduction_clues.compare_tags`) = 0 of 2478 clue rows.

## No version bump
`ANIMAL_RULES.version` stays `055-0`: the constants only described a tag no animal holds, so every deal, answer and score is the same (e2e `rounds` at seed 7 match the baseline). A bump would only drop saved games. A saved round dealt with `habitat:artificial` already fails `roundStillFits` and is re-dealt.

## Side effect
A hand-written clue tag `artificial:<kind>` is no longer "reserved" (`profiles.ts` reserved check reads `COMPLETE_PREFIXES`). It isn't askable (no `PREFIX_CATEGORY`); the `CONTENT_SOURCES.md` rule and the unknown-habitat check cover authors.

## Left as is (not dead)
`tests/clueGame/animalBoard.test.ts` comment "since Farms & towns left 54" (history); `signs.ts` `town_dweller` (a content sign); `traits.ts` comment "IUCN habitat classes (level 1)".

## Verification
Static: typecheck, lint, `npm test` 66/66; `rg artificial src db/content` empty; content preview identical to before, 0 PROBLEM. E2E (dev copy `phaser_june_dev`, seed 7, Africa): 1565/1565 checks, 0 console errors, rounds identical to baseline (S2 and final run).
