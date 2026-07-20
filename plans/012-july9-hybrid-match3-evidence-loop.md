# Plan 012: July 9, 2026 — Make Match-3 the Expedition Evidence Engine Before Replacing It

> **Executor instructions**: Follow this plan in order. Run every verification gate. Stop at every listed STOP condition; do not improvise. This plan deliberately keeps the match-3 core while proving whether it creates meaningful evidence rather than merely unlocking text.
>
> **Drift check (run first)**: `git diff --stat ea17a07..HEAD -- docs/DEDUCTION_CLUE_SYSTEM_PLAN.md db/seeds/deduction src/lib/deductionEngine.ts src/lib/deductionTags.ts scripts/seed-deduction.ts src/contexts/ExpeditionContext.tsx src/types/expedition.ts tests` and then `git status --short -- <same paths>`. Empty committed diff output is expected on the original planning commit. Any output means in-scope work changed after planning; review it before editing and preserve owner changes.

## Status

- **Priority**: P1
- **Effort**: XL
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `ea17a07`, 2026-07-09

## Why this matters

The product promise is a real-place expedition that culminates in identifying an endangered species: map location and GIS create the field context; match-3 earns observations; comparative deduction turns observations into a hypothesis; discovery explains why the animal and habitat matter. The board already has a role—action gems progress nodes and loot gems advance clues—but the evidence layer is not yet trustworthy enough to judge whether the board earns its place.

Do not replace match-3 before fixing the content and evidence contracts below, then measuring actual runs. Replace it only if normal play shows that the board consistently supplies all needed fragments without tactical pressure and the interesting part begins only after the board ends.

## Current state

- `docs/EXPEDITION_RUN_LOOP.md:3-23` defines the shipped loop as map click → briefing → board objective → deduction, with action gems for nodes and loot gems for clues.
- `src/contexts/ExpeditionContext.tsx:383-462` converts matched loot categories into either a habitat survey entry or the next authored clue. The board is already the evidence-delivery mechanism.
- `src/lib/deductionEngine.ts:165-194` ANDs separate confirmed clues but ORs `compareTags` inside one clue. A multi-tag label therefore does not mean every stated fact is required.
- `db/seeds/deduction/addax_nasomaculatus.json` has 17 authored rows, including two `habitat` rows. `db/seeds/deduction/panthera_tigris.json` has 15 and none. `docs/DEDUCTION_CLUE_SYSTEM_PLAN.md:338-347` requires 17 rows while its worked Tiger example and §8 claim 15.
- Both current seeds use unique `genus:` tags as filtering taxonomy clues. In the 28-mammal pool, this can identify the target rather than narrow it.
- `src/lib/deductionEngine.ts:265-270` emits GIS tags such as `freshwater`, `riverine`, and `lacustrine`, while `src/lib/deductionTags.ts:37-53` defines `habitat_tag:river`, `habitat_tag:lake`, and `habitat_tag:wetland`. The intersection in `applyEvidenceBundle` is therefore mostly empty.
- `scripts/seed-deduction.ts:225-288` validates tag existence and subset membership, but allows multi-tag filtering clues and reports each clue's individual coverage instead of sequential candidate reduction.
- Database inspection on 2026-07-09 found: 50 curated `species` rows join all 50 raw IUCN IDs and 103 polygons; all 28 mammals have raw range data; only Addax and Tiger have the new mammal deduction profiles (32 authored clues total). Raw IUCN data supplies taxonomy/status/range flags, not morphology, diet, behavior, life history, or key facts.
- At planning time, `npm test`, `scripts/run-tests.mjs`, `tests/lib/`, and the recursive `*.test.ts` runner exist in the worktree. `tests/scripts/` does not yet exist and may be added for validator coverage. Reconfirm this preflight before Step 1 because the runner and tests are currently uncommitted owner work.
- The shapefile guide is in flux: the worktree replaces deleted `docs/SHAPEFILE_BEST_PRACTICES.mdx` with untracked `docs/SHAPEFILE_BEST_PRACTICES.md`. Use the current file; do not rename, restore, or otherwise absorb that owner change into this plan.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Drift check | `git diff --stat ea17a07..HEAD -- <in-scope paths>` plus `git status --short -- <in-scope paths>` | First command initially empty; review any committed or worktree changes before editing |
| Test preflight | `npm pkg get scripts.test && test -f scripts/run-tests.mjs && test -d tests/lib` | Test script, runner, and base test directory exist |
| Typecheck | `npm run typecheck` | Exit 0 |
| Tests | `npm test` | Exit 0 |
| Seed validation after adding check mode | `npm run seed:deduction -- --check` | Exit 0; no database writes |
| Optional live load | `npm run seed:deduction` | Run only with explicit user approval and a configured database tunnel |

