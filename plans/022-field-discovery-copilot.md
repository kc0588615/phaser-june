# Plan 022: Add a Field Discovery Co-Pilot Without Replacing Deduction

> **Executor instructions**: Follow this plan in order. Run each verification
> gate before continuing. Preserve all unrelated working-tree changes. Stop and
> report instead of improvising when a STOP condition is met. When complete,
> mark this plan DONE in `plans/README.md`.
>
> **Drift check (run first)**:
>
> ```bash
> git diff --stat a186c5a..HEAD -- src db scripts tests docs plans
> git status --short -- src db scripts tests docs plans
> ```
>
> This plan was written against commit `a186c5a` plus an already-dirty v3-only
> working tree. Compare the current implementation with the “Current state”
> section before editing. Do not commit, discard, or reformat unrelated changes.

## Status

- **Priority**: P1 product
- **Effort**: L
- **Risk**: MED
- **Depends on**: Plan 020 implemented; v3 evidence-family runtime active
- **Category**: direction
- **Planned at**: commit `a186c5a`, 2026-07-26

## Why this matters

The v3 loop has a strong server-authoritative deduction spine, but its other
facts and hints are mostly passive. The player should keep identifying species
through the existing hard clues while secondary content adds prediction,
surprise, comparison, and corrective feedback around that deduction.

This plan adds three supporting learning beats without changing evidence
strength or elimination:

1. One guaranteed predict-and-reveal Field Event per site.
2. An optional contrast lens for issued hard clues.
3. One player-chosen bonus-fact reveal after the correct verdict.

## Locked product decisions

| Decision | Choice |
|---|---|
| Deduction authority | Existing hard clues remain the only candidate-elimination mechanism |
| Field Event cadence | One per site: first cascade, otherwise move four |
| Interaction | One consistent two-choice prediction shell |
| Correct-answer reward | Knowledge only; no score, charge, or board effect |
| Skip behavior | “Reveal signal” shows the correction and continues |
| Contrast | Optional notebook tool; never blocks site progression |
| Post-verdict reveal | Player chooses one of the three played-family envelopes |
| Album unlocks | All three existing played-family facts still unlock |
| Content source | Transform existing reviewed hints, facts, and citations only |
| Rollout | Coordinated migration, seed, deploy, and smoke test; no permanent flag |
| Audience | Grades 6–12; field-research tone, not school-quiz framing |

`plans/021-player-marked-deduction.md` is superseded. Do not implement player
marking, count-only elimination feedback, withheld elimination truth,
deduction-accuracy bonuses, or its reference-slot work as part of this plan.

## Current state

- `docs/EXPEDITION_RUN_LOOP.md` defines three six-move sites. Direct clears
  charge evidence families; cascades animate and score but add no evidence.
- `POST /api/runs/[runId]/evidence-choice` applies a reviewed fixed-strength
  hard clue and automatically eliminates incompatible candidates. Preserve
  this behavior and response data.
- `src/lib/evidenceRunState.ts` persists the full board checkpoint and increments
  `cascadeHintCount` once for a move containing cascades.
- `POST /api/runs/[runId]/evidence-progress` returns progressive hint lines and
  one generic cascade line. Identical retries are idempotent.
- `src/contexts/ExpeditionContext.tsx` emits
  `evidence-progress-committed` after the progress response, which releases
  Phaser input for the next move.
- `src/components/EvidenceLog.tsx` already displays Observation, Inference, and
  Ruled out. The selected hard clue includes the mystery trait phrase and
  per-candidate trait phrases required for local comparison.
- `src/components/RunCompleteSummary.tsx` displays the captured species card.
  The guess route already unlocks the three selected-family `bonusFactText`
  values but does not expose an interactive reveal.
- `evidence_family_cards` has one reviewed card per species and family. Each
  card has `bonus_fact_text`; the six prototype species currently provide four
  progressive hints per family.
- `cascade_hints` contains generic flavor. Keep it for non-triggering cascades.
- Baseline at planning time: `npm run typecheck` passes, `npm test` passes all
  117 tests, and `npm run verify:case-compiler` passes all 360 paths.

Relevant current contracts:

