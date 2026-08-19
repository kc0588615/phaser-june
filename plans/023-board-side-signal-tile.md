# Plan 023: Board-Side Discovery — Signal Tile + Why Ruled Out

> **Executor instructions**: Ship Stage A and Stage B independently, in order. Run
> the verification gate after each. Preserve all unrelated working-tree changes;
> the tree is dirty with v3-only work. Do not commit unrelated files. Stop and
> report instead of improvising when a STOP condition is met.
>
> **Drift check (run first)**:
>
> ```bash
> git status --short -- src tests plans
> npm test
> ```
>
> Written against commit `a186c5a` plus the dirty v3 tree. Baseline verified at
> planning time: `npm test` → 117/117 pass.

## Status

- **Priority**: P1 product
- **Effort**: S–M (was L as Plan 022)
- **Risk**: LOW
- **Depends on**: v3 evidence-family runtime active
- **Category**: direction
- **Planned at**: commit `a186c5a`, 2026-07-26
- **Relationship to 022**: narrows `plans/022-field-discovery-copilot.md`. 022 is not
  implemented. Its Step 4 becomes Stage A here verbatim; its Field Event modal is
  replaced by Stage B; its Wonder endpoint is dropped.

## Context

The v3 loop has a solid server-authoritative deduction spine, but cascades — the best
moment in a match-3 — currently produce score and one generic flavor line and nothing
else. The goal is to make the board itself more fun *and* make the facts already in
Postgres participate in the deduction, without touching evidence strength, elimination,
or the economy.