## Suggested executor toolkit

- Use the `postgres-tunnel` skill for any database inspection or approved seed load.
- Read whichever of `docs/SHAPEFILE_BEST_PRACTICES.md` or `.mdx` exists before querying raw IUCN range data. Do not resolve the current rename/deletion as part of this plan.
- Use Context7 only if a framework/library API question arises; do not use it for the game-design decisions in this plan.

## Scope

**In scope**

- `docs/DEDUCTION_CLUE_SYSTEM_PLAN.md`
- `src/lib/deductionTags.ts`
- `src/lib/deductionEngine.ts`
- `src/contexts/ExpeditionContext.tsx`
- `src/types/expedition.ts`
- `scripts/seed-deduction.ts`
- `db/seeds/deduction/*.json`
- New focused tests under `tests/lib/` and/or `tests/scripts/`
- Run-summary persistence only where needed to record the metrics in Step 4

**Out of scope**

- Replacing Phaser or match-3.
- Moving raw source fields or game-authored facts into `iucn`.
- Broad visual redesign, economy redesign, or a permanent 6–12 candidate-pool feature.
- Loading seed data into a live database without explicit user approval.

## Git workflow

- Branch: `advisor/012-july9-hybrid-evidence-loop`
- Do not push, commit, or open a PR unless explicitly instructed.
- Keep commits scoped to one completed step if commits are requested later.

## Steps

### Step 1: Establish one authored-evidence contract

Adopt the following v1 contract and make the docs, validator, and two existing seed files agree:

| Rule | V1 decision |
|---|---|
| Authored deck size | Exactly 15 rows per mammal |
| Green gem | GIS survey/context only; no authored `habitat` clue rows |
| Dormant habitat category | Keep `DeductionClueCategory = 'habitat'` for a future GIS-driven evidence path, but no v1 wallet mapping reveals authored habitat rows |
| Blue gem | Two `geography` rows |
| Yellow gem | Two `behavior` rows plus one `diet` row |
| Purple gem | Two optional payoff facts plus one signature discriminator |
| Filtering row | Exactly one `compare_tags` value |
| `misc:` tag | Never use it in a filtering row |
| `genus:` tag | Non-filtering during the six-species pilot; after all profiles exist, allow filtering only when at least two of the complete 28-profile authoring corpus share it |
| Taxonomy | Keep family/genus in profiles for album/education; use only fair, shared tags for filtering |

Fifteen rows wins over 17 because it matches the shipped Tiger deck, keeps green habitat survey and blue authored geography roles distinct, and removes 56 redundant habitat cards across 28 mammals. The remaining 12 categorical observations plus three key facts are sufficient for the pilot; the playtest must verify that claim before full-corpus authoring.

The exact deck shape is: `taxonomy` orders 1–2, `geography` 1–2, `morphology` 1–2, `behavior` 1–2, `diet` 1, `reproduction` 1, `conservation` 1–2, and `key_fact` 1–3. No `habitat` rows are authored.

Update `docs/DEDUCTION_CLUE_SYSTEM_PLAN.md` so its prose, worked example, prompt, row count, and checklist use this single contract. Remove the requirement for `habitat` clue rows from the generation prompt. State that `habitat_tags` remain profile data for future GIS/context use and that the `habitat` clue category is intentionally dormant, not accidental dead code.