```ts
// src/types/expedition.ts
export interface EarnedObservation {
  family: EvidenceFamily;
  observationText: string;
  inferenceText?: string;
  actualEliminatedIds?: number[];
  candidateTraitPhrases?: Record<string, string>;
  traitPhrase?: string;
}
```

```ts
// src/expedition/caseFlow.ts
export type CaseStage =
  | 'choose_evidence'
  | 'board'
  | 'interpreting'
  | 'guess';
```

```ts
// src/lib/evidenceRunState.ts
cascadeHintCount:
  state.cascadeHintCount + (input.cascadeCount > 0 ? 1 : 0)
```

## Commands

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0, no errors |
| Tests | `npm test` | exit 0, all tests pass |
| Compiler paths | `npm run verify:case-compiler` | 360 paths pass or a larger current valid count |
| Content check | `npm run seed:evidence-family -- --check` | 30 cards and all interactions validate; no DB connection |
| DB dry run | `npm run seed:evidence-family -- --dry-run` | transaction rolls back; no rows changed |
| Build | `npm run build` | exit 0 |

Use the `frontend-design` skill when implementing the modal, contrast lens, and
completion reveal. Use the `postgres-tunnel` skill for migration, seed, or
database inspection. Never hardcode a database URL.

## Scope

### In scope

- Evidence-card schema, migration `027`, seed parsing, and all six reviewed
  evidence-family seed files.
- V3 compiler validation and evidence-run checkpoint parsing.
- Evidence-progress projection and one new Field Event endpoint.
- Client flow, resume handling, and one accessible Field Event dialog.
- Optional evidence-log contrast.
- Owner-only completed-run wonder endpoint and completion UI.
- Focused tests and current expedition/economy documentation.
- `plans/README.md` status updates for Plans 021 and 022.

### Out of scope

- Any replacement or weakening of automatic server elimination.
- Player-marked candidates or candidate-removal guesses.
- New currencies, scores, bonuses, board power-ups, or clue tiers.
- Changes to the six-move budget or evidence-family offer algorithm.
- Cross-run/spaced-recall callbacks.
- Album reference-slot gameplay.
- New biological claims, new source research, or prototype-pool expansion.
- Plan 016’s unified species-package migration. Plan 016 must later absorb the
  new fields without changing their contracts.
- Map-style configuration and unrelated v3 cleanup.

## Public interfaces

### Authored choice content

Add shared types:

```ts
export type ChoiceOptionId = 'a' | 'b';

export interface ChoicePrompt {
  promptText: string;
  options: [
    { id: 'a'; text: string },
    { id: 'b'; text: string },
  ];
  correctOptionId: ChoiceOptionId;
}

export interface FieldEventContent extends ChoicePrompt {
  signalText: string;
}
```

Add nullable typed JSONB columns to `evidence_family_cards`:

```text
field_event  FieldEventContent | null
bonus_prompt ChoicePrompt | null
```

Columns stay nullable for deployment compatibility. Seed validation and the v3
compiler, not a database NOT NULL constraint, enforce completeness for new
runs.

### Public Field Event

```ts
export interface PublicFieldEvent {
  ref: `field-${0 | 1 | 2}`;
  nodeIndex: number;
  family: EvidenceFamily;
  promptText: string;
  options: ChoicePrompt['options'];
  trigger: 'cascade' | 'fallback';
  triggerMove: number;
}
```

Extend runtime state:

- Add `field_event` to `CaseStage`.
- Add `pendingFieldEvent: PublicFieldEvent | null` to `CaseState`.
- Add `field_event` to `hintFeed.kind`.
- Add pending-event state to `FlowNode` and resume reconciliation.
- Add a private persisted Field Event snapshot to `V3NodeEvidenceState`.

The private node snapshot contains the public prompt plus `correctOptionId`,
`signalText`, response, correctness, status, and timestamps. Public projection
must strip the correct ID and signal until the player commits.

### Field Event endpoint

`POST /api/runs/[runId]/field-event`

```ts
// Request
{
  nodeIndex: number;
  optionId: 'a' | 'b' | null;
}

// Response after commitment
{
  ref: string;
  status: 'answered' | 'skipped';
  selectedOptionId: 'a' | 'b' | null;
  correct: boolean | null;
  correctOptionId: 'a' | 'b';
  signalText: string;
}
```