Plan 022 proposed a two-choice prompt in a blocking modal, backed by migration 027, two
new endpoints, a new case stage, and 60 hand-authored content objects. That is
minigame-sized engineering for quiz-sized fun, and it pauses the board at exactly the
moment the board is most enjoyable. Its zero-stakes lock ("no score, charge, or board
effect") plus a one-click **Reveal signal** escape makes skipping the dominant strategy
by run two.

This plan gets the same participatory goal from mechanics that already exist in the
codebase, with no database work at all.

## Locked decisions

| Decision | Choice |
|---|---|
| Deduction authority | Existing hard clues remain the only elimination mechanism |
| Where the interaction lives | On the board, not in a dialog |
| Board pausing | Never. No new case stage, no pending-move lock |
| Cascade payoff | One extra family hint line, from the existing vetted hint corpus |
| Content authoring | None. No new prompts, no new biological claims |
| Database | No migration, no new columns, no new endpoint |
| Bonus facts | Stay post-verdict. Not shown mid-run (leak risk) |
| Audience | Grades 6–12; field-research tone |

## Current state (verified)

- `src/expedition/caseFlow.ts:12` — `CaseStage` is `'choose_evidence' | 'board' |
  'interpreting' | 'guess'`. This plan adds none.
- `src/game/boardTypes.ts:4` — `BoardCellState { blockerId?, durability?, flags? }`,
  and `BoardCheckpointV1` persists the full grid, so cell state survives refresh for free.
- `src/game/BackendPuzzle.ts:422-427` — already damages a blocker on an adjacent match
  and clears it at `durability <= 0`. No new clearing logic needed.
- `src/game/BoardView.ts:723-781` — already renders blocker overlays from
  `cell.state.blockerId` via a switch and `drawOverlayAt`.
- `src/game/nodeObstacles.ts` — `CellStateSeed` and deterministic seeded placement as a
  pure function of node index + board size. Mirror this.
- `src/game/scenes/Game.ts:1549` — emits evidence telemetry
  `{ directClears, directMatchFamilies, cascadeCount }`; `:1572` increments
  `currentMoveSummary.cascades`.
- `src/contexts/ExpeditionContext.tsx:296-329` — POSTs `/evidence-progress`, appends
  `hintLines` and `cascadeHintLine` to the feed, then emits
  `evidence-progress-committed`, which releases Phaser input. **Do not defer this emit.**
- `src/lib/evidenceRunState.ts:185-197` — `deriveEvidenceHintIds` walks a per-family
  cursor with `ids[cursor % ids.length]`.
- `src/app/api/runs/[runId]/evidence-progress/route.ts` — row-locks session + node,
  derives hint IDs, and reuses `lastHintIds` when `input.moveNumber === node.movesUsed`
  (the `duplicate` branch). Idempotency must be preserved.
- `src/components/EvidenceLog.tsx` — displays Observation / Inference / Ruled out.
  `EarnedObservation` carries eliminated-candidate phrases and
  `actualEliminatedIds`; answer-derived `traitPhrase` is not public pre-verdict.
- Seeds: 6 species × 5 families = 30 reviewed cards, 4 hints each. **Unchanged by this
  plan** — no hint is cannibalized.

## Commands

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test` | exit 0, 117 baseline + new |
| Compiler paths | `npm run verify:case-compiler` | 360 paths, unchanged |
| Build | `npm run build` | exit 0 |

No `postgres-tunnel` work. No migration. No seed write.

## Scope

### In scope

- Why-ruled-out detail in the evidence log (local state only).
- One deterministic `field_signal` cell per site, placed on a cascade.
- One extra family hint line when that cell is cleared.
- Focused tests and a doc update.

### Out of scope

- Any change to server elimination, evidence strength, charges, offers, score, or bonuses.
- Migration 027, JSONB prompt columns, authored two-choice prompts.
- The Wonder endpoint. All three played-family facts already unlock at guess time and
  there is nothing to protect post-verdict.
- The completed-resume species-ID bug (real, but fix it separately — it is not a feature).
- Plan 021's fate. Decide that on its own terms in `plans/README.md`.
- Per-family distinct minigames.

---

## Stage A: Why ruled out

Narrowed from Plan 022 Step 4 after pre-verdict leak review. Ship alone.

1. Extend only the detailed Evidence Log (`src/components/EvidenceLog.tsx`).
2. For each issued observation that has both `actualEliminatedIds` and
   matching `candidateTraitPhrases`, show a **Why ruled out** section.
3. With multiple eliminations, let the player select a candidate eliminated by that
   specific observation. With one elimination, render it directly without a chip.
4. Render only the selected candidate's name, `candidateTraitPhrases[speciesId]`, and
   elimination category beneath the existing observation and inference.
5. Local `useState` only. No endpoint, no score, no case stage, no persisted attempt, no
   completion requirement.
6. Hide the section when no valid eliminated candidate phrase exists.
7. Do not project or render answer-derived `traitPhrase`, raw `compareTag`, or
   surviving-candidate phrases pre-verdict.
8. Use explicit separators for Observation, Inference, and Ruled out. Do not repeat the
   inference inside the explanation.

**Verify**:

```bash
npm test -- --test-name-pattern="evidence log|contrast"
npm run typecheck
```

Tests in `tests/components/evidenceLog.test.ts`: only that clue's eliminated candidates
are offered; zero/one/many presentation is correct; answer and survivor phrases never
appear; the existing three-slot output is unchanged.

---

## Stage B: Signal tile

Cascades stop being cosmetic. No modal, no pause, no new stage.

### 1. Place it

In `Game.ts`, when a move resolves with `currentMoveSummary.cascades > 0` and no signal
tile is currently live at this site, seed one cell with:

```ts
{ blockerId: 'field_signal', durability: 1, flags: ['field_signal'] }
```

Placement is a pure function of case seed + node index + move number — mirror the
deterministic seeding already in `nodeObstacles.ts` so retries and refresh agree. Choose a
cell with no existing blocker. **One tile per site**; later cascades do not add more.

### 2. Render it

Add one case to the `blockerId` switch in `BoardView.ts:730` and an overlay in
`drawOverlayAt`. Visually distinct from hazard blockers — this is a reward, not an
obstacle. Reduced-motion safe. Text/icon, not color alone.

### 3. Clear it

Falls out of the existing `BackendPuzzle.ts:422` damage path — the player clears it by
matching adjacent to it. No new clearing logic. The board never stops; an uncleared tile
simply expires when the site ends, with no penalty.

### 4. Pay it

1. Add `signalCleared: boolean` to the evidence telemetry payload
   (`EventBus.ts:105`, emitted at `Game.ts:1549`).
2. Forward it in the `/evidence-progress` request body
   (`ExpeditionContext.tsx:296`) and parse it in `parseEvidenceProgressInput`.
3. In the route, when `signalCleared` is true, return **one extra hint line** for the
   cleared tile's family by advancing that family's cursor once more through the existing
   `deriveEvidenceHintIds`. Suppress that move's generic `cascadeHintLine`.
4. Persist the advanced cursor and the extra ID in `lastHintIds` so the existing
   `duplicate` branch replays identically on a same-move retry.

Hint text from `evidence_family_hints` is already reviewed for mid-run display.
**Do not use `evidence_family_cards.bonus_fact_text` here** — those strings are written
about the answer species and are not screened for identity leakage. Plan 022 was right to
guard this. Bonus facts stay post-verdict.

### Invariants

No signal-tile path may mutate evidence charges, carried charges, family offers, selected
families, board score, evidence applications, eliminated candidates, or guess/efficiency
bonuses. It grants hint text only.

**Verify**:

```bash
npm test -- --test-name-pattern="evidence progress|signal|backend puzzle"
npm run typecheck
npm run verify:case-compiler
```

## Files

| Stage | Files |
|---|---|
| A | `src/components/EvidenceLog.tsx`, `tests/components/evidenceLog.test.ts` |
| B | `src/game/scenes/Game.ts`, `src/game/BoardView.ts`, `src/game/nodeObstacles.ts` (or a small sibling helper), `src/game/EventBus.ts`, `src/contexts/ExpeditionContext.tsx`, `src/lib/evidenceRunState.ts`, `src/app/api/runs/[runId]/evidence-progress/route.ts` |
| Tests | `tests/lib/evidenceRunState.test.ts`, `tests/game/backendPuzzleV3.test.ts` |
| Docs | `docs/EXPEDITION_RUN_LOOP.md` |

## Test plan

Follow existing Node test patterns.

**Signal tile state**
- Placement is deterministic for a given seed + node + move.
- A cascade places exactly one tile; later cascades at the same site place none.
- The tile clears through the existing adjacent-match damage path.
- Cell state round-trips through `BoardCheckpointV1`.

**Evidence progress**
- `signalCleared` advances that family's cursor by exactly one extra step.
- The generic `cascadeHintLine` is suppressed on that move.
- A same-move-number retry replays the identical hint IDs (`duplicate` branch).
- `signalCleared` changes no charge, offer, score, application, or elimination.
- An uncleared tile at site end produces no extra line and no error.

**Why ruled out** — as listed in Stage A.

## Manual acceptance

Desktop and a narrow mobile viewport:

1. Trigger a cascade at site one — a signal tile appears and board input never pauses.
2. Clear it with an adjacent match — one extra family hint line appears; generic cascade
   flavor is absent that move.
3. Leave a tile uncleared for the rest of the site — site completes normally, no lock.
4. Refresh mid-site with a live tile — same tile, same cell, restored from checkpoint.
5. Retry the same move — no duplicate hint line.
6. Finish the run — hard clues, automatic elimination, score, efficiency bonus, and the
   three album unlocks all behave exactly as before.
7. Open an issued clue and inspect Why ruled out for one and multiple candidates.
8. Verify keyboard operability, screen-reader names, text-plus-icon feedback, and
   reduced-motion behavior.

## Done criteria

- [ ] Why ruled out ships without answer-derived or surviving-candidate trait leakage.
- [ ] Exactly one signal tile per site, placed on the first cascade.
- [ ] Clearing it yields one extra family hint line; the generic cascade line is suppressed.
- [ ] The board never pauses; no new `CaseStage`; `evidence-progress-committed` is never deferred.
- [ ] Same-move retries stay idempotent.
- [ ] Hard-clue issuance and automatic elimination are unchanged.
- [ ] No score, charge, offer, or elimination effect from any signal path.
- [ ] No migration, no new columns, no new endpoint, no authored content.
- [ ] `npm run typecheck`, `npm test`, `npm run verify:case-compiler`, `npm run build` all exit 0.
- [ ] No unrelated working-tree changes overwritten or committed.

## STOP conditions

Stop and report; do not improvise if:

- The current hard-clue loop no longer matches "Current state".
- Implementing the tile appears to require a new case stage, a pending-move lock, or
  deferring `evidence-progress-committed`.
- A signal path can influence score, charge, offers, clue strength, or elimination.
- Any mid-run payload would expose answer identity or `bonus_fact_text`.
- Delivering the extra hint line appears to require a migration or new authored content.
- An in-scope file has overlapping unrelated edits that cannot be preserved confidently.
- Any verification command fails twice after a reasonable correction.

## Deferred

- **Prediction content.** If Stage B still reads as passive in playtest, attach a
  two-choice prompt *to the tile* — non-blocking, resolved inline, board still live. Only
  then does migration 027 plus authored prompts earn its cost, and by then you will know
  whether players engage before taxing every future species with 10 authored objects.
- **Wonder reveal.** If you want the envelope flip, it is client-only state in
  `RunCompleteSummary.tsx`. No endpoint.
- **Per-family distinct minigames.** Keep one board mechanic until pacing is validated.