In `WALLET_KEY_TO_DEDUCTION_CATEGORIES`, change the geographic wallet mapping from `['geography', 'habitat']` to `['geography']`; keep the habitat wallet mapping empty. Do not delete `habitat` from `DeductionClueCategory` or the profile schema in this plan. Add a regression test proving no v1 wallet path reveals an authored habitat row.

In `scripts/seed-deduction.ts`, add hard validation for:

- exactly the 15 category/reveal-order pairs above;
- `is_filtering: true` requiring one `compare_tags` entry;
- `is_filtering: false` requiring no compare tags;
- rejection of `misc:` filtering tags;
- rejection of every `genus:` filtering tag during the pilot; after the checked-in corpus contains all 28 profiles, rejection unless that exact tag appears in at least two of those 28 profiles (never use a transient runtime pool for this validation);
- a label/tag coherence warning when a filtering label contains obvious conjunction wording (`and`, semicolon, or comma-separated clauses). Keep this warning non-blocking; a human must judge prose.

Do not add `matchMode: 'all'` in this plan. The simpler contract is one atomic comparison fact per filtering clue.

Update both seed files to conform. Split compound observations into separate authorable facts only when they have separate clue slots; otherwise preserve one fact in the label and move the other to profile notes or optional lore.

**Verify**:

- `npm run seed:deduction -- --check` reports 15 rows for both seeds and no hard validation errors.
- `npm run typecheck` exits 0.
- Add validator tests that reject a multi-tag filtering clue, a filtering `misc:` tag, a singleton genus tag, and the old 17-row shape.

### Step 2: Put every tag in one semantic home and bridge GIS vocabulary

Define one canonical stored format for controlled tags. Use key-qualified values consistently in new/rewritten seeds, such as `activity_pattern:nocturnal` and `habitat_tag:river`. Preserve dynamic prefixes only for taxonomy, geography, status, and signature tags.

Assign concepts once:

- `diet_tags`: what is eaten (`diet_type` plus a controlled food group if needed).
- `behavior_tags`: when/how it acts (`activity_pattern`, `sociality`, `locomotion`, `foraging_style`).
- `habitat_tags`: actual shared habitat vocabulary only.

Extend `TAG_VOCAB` only when at least two mammals need a missing concept. Do not solve recurring content with `misc:`. If food groups or offspring-pattern groups prove necessary during the first six species, add small controlled vocabularies then; otherwise stop and report rather than inventing prefixes.

Replace the raw string arrays in `FEATURE_CLASS_HABITAT_TAGS` with canonical values from the controlled vocabulary. Map only biologically compatible evidence:

- river → `habitat_tag:river`
- lake → `habitat_tag:lake`
- Ramsar/wetland → `habitat_tag:wetland`
- do not map protected-area status to habitat

For this v1 plan, green remains **context only**. Keep survey entries visible, but do not insert green/GIS tags into `confirmedClues` or candidate filtering until all 28 habitat profiles and GIS mappings have been coverage-tested. Preserve diagnostic information for future work if useful, but avoid a hidden free elimination constraint.

**Verify**:

- Add unit tests for each GIS feature-class mapping and for no protected-area-to-habitat conversion.
- Add a test showing a green survey reveal alone does not change `candidateCount`.
- `npm test` and `npm run typecheck` exit 0.

### Step 3: Build a six-species pilot corpus

Before generating prose for a species, assemble a reviewed source dossier:

1. Use raw IUCN-linked data for scientific name, taxonomy, Red List category, range geometry, flags, and distribution comment.
2. Use authoritative species sources for morphology, habitat use, diet, behavior, reproduction, threats, and memorable facts.
3. Populate the curated `species` enrichment fields where the app needs them for route selection and display. Do not alter raw `iucn` fields.
4. Create or revise the 15-row seed using the Step 1 contract.
5. Run the check-only loader and review the prose as one coherent field portrait.

Limit pre-playtest content to six mammals:

- existing Addax and Tiger decks;
- `Manis javanica` for armored morphology, insectivory, and tropical habitat;
- `Pteropus livingstonii` for flight, frugivory, and island range;
- `Elephas maximus` for extreme scale, herbivory, and social behavior;
- `Cryptochloris wintoni` for fossorial locomotion, insectivory, and arid habitat.

These are a deliberate tag-diversity sample, not an encounter pool. Revise Addax and Tiger, then author the four new profiles in one reviewed batch. Do not author the remaining 22 yet. Do not load a partially reviewed batch into a live database. Maintain a human-review record outside the raw IUCN table for factual provenance.

Coverage rules for the pilot:

- Validate every filtering clue against the six checked-in profiles, while labeling results as pilot-only coverage.
- Simulate sequential intersections using the real `filterCandidates` semantics; warn if an ordinary two-to-three-clue path yields zero candidates.
- Do not enable filtering genus clues; the complete 28-profile frequency denominator does not exist yet.
- Allow a signature clue to reach one or two pilot candidates.

**Verify**:

- `npm run seed:deduction -- --check` reports six mammal profiles, 15 clues each, and zero hard errors.
- Generate a machine-readable pilot report containing per-clue matches and sequential candidate counts.
- Manually read all 90 labels without names and confirm each deck forms one coherent animal portrait.

### Step 4: Instrument the evidence economy and run the early value test

Use the existing deduction summary write in `src/contexts/ExpeditionContext.tsx:619-637` as the persistence point. Extend the stored summary only after confirming the run API accepts additive JSON fields without a migration.

Record enough data to answer whether the board creates meaningful pressure:

- board-phase, per-node, and deduction-phase elapsed milliseconds;
- move budget, moves used per node, and completed-node count;
- route match count and matched loot categories;
- fragments earned and spent by category;
- clues revealed, processed, confirmed, and rejected;
- candidate count after every confirmed clue;
- each node boundary where available fragments cannot buy every next available filtering clue;
- the node at which all filtering clues actually used for the correct identification first become affordable;
- reference attempts, final guess, score spent, final score, and first reasonable-guess point.

Do not record secret values, raw coordinates beyond the existing run contract, or unnecessary player-identifying data.

Run six manual expeditions across at least three of the pilot species after Steps 1–3. Use ordinary play, not debug grants. After each run, ask the player—without showing the clue list—to state the location context and the observations that drove the guess.

Set these provisional thresholds before testing; do not move them after seeing results:

| Gate | Pass threshold across six runs |
|---|---|
| Scarcity creates choices | At least four runs contain at least two node boundaries where the wallet cannot buy every next available filtering clue |
| Evidence does not saturate early | No more than two runs can afford every filtering clue actually used for the correct guess before the halfway route node |
| Deduction uses a chain | In at least four runs, candidate count reaches two or fewer only after confirming at least two independent filtering clues |
| Board pressure is present | Median completed node uses 50–90% of its move budget |
| Mobile-session pacing | Median board phase is 3–8 minutes and median deduction phase is 1–4 minutes |
| Learning survives the UI | In at least four runs, the player recalls the location context and at least two board-earned observations unprompted |

These six runs are a directional product pilot, not statistical proof.

**Decision rule**:

- **Keep and deepen match-3** only if the scarcity, early-saturation, and deduction-chain gates pass and at least two of the remaining three gates pass.
- **Stop before the remaining 22 decks and open a redesign plan** if early saturation occurs in at least four runs, or if fewer than three runs contain even one scarcity choice.
- **Rebalance once and repeat the same six-run protocol** for any other mixed result. If the repeat remains mixed, stop for a product decision; do not author the remaining 22 by default.

**Verify**:

- `npm test` and `npm run typecheck` exit 0.
- Six run summaries contain every required metric.
- A written keep/rebalance/redesign decision cites each threshold and the observed count or median.

### Step 5: Expand to all 28 mammals only after a keep decision

Enter this step only when Step 4's recorded decision is **keep and deepen match-3**.

Author the remaining 22 mammals in reviewed batches of at most six, using the dossier and 15-row process from Step 3. This makes the full plan XL; the gate prevents the largest editorial cost from being paid before the board proves useful.