`null` means Reveal signal. The route records a skip, reveals the correct
interpretation, and releases the board. An identical retry is idempotent; a
different retry returns `409 { reason: 'event_locked' }`.

### Wonder endpoint

Add owner-only `GET/POST /api/runs/[runId]/wonder`.

Before an attempt, `GET` returns:

```ts
{
  speciesId: number;
  choices: Array<{
    family: EvidenceFamily;
    promptText: string;
    options: ChoicePrompt['options'];
  }>;
  attempt: null;
}
```

`POST` accepts:

```ts
{
  family: EvidenceFamily;
  optionId: 'a' | 'b';
}
```

After an attempt, POST and later GET responses include:

```ts
{
  family: EvidenceFamily;
  selectedOptionId: 'a' | 'b';
  correct: boolean;
  correctOptionId: 'a' | 'b';
  bonusFactText: string;
}
```

The route is locked until the owner has a correct completed verdict. One
immutable `metadata.wonderAttempt` is allowed. Identical retries are
idempotent; conflicting retries return
`409 { reason: 'wonder_locked' }`.

## Steps

### Step 0: Retire the rejected direction and protect the baseline

1. Add Plan 022 to `plans/README.md`.
2. Mark Plan 021 `SUPERSEDED by 022 — preserve server elimination`.
3. Run the drift checks and inspect overlapping working-tree changes.
4. Run typecheck, tests, and compiler verification before editing.
5. Do not commit or clean unrelated files.

**Verify**:

```bash
npm run typecheck
npm test
npm run verify:case-compiler
```

Expected: all commands exit 0. If the existing baseline fails, stop and report
the failures separately from this feature.

### Step 1: Add and validate authored interaction content

1. Add migration `src/db/migrations/027_field_discovery_prompts.sql` with the
   two nullable JSONB columns.
2. Add the shared prompt parser beside the existing evidence-seed validation.
3. Enforce:
   - exactly two options;
   - IDs exactly `a` and `b`;
   - unique, trimmed, nonempty option text;
   - prompt length 10–180;
   - option length 1–90;
   - signal length 10–220;
   - a valid correct option;
   - no common name, scientific name, or scientific genus in Field Event
     prompt, options, or signal;
   - bonus prompts may name the species because they are post-verdict.
4. Update the evidence-family seed format and seed script to parse, compare,
   and upsert both JSONB objects.
5. For each of the 30 cards:
   - retain the first three existing hints as passive hints;
   - move/reshape the fourth hint into `field_event.signal_text`;
   - write a two-choice prediction using only the existing reviewed card,
     hints, bonus fact, and cited source;
   - create `bonus_prompt` from `bonus_fact_text`;
   - make the distractor a clearly contrasting interpretation, never a new
     asserted biological claim.
6. Extend the v3 compiler input and validation so new runs require both valid
   interactions on all 30 reviewed cards. Do not put prompts into the public
   case snapshot.

Example tone and shape:

```json
{
  "field_event": {
    "prompt_text": "The range signal covers a broad landmass. Which pattern fits?",
    "options": [
      { "id": "a", "text": "Mainland population" },
      { "id": "b", "text": "Small island chain" }
    ],
    "correct_option_id": "a",
    "signal_text": "Keep the search on continental terrain."
  },
  "bonus_prompt": {
    "prompt_text": "Can this species meet most water needs without drinking?",
    "options": [
      { "id": "a", "text": "Yes" },
      { "id": "b", "text": "No" }
    ],
    "correct_option_id": "a"
  }
}
```

Do not copy this answer into unrelated species; it is a format/tone example.

**Verify**:

```bash
npm run seed:evidence-family -- --check
npm run verify:case-compiler
npm test
```

Expected: 30 cards, 90 passive hints, 30 Field Events, and 30 bonus prompts
validate; all compiler paths still pass with the same survivor distribution.

### Step 2: Schedule and persist one Field Event per site

1. Extend `V3NodeEvidenceState` parsing with an optional bounded event snapshot.
2. Add pure helpers for:
   - determining whether the accepted move triggers an event;
   - ranking direct-match families;
   - excluding earlier event families when possible;
   - deterministic option ordering;
   - resolving answered/skipped attempts;
   - public projection of the pending event.
