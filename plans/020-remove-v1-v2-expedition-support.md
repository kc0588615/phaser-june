# Plan 020 — Remove v1/v2 expedition support (v3 only)

Status: APPROVED 2026-07-20 — owner confirmed: hardcode v3 (delete flag), abandon in-flight v1/v2 runs.
Date: 2026-07-20.

## Current state (verified 2026-07-20)

- New-run version is server-controlled at `src/app/api/runs/route.ts:28`:
  `EXPEDITION_CASE_VERSION === '3' ? 3 : 2` — **code default v2**.
- Local `.env.local` pins `EXPEDITION_CASE_VERSION=3`; **Vercel prod never got the secret**
  (plan 015 gate, still open). Prod DB confirms: fresh v2 runs created 2026-07-19 ~21:26 UTC.
- Prod DB run inventory (`eco_run_sessions.metadata->casePublic->>version`):
  - v1: 1 active, 3 deduction, 2 completed
  - v2: 2 active (started 7/19), 4 completed
  - v3: 7 active, 1 deduction, 1 completed (local dev sessions on prod DB)
  - pre-case (null): 123 active + 58 other — already rejected on resume ("Expedition format updated")
- In-flight v1/v2 runs span only 2 player_ids (`0dfdeead…`, `bf0d3fee…`) — presumed owner test accounts.

## Owner decisions required before execution

1. **Hardcode v3** (delete `EXPEDITION_CASE_VERSION` flag entirely) vs set the Vercel secret and keep the flag. Recommendation: hardcode — the flag is meaningless once v1/v2 code is deleted.
2. **Abandon the 6 in-flight v1/v2 runs** (`UPDATE … SET run_status='abandoned'`) vs let resume-rejection + abandon-stale-runs cron age them out. Recommendation: abandon explicitly, single UPDATE, before deploy.

## Phases

### Phase 1 — prod cutover (no code delete yet)
- Deploy nothing; runs route already creates v3 when flag=3. If keeping flag: set Vercel secret now. If hardcoding: fold into Phase 2 deploy.
- Abandon in-flight v1/v2 runs (decision 2):
  `UPDATE eco_run_sessions SET run_status='abandoned', ended_at=now() WHERE metadata->'casePublic'->>'version' IN ('1','2') AND run_status IN ('active','deduction');`

### Phase 2 — server code removal
- `src/app/api/runs/route.ts` — drop flag read + v2 branches (`compiled.version === 2` seed block, `objectiveType`/`objectiveTarget`/`moveBudget` ternaries); always compile v3.
- Delete `src/lib/caseCompiler.ts` (v1, ~600 lines) and `src/lib/caseCompilerV2.ts`; keep the v3 compiler path only. Check shared exports (`caseCorpusVerifier.ts`, `evidenceSeedValidation.ts`, `caseOffers.ts`) — move anything v3 still imports, delete the rest.
- `src/lib/runCaseState.ts`, `src/lib/runProjection.ts` — collapse `version: 1 | 2 | 3` unions to v3 shapes; parse of stored v1/v2 snapshots may return null → resume rejection path (same UX as pre-case runs).
- API routes: `observations` (v1 signature-attempt + v2 branches), `research-choice`, `nodes/[nodeIndex]/complete`, `runs/[runId]` — strip version branches; non-v3 runs get 409/format-updated.

### Phase 3 — client code removal
- `src/expedition/caseFlow.ts` — remove `choose_method`, `signature-attempt`, v1 `nodeMethods` recovery; `createFlowState` v3-only.
- `src/contexts/ExpeditionContext.tsx` — remove all `version === 1|2` branches (offeredMethods, selectedMethods, method gems, evidenceRefs guess body).
- `src/game/scenes/Game.ts` — remove `caseVersion` branches + method-gem objective flow (~20 sites).
- `src/MainAppLayout.tsx` — remove non-v3 in-run map panel branch (`caseState?.version !== 3`).
- `src/components/FieldNotebook.tsx`, `GemSignalStrip.tsx` — strip method-tile / offer UI reachable only in v1/v2.
- `src/expedition/methodVerbs.ts`, `caseOffers.ts`, `domain.ts` — delete or trim to what v3 imports.
- `src/types/expedition.ts` — `version: 3` only; drop `MethodType` plumbing if v3-unused.
- KEEP: `boardTypes.ts` / `boardCheckpoint.ts` / `BackendPuzzle.ts` `version: 1` — board-checkpoint schema, unrelated to case version.