Coverage rules after all 28 profiles exist:

- Validate every individual filtering clue against the full content corpus.
- Simulate sequential intersections using the real `filterCandidates` semantics; warn if an ordinary two-to-three-clue path yields zero candidates.
- Allow the signature clue to reach one or two candidates.
- Treat full-pool coverage as authoring QA, not as a requirement that every live run expose all 28 candidates.

**Verify**:

- `npm run seed:deduction -- --check` reports 28 mammal profiles, 15 clues each, and zero hard errors.
- Add a machine-readable coverage report containing per-clue matches and sequential candidate counts.
- Manually read each species' 15 labels without names and confirm they form one animal portrait.

### Step 6: Defer active GIS encounter pools until the evidence gate passes

Do not implement the proposed 6–12 candidate pool in this plan. If Step 4 says to keep match-3, write a follow-up design/implementation plan that:

- starts from the raw IUCN `species.iucn_id = iucn.id_no` geometry join;
- ranks species by range, verified habitat tags, and route context rather than declaring a point observation as species proof;
- creates a transparent fallback for locations with no plausible endangered species;
- sends only the selected case pool to `/api/species/deduction` while retaining the global album/catalogue;
- validates that each selected pool has enough fair clue intersections.

**Verify**: Do not start implementation until the Step 4 decision is “keep match-3” and the follow-up plan is approved.

## Test plan

- Add pure unit tests for `filterCandidates` using one-tag atomic clues and multiple ANDed clues.
- Add validator tests under existing `tests/lib/` or new `tests/scripts/` for deck shape, tag syntax, tag subset, name leakage, atomic filtering, forbidden `misc:` filtering, and pilot/full-corpus genus rules.
- Add GIS mapping tests for canonical habitat tags and green-survey non-filtering behavior.
- Add a wallet-mapping regression test proving the dormant habitat category has no authored v1 reveal path.
- Add a regression test proving `COUNT(DISTINCT c.id)` is used when reporting clue rows alongside raw IUCN range polygons.
- Run `npm test` and `npm run typecheck` after every implementation step.

## Done criteria

- [ ] The six-species pilot uses the same 15-row evidence contract before playtesting.
- [ ] Filtering clues are atomic and have a coherent visible claim.
- [ ] No filtering clue uses an unsupported `misc:` tag or singleton `genus:` tag.
- [ ] Green GIS survey tags are canonical and do not silently eliminate candidates.
- [ ] Run summaries support an evidence-economy playtest.
- [ ] A threshold-backed keep/rebalance/redesign decision exists before authoring the remaining 22 mammals.
- [ ] If and only if the decision is keep: all 28 mammals have reviewed deduction profiles and check-only validation passes.
- [ ] `npm test` and `npm run typecheck` pass.

## STOP conditions

- The live clue/reveal design requires 17 species-authored rows after all; stop and obtain a product decision instead of silently changing the contract.
- The test preflight fails because the current uncommitted runner/tests are absent; stop and rescope the missing harness rather than hiding setup inside Step 1.
- Canonical GIS tags cannot express a real feature class without a one-off `misc:` tag; stop and define a controlled vocabulary extension.
- A raw IUCN range query has no plausible species for a chosen location; do not invent a local candidate.
- The run API cannot accept additive summary fields without a schema migration; stop and plan that migration explicitly.
- Source material cannot substantiate a proposed clue; return it to the research backlog rather than inventing biology.
- Step 4 returns redesign or an inconclusive repeated pilot; do not author the remaining 22 profiles.
- A verification command fails twice after a focused repair attempt.

## Maintenance notes

- The global 28-mammal corpus is an authoring and collection set. A later active encounter pool must be a separate layer, not a replacement for the catalogue.
- Any future change to `compareTags` semantics must update seeds, validator coverage simulation, UI feedback, and tests together.
- Reviewers should scrutinize content truthfulness and candidate-pool fairness as closely as TypeScript correctness.
- This plan intentionally defers the remaining 22 decks, candidate-pool selection, and any match-3 replacement until the Step 4 playtest earns that investment.