3. Trigger on the first accepted move at that site where `cascadeCount > 0`.
   If none has triggered, use accepted move four.
4. Select only among `directMatchFamilies` for that move. Rank by that move’s
   `directClears[family]`, then `EVIDENCE_FAMILIES` registry order.
5. Read bounded `metadata.fieldEventFamilies` and prefer an unused family. If
   every directly matched family has appeared before, allow the highest-ranked
   repeat rather than changing the trigger move.
6. Deterministically shuffle the two displayed options from case seed,
   node index, and family. Persist the complete snapshot so retries and resume
   never depend on later seed edits.
7. On the triggering progress response:
   - return `fieldEvent`;
   - persist the used family;
   - suppress that move’s generic `cascadeHintLine`;
   - continue returning ordinary direct-match hint lines.
8. If a move is retried with the same digest, return the same pending event.
9. Reject the next move with `field_event_pending` until answer/skip is stored.
10. If an older active run lacks valid event content, persist an `unavailable`
    event marker and continue the original loop. Do not brick the run.
11. Implement the authenticated, owner-only Field Event POST route using the
    existing session/node row-lock and response-helper patterns.
12. Expose pending public event data through run projection. Never project
    `cardId`, `correctOptionId`, `signalText`, answer ID, or compare tag before
    commitment.

No Field Event path may mutate:

- evidence charges;
- carried charges;
- family offers;
- selected families;
- board score;
- evidence applications;
- eliminated candidates;
- guess or efficiency bonuses.

**Verify**:

```bash
npm test -- --test-name-pattern="field event|evidence progress|run projection|case flow"
npm run typecheck
```

Expected: trigger, retry, projection, lock, and resume tests pass; existing
evidence progress tests remain unchanged.

### Step 3: Add the live Field Event interaction

1. Add `field_event` to the pure case-flow machine.
2. When evidence progress returns `fieldEvent`:
   - store it in `CaseState`;
   - set stage `field_event`;
   - do not emit `evidence-progress-committed`;
   - do not advance to evidence choice.
3. Add `handleFieldEventResponse(optionId)` to `ExpeditionContext`.
4. After a successful answer or reveal:
   - append `signalText` to the feed as `kind: 'field_event'`;
   - clear `pendingFieldEvent`;
   - restore stage `board`;
   - emit the delayed progress-committed event for the trigger move;
   - if no board was mounted during resume, restore it from the persisted
     checkpoint through the normal flow.
5. Reconcile a projected pending event before board/evidence-choice steps on
   resume.
6. Create one shadcn dialog hosted from the persistent application layout:
   - title: **Unexpected Signal**;
   - two large prediction buttons;
   - primary action: **Commit read**;
   - skip action: **Reveal signal**;
   - feedback: **Read confirmed** or **Signal corrected**;
   - continue action: **Back to survey**.
7. Prevent Escape and backdrop clicks from silently dismissing the durable
   interaction. Reveal signal is the explicit skip.
8. Use focus trapping, keyboard-operable choices, `aria-live` feedback, text
   plus icons rather than color alone, and reduced-motion-safe transitions.
9. Keep the tone concise and field-oriented. Do not use “quiz,” grades,
   confetti, points, or streak copy.

**Verify**:

```bash
npm run typecheck
npm test -- --test-name-pattern="field event|case flow"
```

Expected: pending events pause input, all response paths resume exactly once,
and refresh restores the identical interaction.

### Step 4: Add optional hard-clue contrast

1. Extend only the detailed Evidence Log.
2. For each issued observation with both eliminated IDs and candidate trait
   phrases, show **Compare trail**.
3. Let the player select candidates eliminated by that specific observation.
4. Render:
   - **Mystery subject** plus `observation.traitPhrase`;
   - selected candidate name plus its
     `candidateTraitPhrases[speciesId]`;
   - the existing observation and inference.
5. Keep selection in local component state. Do not add an endpoint, score,
   event stage, persisted attempt, or completion requirement.
6. Hide the control if no valid eliminated candidate or trait phrase exists.
7. Never label the mystery trait with the answer species identity.

**Verify**:

```bash
npm test -- --test-name-pattern="evidence log|contrast"
npm run typecheck
```

