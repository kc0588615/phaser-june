# Plan 021 — Player-Marked Deduction, Contrastive Dossier, Reference Slot

## Context

The v3 loop (commit `920f8fb`) made the deduction airtight but took the player out of it: after six board moves the player picks an evidence family, and **the server reveals a clue and eliminates incompatible candidates automatically** (`src/app/api/runs/[runId]/evidence-choice/route.ts:69-77`). The player watches inference happen rather than performing it.

That is the single biggest regression against the goal of memorable educational play. The April build (`48a35af`) had the player predict and compare; `1cf4f98` and `920f8fb` traded it away for loop hygiene. Retention research is unambiguous that the commit-then-feedback shape is what makes facts stick — a revealed fact is recognition, a fact recovered under uncertainty after a commitment is retrieval.

Good news from exploration: the elimination rule (`computeActualEliminatedIds`, `src/lib/runCaseState.ts:62-79`) reads **only public profile tags**, so the client can already compute the same judgment. The comparison engine (`compareReference`, `src/lib/deductionEngine.ts:112`) survived `1cf4f98` intact and is live in the guess route. Almost nothing needs inventing — the work is moving authority from server to player, and surfacing data that already exists but is dropped on the floor.

**Outcome:** the player rules candidates out themselves and can be wrong; each site tells them *how many* marks landed without saying which; the case ends with a contrastive dossier that teaches by comparison; and a scoring tier rewards careful reasoning.

## Decisions taken (from discussion)

| Decision | Choice |
|---|---|
| Working tree | Commit the uncommitted v3-only cleanup as-is first |
| Mark interaction | Tap only the candidates to rule out, then Confirm |
| Wrong marks | Player's marks stand — never silently corrected |
| Truth reveal | Count-only at each site end; per-species truth in the dossier |
| Scoring | End-of-case deduction-accuracy bonus |
| Reference slot | Canonicalize the 22 legacy profiles first, then rebuild |

**Judgment call to confirm:** "reveal at site end" + "marks stand" conflict if site-end feedback is per-species — the player would just correct their roster and the stakes vanish. Site feedback is therefore a **count** ("2 of your 3 marks matched the evidence"), not a per-candidate correction. The player learns they erred and must re-reason *which*. Per-species truth lands in the dossier.

**Never-guess-dead-end rule:** a crossed-out candidate greys out and leaves the active roster view, but the guess UI still allows picking it, with a "you ruled this out" confirm. Wrong eliminations mislead; they never make a run unwinnable.

---

## Phase 0 — Groundwork

**0.1 Commit the cleanup.** 915 changed paths, ~11.5k deletions: removes v1/v2 routes, `GemSignalStrip`, `caseOffers`/`methodVerbs`, most of `FieldNotebook`, plus untracked `plans/019-*`, `plans/020-*`, `src/lib/caseTraits.ts`, `src/game/expeditionHudLayout.ts`. Review `git diff --stat`, run `npm run typecheck` and `npm test`, commit as one `chore:` commit. Nothing in Phases 1-4 depends on the deleted code.

**0.2 Basemap.** `NEXT_PUBLIC_MAP_STYLE_URL` is empty in `.env.example`, so `createFallbackMapStyle` (`src/lib/maplibreStyle.ts`) serves `sources: {}` + one background layer — no place names, rivers, or cities. Set a real style URL in `.env.local`. Config only, no code change. Needs a style URL choice (MapTiler/Protomaps/self-hosted).

**0.3 Delete the empty `src/app/api/species/deduction/` directory** left behind by `1cf4f98`.

---

## Phase 1 — Player-marked elimination

The core change. Server keeps computing truth (the case-quality invariants depend on it) but stops shipping it to the client mid-case.

### 1.1 Stop the leak

`actualEliminatedIds` and `eliminationReasons` currently reach the client on every family choice and on resume. Withhold both until the run completes.

