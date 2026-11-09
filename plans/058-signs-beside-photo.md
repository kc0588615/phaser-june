# 058: Signs back beside the photo, grouped by category

Mission `signs-beside-photo` (state: `plans/2026-11-09-signs-beside-photo.md`). Follows 055 (`plans/055-moves-and-signs.md`), which moved the signs into the field guide's category rows.

## What changed
- Species sheet: the sign chips are back in the box beside the photo (`GuideSigns`, removed in PR #66, last at `447e9317`), now grouped by category in the guide's order (Body, Habits, Habitat, Range, Life cycle). Each group is one `CategoryMark` icon, then its chips. Empty groups don't show; no icon per chip.
- Auto-paging as before: measure once in a hidden list (`ResizeObserver`; the photo alone sets the row height), split into pages that turn every `SIGN_PAGE_MS` (5 s), counter `1/2` beside "Signs", tap to pause, pause mark (only when there are pages), a screen-reader list with one item per category (`Body: …`).
- Guide rows: lines only again (as before 055); a row whose lines are all hidden (plan 045) doesn't show.
- Everything else from 055 stays: signs never hidden, the reworded signs, category marks on headings, "Its answers" rows, question tiles and witness notes, `signProblems`.
- All product code is in `src/components/animalBoard/AnimalSheets.tsx` (`GuideSigns`, `SignGroups`, pure `signPages`). `CategoryMark.tsx` unchanged except its comment.

## Why
The owner wants the signs where players look first, with the paging that let long lists fit, keeping 055's category link but with one icon per category so the box stays readable.

## Decisions
- **Hanging layout:** each group is a row, the icon in its own column and its chips wrapping beside it, so a line never mixes categories and a page that starts mid-group just renders the icon again. The icon box is `h-(--line-xs)` (one chip line, 16 px): the split measures chip bottoms only, so the icon must never hang below them. Rejected: icons inline in a shared flow (a repeated icon re-wraps the continuation page, so pages no longer match the one measurement).
- **Keep-together rule (`signPages`):** the old one-pass line split, plus: when a page overflows inside a group that started on that page (not at its top) and fits a page whole, the whole group moves to the next page. A longer group breaks at a line end and its next page repeats its icon. Every run holds ≥ 1 chip, so no lone icon.
- **Measured cost:** at 390 px the box is 186 × 106 px (5 lines); 23 of 76 animals page. At 320 px more do; nothing overflows sideways (widest word fits the 98 px chips column).
- **E2E forced box 144 × 40 px** for the paging checks: gives 2 splits (animals 14, 41) and 1 whole-group move (13) on seed 7 round 1. A box narrower, never taller, is the fix if content changes break it.
- **Audit (one `graphical-audit` pass):** the pause button's keyboard focus ring was clipped by the box's `overflow-hidden`; fixed with an inward ring (`focus-visible:-outline-offset-2!`; `!` because the global `:focus-visible` rule is unlayered), with an e2e check and shot. Gaps unchanged (equal `xxs` within and between groups; the icon column marks group starts, and a bigger gap would cost a line of the box). Pre-existing, left alone: `MENU_ROW`'s inward ring also loses to the global rule (visible, not clipped).
- **Code review (Astra), keyboard:** the photo row's drag guard swallowed the pause button's keyboard clicks after any drag; it now swallows only pointer clicks (`event.detail > 0`), with an e2e check (real mouse drag, Tab, Space).
- Rejected: one group per page, a scrolling box, no auto-turn under reduced motion (the crossfade isn't movement; pause meets WCAG 2.2.2), a dev-bridge hook to inject signs, a unit test for `signPages` (E2E checks it on the real layout).

## No version bump
`ANIMAL_RULES.version` unchanged: no content, signs table, rules or deal logic changed; nothing a round deals differs.

## DB
None. No production content build needed.

## Verification
Static: `npm run typecheck`, `npm run lint`, `npm test` 66/66, `npm run content -- preview` same as before.
E2E (dev copy `phaser_june_dev`): `E2E_SEED=7 E2E_PLACE=continent:africa npm run e2e:fresh`. New checks: signs beside the photo grouped in category order, one icon per group, none in the guide rows (S1); every page fits (S2); forced-box paging, keep-together and repeat-icon breaks, auto-turn and pause (P1–P3); 320 px pages instead of overflowing (S3); one-page 02d sheet; paging sheet found and shot; pause focus ring inside the box; keyboard pause after a photo-row drag. Rounds equal the baseline.
Final: 1573/1573 checks, 0 failed, rounds = baseline (Hairy Frog found, Hirola lost, Golden-rumped Sengi found, African Forest Elephant found); artifact `/srv/critter-ai/agent-state/missions/signs-beside-photo/final-e2e/report.json`.

Shots (390×844 light/dark unless noted), `/srv/critter-ai/agent-state/missions/signs-beside-photo/shots/`: `02d-field-guide-*` (one page), `02e-field-guide-rows-*` (rows, no chips), `02f-signs-page-{1,2}-*` (paging, round 2 Chimpanzee), `02g-signs-desktop.png` (1280×800), `02h-signs-focus.png`. Audit: `…/signs-beside-photo/audit.md`.
