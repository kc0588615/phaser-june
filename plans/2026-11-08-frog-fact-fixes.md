---
mission: frog-fact-fixes
project: critter-connect
branch: agent/frog-fact-fixes
status: active
started: 2026-11-08 23:09 UTC
---

# Mission: Two frog content fixes (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Two hand-written clues that the fact-sources mission flagged (plan `plans/2026-11-07-fact-sources.md`, Decisions, steps 8 and 9) say what their sources now show is wrong. The owner checked both and wants them fixed (2026-11-08):

1. **Red-eyed tree frog, CITES year** (`db/content/animals/06-red-eyed-tree-frog.json`, the `conservation` clue "Its international trade has been controlled since 2008 (CITES Appendix II)", source `iucn`). The owner checked the CITES Checklist (https://checklist.cites.org, *Agalychnis callidryas*): Appendix II listing starts in **2010**. AmphibiaWeb says Appendix II from 21 March 2010. Make it "since 2010", re-sourced to a page that states 2010 (AmphibiaWeb's page for 06, which the profile already cites, or the CITES Checklist with its own `citations.json` entry).
2. **Goliath frog, "can't croak"** (`db/content/animals/11-goliath-frog.json`, `behavior` clue "It has no vocal sac, so it can't croak. Males whistle with their mouths open instead.", tag `voiceless`, source `adw`). AmphibiaWeb says the old no-call claims were wrong, and the same profile already has the AmphibiaWeb fact about its long mating call, so the game contradicts itself. Owner's wording: **"It has no vocal sac, but it still calls: whistles, chirps, even a deep roar, made with its mouth open."** Source `amphibiaweb`, with the quotes in `docs/research/2026-11-07-amphibiaweb-wayback.md` (section "11 Goliath Frog", Disagreements). **Drop the `voiceless` tag from 11**; it stays on 08, which truly has no call.

### Why

A clue players read must be true and agree with the facts shown after the round. `voiceless` also grouped 11 with 08 as a shared sign, which taught a false link.

### Scope

In:
- The two animal files; `db/content/citations.json` only if a new page is cited; the two research notes (mark the disagreements resolved); `docs/research/2026-11-07-moves-and-signs/sign-map.csv` if a tag's holders are listed there; a short plan `plans/057-frog-fact-fixes.md` (or the next free number).
- Small wording polish of the Goliath line is fine if the quote check needs it; keep its meaning.

Out:
- Any other content, code or rule. The 11 IUCN citation lines flagged in fact-sources are not part of this.

### Definition of done

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run content -- preview` exit 0, with 0 content PROBLEMs, 0 sign problems and 0 citation warnings; the fact-sources quote check (if it's in the repo or `/srv/critter-ai/agent-state/missions/fact-sources/tools/`) finds the new quotes.
- `rg -n voiceless db/content/animals` lists only 08.
- Dev copy only for anything that touches a database, with the guarded block from plan 055 (`plans/2026-11-08-moves-and-signs-build.md`, V3): export `/srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy`, check `current_database()` is `phaser_june_dev`, then `npm run content -- build && npm run content -- check && npm run e2e:fresh` (no-sandbox Chrome wrapper as in 055). Never run them against `.env.local`; never print `DATABASE_URL` or `cat` that file.
- Whether `ANIMAL_RULES.version` needs a bump: follow the repo's own rule (AGENTS.md / `animalBoard.ts` comment) and say why in the plan. Saved rounds with stale witness notes already deal fresh (`roundStillFits`, plan 055).
- **Handoff item** for the owner: "Production content build for the frog fixes", to run `npm run content -- build` from WSL after the deploy, with the expected counts.
- Release `deploy`: merge, `deploy critter-connect`, smoke `/explore` 200 and `version.txt` = the merge commit.

### Decision rules

- One session's worth of work; no architecture reviews beyond what the runner does by default for a small content change.
- If a source can't be quoted for either line, keep the old line, record why in the plan, and add a handoff note rather than guessing.

### Notes

- Start from a fresh `origin/main` (after ft-cleanup, plan 056, merges).
- Evidence: `docs/research/2026-11-07-amphibiaweb-wayback.md` on main; Wayback snapshot of the Goliath page https://web.archive.org/web/20241208045710/https://amphibiaweb.org/species/4691.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

From `agent/frog-fact-fixes` @ `e4c59782` (= `origin/main` `7edc1a5a` + mission start). `node_modules` present; no migrations in this repo.
- `npm run typecheck` 0, `npm run lint` 0, `npm test` 66/66 pass, `npm run content -- preview` 0 (no PROBLEM lines; output `/srv/critter-ai/agent-state/missions/frog-fact-fixes/preview-before.txt`).
- `npm run e2e:fresh` on dev copy (`current_database()` guard = `phaser_june_dev`, no-sandbox Chrome wrapper from moves-and-signs-build), seed 7, `continent:africa`: **1565/1565 checks**. Artifact `/srv/critter-ai/agent-state/missions/frog-fact-fixes/baseline-e2e/`.
- `rg -n voiceless db/content/animals`: 08:109 and 11:106. Target lines: `06-red-eyed-tree-frog.json:140` ("since 2008"), `11-goliath-frog.json:104` ("can't croak").
- Quote check tool: `/srv/critter-ai/agent-state/missions/fact-sources/tools/check_quotes.py`.

## Architecture

Content-only fix: two clue objects, one CSV row, two research bullets, a short plan 057. No code, no schema, no `citations.json`, no version bump. Everything else in the area checks out (below).

### Findings

1. **06 CITES year is wrong** (bug: a false clue). `db/content/animals/06-red-eyed-tree-frog.json:138-142` = `{"category":"conservation","text":"Its international trade has been controlled since 2008 (CITES Appendix II).","source":"iucn"}`. Owner checked the CITES Checklist: Appendix II from 2010. AmphibiaWeb 616 says the same, and the quote is already in the research note (`docs/research/2026-11-07-amphibiaweb-wayback.md:201`, found in `STATE/wayback/06-red-eyed-tree-frog.txt`). **Fix:** "since 2010", `source: "amphibiaweb"`. The page is the profile's `sources.amphibiaweb` (`06:194`, `https://amphibiaweb.org/species/616`, resolved by `pageUrl`, `src/clueGame/profiles.ts:309-311`). It already has a full entry in `db/content/citations.json:67-71` (accessed, archive, cite), so `checkCitations` (`profiles.ts:361-380`) passes and there is **no new `citations.json` entry**. Clue shape is `{category, text, tags?, source, url?}` (`profiles.ts:59`); there are no quote or citation fields per clue, because the quotes live in the research note.
2. **11 "can't croak" contradicts its own fact and AmphibiaWeb** (bug). `db/content/animals/11-goliath-frog.json:102-109` = `{"category":"behavior","text":"It has no vocal sac, so it can't croak. Males whistle with their mouths open instead.","tags":["voiceless"],"source":"adw"}`. Fact `11:150-154` (AW: a mating call up to 1.5 min) and AW 4691 ("Despite previous assertions that adults do not call … brief whistles, chirping, and even a “sighing deep roar”") both say it calls. **Fix:** the owner's wording, `source: "amphibiaweb"`, and drop the `tags` key entirely, as untagged clues do (e.g. `11:110-114`). The page is `sources.amphibiaweb` (`11:184`), with its entry at `citations.json:52-56`, so again no new entry.
   - Wording check (verified): the AW 4691 snapshot text never mentions a vocal sac (no `sac` anywhere). The "no vocal sac" half is ADW's (`STATE/adw/Conraua_goliath.html`: "Goliath frogs do not have vocal sacs"). The ADW page is the profile's own (`11:183`) and still cited by other rows. A clue has one `source`, and no single page states the whole line. **Decision:** keep the owner's line verbatim with `amphibiaweb`. Its claim (it calls, how, with an open mouth) is AW's. The vocal-sac half is true and uncontested, and the research note records its ADW backing. "Made with its mouth open" is AW's for the advertisement call (and ADW's for the whistle); the owner's line applies it to the calls in general. That is the owner's editorial call and no source contradicts it, so no polish.
