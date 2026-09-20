# 035 — Evidence ladder: continuous deduction between hard clues

Owner request, 2026-09-19. Implemented in the working tree alongside 034 Phase A; no commit, no schema change, no production write.

## Problem

v4 deduction was punctuated: eighteen moves, three hard clues at the site ends, and the candidate pool only moved at those three stops. Direct-match hints were ticker text with no consequence, so matching a colour taught nothing about which candidates it hurt. The COG review's Speak contract asks for the opposite: a match is how you analyze presence, the six candidates must change state in public, and the rail must teach reading, not farming.

## Design

**Ladder, not wallet.** Each family owns an ordered ladder of 3–5 reviewed facts about the answer (`evidence_family_hints`, now with a real `weak_tag` per rung). A direct match climbs the matched family's ladder one rung. Every live candidate lacking that rung's tag in the family's trait category is ruled out at once. Ladders are authored broad → narrow: rung 0 is the general "not X" comparison (rules out one animal), later rungs are positive traits (plant eater → strict herbivore). A ladder never identifies the animal by itself (final rung keeps ≥2 survivors); families combine.

**One Speak per swap.** Among direct matches, the family with the most cleared cells speaks (ties → replay order). A completed ladder yields to the next matched family. A Field Signal payout adds its one or two rungs on the clearing family. Cascades never climb. A move that reveals nothing shows a muted "no new fact" line — visibly not a reward.

**Hard card stays decisive.** The six-move family choice still applies the card, closes the family, and issues observation/inference/bonus fact. It now applies on top of ladder eliminations and may add nothing new; the pool may already be at one. Ladder cursors carry across sites.

**Learn the categories.** Every fact is filed live in a Fact Ledger under its family and trait category (Habits · Diet, Relatives · Lineage, …) with the candidates it ruled out. The roster's five family dots light when a family has spoken and turn red on the candidate that fact struck; the open card lists which fact, verbatim. This is the species-facts-by-category readout from earlier builds, made consequential.

## Safety and invariants

- Rung tags must be canonical for the card category and present in the answer profile → the answer is never eliminated. Server refuses (`corpus_invariant_failed`) rather than mis-eliminating if content drifts.
- Compile-time (run creation): each rung leaves 2–5 survivors alone; cumulative survivors never widen. Corpus verifier and seed validation add the strict rule: every rung removes at least one more candidate.
- Private ids and tags never reach the client: the ledger is stored server-side as `metadata.factLedger` (hint ids), projected as `factLedger` facts hydrated from reviewed text. Projection tests assert no `hintId`/`weakTag` leak.
- Idempotent retries re-hydrate the same move's facts; duplicates cannot double-eliminate.
- Choice-route invariants relaxed: `liveAfter ≥ 1`, and the node-3 "must eliminate" rule is gone (ladders may have done the work). Guess route already reads hard-card eliminations; ladder eliminations are informational for guessing (a player may still name a ruled-out animal and be told it is wrong).

## Files

- `src/lib/evidenceLadder.ts` — selection, elimination, ledger parse/hydrate, `validateFamilyLadder`, category labels.
- `src/lib/evidenceRunState.ts` — `applyEvidenceProgress(state, input, issuedFamilies)`; hint-id cycling removed.
- `src/lib/caseCompilerV3.ts` — ladder rules replace `hintWeakensCard` (non-strict compile, strict verify).
- `src/app/api/runs/[runId]/evidence-progress/route.ts` — issues rungs, computes eliminations, persists ledger, returns `facts` + `reinforcedFamilies`.
- `src/app/api/runs/[runId]/evidence-choice/route.ts` — counts ledger eliminations, carries `hintCounts`, relaxed invariants.
- `src/app/api/runs/[runId]/route.ts`, `src/lib/runProjection.ts` — `factLedger` on resume.
- Client: `src/types/expedition.ts` (`CaseState.factLedger`, `reinforce` ticker kind), `src/contexts/ExpeditionContext.tsx`, `src/components/FactLedger.tsx` (new), `CandidateRoster.tsx`, `ExpeditionMapHud.tsx`, `FieldHintTicker.tsx`.
- Content: `src/lib/evidenceFamilySeedValidation.ts` (hint = string | `{text, weak_tag}`), `scripts/seed-evidence-family.ts` writes per-rung tags, `db/seeds/pools/prototype-six/evidence/*.json` re-authored to three-rung ladders (rung 0 keeps the previous first hint).
- Tests: `tests/lib/evidenceLadder.test.ts` (new), `evidenceRunState.test.ts`, `runProjection.test.ts`, `caseFlow.test.ts`.
- Docs: `docs/EXPEDITION_RUN_LOOP.md`, `docs/CONTENT_AUTHORING.md`, `plans/README.md`.

