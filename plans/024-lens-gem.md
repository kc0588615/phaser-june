# Plan 024: Lens Payout — Match-Adjacent Soft Clues on Field Signal

> **Executor instructions**: Evolve the existing Plan 023 Field Signal. Do not add a
> second special tile type. Run verification after each stage. Preserve unrelated
> working-tree changes; do not commit unrelated files. Stop and report instead of
> improvising when a STOP condition is met.
>
> **Drift check (run first)**:
>
> ```bash
> git status --short -- src tests plans docs
> npm test
> ```
>
> Written against commit `a186c5a` plus the dirty v3 tree where Plan 023 Field Signal
> is already live. Baseline at planning time: `npm test` → 125/125 pass.

## Status

- **DONE** 2026-07-26. Implemented with three clarifications:
  1. Cascades damage the Field Signal per the locked decision but never claim its family
     payout. A cascade-only clear keeps the generic cascade hint.
  2. `signalHintCount` added to `evidenceMoveDigest`. Without it a same-move retry that
     recomputed 1 vs 2 returned `move_locked` instead of replaying.
  3. The under-tile family equality check in `isValidFieldSignalTransition` is removed.
     The server instead requires the payout family in `directMatchFamilies` and at least
     3/4 direct cells for a one/two-hint payout. Exact match geometry remains client-asserted;
     the live→cleared board transition remains enforced.
- Payout and damage rules are extracted in `src/game/fieldSignal.ts`, so direct and cascade
  behavior is unit-testable.
- Multi-line responses queue through `FieldHintTicker`; duplicate response IDs are ignored.
- Stage B.5 resolved as written: no change was needed at `ExpeditionContext.tsx:325` — the
  existing `directMatchFamilies[index] ?? signalClearedFamily` already tags both payout
  lines correctly.
- Note: with durability 1 the **first** direct clear wins; "longest of several groups" is
  unreachable in practice.
- Verified: `npm run typecheck` 0, `npm test` 129/129, `verify:case-compiler` 360 paths,
  `npm run build` 0.

- **Priority**: P1 product
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plan 023 Field Signal implemented (tile place / clear / progress path)
- **Category**: direction
- **Planned at**: 2026-07-26
- **Relationship to 023**: keeps spawn, clear UX, checkpoint, and FIELD TEAM feed.
  Changes **what family pays** and **how many soft hints**. No new special gem type.

## Context

Plan 023 made cascades matter: first cascade plants a one-durability Field Signal;
adjacent match clears it for one extra soft hint. That hint’s family is taken from the
**gem under the tile** (`getFieldSignalFamily` → `GEM_EVIDENCE_FAMILIES[cell.gemType]`).

Players cannot choose the intel: the cascade plants a random eligible cell’s color. A
picker modal was rejected (Plan 022). The better board-native choice is:

> Clear the signal with the color you care about; that color’s family pays.

Also: a 4+ match is the skillful board beat. Paying **two** soft hints for a 4+ clear
rewards setup without hard clues, score, or elimination.

Soft text already ships in `FieldHintTicker` as `FIELD TEAM · {text}` when
`hintFeed.kind === 'evidence'`. Reuse that banner — no new UI chrome.

## Locked decisions

| Decision | Choice |
|---|---|
| Deduction authority | Hard clues alone eliminate (unchanged) |
| Special type | **Evolve Field Signal** — do not add a second lens tile |
| Family source | Family of the **direct match that damaged/cleared** the signal |
| Payout count | Direct match length **3 → 1** soft hint; **4+ → 2** soft hints |
| Cascade clears | Cascade may damage/clear durability, but **family + length come only from a direct match** that hits the tile. If only cascade touches it, prefer: require a direct adjacent hit for payout (see edge cases) |
| UI | Existing `FieldHintTicker` / `FIELD TEAM ·` only |
| Content | `evidence_family_hints` only — never hard card text or `bonus_fact_text` |
| Economy | No charge, offer, score, elimination, or bonus mutation |
| Board pause | Never. No new `CaseStage`. Do not defer `evidence-progress-committed` |
| Database | No migration, no new columns, no new endpoint, no seed write |
| Authoring | None |

## Current state (verified)

- `src/game/fieldSignal.ts` — places one `field_signal` blocker; family from under-tile gem.
- `src/game/scenes/Game.ts` `MoveSummary.signalClearedFamily` — set on clear from
  `getFieldSignalFamily(liveGrid…)` (under-tile), not from the match gem type.
- Damage path at `Game.ts` adjacent-blocker loop: only `FIELD_SIGNAL_BLOCKER_ID` records
  payout; match length is available as `match.length` in the same loop.
- `EventBus` `evidence-move-resolved`: `{ signalCleared, signalClearedFamily?, … }`.
- `src/lib/evidenceRunState.ts` — `getEvidenceHintFamilies` appends one
  `signalClearedFamily`; `deriveEvidenceHintIds` advances one cursor step per family
  entry (duplicates allowed → two entries = two hints).