### Phase 4 — tests + docs
- Update/remove: `tests/lib/caseCompiler.test.ts`, `tests/lib/runProjection.test.ts`, `tests/expedition/caseFlow.test.ts`, `tests/expedition/domain.test.ts`.
- Env examples: drop `EXPEDITION_CASE_VERSION` from `.env.example` (if hardcoding).
- Docs: note in `docs/EXPEDITION_RUN_LOOP.md`; update `plans/README.md` (018 note says "do not select 3 without approval" — supersede).
- AGENTS.md / CLAUDE.md: no v1/v2 references expected; verify with `rg`.

## Verification
- `npm run typecheck`, `npm test`, `npm run build`.
- `npm run verify:case-compiler` still passes (v3 path).
- Resume check: load app with an abandoned/legacy run id in localStorage → clean "format updated" rejection, no crash.
- Prod DB after cutover: new runs all `version=3`; no new v2 rows.

## Rollback
- Phase 1 is reversible (re-set flag / restore run_status from ended_at IS NOT NULL + abandoned filter).
- Phases 2–4 are a git revert; no DB migration involved (metadata jsonb untouched — old snapshots simply become unparseable → resume-rejected).

## Handoff to codex 2026-07-20

Phase 1 done (DB abandonment ran). Most of phase 2/3 done in this working tree by claude:
deleted `caseCompiler.ts`, `caseCompilerV2.ts`, `caseCorpusVerifier.ts`, `caseOffers.ts`,
`methodVerbs.ts`, `GemSignalStrip.tsx`, `scripts/seed-evidence.ts`, `observations`/`research-choice`/
`nodes/[nodeIndex]/complete` routes, matching tests. rewrote `runs/route.ts`, `runProjection.ts`,
`runCaseState.ts`, `runs/[runId]/route.ts` (dropped PATCH), `guess/route.ts`, `caseFlow.ts`,
`types/expedition.ts`, `EventBus.ts`, `Game.ts`, `ExpeditionContext.tsx`, `MainAppLayout.tsx`,
`FieldNotebook.tsx` (stripped to `choose_evidence` panel only). New `src/lib/caseTraits.ts` holds
shared `CompilerSpeciesProfile`/`CaseTraitCategory` types pulled out before deleting `caseCompiler.ts`.

codex was concurrently editing overlapping/adjacent files in this same tree (`caseCompilerV3.ts`,
`evidenceFamilySeedValidation.ts`, `verify-case-compiler.ts`, `ExpeditionMapHud.tsx`,
`FamilyCardStack.tsx`, `MapLibreExploreMap.tsx`, plus unrelated species-browser files) — run
`git status`/`git diff` first to see the combined state before continuing.

Known remaining compile errors, not yet fixed:
1. `src/lib/evidenceSeedValidation.ts:9` imports `CompilerCard` from deleted `caseCompiler.ts`.
   Trim dead v1/v2 corpus-validation code but KEEP `EVIDENCE_PROTOTYPE_IUCN_IDS` +
   `parseEvidenceProfileDossier`/`EvidenceProfileDossier` — still used by v3's
   `scripts/seed-evidence-family.ts`.
2. `src/components/CandidateRoster.tsx`: `onGuess` prop still typed `(speciesId, refs)` two-arg,
   called as `onGuess(profile.speciesId, [])`. `ExpeditionContext.handleGuess` is now
   `(speciesId: number) => Promise<boolean|null>`, one arg. Fix prop type + call site.
3. `src/components/RunCompleteSummary.tsx:97` references `caseState?.interpretations.length` —
   that field was removed from `CaseState` in `types/expedition.ts`. Swap to something that exists
   (e.g. `observations.length`) or drop the stat.

Next: `npm run typecheck`, iterate. Sweep `EvidenceFamilyRail.tsx`, `ExpeditionMapHud.tsx`,
`SpeciesPanel.tsx`, `ExpeditionRouteRecap.tsx`, `ExpeditionBriefing.tsx` for other stale `CaseState`
fields (`method`, `selectedMethods`, `offeredMethods`, `citedObservationRefs`, `fieldNotes`,
`pendingInterpretationRef`, `missedEvidenceNodeIndexes`). Then `npm test` — likely need to
delete/update `tests/expedition/caseFlow.test.ts`, `tests/lib/runProjection.test.ts`,
`tests/expedition/domain.test.ts`. Then `npm run build` and `npm run verify:case-compiler`.

Phase 4 still open: drop `EXPEDITION_CASE_VERSION` from `.env.example`, update
`docs/EXPEDITION_RUN_LOOP.md`, update `plans/README.md` (currently says don't select case v3
without approval — supersede that line), confirm no v1/v2 refs left in `AGENTS.md`/`CLAUDE.md`.

Please take it from here: finish the typecheck/test/build pass + phase 4 docs.
