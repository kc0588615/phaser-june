# 038 — Live claims: solve the case during play, not after it

Owner decision, 2026-09-20. Builds on [035](035-evidence-ladder-continuous-deduction.md) (ladder facts already rule candidates out live). Independent of 036/037. Preserve unrelated tree changes; no commit until the owner asks.

## Problem

Species deduction now moves every swap, but the ecological explanation is still a static four-way quiz at the end, and the whole case is locked behind three completed sites. A player who has already worked out the animal sits in a "Final Field Diagnosis" screen fixing the other claim instead of investigating. Deduction should be the game from the first match, and both questions should be visible, live, and answerable when the player is ready.

## Design locks

1. **Two independent claims, live from move one.** Species and explanation each have a state: `open`, `locked` (confirmed correct), `slipped` (case failed). A correct claim locks and stays locked while the other remains investigable. The case resolves when both lock.
2. **Explanations get evidence, not just labels.** Every ladder rung and hard card may carry explanation effects. A revealed fact marks each hypothesis `open`, `supported`, or `contradicted`. States are shown; nothing is auto-confirmed. The player still submits.
3. **Wrong claims cost.** Each wrong submission on either claim costs score and counts toward one shared limit of **three** wrong claims per case. The third slips the case (`completionReason: 'slipped'`, run completed, no discovery award). This is what keeps "answer any time" from becoming brute force over 6 × 4 options.
4. **Sites become optional, not gates.** The three real clips and their hard cards stay. The case may resolve after any move. Unplayed sites are not required; finishing early is rewarded by the existing efficiency bonus, not penalized.
5. **Answer safety, same pattern as the ladder.** No rung or card of the answer species may contradict the answer explanation. Compiler and seed validation enforce it. Server refuses rather than mis-marks if content drifts.
6. **No numbers on the UI.** No percentages, no confidence meters. Three-state chips for hypotheses, dim/strike for candidates, one-line "what changed" toasts.
7. **One evidence model.** Ladder facts, hard cards, and later Phase C presence records all feed the same claim-update path. Nothing new is invented for the end screen.

## Content model

Explanation effects live next to the tag on each rung and card in `db/seeds/pools/<slug>/evidence/<species>.json`:

```json
{ "text": "Its food comes from plants, not from other animals.",
  "weak_tag": "food_source:plants",
  "explains": { "supports": ["subsurface-foraging"], "contradicts": ["wind-pattern"] } }
```

- Slugs must be explanation ids from that species' own case (`cases/<case>.json` → `public.explanationChoices[].id`).
- `explains` is optional; a fact with none only affects species.
- Cards get the same optional field. Effects apply on reveal (rung) or on choice (card).
- Loader: new columns `evidence_family_hints.explains jsonb` and `evidence_family_cards.explains jsonb` (nullable). One migration, additive, no case-version change. The 035 snapshot (`casePrivate.familyHints`) gains the effects too so live runs are immune to content reloads, same rule as hint text.
- Validation (seed, compiler strict, run-creation non-strict): every slug exists in the species' case; the answer explanation is never in `contradicts` for any rung or card of that species; at least one rung or card `contradicts` each non-answer explanation (strict only, so a case is solvable by evidence, not just by guessing); `supports` for a non-answer explanation is allowed (red herrings are fine, but cap at two per case).

Author effects for all six prototype-six cases (30 cards, 90 rungs). Most rungs will carry nothing; aim for 3–5 effects per case so every hypothesis can be contradicted by play.

## Server

**Claim state** in `metadata.claims`:

```ts
interface ClaimState { species: 'open' | 'locked'; explanation: 'open' | 'locked'; wrongClaims: number; lockedSpeciesId?: number; lockedExplanationId?: string }
```

**Hypothesis state** is derived, never stored: fold `explains` of every ledger entry and applied card into `{ [slug]: 'open' | 'supported' | 'contradicted' }` (contradicted wins). Expose it in the progress response (`hypotheses`), the choice response, and the GET projection. Public projection must carry states only, never the effects table or which fact will contradict what.

**Guess route** (`POST /api/runs/[runId]/guess`) becomes per-claim:

- Body: `{ claim: 'species', speciesId }` or `{ claim: 'explanation', explanationId }`.
- Allowed whenever `runStatus` is `active` or `deduction` and the claim is `open`. Remove the `evidence_incomplete` (3 applications) and `not_guess_ready` gates. Keep `candidate_eliminated` (cannot claim a struck species) and add `hypothesis_contradicted` (cannot claim a contradicted explanation).
- Correct: lock the claim, return `verdict: 'supported'` plus the existing private feedback text for explanations. If both are locked, complete the run exactly as today (finalScore, awards, memory, discovery), reusing the current completion block.
- Wrong: `wrongClaims += 1`, return `verdict: 'revise'` plus feedback text. On the third wrong claim, complete the run as `slipped`: `runStatus: 'completed'`, no bonuses, no discovery award, memory row written with `deductionSummary.slipped = true`.
- Idempotency: same `claim` + same id at the same `wrongClaims` count returns the stored verdict.
- Scoring: keep `applyWrongGuessDecay`, fed by `wrongClaims`. The efficiency bonus uses sites completed (0–3) instead of paid clue count, so early resolution scores higher.
- Legacy runs (no `metadata.claims`): derive `claims` as both `open` with `wrongClaims = wrongGuessCount` on first touch.

**Evidence-choice route**: still applies the card, closes the family, and advances the site; also folds card `explains`. No longer sets `runStatus: 'deduction'` as a gate; after site three it stays `active` with no board, and the claims panel is the only remaining action.

**Run completion after early resolution**: unplayed nodes are marked `skipped` (already allowed by the `eco_run_nodes.node_status` CHECK from migration 007; no schema change). `resolveCompletedRunRoute` must accept fewer than three completed nodes.

## Client

- `CaseState` gains `claims`, `hypotheses`, and `explanationFeedback: Record<string, string>` for texts already revealed by wrong or correct submissions.
- **Live claims panel** (`src/components/CaseClaimsPanel.tsx`): two rows, always reachable from the HUD during a run. Species row: candidate strip with strike marks, submit button enabled only for live candidates. Explanation row: four hypothesis chips with `open`/`supported`/`contradicted` states, submit enabled only for non-contradicted. Shows `wrongClaims`/3 as three small marks, not a number. Locked rows collapse to their answer.
- `CaseDiagnosisPanel` is retired; its verdict/feedback copy moves into the claims panel. The completed-case summary (resolution, evidence chain, sources) stays and appears when both lock.
- Progress toasts: after a move, if any hypothesis changed state, add one line: "New Behavior evidence — wind-pattern weakened." Reuse the ticker `kind: 'evidence'`.
- `caseFlow.nextFlowStep`: `guess` is no longer a stage reached after node three; the board stays the primary stage and claims are a parallel panel. After site three with claims still open, stage is `claims_only`.
- Fact ledger rows show the explanation effect they carried ("weakens wind-pattern") once revealed.

## Tests

- Hypothesis fold: contradicted wins over supported; unaffected stays open; answer never contradicted for every prototype case (fixture-driven).
- Seed and compiler validation: unknown slug, answer contradicted, uncontradictable non-answer (strict only), more than two red herrings.
- Guess route logic (`decideClaim` pure function): lock on correct, revise on wrong, slip on third, idempotent repeat, cannot claim struck species or contradicted explanation, both-locked completes.
- Projection: hypothesis states present, effects table and slugs-per-fact absent from the public payload.
- caseFlow: resume into `claims_only`, resume with one claim locked, legacy run without `claims`.
- Efficiency bonus by sites completed.

## Rollout

1. Migration (two nullable jsonb columns) on rehearsal, then production, owner-run.
2. Author `explains` for prototype-six; `seed:evidence-family --check`, `--write`, `verify:case-compiler` strict passes.
3. Deploy runtime; existing runs keep working (claims derived, hypotheses all `open` until new facts arrive).
4. Playtest: solve a case after site one; lock species then fix explanation while still matching; slip a case on the third wrong claim and confirm no discovery award.

## Out of scope

Trail routing, spawn bias, presence records (Phase C hooks into the same claim-update path later), any change to move budget or ladder rules, new resources.

## Gates

`npm run typecheck`, `npm test`, `npm run build`, React Doctor `--diff` with no new findings, browser check desktop and mobile. Record real results here. No commit until asked.