Expected: contrast offers only the selected clue’s eliminated candidates and
does not alter the evidence log’s existing three-slot output.

### Step 5: Add the post-verdict wonder reveal

1. Implement owner-only GET/POST wonder handlers.
2. Require a correct completed v3 run. Return 409 before verdict, on an
   incorrect/incomplete run, or when the three evidence applications cannot be
   safely hydrated.
3. Build exactly three choices from the played-family card IDs. Do not return
   unplayed family prompts.
4. Before commitment, return prompt and options only. Returning the completed
   answer species ID is safe and repairs the existing generic completed-resume
   summary.
5. Persist one bounded `metadata.wonderAttempt` containing family, selected
   option, correctness, and timestamp.
6. After commitment, return the correct option and existing
   `bonusFactText`.
7. Do not change the guess route’s existing three-fact album unlock.
8. Extend `RunCompleteSummary`:
   - fetch GET wonder on live completion and completed resume;
   - use returned species ID as a fallback for loading the captured card;
   - show three sealed envelopes labeled by played family;
   - reveal the chosen prompt and two choices;
   - show correction plus bonus fact after POST;
   - keep Return to Globe available throughout;
   - restore an existing attempt on reload.
9. Treat endpoint failure as non-blocking. Preserve the original summary and
   log the failure without hiding Return to Globe.

**Verify**:

```bash
npm test -- --test-name-pattern="wonder|guess|run projection|run completion"
npm run typecheck
```

Expected: pre-verdict access is denied, no answer leaks before commitment, one
attempt is durable and idempotent, and all three album facts still unlock.

### Step 6: Document, migrate, seed, and ship

1. Update `docs/EXPEDITION_RUN_LOOP.md`:
   - hard clues alone eliminate;
   - one Field Event occurs per site;
   - events provide weak interpretive signals;
   - contrast is optional;
   - one bonus-fact prediction occurs after verdict.
2. Update `docs/DEDUCTION_CAMP_ECONOMY.md`:
   - Field Event correctness has no score or currency effect;
   - no evidence strength or family charge changes.
3. Run all local verification before touching the database.
4. Through `postgres-tunnel`:
   - apply migration 027;
   - run seed dry-run;
   - inspect the proposed 30-card update;
   - run seed write only after the dry-run matches this plan;
   - query counts and JSON completeness.
5. Deploy only after migration and complete seed data exist.
6. Smoke-test one full authenticated expedition in production.

Deployment order is mandatory:

```text
nullable migration → reviewed seed write → application deploy → smoke test
```

The prior application remains compatible with the new nullable columns. If the
new deployment must be rolled back, the columns and seeded JSON may remain.

**Verify**:

```bash
npm run typecheck
npm test
npm run verify:case-compiler
npm run seed:evidence-family -- --check
npm run build
```

Expected: every command exits 0 before deployment.

## Test plan

Follow existing Node test patterns in:

- `tests/lib/evidenceRunState.test.ts`
- `tests/lib/runProjection.test.ts`
- `tests/expedition/caseFlow.test.ts`
- `tests/components/evidenceLog.test.ts`
- `tests/lib/runCaseState.test.ts`

Add or extend focused tests for:

### Content

- All 30 cards parse valid Field Events and bonus prompts.
- Missing, malformed, oversized, duplicate-option, and invalid-correct-ID
  content is rejected.
- Field Event copy containing answer common/scientific/genus names is rejected.
- Bonus prompts may contain the post-verdict species name.
- Exactly 90 passive hints remain after moving one signal per card.
- The compiler rejects any reviewed prototype card missing interaction content.
- All 360 existing case paths retain the current survivor distribution.

### Field Event state and API

- A cascade on moves one through three triggers immediately.
- No cascade triggers the fallback on move four.
- Later cascades cannot create a second site event.
- Family ranking uses direct-clear count then registry order.
- A previously unused event family is preferred.
- Option order is deterministic across retries and resume.
- Same-move retry returns the identical event.
- A next move is rejected while the event is pending.
- Correct, incorrect, and skipped responses all reveal the same signal.
- Skipped correctness is `null`.
- Identical response retry succeeds; conflicting retry is locked.
- No outcome changes score, charge, offer, elimination, or evidence application.
- Public projection never exposes private event fields before commitment.
- An older run with missing event content continues without an event.