- `src/contexts/ExpeditionContext.tsx` — maps `hintLines` → `hintFeed` with
  `kind: 'evidence'` and family from `directMatchFamilies[index] ?? signalClearedFamily`.
- `src/components/FieldHintTicker.tsx` — non-cascade lines render
  `FIELD TEAM · {text}`.
- Soft corpus: 6 species × 5 families × 4 hints = 120 reviewed mid-run lines.

## Commands

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test` | exit 0, 125 baseline + new |
| Compiler paths | `npm run verify:case-compiler` | 360 paths, unchanged |
| Build | `npm run build` | exit 0 |

No `postgres-tunnel` work.

## Scope

### In scope

- Client: derive clear-family + clear-length from the **direct** adjacent match.
- Telemetry: pay count (`1 | 2`) on progress payload.
- Server: advance that family’s hint cursor once or twice; return that many lines.
- Client feed: append both lines as `kind: 'evidence'` so FIELD TEAM shows them.
- Tests + one doc line in `docs/EXPEDITION_RUN_LOOP.md`.

### Out of scope

- Category picker, modal, Field Event (022), wonder envelopes.
- Second special gem type / wild gem / color bomb.
- Hard clues, bonus facts, profile tags mid-run.
- Charge, offer ranking, score, elimination, efficiency bonus.
- New endpoint or migration.
- Persistent radio history or manual replay controls.

---

## Stage A: Client — family and length from clearing match

### 1. Summary shape

Extend `MoveSummary` in `Game.ts`:

```ts
signalClearedFamily?: EvidenceFamily;
signalClearMatchLength?: number; // 3..N of the direct match that cleared it
```

On clear, set both from the **current match** in `recordMatchesForSummary`, not from
`getFieldSignalFamily`.

### 2. Damage / clear rules

In the adjacent-blocker loop (today records under-tile family):

1. Only **direct** resolution (`!isCascade`) may claim the lens payout.
2. When a direct match of length `L >= 3` is adjacent to a live Field Signal cell and
   `damageBlocker` clears it:
   - `signalClearedFamily = GEM_EVIDENCE_FAMILIES[matchGemType]`
   - `signalClearMatchLength = L`
3. If several direct groups would clear the same tile in one move (rare): keep the
   **longest** `L`; ties → first in match-iteration order (stable enough).
4. Cascade phases may still call `damageBlocker` for normal obstacle UX **only if** the
   tile was already claimed this move, or treat cascade damage as durability-only with
   **no payout overwrite**. Preferred simple rule:

   - **Payout claim only on direct adjacent clear.**
   - If cascade reduces durability to 0 without a prior direct claim this move → clear
     with **no** `signalClearedFamily` (no free cascade intel). Document as intentional.

### 3. Telemetry

`evidence-move-resolved` / progress body:

```ts
signalCleared: boolean;
signalClearedFamily?: EvidenceFamily;
signalHintCount?: 1 | 2; // present iff signalCleared
```

Derive:

```ts
signalCleared = signalClearedFamily !== undefined
signalHintCount = signalClearMatchLength >= 4 ? 2 : 1
```

Checkpoint / spawn / `fieldSignalSpawned` unchanged from 023.

**Verify**:

```bash
npm test -- --test-name-pattern="field signal|signal|backend puzzle"
npm run typecheck
```

---

## Stage B: Server — one or two soft hints for that family

### 1. Parse

`parseEvidenceProgressInput`:

- When `signalCleared === true`: require `signalClearedFamily` and
  `signalHintCount` ∈ `{1, 2}`.
- When `signalCleared === false`: both must be absent.
- Checkpoint transition checks stay: one live signal → none, family was live before
  clear. **Do not** require cleared family to equal under-tile gem family anymore.

### 2. Hint family list

Replace single append with count-aware expansion:

```ts
// conceptual
function getEvidenceHintFamilies(input): EvidenceFamily[] {
  const base = [...input.directMatchFamilies];
  if (input.signalClearedFamily && input.signalHintCount) {
    for (let i = 0; i < input.signalHintCount; i += 1) {
      base.push(input.signalClearedFamily);
    }
  }
  return base;
}
```

`deriveEvidenceHintIds` already walks cursors per list entry, so two identical family
entries yield two sequential hint IDs (wrap on 4-hint pools).

`hintCounts` advance by the same multiplicity (today +1 for `signalClearedFamily` —
change to `+ signalHintCount`).

### 3. Cascade flavor

Keep 023: `shouldIssueCascadeHint` is false when `signalCleared` (suppress generic
cascade line on payout moves).

### 4. Idempotency

`lastHintIds` already replays on same-move `duplicate` branch. After a 4+ clear,
`lastHintIds` length includes two signal entries. Do not re-derive on retry.

### 5. Client feed mapping

`ExpeditionContext` already appends every `hintLines[i]` as FIELD TEAM evidence.
Fix family attribution for multi-signal lines:

- Walk `getEvidenceHintFamilies`-equivalent order, **or**
- Prefer: server returns `hintLines` only; client tags family from
  `[...directMatchFamilies, ...Array(signalHintCount).fill(signalClearedFamily)]`.

Ticker queues new lines and shows each for 3.2 seconds; all remain in `hintFeed` (capped
at 32 unique IDs).

No change required to `FieldHintTicker` copy (`FIELD TEAM ·`).

**Verify**:

```bash
npm test -- --test-name-pattern="evidence progress|signal|field signal"
npm run typecheck
npm run verify:case-compiler
```

---

## Files

| Stage | Files |
|---|---|
| A | `src/game/scenes/Game.ts`, `src/game/EventBus.ts` |
| B | `src/lib/evidenceRunState.ts`, `src/app/api/runs/[runId]/evidence-progress/route.ts` (only if parse/helpers need route touch — prefer pure helpers), `src/contexts/ExpeditionContext.tsx` |
| Tests | `tests/lib/evidenceRunState.test.ts`, `tests/game/fieldSignal.test.ts` (or Game summary unit if extracted) |
| Docs | `docs/EXPEDITION_RUN_LOOP.md` |

Optional rename for clarity only (not required for ship): comments/docs say “lens payout”
while `blockerId` stays `field_signal` to avoid checkpoint churn.

## Test plan

**Client / summary**

- Direct 3-match adjacent to signal → `signalClearedFamily` = that match’s family,
  `signalHintCount` = 1; under-tile gem color ignored.
- Direct 4-match (or 5+) adjacent → same family, `signalHintCount` = 2.
- Cascade-only clear → no payout fields (or document if you chose durability-only clear).
- Two candidate groups same move → longest length wins.
- Uncleared signal at site end → no error, no extra hints.

**Progress state**

- `signalHintCount: 1` advances that family’s cursor by 1; one extra id in `hintLines`.
- `signalHintCount: 2` advances by 2; two extra ids; pool wraps after 4.
- Same-move retry returns identical `hintLines` / `lastHintIds`.
- `signalCleared` still suppresses cascade flavor line.
- No mutation of charges, offers, score, applications, elimination.
- Invalid: `signalCleared` without count/family; count without cleared; count ∉ {1,2}.

**Feed**

- Two evidence entries appear for a 4+ clear; both `kind: 'evidence'`.
- `FieldHintTicker` prefix remains `FIELD TEAM ·` (not MULTIPLE SIGNALS).

## Manual acceptance

1. Cascade plants signal; board never pauses.
2. Clear with orange 3-match → one Body FIELD TEAM line; family is Body even if tile sat on blue.
3. Clear with green 4-match → two Habits FIELD TEAM lines play in order.
4. Leave uncleared → site ends cleanly.
5. Refresh with live signal → same cell from checkpoint.
6. Retry same move → no duplicate extra lines beyond idempotent replay.
7. Full run: hard clues, elimination, score, album unlocks unchanged.

## Done criteria

- [ ] Field Signal clear family = clearing **direct** match family, not under-tile gem.
- [ ] Match length 3 → 1 soft hint; 4+ → 2 soft hints for that family.
- [ ] Both lines use existing `hintFeed` + `FIELD TEAM ·` banner.
- [ ] Cascade flavor suppressed on payout move (023 behavior retained).
- [ ] Board never pauses; no new stage; progress-committed never deferred.
- [ ] No score/charge/offer/elimination side effects.
- [ ] No migration, no new endpoint, no authored content.
- [ ] `npm run typecheck`, `npm test`, `npm run verify:case-compiler`, `npm run build` exit 0.
- [ ] `docs/EXPEDITION_RUN_LOOP.md` describes match-adjacent family + 4→2 payout.
- [ ] No unrelated working-tree changes overwritten or committed.

## STOP conditions

Stop and report; do not improvise if:

- Field Signal place/clear path is missing or no longer matches “Current state”.
- Implementing 4→2 appears to need hard clues, bonus facts, or new authored rows.
- A path mutates charge, offer, elimination, or score.
- Fix appears to require a new case stage or pending-move lock.
- Checkpoint validation cannot accept clear-family ≠ under-tile family without a
  breaking change you cannot contain in pure helpers.
- Any verification command fails twice after a reasonable correction.

## Deferred

- Separate wild “lens gem” piece (only if evolved signal still feels unreadable).
- Persistent radio history and manual replay controls.
- Direct+cascade hybrid length (count cascade length toward 4+).
- Plan 022 prediction content attached to the tile.
- Plan 021 player-marked deduction.

## Design note (do not re-open without playtest)

Soft hints are mid-run-safe and weak: even two Place lines almost never isolate the
answer among six candidates. Hard clues stay the only cut. The 98% “still can’t name
it” property is intentional.