- `hydrateFamilyObservation` (`src/lib/runCaseState.ts:162-178`) — gate the two fields behind a `revealTruth: boolean` argument.
- `choiceBody` (`src/app/api/runs/[runId]/evidence-choice/route.ts:133-149`) — drop `eliminationReasons`; return the new mark-feedback count instead.
- `PublicIssuedObservation` (`src/lib/runProjection.ts:162-173`) and its projection (`:536-552`) — omit both unless `session.runStatus === 'completed'`.
- **Keep `candidateTraitPhrases`** (all six candidates' trait phrase for the family). That is the *evidence* the player reasons from, not the answer.

Persisted truth in `metadata.evidenceApplications[].actualEliminatedIds` (`src/lib/runCaseState.ts:39-48`) stays exactly as-is — it is the dossier's source and the accuracy scorer's key.

### 1.2 Persist player marks

New run-level metadata array, mirroring the `evidenceApplications` pattern:

```ts
// src/lib/runCaseState.ts
export interface V3PlayerMarkRecord {
  ref: string;              // 'obs-0' | 'obs-1' | 'obs-2' — ties marks to the observation
  markedIds: number[];      // candidates the player ruled out on this clue
  correctCount: number;     // |markedIds ∩ actualEliminatedIds| (computed server-side at confirm)
  markedAt: string;
}
```

Stored at `metadata.playerMarks`, with a `parseV3PlayerMarks` validator alongside `parseV3EvidenceApplications` (`:114-138`): max 3 records, unique `ref`, `markedIds` ⊆ `casePublic.candidateIds`.

### 1.3 New route: `POST /api/runs/[runId]/marks`

Body `{ nodeIndex, markedIds }`. Model it on `evidence-choice/route.ts` (row locks, ownership, v3 gate, idempotency by `ref`).

- Requires the matching `evidenceApplications` record to exist (marks come *after* the clue).
- Computes `correctCount` against that record's `actualEliminatedIds`, appends a `V3PlayerMarkRecord`.
- Returns **only** `{ ok, ref, markedCount, correctCount, totalActual }` — a count, never ids.
- Idempotent: re-POST for an existing `ref` returns the stored record unchanged.

### 1.4 Client state

`src/types/expedition.ts` — add to `CaseState`:

```ts
playerMarks: Record<string, number[]>;         // ref -> speciesIds the player ruled out
markFeedback: Record<string, { markedCount: number; correctCount: number; totalActual: number }>;
```

`eliminatedIds` stays but changes meaning: it becomes the **union of player marks**, not server truth. Update both writers in `src/contexts/ExpeditionContext.tsx` — `:226` (post-choice) and `:354` (resume, now rehydrating from `metadata.playerMarks` via the run projection). Add `handleConfirmMarks(markedIds: number[])` next to `handleChooseEvidenceFamily` (`:186-247`).

`eliminationReasons` (`CaseState`, `:50`) is no longer populated mid-case — keep the field, fill it only at completion for the dossier.

### 1.5 Roster UI

`src/components/CandidateRoster.tsx` gains a marking stage between clue reveal and the next board. Existing eliminated-state styling (`:53,61,66,70,72,76,82`) is reused verbatim for player-marked candidates — grey, cross overlay, strikethrough.

- New stage `'marking'` in `CaseStage` (`src/types/expedition.ts`), set after `evidence-choice` resolves, cleared on confirm.
- During `'marking'`: tapping a tile toggles a local `marked: Set<number>`; a footer button reads `Confirm (N marked)`; N=0 allowed ("this rules nothing out" is a legitimate judgment).
- After confirm: show the count feedback line, then advance.
- During `'guess'`: **remove** `disabled={guessing && isOut}` at `:53`. Marked candidates stay tappable; tapping one opens a confirm ("You ruled this out — guess anyway?").

`FieldNotebook.tsx:20,38,47` uses `filterEliminatedCandidates` for its live count — now reflects player belief. No code change, new meaning.

### 1.6 Server-side guard relaxations

- `guess/route.ts:66-67` — **delete** the `candidate_eliminated` 409. With player-owned marks the server has no business rejecting a guess. (Keep the `speciesId ∈ candidateIds` check at `:63`.)
- The case-quality invariants at `evidence-choice/route.ts:73-76` (answer never eliminated, ≥2 live after, final clue must cut, ≤3 live at end) all operate on server truth and are **unchanged** — they still guarantee the case is solvable.

---

## Phase 2 — Contrastive dossier + accuracy bonus

### 2.1 Accuracy bonus

`src/types/expedition.ts:97-103` `getGuessBonuses` gains a third tier. In `guess/route.ts` on the correct path (`:80-206`), sum `correctCount` across `metadata.playerMarks` against total actual eliminations and scale a new `deductionBonus` (suggest 200 max, linear, floor 0). Applied before `applyWrongGuessDecay` (`:267-277`) so it decays consistently with the rest. Persist the accuracy figure into `metadata.deductionSummary` (key already exists).

### 2.2 Dossier data

The correct-guess response returns `contrastiveFeedback: []` today (`:206`), and `bonusFactText` is read at `:133` only to union into `speciesCards.factsUnlocked` — the copy never reaches the run UI. Extend the correct-guess body:

```ts
dossier: {
  answerCards: Array<{ family, observationText, inferenceText, traitPhrase, bonusFactText }>,  // all 5, not just the 3 played
  closestWrong: { speciesId, commonName, survivedFamilies: EvidenceFamily[],
                  separatingFamily: EvidenceFamily, separatingTrait: string,
                  answerTrait: string } | null,
  marks: Array<{ ref, family, markedIds, actualEliminatedIds, eliminationReasons }>  // full truth, case is over
}
```

- **`closestWrong`** = the candidate that survived the most issued clues (ties → lowest id for determinism). The compiler guarantees 1-3 live candidates after three clues (`caseCompilerV3.ts:139-184`), so a residual survivor usually exists; `null` when the three clues isolated the answer exactly.
- **`separatingFamily`** = the family where `card.compareTag ∉ wrongProfile[categoryKey]`, preferring an *unplayed* family (the trait the player never got to see — the highest-value teaching beat). Reuse `compareReference` (`deductionEngine.ts:112`) and `CATEGORY_TO_PROFILE_KEY`.
- Reuse the existing all-six-candidates card query at `evidence-choice/route.ts:57-65`, dropped `family` filter.
- Note `buildMismatchMessage` (`:148-155`) never names the separating trait — new copy needed for the dossier line.

### 2.3 Dossier UI

`src/components/RunCompleteSummary.tsx` (mounted `src/MainAppLayout.tsx:192-197`) gains a dossier section below the existing `SpeciesTCGCard`:

1. **Your deduction** — the three clues with your marks vs. truth. `EvidenceLog.tsx` already renders issued evidence slots from `caseState` alone (`variant: 'detail'`); extend it to overlay mark correctness.
2. **The near miss** — `closestWrong` beside the answer, sharing the `SpeciesTCGCard` renderer dimmed, with the one separating trait called out. `AlbumHeroSwiper.tsx` is the pairing pattern.
3. **Field notes** — the answer's five `bonusFactText` lines, the two unplayed families highlighted as new.

Stat tiles (`:93-98`) gain a Deduction Accuracy tile.

---

## Phase 3 — Tag canonicalization

Prerequisite for Phase 4. Species 1-22 (the April herp set) carry bare tags (`grassland`); the six live case species carry canonical `prefix:value` tags (`habitat_tag:grassland`) and are the only ones with `signature_tag` and `evidence_family_cards`. `compareReference` is raw string intersection, so cross-generation comparison silently returns NO MATCH.

- Use `canonicalizeDeductionTag` from `src/lib/deductionTags.ts` — already pinned by `tests/lib/deductionTags.test.ts` (asserts `grassland` → `habitat_tag:grassland`, cross-category aliasing returns `null`, `iucn:bogus` rejected).
- Write `scripts/canonicalize-deduction-profiles.ts` with a `--check` dry-run mode, mirroring `scripts/seed-deduction.ts:502-505`. Report every tag that canonicalizes to `null` for manual authoring — do not drop them silently.
- Run against the tunnelled DB (`postgres-tunnel` skill), `--check` first, diff reviewed before write.
- Add `tests/lib/deductionEngine.test.ts` — the engine has **zero** direct coverage today and is load-bearing for the live guess route. Pin `compareReference` before anything else touches it.

---

## Phase 4 — Reference slot

Only after Phase 3. Restores the April mechanic: pick an issued clue, place one of your own album cards, get MATCH / NO MATCH.

- **Engine:** `compareReference` as-is. Revive the dead `ReferenceAttempt` type (`deductionEngine.ts:55`) — its shape is already right.
- **Album read path:** `GET /api/species/cards` → owned ids (`SpeciesList.tsx:48-70`, `localStorage` fallback `:485-502`), joined to `GET /api/species/profiles?ids=…`. **Blocker:** `ExpeditionContext.tsx:472` hard-throws unless exactly 6 profiles return — needs a separate non-6 helper.
- **State:** `CaseState.referenceAttempts: ReferenceAttempt[]`.
- **Host:** `FieldNotebook.tsx` — already on the mystery screen with `caseState` in scope, and its `grid-cols-[minmax(0,.8fr)_minmax(360px,1.4fr)]` split (`:43`) fits slot-left / card-strip-right. Its `stage === 'choose_evidence'` early-return (`:23`) needs a second gate.
- **Carousel:** template from `FamilyCardStack.tsx:210-227` / `AlbumHeroSwiper.tsx`.
- **Cost model:** the April doc's `getEffectiveClueCost()` does not exist in the tree. Recommend free-but-limited (N attempts per case) over reviving a fragment currency — `docs/DEDUCTION_CAMP_ECONOMY.md` states the economy is deliberately score-only.
- Also consolidate the duplicated category→profile-key map (`deductionEngine.ts:88` private vs `src/expedition/candidateTraits.ts:15-25`).

---

## Verification

Per phase, before moving on:

- `npm run typecheck` and `npm test` clean. Existing suites that pin this area: `tests/lib/runCaseState.test.ts`, `tests/lib/runProjection.test.ts`, `tests/expedition/caseFlow.test.ts`, `tests/types/expedition.test.ts`.
- **New tests:** `parseV3PlayerMarks` validation; `correctCount` arithmetic; `closestWrong` + `separatingFamily` selection (incl. the `null` case); accuracy-bonus math; `tests/lib/deductionEngine.test.ts` before Phase 3.
- **Leak test (Phase 1, required):** assert `projectRunForClient` emits no `actualEliminatedIds` / `eliminationReasons` for a session with `runStatus !== 'completed'`, and does emit them when completed. This is the invariant the whole design rests on.
- **End-to-end playtest** (`npm run dev`, port 8080) — one full run: three sites, mark candidates at each, deliberately mark the answer wrong at site 2 and confirm the run is still winnable, guess a marked candidate and confirm the "you ruled this out" path works, then read the dossier.
- **DB checks** via the `postgres-tunnel` skill: after a run, inspect `eco_run_sessions.metadata` for `playerMarks` and confirm `evidenceApplications` is unchanged in shape.

## Out of scope

Board power-ups (four-in-line rocket, Field Note gem), waypoint-type → board-obstacle coupling, and any Cesium-trail restoration. All deferred until this lands.
