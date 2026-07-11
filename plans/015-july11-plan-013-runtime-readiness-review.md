# Plan 015: July 11, 2026 — Plan 013 Runtime Readiness Review

## Outcome

Plan 013's playable v0 loop is complete and its automated checks are healthy. The server-side case compiler, three-board flow, evidence issuance, interpretation commits, server-side guesses, persistence, migration, and prototype content are present.

Plan 013 as a whole is not code-complete. Phase 7's action-family deletion sweep and free-play owner STOP remain open, and Phase 8's case-compiler metrics harness has not been built.

It is not yet deployment-complete. A signed-in browser playtest, the production Vercel secret, and several lifecycle/product decisions remain.

Plan 013 remains the plan of record. Plan 014 is absorbed into 013 and must not be executed independently.

## Verified status

- TypeScript typecheck passes.
- All 136 tests across 14 test files pass.
- Migration 024 and the `evidence_cards` schema are implemented.
- Six reviewed deduction profiles are seeded.
- The prototype contains 42 evidence cards across six targets, with one signature per target.
- `CASE_COMPILER_SECRET` is configured locally; `.env.example` contains only a placeholder.
- `casePublic.version` is emitted correctly.
- Evidence seed bigint handling is corrected.
- The API/database smoke test passed for three nodes, observations, interpretations, correct guessing, memory creation, sparse routes, and cleanup.
- The answer ID, display identity, private case seed, and compiled card chain remain server-only.
- The FieldNotebook retry regression is fixed: failed interpretation saves retain the player's candidate selections, and selections clear only after durable server acknowledgement.
- Board objective and score claims remain client-trusted by explicit v0 design. This is acceptable for non-competitive play, not authoritative competitive scoring.

### Remaining Plan 013 phases

- **Phase 7:** complete the legacy action-gem deletion sweep. `ACTION_GEM_TYPES` and `computeActionBias` remain active. Do not delete free-play mode until the owner explicitly resolves its STOP.
- **Phase 8:** add and run `scripts/verify-case-compiler.mjs` for the compiler metrics gate.
- Do not call Plan 013 complete until these phases are completed or explicitly deferred by the owner.

## Findings to fix or decide

### P1 — Prevent abandoned runs after partial start failure

`POST /api/runs` creates the session before the client fetches six candidate profiles. If profile hydration fails, the client remains on briefing without recording the new run ID. Retrying creates another run.

Impact:

- abandoned active sessions and nodes;
- distorted run-start and completion metrics;
- no direct retry path for the already-created case.

Live read-only evidence on 2026-07-11: 129 sessions were unfinished, including 104 anonymous sessions and 127 sessions older than 24 hours. Most are older-format runs and do not prove the new partial-start path caused them. They do prove that unfinished-run lifecycle management is already needed.

Recommended fixes:

1. Retain the returned run ID and public snapshot immediately, then retry profile hydration against that existing run. This requires an explicit hydration-retry branch: when a run ID exists but `caseState` does not, re-fetch the six profiles and start the existing case. Merely moving the `runIdRef` assignment earlier would make the current start guard silently reject every retry click.
2. Define an abandonment policy for unfinished sessions, such as an explicit cancel endpoint plus scheduled expiry of stale, non-resumable runs. Keep cleanup separate from run creation and never delete a recent or owned run without checking its state.

Primary file: `src/contexts/ExpeditionContext.tsx`.

### P1 — Choose an anonymous-run contract

Anonymous players can create and mutate a run when they possess its UUID, but `GET /api/runs/:runId` requires Clerk authentication and exact player ownership. Anonymous runs therefore cannot resume or appear in the run list.

Choose one:

1. Require sign-in before starting an expedition. This is the simplest v0 contract.
2. Support guest resume with a separate high-entropy capability token. Do not treat the run UUID alone as the long-term authorization mechanism.

Primary files:

- `src/app/api/runs/route.ts`
- `src/app/api/runs/[runId]/route.ts`
- `src/app/api/runs/list/route.ts`

### P1 product decision — Make wrong guesses meaningful

Wrong guesses currently record metrics and return useful contrastive feedback, but they do not reduce score or final rewards. A player can brute-force the six candidates after completing the observation loop.

