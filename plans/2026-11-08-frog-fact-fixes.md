---
mission: frog-fact-fixes
project: critter-connect
branch: agent/frog-fact-fixes
status: done
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
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

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
   - `:458` → "Calls: … **Resolved 2026-11-08 (plan 057):** the clue now says it calls, sourced to AmphibiaWeb, and `voiceless` is dropped from 11. "No vocal sac" is ADW's ("Goliath frogs do not have vocal sacs")."
5. New `plans/057-frog-fact-fixes.md`, in the shape of 056 (about 20 lines): what changed (the 2 clues, sources, tag), why (fact-sources Decisions steps 8 and 9, owner check 2026-11-08), sources (AW 616 and 4691 already cited; ADW backs "no vocal sac"), "No version bump" (finding 5), verification. DB line: no schema change; prod needs `content -- build` (handoff H11), which deletes and reloads every clue and fact, so a fresh production dump comes first (AGENTS.md:39). Before or after the deploy are both safe (both AW pages already cited, `voiceless` still in SIGNS); "after the deploy" is the brief's preference, not a constraint.
6. Mission plan only (not code): the Decisions record the wording decision (finding 2), and the handoff file `/srv/critter-ai/handoff/critter-connect.md` gets **H11 · Production content build for the frog fixes**, with these steps:
   1. Wait until `curl https://play.critterconnect.org/version.txt` = the merge commit.
   2. **Fresh production dump** (the build has no backup of its own). From WSL: `ssh root@play.critterconnect.org /opt/critter-connect/deploy/backup/pg-backup.sh` (the host `npm run deploy` uses; add `-i ~/.ssh/hetzner-vps` if the ssh config doesn't pick the key). Success = exit 0 and a last line `<UTC time> backup ok: /var/backups/critter-connect/daily/phaser_june-<stamp>.dump (<size>)`, about 90-120 MB. The script has already checked that the dump reads back (`pg_restore --list`). On anything else, stop and don't build. Restore steps: `docs/DEPLOY.md#backups` ("Restore drill"; for a real restore add `--clean --if-exists -d phaser_june`).
   3. In WSL on a fresh `main` (`git pull --ff-only`): `npm run content -- build`. Expected: `0 citation warnings`, `species_deduction_clues: 2478 rows`, `species_facts: 491 rows`. Optional: `content -- check` = 2478 clues (2086 deductive), 491 facts, 0 errors.
   4. Spot check: `./scripts/db "select id, label, source_key, compare_tags from species_deduction_clues where id in (635, 1127);"` shows the new labels, both `amphibiaweb`, and 1127 with `{}`. `./scripts/db "select distinct species_id from species_deduction_clues where 'voiceless' = any(compare_tags);"` returns only `8`.
   5. Reply `done` with the dump's file name.

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

VERDICT: APPROVE

Checked every cited line against the worktree (`1d924348`). All findings hold:
- 06 clue is `clues[9]` (line 138-142, `iucn`, "since 2008"); `sources.amphibiaweb` = `…/species/616`, full entry at `citations.json:67-71`. `checkCitations` keys on `pageUrl` (profile page when no `url`), so no new entry. Clue shape `{category,text,tags?,source,url?}` (`profiles.ts:59`), no per-clue quote field.
- 11 clue is `clues[5]` (line 102-109); `…/species/4691` entry at `citations.json:52-56`. Other untagged clues in 11 omit the `tags` key (5 of 10), so dropping the key matches.
- `voiceless` stays in `SIGNS` (`signs.ts:230`; header says retired tags are kept). `habits` has no implies/denies, so `signProblems` can't fire. `witnessNotes` needs `fits >= 2`, so 08's lone note is never dealt (same as `whistle_calls,1,70`). No minimum-holder rule anywhere.
- Habits = `clueCategories ['behavior','diet']`, `deduces: true` (`categories.ts:27`); 11 keeps `rests_by_waterfalls` plus `activity`, `social`, `trees` and `diet` traits, so `validatePool.ts:91-96` stays silent.
- No version bump: `animalBoard.ts:25-26` + 056 precedent; deals read only prefixed traits; `roundStillFits` compares note text/tags/fits and re-deals.
- `check_quotes.py` today: 274 quotes, 0 misses. Only `> "…"` lines are checked, so prose edits to `:200` and `:458` are safe; the three 11 quotes and the 06 quote already match the snapshot. AW 4691 snapshot has no "sac"; ADW has "do not have vocal sacs". Keeping the ADW quote in prose (not a `> "` line) is correct.
- DB counts from `preview-before.txt`: 2478 clues, 2087 tagged (→ 2086), 491 facts. Row ids: 06 clue is the 35th built row → **635**; 11 clue is the 27th → **1127**. Both confirmed.
- Baseline e2e round 1 has Goliath Frog as a suspect; 08 is `realm:nearctic`, not in Africa.
- No other stale references in the repo (only the closed `plans/2026-11-07-fact-sources.md`, correctly left alone). Next plan number 057 and handoff H11 are both free.

MUST-FIX: none

MISSED: none

SHOULD-CONSIDER:
1. Plan 057 should say explicitly that `content -- build` on live before or after the deploy is both safe (both AW pages already cited, `voiceless` still in SIGNS), so the "after the deploy" in H11 is the brief's preference, not a constraint.
2. In the H11 spot check, give the exact SQL (`select id, label, source_key, compare_tags from species_deduction_clues where id in (635, 1127)`) so the owner can paste it.
3. The 11 research bullet rewrite is long; keep it to one sentence of resolution plus the ADW attribution, since the clue text itself is already in the profile and plan 057.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. Add a successful fresh production dump as a prerequisite in H11 before `content -- build`. The build deletes and reloads all clues and facts; it performs no backup. Omitting this violates [AGENTS.md:39](/srv/critter-ai/worktrees/frog-fact-fixes/AGENTS.md:39), which requires a fresh dump before bulk writes. Transactional loading does not replace that requirement.

SHOULD-CONSIDER: none

## Revision notes

- **Astra MUST-FIX 1 (fresh prod dump before H11): resolved.** Target design 6 now gives H11 numbered steps, and the dump comes before `content -- build`. It names the exact command (`ssh root@play.critterconnect.org /opt/critter-connect/deploy/backup/pg-backup.sh`, the script's documented path, `docs/DEPLOY.md:69-74`, on the `deploy.sh` host from WSL), says what success looks like (exit 0 plus the script's `backup ok: …dump (<size>)` line; the script checks that the dump reads back) and gives the restore pointer (`docs/DEPLOY.md#backups`). The rule is "no `backup ok`, no build". Target design 5 has plan 057's DB line say the same.
- Fable SHOULD-CONSIDER 1 adopted (item 5): building before or after the deploy is safe either way, and "after" is the brief's preference.
- Fable SHOULD-CONSIDER 2 adopted (item 6.4): exact paste-ready spot-check SQL via `./scripts/db`, plus the `voiceless` query. The columns were checked against `db/schema.sql`.
- Fable SHOULD-CONSIDER 3 adopted (item 4): the 11 research bullet is cut to one resolution sentence plus the ADW attribution.

## Steps

`M=/srv/critter-ai/agent-state/missions/frog-fact-fixes`. V1–V5 are under Verification. Repo root; one heavy job at a time.

- [x] S1. **Content edits, research record, plan 057; one commit.** Exactly Target design 1–5; nothing else:
  - `db/content/animals/06-red-eyed-tree-frog.json` `clues[9]` (lines 138-142) → TD1. `db/content/animals/11-goliath-frog.json` `clues[5]` (lines 102-109) → TD2, deleting the `tags` key. Same positions, 2-space JSON, `\n` at EOF.
  - `docs/research/2026-11-07-moves-and-signs/sign-map.csv:204` → TD3, verbatim.
  - `docs/research/2026-11-07-amphibiaweb-wayback.md`: on the bullet at `:200`, replace the last sentence ("IUCN (tier 1) kept; noted under Decisions.") with TD4's "**Resolved 2026-11-08 (plan 057):** …" sentence. On the bullet at `:458`, replace "Same tier, ADW clue kept; worth the owner's look, since `voiceless` also tags 08, which truly has no call." with TD4's resolution sentence plus the ADW attribution. The ADW quote stays inline in the prose. Don't touch any `> "` line.
  - New `plans/057-frog-fact-fixes.md` per TD5, in 056's shape. Its Verification line holds S1's static results; S2 adds the E2E line.
  - In this plan, under **Decisions**: (a) `S1 · Goliath line kept verbatim on amphibiaweb (Architecture finding 2): AW backs the claim (it calls, how, open mouth); "no vocal sac" is ADW's, true and uncontested, recorded in the research note; one source per clue.` (b) `S1 · No ANIMAL_RULES.version bump (finding 5): deals read only prefixed traits (unchanged); the tag only reaches witness notes, which roundStillFits re-deals.`
  - Checks: V1 (all items), V2. No DB, no E2E. Commit the 2 JSONs, CSV, research note, plan 057 and this plan, then push.
- [x] S2. **Dev-copy build, check and E2E; handoff H11.**
  - Run V3 and V4. V4 reads the newest run in `e2e-artifacts/` (gitignored, self-pruning). Don't copy it into `$M`; the disk rule leaves room only for `baseline-e2e` and `final-e2e`. Hard pass: V3 shows the expected check and spot-check lines, and V4 exits 0. If `rounds` differ: no release. Record it under Decisions, find the cause, and add a fix step or a handoff item.
  - Append H11 to `/srv/critter-ai/handoff/critter-connect.md` under `## Open`, in the exact `~/AGENTS.md` item format:
    - Title `### H11 · Production content build for the frog fixes`, `Status: waiting on you`, `From: frog-fact-fixes · <UTC date>`, `Blocks: the two fixed clues reaching players (the mission doesn't wait on it)`.
    - **Why:** one sentence: prod keeps the old 06 and 11 clue rows until a content build.
    - **Steps:** TD6 1–5, with one correction to step 3. `content -- build` prints no row counts, only `0 citation warnings (see preview).` and `Built. …`. So step 3 is build, then `npm run content -- check`, which must print `Pool: <P> playable of 76 species, 2478 clues (2086 deductive), 491 facts.` and `0 errors, 0 warnings.`. `<P>` is the number V3 printed here.
    - **Your reply:** `- Dump file name:` and `- Built (done/failed + check line):`.
    - Leave the other items alone.
  - Under **Decisions**: `S2 · H11 step 3 differs from TD6.3: content -- build prints no table counts; counts come from content -- check.`
  - Add the V4 line to plan 057's Verification. If `next dev` rewrote the `AGENTS.md` block, commit it (repo rule). Run V1.1, then commit and push.

Not a step: once S2 is checked, the runner does the Astra code review, then the full Verification (V1–V5, artifact `$M/final-e2e/`), then the Release (`~/.claude/CLAUDE.md` "In a mission session" 6-8). A Verification checkbox here would run before the code review, and twice.

## Verification

E2E first. The scenarios are the existing suite at seed 7, Africa: globe → continent → 4 rounds → resume → journal → sources. There's no new scenario: the deals must not change, and matching `rounds` proves it. Round 1 has Goliath Frog as a suspect, so its field guide loads the changed clue row. Final run (after the Astra code review): V1–V5, artifact `$M/final-e2e/`. Run each block in one Bash call, because shell state doesn't persist.
```
M=/srv/critter-ai/agent-state/missions/frog-fact-fixes
CH=/srv/critter-ai/agent-state/missions/moves-and-signs-build/chrome-nosandbox.sh
Q=/srv/critter-ai/agent-state/missions/fact-sources
```

**V1. Static (no DB)**, each must hold:
1. `npm run typecheck && npm run lint && npm test` exits 0; tests 66/66.
2. `rg -n voiceless db/content/animals` prints exactly one line, `db/content/animals/08-coastal-tailed-frog.json:109:…`.
3. `python3 -I $Q/tools/check_quotes.py docs/research/2026-11-07-amphibiaweb-wayback.md $Q/wayback/` prints `274 quotes, 0 misses` and exits 0.
4. The clues and the file format are exact:
   ```
   node -e 'const fs=require("fs"),d="db/content/animals/";for(const [f,i,t] of [["06-red-eyed-tree-frog.json",9,"Its international trade has been controlled since 2010 (CITES Appendix II)."],["11-goliath-frog.json",5,"It has no vocal sac, but it still calls: whistles, chirps, even a deep roar, made with its mouth open."]]){const s=fs.readFileSync(d+f,"utf8"),p=JSON.parse(s),c=p.clues[i],ok=s===JSON.stringify(p,null,2)+"\n"&&c.text===t&&c.source==="amphibiaweb"&&!("tags" in c);console.log(f,ok?"ok":"WRONG "+JSON.stringify(c));if(!ok)process.exitCode=1}'
   ```
   Must print `ok` for both files.
5. Scope: `B=$(git merge-base origin/main HEAD); git diff --name-only $B; git status --short`. Must list only the 2 animal JSONs, `sign-map.csv`, `2026-11-07-amphibiaweb-wayback.md`, `plans/057-frog-fact-fixes.md` and this plan (plus `AGENTS.md` if `next dev` rewrote its block). Also `git diff --quiet $B -- src scripts tests db/content/citations.json db/content/sources.json && echo "code untouched"` must print `code untouched`.

**V2. Content preview** (files only):
```
npm run -s content -- preview > /tmp/frog-preview-after.txt 2>&1; echo "exit $?"
echo "PROBLEM: $(grep -c PROBLEM /tmp/frog-preview-after.txt) cite warn: $(grep -c 'cite warn' /tmp/frog-preview-after.txt)"
diff $M/preview-before.txt /tmp/frog-preview-after.txt
```
Must show `exit 0` and `PROBLEM: 0 cite warn: 0` (this covers sign problems via `checkProfile`). The diff must be exactly two hunks:
- `220c220` → `  conservation/4 [] Its international trade has been controlled since 2010 (CITES Appendix II).`
- `418c418` → `  behavior/5 [] It has no vocal sac, but it still calls: whistles, chirps, even a deep roar, made with its mouth open.`

**V3. DB build, check and E2E, dev copy `phaser_june_dev` only.** Never `.env.local`. Never print `DATABASE_URL` or `cat` the secrets file.
```
( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
  [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
  npm run content -- build && npm run content -- check || exit 2
  psql "$DATABASE_URL" -tAc "select id, source_key, coalesce(array_to_string(compare_tags, ','), ''), is_filtering, label from species_deduction_clues where id in (635, 1127) order by id"
  psql "$DATABASE_URL" -tAc "select string_agg(distinct species_id::text, ',') from species_deduction_clues where 'voiceless' = any(compare_tags)"
  E2E_SEED=7 E2E_PLACE=continent:africa CHROME_PATH=$CH npm run e2e:fresh )
```
- **Exit 1:** wrong DB. Stop, and add a handoff item to refresh the dev-copy file.
- **Exit 2:** the build or check failed. Fix it before anything else.
- **Must show:**
  - Build: `0 citation warnings (see preview).`
  - Check: `… 2478 clues (2086 deductive), 491 facts.` and `0 errors, 0 warnings.` Record the playable count for H11.
  - Spot check (this confirms the new Goliath line):
    `635|amphibiaweb||f|Its international trade has been controlled since 2010 (CITES Appendix II).`
    `1127|amphibiaweb||f|It has no vocal sac, but it still calls: whistles, chirps, even a deep roar, made with its mouth open.`
  - `voiceless` holders: `8`.
- **Why not a screenshot:** the field guide reads exactly these rows (`/api/clue-game/pool`), but no screenshot is expected to show the line. In round 1 Habits is a dealt question, so Habits guide lines stay hidden during play, and `02d` shows Hairy Frog.
- **Known VPS flake:** 1–3 timing checks can fail. Rerun e2e:fresh once, inside the same guard; failing twice is real.

**V4. Artifact must show** (hard pass, exit 0). `<run>` is `"$(ls -d e2e-artifacts/*/ | tail -1)report.json"` in S2, and `$M/final-e2e/report.json` in the final run, after `rm -rf $M/final-e2e && cp -r "$(ls -d e2e-artifacts/*/ | tail -1)" $M/final-e2e`:
```
node -e 'const [a,b]=process.argv.slice(1).map(f=>require(require("path").resolve(f))),bad=b.checks.filter(c=>!c.ok),same=a.seed===b.seed&&a.place.key===b.place.key&&JSON.stringify(a.rounds)===JSON.stringify(b.rounds);console.log(b.checks.length,"checks (baseline",a.checks.length+"),",bad.length,"failed,",b.consoleErrors.length,"console errors,",b.failedRequests.length,"failed requests; rounds same as baseline:",same);process.exit(bad.length||b.consoleErrors.length||!same?1:0)' $M/baseline-e2e/report.json <run>
```
- **Must show:** 0 failed, 0 console errors, `rounds same as baseline: true` (seed 7, Africa; baseline 1565 checks, round 1 suspects include Goliath Frog).
- **Artifact:** `$M/final-e2e/` (`report.json` + screenshots). Reproduce: V3 then V4.
- **Disk:** `$M` keeps only `baseline-e2e` (V4's reference) and `final-e2e`. Any later re-run replaces `final-e2e`.

**V5. Summary** (final run): `git diff --stat origin/main...HEAD`, `$M/final-e2e/` with its V4 line and V3's check and spot-check lines, both architecture verdicts, the code-review verdict and its SHOULD-CONSIDERs. Also say that the fixed clues reach players only after the owner's H11 build. Put the same V4 line in plan 057.

**Failure modes:** none. Nothing is tested in isolation: there's no code. The quote check is an existing tool run as-is.

**Release** (runner's unit, `deploy`):
1. Refresh and re-verify:
   - `git fetch origin --prune`, then rebase on `origin/main`. Rerun V1–V4; the re-run replaces `final-e2e`.
   - If `git diff --quiet 7edc1a5a origin/main -- src scripts db/content` fails, main changed code or content. Then the V2 diff and V4's `rounds` match don't apply: record that under Decisions, and everything else must still hold.
2. Merge, deploy and smoke:
   - Open the PR, `gh pr merge <n> --merge`, `deploy critter-connect`.
   - Smoke:
     ```
     MC=$(gh pr view <n> --json mergeCommit -q .mergeCommit.oid)
     echo "explore: $(curl -sL -o /dev/null -w '%{http_code}' https://play.critterconnect.org/explore/)"
     [ "$(curl -s https://play.critterconnect.org/version.txt)" = "$MC" ] && echo "version.txt = merge commit"
     ```
     Must show `explore: 200` and `version.txt = merge commit`.
3. Record:
   - Add `(Done <date>: PR #<n> merged as <MC> and deployed.)` to H11 step 1, as H10 did.
   - In the Summary, note that prod content waits on H11.

## Code review (Astra)

`astra-review --code origin/main` (exit 0), branch `7edc1a5a..f8fbe9c6`:

VERDICT: APPROVE

MUST-FIX: none

SHOULD-CONSIDER:

1. Refresh `origin/main` before opening the PR. Fetch was blocked by the read-only filesystem; review used local `7edc1a5a` through `f8fbe9c6`.

SC 1 is covered by the release step (fetch + rebase on `origin/main`, rerun V1–V4); for the Summary.

## Release

- Refresh: `origin/main` = `7edc1a5a` = merge-base, rebase no-op. Re-ran V1–V4: V1 pass (66/66, voiceless = 08, quotes 274/0, JSON ok, scope ok, code untouched); V2 exit 0, 0/0, 2 clue hunks; V3 dev copy 76 playable, 2478/2086/491, 0/0, 635/1127 ok, voiceless = 8; V4 `1565 checks (baseline 1565), 0 failed, 0 console errors, 0 failed requests; rounds same as baseline: true` (replaced `final-e2e/`).
- PR #68: CI check + e2e pass. Merge commit `fd7ecea178a76ded41828f0d1eda4c65d35c9923`.
- Deploy last line: `deploy critter-connect: live at https://critterconnect.org` (38 OK, 0 FAIL).
- Smoke: `explore: 200`, `version.txt = merge commit`.
- Log: `/srv/critter-ai/agent-state/missions/frog-fact-fixes/deploy.log`. H11 step 1 marked done.

Result: done

## Decisions

- S1 · Goliath line kept verbatim on amphibiaweb (Architecture finding 2): AW backs the claim (it calls, how, open mouth); "no vocal sac" is ADW's, true and uncontested, recorded in the research note; one source per clue.
- S1 · No ANIMAL_RULES.version bump (finding 5): deals read only prefixed traits (unchanged); the tag only reaches witness notes, which roundStillFits re-deals.
- S1 · V2 diff has one extra hunk (lines 2-5, npm's `> critter-connect@… content` banner): `preview-before.txt` was captured without `-s`. Not content; the content diff is exactly the two clue hunks (now at 216/414 after the banner offset).
- S2 · H11 step 3 differs from TD6.3: content -- build prints no table counts; counts come from content -- check.

## Log

- 2026-11-08 23:20 UTC · Baseline: typecheck/lint/66 tests/preview 0; dev-copy e2e:fresh seed 7 Africa 1565/1565 (`baseline-e2e/`).
- 2026-11-08 23:35 UTC · Architecture: architect wrote findings + target design (content-only: 2 clues on `amphibiaweb`, drop `voiceless` from 11, CSV row, 2 research bullets, plan 057; no code, no citations.json, no version bump). Doc-only, no checks needed.
- 2026-11-08 23:45 UTC · Fable review: APPROVE, no MUST-FIX; 3 SHOULD-CONSIDER (H11 order note, spot-check SQL, shorter 11 bullet) for the planner. Doc-only, no checks needed.
- 2026-11-08 23:35 UTC · Astra review: APPROVE_WITH_CHANGES; 1 MUST-FIX (H11 needs a fresh prod dump before `content -- build`) for Revision. Doc-only, no checks needed.
- 2026-11-08 23:55 UTC · Revision: architect added fresh prod dump (`pg-backup.sh`, "no `backup ok`, no build") as H11 step 2; adopted Fable SC 1-3. Resolves Astra MUST-FIX 1. Doc-only, no checks needed.
- 2026-11-08 23:41 UTC · Steps: planner wrote S1 (content edits + plan 057) and S2 (dev-copy build/check/e2e + H11), V1–V5 + release smoke; corrected H11 step 3 (counts come from `content -- check`). Doc-only; quote check still 274/0.
- 2026-11-09 00:05 UTC · S1: 06 + 11 clues on amphibiaweb, `voiceless` off 11, sign-map row, 2 research bullets resolved, plan 057. V1 all pass (66/66, voiceless = 08 only, quotes 274/0, JSON ok, scope ok, code untouched); V2 exit 0, 0 PROBLEM, 0 cite warn, diff = 2 clue lines.
- 2026-11-08 23:55 UTC · S2: dev copy (guard = phaser_june_dev) build 0 cite warn; check 76 playable, 2478 clues (2086 deductive), 491 facts, 0/0; rows 635/1127 new text on amphibiaweb, 1127 no tags; voiceless = 8. e2e:fresh seed 7 Africa 1565/1565; V4 0 failed, 0 console errors, rounds same as baseline: true. H11 added to handoff.
- 2026-11-09 00:15 UTC · Astra code review: APPROVE, no MUST-FIX; 1 SC (refresh origin/main before PR, already in release step). Doc-only, no checks needed.
- 2026-11-09 00:11 UTC · Final Verification: V1 (66/66, voiceless = 08, quotes 274/0, JSON ok, scope ok, code untouched), V2 (exit 0, 0/0, 2 clue hunks), V3 dev copy (76 playable, 2478/2086/491, 0/0; 635/1127 ok; voiceless = 8), V4 1565/1565, rounds = baseline. Artifact `final-e2e/`. Summary written.
- 2026-11-09 00:50 UTC · Release: V1–V4 re-run pass (1565/1565, rounds = baseline); PR #68 CI pass, merged as fd7ecea1, deployed; smoke explore 200, version.txt = merge commit.

## Summary

Fixed two frog clues players read; content only, no code.
- **06 Red-eyed tree frog:** "since 2008" → "since 2010 (CITES Appendix II)", re-sourced `iucn` → `amphibiaweb`.
- **11 Goliath frog:** "can't croak" → owner's wording ("no vocal sac, but it still calls: whistles, chirps, even a deep roar, made with its mouth open"), `adw` → `amphibiaweb`; `voiceless` tag dropped (now only 08).
- Also: `sign-map.csv` row, 2 research-note disagreements marked resolved, plan `057-frog-fact-fixes.md`. No `ANIMAL_RULES.version` bump (deals read only prefixed traits; see Decisions).
- Diff vs `origin/main`: 6 files, +360 −10 (2 JSONs, CSV, research note, 2 plans).

Verification (final, after code review):
- V1: typecheck, lint, 66/66 tests; `rg voiceless` = 08 only; quote check 274 quotes, 0 misses; JSON exact; scope only the 6 files, code untouched.
- V2: preview exit 0, 0 PROBLEM, 0 cite warn; diff = the 2 clue lines (+ npm banner, see Decisions).
- V3 (dev copy `phaser_june_dev`): build 0 citation warnings; check `Pool: 76 playable of 76 species, 2478 clues (2086 deductive), 491 facts.` `0 errors, 0 warnings.`; rows 635/1127 new text on `amphibiaweb`, no tags; `voiceless` holders `8`.
- V4: `1565 checks (baseline 1565), 0 failed, 0 console errors, 0 failed requests; rounds same as baseline: true`. Artifact `/srv/critter-ai/agent-state/missions/frog-fact-fixes/final-e2e/` (report.json + screenshots); reproduce: V3 then V4.

Reviews: architecture Fable APPROVE, Astra APPROVE_WITH_CHANGES (1 MUST-FIX, fresh prod dump before build, folded into H11); code review Astra APPROVE, no MUST-FIX; SC 1 (refresh `origin/main` before PR) handled by the release step.

**Players see the fixes only after the owner's production content build (handoff H11)**; the deploy alone doesn't change prod clue rows.

**Released 2026-11-09:** PR #68 merged as `fd7ecea1` and deployed (smoke pass). Prod clue rows still wait on H11 (owner's content build).