## Prototype-six ladders (authored)

Rung 0 = existing "not X" comparison text (same tag as the hard card). Rungs 1–2 per family:

| Species | Relatives | Body | Behavior | Habits | Place |
|---|---|---|---|---|---|
| Addax | laurasiatheria → not_pangolin | not_scaled_digger → large | group → herd | plants → herbivore | not_south_asian_mainland → africa |
| Golden mole | not_bovid → not_pangolin | not_horned_antelope → small_medium | not_desert_herd → solitary | animals → insectivore | not_south_asian_mainland → africa |
| Asian elephant | not_bovid → afrotheria | not_sand_digger → large | not_defensive_curler → group | not_ant_specialist → plants | tropical → asia |
| Sunda pangolin | laurasiatheria → not_bovid | not_horned_antelope → small_medium | solitary → nocturnal | not_bulk_browser → animals | tropical → asia |
| Tiger | laurasiatheria → not_bovid | not_sand_digger → large | not_desert_herd → solitary | not_ant_specialist → animals | tropical → asia |
| Flying fox | laurasiatheria → not_pangolin | not_horned_antelope → small_medium | not_defensive_curler → group | not_large_prey_hunter → plants | tropical → not_south_asian_mainland |

Every ladder ends at exactly two survivors, so no family solves the case alone; any two families with different final pairs do. `npm run seed:evidence-family -- --check` validates all 30 ladders offline.

## Verification record

- `npm run typecheck`, `npm test` (37 files, 172 tests), `npm run build`: pass.
- Offline seed check: 30 cards, 90 rungs, strict ladder rule, no name leaks.
- Database reload: 2026-09-19 production `--write` after runtime-on-:8080 check and dry-run. Preserved 5 saved v4 ladders; 10 hint upserts and 5 stale-hint deletes per species.
- `verify:case-compiler --pool=prototype-six`: 360 v3 paths, residual 3, passed.
- Not done: authenticated live playtest (POST /api/runs is 401 without a Clerk session).

## Rollout

1. Done 2026-09-19: runtime on :8080 from this tree, then `./scripts/db --production --exec npm run seed:evidence-family -- --pool=prototype-six --dry-run`, `--write`, `verify:case-compiler --pool=prototype-six` (360 paths).
2. Playtest still pending (browser unsigned): match one colour repeatedly — expect rung 1, 2, 3 then "no new fact"; roster dims per rung; ledger files each fact under its category; resume restores the ledger.
3. Tuning knobs: rung count per family (3–5) sets pace; rung 0 copy can be rewritten later without changing tags.

## Relationship to 034 B/C

Phase C's presence-record analysis should feed this ladder (a survey site could unlock rungs or gate Body/Habits speaking on a presence record) rather than add a second evidence path. Nothing here touches terrain, trails, or the six-move budget.


## Review fixes: immutable per-run ladder content

- New cases snapshot all family hint text, tags and trait categories in private `casePrivate.familyHints`. Progress, retries and resume use these snapshots; private content remains excluded from the public projection.
- Before changing authoring rows, the seed transaction locks existing v4 sessions and snapshots their complete old ladders, including fourth rungs. It preserves ledger eliminations, cursors and other metadata. Missing old content aborts the transaction; existing snapshots are never overwritten.
- Deploy the updated runtime before the seed reload. Run the seed dry run first; it validates preservation without writes. Then the normal seed write preserves sessions and replaces the corpus atomically. No schema migration or case-version change.
- `seed --write` locks v4 `eco_run_sessions` `FOR UPDATE` then writes snapshots into player session metadata. Do not run it while runs are mid-move (lock wait). A malformed `familyHints` snapshot makes `parsePrivateCase` return null; that run is unplayable by design.
- Regression coverage: fourth-rung progress after row deletion, unchanged retry/resume facts, metadata preservation, repeat reloads and malformed snapshots. Source changes do not repair already-lost content from an earlier destructive reload.