Recommended v0 rule: keep wrong guesses non-blocking, but reduce the remaining deduction bonus after each wrong attempt. Compute and apply this decay server-side in `guess/route.ts`, using its persisted `wrongGuessCount`. Do not move the decay rule into shared `getGuessBonuses`, which client code also imports. This preserves corrective learning while keeping scoring authoritative and rewarding accurate inference.

Primary file: `src/app/api/runs/[runId]/guess/route.ts`.

### Deployment blocker — Configure the server secret in Vercel

Local configuration is complete. Production run creation returns HTTP 503 until `CASE_COMPILER_SECRET` is configured in Vercel and the application is redeployed.

Never expose this value to client code or use a `NEXT_PUBLIC_` name.

Primary file: `src/app/api/runs/route.ts`.

### Acceptance blocker — Complete a real browser playtest

The API smoke test does not verify Phaser input, board transitions, overlay timing, map/route presentation, responsive layout, or browser resume behavior.

Run this signed-in path:

1. Select a map location and open the briefing.
2. Start the expedition and finish board 1.
3. Commit its interpretation and verify board 2 appears only afterward.
4. Refresh during board 2 and resume the same case. Expected v0 behavior: the correct board resumes with objective progress reset to 0. Mid-board progress is deliberately not checkpointed by the client; the existing server PATCH capability is currently unused for this purpose. Do not report that reset as a defect during this acceptance pass.
5. Finish boards 2 and 3 and their interpretations.
6. Verify optional signature behavior.
7. Submit a wrong guess and inspect contrastive feedback.
8. Submit the correct guess and verify completion, score, discovery, memory, and run-list display.
9. Inspect browser network responses for answer ID, answer name, private seed, or compiled chain leakage.
10. Repeat once at a sparse location and once on a narrow/mobile viewport.

## Non-blocking observations

- Interpretation payloads contain inference/tag fields before the UI reveals them. Ordinary players do not see them, but browser tooling can. Server-side pre-commit withholding remains optional hardening.
- The previously reported anonymous run with prefix `ddf3c9ae` was confirmed live and unfinished: status `active`, three nodes, one completed node, started 2026-07-11 at 17:38 UTC. It may be a real interrupted playtest, so it was left untouched.
- A newer authenticated run with prefix `846eb4f2` was also unfinished in `deduction` with all three nodes completed. This is likely an active or intentionally resumable test and was left untouched.
- Live content counts remain correct: 42 evidence cards across six targets, including six signature cards.
- React Doctor still reports broad pre-existing dependency/UI debt. No reported item currently blocks the Plan 013 runtime.

## Execution order

1. Run the signed-in browser acceptance path.
2. Fix partial-start retry handling and define stale-run cleanup semantics.
3. Decide and implement the anonymous-run contract.
4. Decide and implement the wrong-guess reward rule.
5. Resolve the Phase 7 free-play STOP and complete the approved deletion sweep.
6. Implement and run the Phase 8 case-compiler metrics harness.
7. Re-run typecheck, tests, API smoke, and the browser acceptance path.
8. Configure `CASE_COMPILER_SECRET` in Vercel and redeploy.
9. Commit the Plan 013 implementation in bounded, reviewable chunks.

## Current gate

Automated gate: **PASS**.

Local API/database integration gate: **PASS**.

Browser acceptance gate: **PENDING**.

Plan 013 completion gate: **PENDING PHASES 7–8 / OWNER STOP**.

Production deployment gate: **PENDING VERCEL SECRET**.

## Implementation update — 2026-07-11

- Partial-start profile hydration now retries the already-created run.
- New runs and all case mutations require a signed-in exact owner.
- Players can soft-abandon unfinished owned runs; a secured daily cron soft-abandons stale anonymous or non-resumable legacy runs after seven days.
- Wrong guesses reduce both remaining deduction bonuses by 25% per attempt, server-side only.
- Phase 7 action gems, counter-gem mechanics, affinity board buffs, historical counter displays, and the free-play guess path are removed. Method objectives use an explicit `objectiveGem`.
- Phase 8 compiler harness passes 200/200 deterministic cases with no dead reveals, 0% signature fallback, and a stable snapshot hash. The reasoning metrics reporter is implemented.
- Typecheck, tests, evidence validation, compiler harness, and production build pass.
- Still pending: authenticated full browser path, live reasoning report (SSH tunnel unavailable), `CASE_COMPILER_SECRET` + `CRON_SECRET` in Vercel, and redeploy.