3. **`voiceless` on 11 is a false shared sign** (bug: it linked 11 with 08). Where it's defined and used: `SIGNS.voiceless = at('habits')` (`src/clueGame/signs.ts:230`) **stays**, because 08 holds it and SIGNS keeps even retired tags (`signs.ts:1-4`). Consumers are `signProblems` via `checkProfile` (`profiles.ts:351`; `habits` has no implies/denies, so there is nothing to conflict), `signsOf` (field-guide signs) and `witnessNotes` (`src/clueGame/animalBoard.ts:169-175`, which needs fits ≥2).
   - **No minimum-holder rule exists.** Nothing checks a sign's holder count, and many signs have a single holder (e.g. `sign-map.csv:209` `whistle_calls,1,70`). After the change, 08's `voiceless` note fits only 08, so it is never dealt as a witness note. That is the intended outcome: no false link.
   - **11 still deduces in Habits.** The only per-animal rule is `validatePool.ts:90-98`: each playable species needs ≥1 tagged clue per deducing gem category. 11 keeps `rests_by_waterfalls` (`11:94-101`) plus the trait clues `activity:night`, `social:alone` and `trees:no` (`11:44-56` → `profiles.ts:274-276`), so there is no warning, and `content.test.ts` stays at 0 warnings.
   - **Replacement: none.** `whistle_calls` (`signs.ts:235`, held only by 70 Baird's tapir) would create a new frog/tapir link and is outside the scope.
4. **`sign-map.csv:204` goes stale.** It reads `voiceless,2,8 11,behavior=2,Habits,majority,,,`. The CSV is the research record that 055 recomputed (`042655eb`) and that lists holders, so it is in scope. **Fix:** set the holders to 8 only and add a `misleads` entry, following 055's "fixed in" convention (rows 67 `giant_frog` and 132 `rock_basker`).
5. **`ANIMAL_RULES.version`: no bump** (stays `'055-0'`, `animalBoard.ts:60`). The rule is `animalBoard.ts:25-26` ("Bumping `version` drops saved games") together with plan 056's precedent (`plans/056-ft-cleanup.md:15-16`: no bump when deals, answers and scores are unchanged; a bump would only drop saves). Plan 055 also rejected a content fingerprint on saves (`plans/2026-11-08-moves-and-signs-build.md:364`).
   - **Deals are unchanged.** Suspect sets and questions read only prefixed traits (`pickSuspectSet` `animalBoard.ts:147-159`, `likeness` `questionMatch.ts:313-321`), and no trait changes here.
   - **The tag only affects witness notes, and saves handle that.** A save whose witness notes differ (a world-mode round with 08 and 11 together) fails `roundStillFits` (`animalBoard.ts:182-192`) and is dealt fresh. The 06 clue is untagged, so it never reaches a witness note.
   - Solve stats under `rules_version` 055-0 stay comparable.
6. **Research notes.** Only one research file covers these claims. Its "two notes" are the two Disagreement bullets: 06 at `docs/research/2026-11-07-amphibiaweb-wayback.md:198-201` and 11 at `:456-461` (the Calls bullet; the Tadpole-food bullet stays). `check_quotes.py` reads every `> "…"` line under a `### NN` heading and looks it up, whitespace-normalized, in `STATE/wayback/NN-*.txt`. Today it reports **274 quotes, 0 misses**. The supporting quotes for both new lines are already there (`:201`, `:459-461`), so marking the bullets resolved in place keeps 274/0 and the checker "finds" them. The ADW vocal-sac quote must stay inline in prose, not on a `> "` line: the checker would compare it against AW text and report a MISS. `plans/2026-11-07-fact-sources.md` (Decisions `:678-679`, Summary `:760`) is a closed mission record (`status: done`), so leave it alone; 057 links to it. Next free plan number: **057** (latest is 056; `origin/main` = `7edc1a5a`).
7. **DB impact.** No schema change. `content -- build` deletes and reloads the content tables (`scripts/content.ts:129-143`), and ids are `species × 100 + position` (`profiles.ts:382-422`). Since no clue moves, row counts are unchanged:
   - `content_sources` 16, `species` 76, `species_deduction_clues` **2478**, `species_facts` **491**.
   - Live is the same since H10: 2478 clues and 491 facts.
   - Changed rows:
     - **635** (06): label, `source_key` `amphibiaweb`, `source_url` `…/species/616`.
     - **1127** (11): label, `compare_tags` `{}`, `is_filtering` false, `source_key` `amphibiaweb`, `source_url` `…/species/4691`.
   - Tagged clues go from 2087 to 2086 (counted from `preview-before.txt`), so `content -- check` should print `2478 clues (2086 deductive), 491 facts`, 0 errors, 0 warnings.
   - Order doesn't matter for correctness, because both AW citation entries are already live and `voiceless` stays in SIGNS. The handoff still says "after the deploy", as the brief asks.
   - E2E: seed 7 Africa deals the same `rounds` as the baseline. Round 1 has Goliath Frog as a suspect, so its field guide shows the new line; 08 isn't in Africa.

### Target design (every file, exactly)

1. `db/content/animals/06-red-eyed-tree-frog.json:138-142`, in place (same position):
   ```json
   {
     "category": "conservation",
     "text": "Its international trade has been controlled since 2010 (CITES Appendix II).",
     "source": "amphibiaweb"
   }
   ```
2. `db/content/animals/11-goliath-frog.json:102-109`, in place (same position, no `tags` key):
   ```json
   {
     "category": "behavior",
     "text": "It has no vocal sac, but it still calls: whistles, chirps, even a deep roar, made with its mouth open.",
     "source": "amphibiaweb"
   }
   ```
   Keep the 2-space JSON, `\n` EOF format (`writeProfile`, `content.ts:22-24`) so later `content -- ranges|photos` rewrites don't churn.
3. `docs/research/2026-11-07-moves-and-signs/sign-map.csv:204` →
   `voiceless,1,8,behavior=1,Habits,majority,,,"11: it calls (whistles, chirps, a roar; AmphibiaWeb), ""voiceless"" reads as no call; fixed in 057: tag dropped from 11"`
4. `docs/research/2026-11-07-amphibiaweb-wayback.md`: rewrite the two bullet lines only and keep every `> "` quote line under them unchanged:
   - `:200` → "CITES: … AmphibiaWeb says the Appendix II listing came on 21 March 2010. **Resolved 2026-11-08 (plan 057):** the owner checked the CITES Checklist (Appendix II from 2010); the clue now says since 2010, sourced to AmphibiaWeb."
   - `:458` → "Calls: … **Resolved 2026-11-08 (plan 057):** owner's line "It has no vocal sac, but it still calls: whistles, chirps, even a deep roar, made with its mouth open.", sourced to AmphibiaWeb; `voiceless` dropped from 11 (08, which truly has no call, keeps it). AmphibiaWeb doesn't mention a vocal sac; that half is ADW's ("Goliath frogs do not have vocal sacs", the profile's ADW page)."
5. New `plans/057-frog-fact-fixes.md`, in the shape of 056 (about 20 lines): what changed (the 2 clues, sources, tag), why (fact-sources Decisions steps 8 and 9, owner check 2026-11-08), sources (AW 616 and 4691 already cited; ADW backs "no vocal sac"), "No version bump" (finding 5), DB (finding 7, handoff H11), verification.
6. Mission plan only (not code): the Decisions record the wording decision (finding 2), and the handoff file `/srv/critter-ai/handoff/critter-connect.md` gets **H11 · Production content build for the frog fixes**: after `version.txt` = merge commit, in WSL on fresh `main`, `npm run content -- build`. Expected: `0 citation warnings`, `species_deduction_clues: 2478 rows`, `species_facts: 491 rows`; optional `content -- check` = 2478 clues (2086 deductive), 491 facts, 0 errors. Spot check: rows 635 and 1127 carry the new labels, and `'voiceless' = any(compare_tags)` matches only species 8.

Not changed: `db/content/citations.json`, `db/content/sources.json`, `src/**` (incl. `signs.ts`), `docs/CONTENT_SOURCES.md`, `plans/2026-11-07-fact-sources.md`, 08's profile.

Verification hooks for the planner: typecheck, lint, `npm test` 66/66, `content -- preview` with 0 `PROBLEM` and 0 `cite warn`, `rg -n voiceless db/content/animals` showing only 08; `python3 -I …/check_quotes.py docs/research/2026-11-07-amphibiaweb-wayback.md …/fact-sources/wayback/` = 274 quotes, 0 misses; the guarded dev-copy block (055 V3: build, check, `e2e:fresh` seed 7 Africa), with check counts as in finding 7 and `rounds` equal to `baseline-e2e/report.json`.

### Rejected alternatives

- **CITES Checklist as 06's source, with a new `citations.json` entry:** there's no fitting source key (a new key means a registry and `content_sources` row change), it's a JS app with a hand-made cite line, and `check_quotes.py` can't verify it. AW 616 states the date and is already fully cited.
- **Polishing 11 to AmphibiaWeb-only wording** ("It isn't mute: …"): it drops the owner's true vocal-sac fact, and the brief allows polish only if the quote check needs it, which it doesn't.
- **Keeping 11 on `adw`:** ADW says "often considered mute" and gives no chirps or roar, so it doesn't support the new line.
- **Tagging 11 `whistle_calls` (or another sign) to replace `voiceless`:** it would add a new cross-animal link, and the brief says just drop the tag. 11 still deduces in Habits without one.
- **Removing `voiceless` from SIGNS:** 08 holds it, and SIGNS keeps retired tags so old rows load.
- **Bumping `ANIMAL_RULES.version`:** it would only drop saved games. Deals are unchanged, and `roundStillFits` already re-deals stale witness notes.
- **Editing `plans/2026-11-07-fact-sources.md`:** it's a closed mission log; 057 and the research note carry the resolution.

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-08 23:20 UTC · Baseline: typecheck/lint/66 tests/preview 0; dev-copy e2e:fresh seed 7 Africa 1565/1565 (`baseline-e2e/`).
- 2026-11-08 23:35 UTC · Architecture: architect wrote findings + target design (content-only: 2 clues on `amphibiaweb`, drop `voiceless` from 11, CSV row, 2 research bullets, plan 057; no code, no citations.json, no version bump). Doc-only, no checks needed.

## Summary
