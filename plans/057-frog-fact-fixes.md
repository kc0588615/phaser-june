# 057: Two frog clue fixes

Mission `frog-fact-fixes` (state: `plans/2026-11-08-frog-fact-fixes.md`). Follows the fact-sources mission (`plans/2026-11-07-fact-sources.md`, Decisions steps 8 and 9), which flagged two hand-written clues their sources contradict. Owner checked both, 2026-11-08.

## What changed
- `06-red-eyed-tree-frog.json` conservation clue: "since 2008" -> "since 2010 (CITES Appendix II)"; source `iucn` -> `amphibiaweb`.
- `11-goliath-frog.json` behavior clue: "It has no vocal sac, so it can't croak. …" -> owner's line "It has no vocal sac, but it still calls: whistles, chirps, even a deep roar, made with its mouth open."; source `adw` -> `amphibiaweb`; `voiceless` tag dropped (stays on 08, which has no call).
- Research record: `sign-map.csv` `voiceless` row (holders 8 only, misleads note); `2026-11-07-amphibiaweb-wayback.md` both Disagreement bullets marked resolved.

## Why
A clue must be true and agree with the facts shown after the round. 11's old clue contradicted its own AmphibiaWeb fact (a mating call up to 1.5 min), and `voiceless` linked 11 with 08 as a false shared sign.

## Sources
- AW 616 states Appendix II from 21 March 2010 (owner confirmed on the CITES Checklist). AW 4691: "Despite previous assertions that adults do not call … brief whistles, chirping, and even a “sighing deep roar”". Quotes are in the research note.
- Both AW pages are the profiles' own `sources.amphibiaweb`, already in `citations.json`: no new entry.
- "No vocal sac" is ADW's ("Goliath frogs do not have vocal sacs"); true and uncontested, kept in the owner's line. One source per clue, so the clue cites AW for its claim (it calls).

## No version bump
`ANIMAL_RULES.version` stays `055-0`. Deals read only prefixed traits, which are unchanged, so every deal, answer and score is the same. The tag only reaches witness notes; a saved round whose notes differ fails `roundStillFits` and is re-dealt. A bump would only drop saved games. 08's `voiceless` now has one holder, so it's never dealt as a witness note (needs ≥2 fits); 11 still deduces in Habits (`rests_by_waterfalls` + traits).

## DB
No schema change. Prod needs `npm run content -- build` (handoff H11), which deletes and reloads every clue and fact, so a fresh production dump comes first. Counts unchanged: 2478 clues (2086 deductive, was 2087), 491 facts; rows 635 and 1127 change. Building before or after the deploy is safe (both AW pages already cited, `voiceless` still in SIGNS); "after the deploy" is the brief's preference.

## Verification
Static: typecheck, lint, `npm test` 66/66; `rg voiceless db/content/animals` = 08 only; quote check 274 quotes, 0 misses; content preview 0 PROBLEM, 0 cite warn, diff vs before = the two clue lines.
E2E (dev copy `phaser_june_dev`): `content -- build` 0 citation warnings; `content -- check` 76 playable, 2478 clues (2086 deductive), 491 facts, 0 errors; `e2e:fresh` seed 7 Africa 1565 checks (baseline 1565), 0 failed, 0 console errors, 0 failed requests; rounds same as baseline: true.