### Client and contrast

- Pending event reconciles before board/evidence choice.
- Resolving a live event releases Phaser input exactly once.
- Resolving a resumed event restores the saved checkpoint.
- Contrast contains only candidates eliminated by that observation.
- Contrast hides when required authored phrases are absent.
- Contrast never contains the answer name.

### Wonder reveal

- Incomplete and incorrect runs are denied.
- Correct completed runs return exactly the three played families.
- Pre-attempt response omits correct option and bonus fact.
- One attempt persists and is idempotent.
- A conflicting second choice is locked.
- Post-attempt GET restores the result.
- Existing three-fact album unlock behavior remains unchanged.
- Completion remains usable when wonder fetch fails.

## Manual acceptance

Test desktop and a narrow mobile viewport:

1. Trigger a cascade before move four; confirm the board pauses after the move.
2. Answer correctly; confirm the signal appears and play resumes.
3. Answer incorrectly at another site; confirm corrective feedback appears and
   score/charges remain unchanged.
4. Reach move four without a prior cascade; confirm the fallback event.
5. Use Reveal signal; confirm it records no correctness and resumes.
6. Refresh while an event is pending; confirm the same option order returns.
7. Finish all three sites; confirm server hard clues and automatic elimination
   behave exactly as before.
8. Open each hard clue and compare its mystery trait with a ruled-out candidate.
9. Guess correctly; choose one of three family envelopes and commit a response.
10. Confirm one fact is spotlighted while all three played facts are unlocked
    on the album card.
11. Refresh the completed run; confirm the species and wonder result restore.
12. Verify keyboard focus, screen-reader names, text-plus-icon feedback, and
    reduced-motion behavior.

## Done criteria

- [ ] Plan 021 is marked superseded and Plan 022 is indexed.
- [ ] Migration 027 adds only the two nullable JSONB columns.
- [ ] All 30 reviewed cards have valid Field Events and bonus prompts.
- [ ] Exactly one Field Event is offered per new site.
- [ ] First cascade and move-four fallback both work.
- [ ] Correct, incorrect, and reveal paths resume safely.
- [ ] Hard-clue issuance and automatic candidate elimination are unchanged.
- [ ] Field Event outcomes have no economic or board-state effects.
- [ ] Public responses contain no pre-commit answer or correctness leak.
- [ ] Optional contrast uses existing observation data and never blocks play.
- [ ] One post-verdict envelope is interactive; all three facts still unlock.
- [ ] Pending and completed interactions survive refresh.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm test` exits 0.
- [ ] `npm run verify:case-compiler` exits 0.
- [ ] `npm run seed:evidence-family -- --check` exits 0.
- [ ] `npm run build` exits 0.
- [ ] Database migration and seed dry-run are reviewed before write.
- [ ] No unrelated working-tree changes are overwritten or committed.

## STOP conditions

Stop and report; do not improvise if:

- The current hard-clue loop no longer matches the Current state section.
- The six prototype species do not have exactly 30 reviewed family cards and
  four current hints per card before conversion.
- Completing this feature appears to require client-owned candidate
  elimination or withholding current elimination truth.
- A Field Event can influence score, evidence charge, family offers, clue
  strength, or candidate elimination.
- Any pre-verdict public payload exposes answer identity, correct option,
  signal text, compare tag, or private card ID before commitment.
- A prompt requires a new biological claim or source rather than transforming
  reviewed content.
- An in-scope file contains overlapping unrelated edits that cannot be
  preserved confidently.
- The migration or seed dry-run differs from the expected 30-card update.
- Any verification command fails twice after a reasonable correction.

## Maintenance notes

- Field Events are content API. Future species must ship five reviewed events
  and five bonus prompts before entering the playable compiler pool.
- Plan 016’s unified species package must make these objects first-class and
  emit them into the same database columns.
- Reviewers should scrutinize answer leakage, idempotency, pending-event resume,
  and accidental score/charge mutations.
- Cross-run retrieval should be planned only after event completion, skip rate,
  and wrong-answer telemetry demonstrate that players engage with this layer.
- Distinct family-specific microgames are deliberately deferred. Keep one
  interaction shell until the content and pacing are validated.
