# Plan 017: Implement Contextual Method Choice and Tiered Evidence

## Summary

Replace fixed Track→Observe→Survey expeditions with three contextual research choices. The selected method becomes the board objective; its largest match determines evidence quality.

No move log, energy, or Insight currency. Preserve current score/guess bonuses and all v1 runs. Initial scope remains six species.

## Core Gameplay

### Method choice

Before every v2 board, offer two unused methods. Materialize the complete offer tree during run creation and store it in the public snapshot.

Use the first two unchosen methods from these fixed rankings:

| Node | Ranking |
|---|---|
| River | Track, Survey, Analyze, Observe, Listen |
| Canopy | Observe, Listen, Track, Survey, Analyze |
| Urban | Observe, Track, Survey, Listen, Analyze |
| Ridge | Observe, Listen, Survey, Track, Analyze |
| Storm | Survey, Track, Analyze, Listen, Observe |
| Analysis | Analyze, Observe, Survey, Track, Listen |
| Custom | Track, Observe, Survey, Listen, Analyze |

Questions:

- Track: “What signs did the animal leave behind?”
- Observe: “What can a direct sighting reveal?”
- Listen: “What can its sounds reveal?”
- Survey: “Which habitat conditions fit the animal?”
- Analyze: “What can a biological sample confirm?”

Chosen methods cannot repeat, even after a failed node. Offers depend only on public node types and prior choices—never answer, case seed, evidence coverage, or GIS answer weighting.

Keep offer derivation as a pure function. On create/resume, re-derive it and reject a persisted tree that differs.

### Evidence tier

Track the largest contiguous selected-method match group across direct resolution and cascades:

- No target match: `0`
- Match 3: tier 1, Broad
- Match 4: tier 2, Replicated
- Match 5–8: tier 3, High-resolution

A direct match-3 followed by a selected-method cascade match-5 produces tier 3. Off-method matches never affect evidence tier. Ties use the maximum group length; totals and unique-cell counts are irrelevant.

`bestTargetMatchLength` is bounded to `0` or `3..8`, monotone non-decreasing, and writable only while the node is active. The server derives tier from this value; clients never submit a tier.

Successful objective + length ≥3 issues evidence. Failed objectives always issue zero evidence.

No durable move log: bounded telemetry is proportionate for solo play. Reconsider only if competitive scoring, leaderboards, or PvP are introduced.

## Evidence Corpus and Compiler

### Content contract

Expand from 42 to 96 reviewed cards:

- Six species.
- Five methods × three tiers = 15 ordinary cards/species.
- One signature card/species.
- Reuse the existing `specificity` field as `EvidenceQualityTier = 1 | 2 | 3`.
- Reuse the existing sensory, concise, sourced, species-name-free writing rubric.
- No database migration.

For every species and method:

`survivors(tier3) ⊆ survivors(tier2) ⊆ survivors(tier1)`

The answer must belong to every survivor set. Higher tiers therefore eliminate the same or a larger candidate set, never fewer.

Every ordinary tag must occur in 2–5 prototype profiles. Update reviewed deduction profiles and controlled vocabulary where Listen, Analyze, or tier nesting requires new traits.

### Exhaustive checker

Add a pure compiler enumerator before authoring the new cards. Run all:

- 6 answers
- 60 distinct three-method permutations
- 27 tier paths
- 9,720 shapes total

Use the same public profile matrix as `computeActualEliminatedIds`.

Hard assertions:

- Answer always survives.
- Candidate set never expands or becomes empty.
- Tier 1 may corroborate without reducing.
- Tier 2/3 must reduce while multiple candidates remain.
- Residual candidate count after node 3 is at most 3.
- An eligible signature resolves residual ambiguity to exactly 1.
- Tier nesting holds for every species × method cell.

Decision: tier-1 corroboration is intentional pedagogy, not a corpus defect. The completed checker reports 4,140 tier-1 corroborations across 9,720 enumerated shapes. Broad samples may confirm an existing hypothesis without narrowing it; tier 2/3 carry the mandatory reduction contract. Revisit the frequency from play telemetry if corroboration feels unrewarding, but sharper tier-1 cards are not a launch gate.

Run the checker in report mode against the current corpus before content authoring, then make it a CI failure for the completed 96-card corpus.

## Architecture and APIs

### Versioned snapshots

Use discriminated unions:

- `PublicCaseV1`: current candidates, fixed methods, board seeds.
- `PrivateCaseV1`: current fixed evidence chain.
- `PublicCaseV2`: candidates, board seeds, materialized offer tree.
- `PrivateCaseV2`: answer, case seed, 5×3 immutable card-ID matrix, signature card ID.

Missing private version plus valid `chainCardIds` means v1. Pre-v2 runs continue through the old flow; they do not enter the legacy-reset branch and do not show planning or quality UI.

New v2 fields are non-nullable. Add quality and justification bounds to `RUN_CHECKPOINT_LIMITS`.

Run identity and create idempotency are separate. The server always generates `eco_run_sessions.id`. `createRequestId` is an optional client UUID; the server generates one when omitted and stores it in a separate nullable legacy-compatible column. A unique `(playerId, createRequestId)` index makes retries resolve the original run and public offer tree. Migration 025 must precede the v2 application deploy.

### Pure flow first

Extend `caseFlow.ts` with a `choose_method` step before each unplayed v2 node.

Use one projected node state across components:

- offered
- chosen
- board active
- objective met
- objective failed
- evidence issued
- interpreted
- cited

Implement parsing, validation, idempotency, and state-transition decisions as pure `runCaseState.ts` helpers. Route handlers only authenticate, lock rows, invoke these helpers, and persist results.

### Research-choice endpoint

Add a Clerk-protected transactional endpoint:

```ts
{
  method: MethodType;
}
```

Server behavior:

- Lock run and node rows.
- Verify ownership, v2 run, active node, and current offer path.
- Reject methods outside the exact public offer pair.
- Reject methods selected on earlier nodes.
- Same-method retry returns the persisted choice.
- Different-method retry returns `409 choice_locked`.
- Persist choice before the board becomes actionable.

Timing:

- Node 0 `choiceOfferedAt` is written during run creation.
- Nodes 1–2 receive `choiceOfferedAt` in the transaction committing the preceding interpretation.
- Compute choice latency server-side at method commit and clamp to the existing one-hour limit.
- Do not measure from database node activation.

### Quality checkpoint and issuance

Extend the existing checkpoint with `bestTargetMatchLength`.

- Store `max(existing, incoming)`.
- Reject writes after node completion.
- Node completion persists the final value atomically.
- Observation issuance derives the tier and selects the corresponding immutable private-matrix card.
- Duplicate issuance returns the original card/tier.
- Card IDs and unused variants never enter public responses.

A v2 signature requires all three nodes complete, at least one interpreted regular observation, every issued regular observation interpreted, and more than one residual candidate. A zero-evidence run proceeds to a blind guess without a signature. `candidateCount` at this eligibility check includes eliminations from committed regular observations only: the check occurs before first signature issuance, and a duplicate signature request returns the persisted issuance before eligibility is recomputed. It therefore never includes an interpreted signature observation.

Keep partial-start retry behavior: a created v2 run and its public offer tree must be reused rather than duplicated after a client retry.

## UI and Deduction

Extend Field Notebook and signal strip:

- `choose_method`: two question cards, waypoint, node rationale, live candidate count.
- Board: selected question, objective progress, and current Broad/Replicated/High-resolution state.
- Completion: objective met/missed.
- Interpretation: observation and quality badge while inference/tag remain hidden until commit.
- Feedback: prediction confirmed/revised or evidence corroborated.
- Final deduction: select evidence, then species.

Quality badge represents sampling quality only. Interpretation correctness remains a separate feedback state.

Final citation contract:

- Require exactly `min(2, interpretedObservationCount)` unique refs.
- Zero refs allowed only when zero observations were interpreted.
- Refs must belong to the run and be both issued and interpreted.
- Citations do not affect species verdict, score, or bonuses.
- Persist cited refs in guess metadata and run memory.
- Wrong guesses may revise candidate and citations.

Remove the unused `observation-earned` event. The board reports objective/quality telemetry; only the server issues evidence.

## Telemetry and Documentation

Record:

- Offered and selected methods.
- Server-derived choice latency.
- Best target-match length and tier.
- Objective result.
- Candidate-count delta.
- Interpretation accuracy/latency.
- Final cited evidence refs.

Update the reasoning report to aggregate method choice, tier distribution, corroboration frequency, and citation use.

Correct expedition-loop, deduction, EventBus, and wiki documentation. State that no energy/Insight currency exists and the score/guess-bonus economy is unchanged.

List, but do not perform:

- Legacy clue-fragment/economy cleanup.
- Album/foil tier surfacing.

## Verification

Automated:

- `npm run seed:deduction -- --check`
- `npm run seed:evidence -- --check`
- New evidence seeder `--dry-run` prints the live replacement diff without writes.
- `npm run verify:case-compiler` covers all 9,720 shapes.
- `npm run typecheck`
- `npm test`
- `npm run build`

Required tests:

- Offer tree identical across different forced answers.
- Offer tree pure re-derivation equals persisted tree.
- Methods never repeat.
- Choice authentication, offer validation, idempotent retry, and locking.
- Match-3/4/5 and selected-method cascades produce correct tiers.
- Off-method matches do not change tier.
- Quality checkpoints are bounded, monotone, and active-node-only.
- Failed objectives issue no evidence.
- Observation retries preserve card and tier.
- Zero regular observations cannot unlock a signature.
- v1 runs finish through the v1 flow.
- Private answer/card fields never appear in public projections.
- Citations reject duplicates, unissued refs, and uninterpreted refs.
- Zero-observation runs can still guess.
- Resume works during method choice, board play, interpretation, and final deduction.

Manual:

- Complete one run at each tier.
- Fail one node and continue without evidence.
- Resume at every new flow stage.
- Confirm three distinct methods across a route.
- Revise a wrong guess with different citations.
- Inspect network responses for answer or unused-card leakage.

## Rollout and Boundaries

1. Land compiler/checker and dry-run tooling before content authoring.
2. Author and review the 96-card corpus.
3. Run the live database dry-run.
4. Obtain explicit approval before replacing deduction profiles or evidence cards.
5. Seed reviewed profiles first and evidence cards second.
6. Deploy v2 code only after the live corpus passes compiler verification.

Deferred:

- Move logs.
- Early guesses.
- GIS board physics.
- Cross-node evidence combinations.
- More than six species.
- Album/foil quality rewards.
- Rarity tuning.
- Economy-remnant cleanup.

Preserve all current uncommitted owner changes. Stop rather than overwriting conflicting work.
