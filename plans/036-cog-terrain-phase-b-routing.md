# 036 — Isolated Phase B routing prototype

User-authorized implementation, 2026-09-19. Direction: [033](033-cog-board-integration-review.md) §B, [034](034-cog-terrain-phase-a.md), [COG_BOARD_HANDOFF](COG_BOARD_HANDOFF.md). Preserve unrelated tree changes. Phase C stays deferred.

## Scope

Prove deliberate trail-building on the recorded Costa Rica 6×6 clip **without changing production evidence**.

Keep v4: five families, wrapping row/column puzzle shifts, six counted matching moves, then family choice on normal expeditions. This slice does not mute, gate, or replace that loop.

- Isolated harness: `/routing-prototype` + `/api/routing-prototype`. Normal `/api/runs` evidence-progress/choice untouched.
- Recorded COG fixture + authored camp, barrier wall, crossing socket, far-bank survey. Synthetic raster for rule tests.
- Ink verified matched **ground** cells. Disconnected ink is stored. Only the camp-connected traversable component is travelable.
- Geographic adjacency never wraps. Puzzle wrap still moves gems; ink uses the slot at match time.
- Direct 4+ grants at most one player-selected frontier extension (5+ or several groups still one). Cascades may ink; they never grant an extension. **Current isolated rule (replaces 4+):** one extension per accepted move when a **direct match of 3+** overlaps or is orthogonally adjacent to the **pre-move** camp-connected trail across a legal traversal edge.
- Player picks a reachable destination; arrival at the survey records once.
- Persist ink, party, pending extension, arrival, revision **outside gem state**.
- Block the next board move until the extension is selected or skipped. Empty frontier auto-skips.
- Server replay keeps spatial match deltas. Travel/extension/stale/repeat commands validated with per-session locking.
- Measure 4+ frequency and encounter reachability before changing budgets. Do not add a second resource or restore free moves.

Out of scope: presence records, ladder/evidence changes, six-move → family-choice rewrite, claiming human usability.

## Authored Costa Rica sockets

Habitat supplies context only. Do not infer a river or ford from class 1403.

| Socket | Board slot `[x][y]` | Role |
|---|---|---|
| Camp | `[0][5]` | Trail origin; pre-inked; party start |
| Barrier | `x=3`, all y | Authored non-traversable wall |
| Crossing from | `[2][4]` (Plantations 1403) | West-bank approach |
| Crossing to | `[4][4]` | Far-bank landing; extension may open the socket |
| Survey | `[5][0]` | Arrival records once |

Crossing is an extra edge, not geographic adjacency. Travel across the wall without an open socket is illegal.

## State and commands

Immutable terrain snapshot stays Phase A. Routing state is a separate document: `inkedIds`, `partyId`, `crossingOpen`, `pendingExtension`, `arrived`, `revision`, `movesUsed`, `fourPlusCount`, last action digest. Camp is always inked.

Commands, each carrying `revision` + `requestId`:

1. **move** — replay via `verifyEvidenceMoveDetailed` (spatial slots). Ink ground under direct and cascade slots. **Extension eligibility uses the pre-move camp-connected component** so a match cannot qualify merely by inking itself. A direct 3+ group grants one pending extension iff those cells overlap that trail or share an orthogonal legal traversal edge with it (no wrap; closed barrier/closed crossing is not an edge). Cascades and detached ink never qualify. 5+ or several 3+ groups still one grant. Pending is set only if a legal frontier exists after ink; otherwise auto-skip.
2. **extend** — one frontier cell, or skip (`cellId: null`). Choosing the far-bank opens the crossing.
3. **travel** — party to a camp-connected inked ground cell. Survey arrival is server-side, once.

Reject: stale revision, move while pending, extend when none pending, illegal frontier, illegal travel, unverified/out-of-order move. Same digest at the current revision is an idempotent replay.

## Isolation and UI

Production Game still emits `evidence-move-resolved` → ExpeditionContext → evidence-progress only when a mystery run is active. The prototype page does not mount ExpeditionContext and never creates an `eco_run_sessions` row.

Harness: Phaser board + overlay (ink, camp, survey, party, barrier, frontier). Taps still select terrain during the extension hold. HUD: skip/choose frontier, travel to selection. Resume uses GET + saved checkpoint.

API is an **unauthenticated, unevicted in-memory Map**, gated off in production unless `ROUTING_PROTOTYPE=1`. Fine for a local harness; **must not ship**. HMR drops sessions; reducer parse tests cover resume.

## Tests

Engine: wrap is not geographic adjacency; disconnected ink stored but not travelable; illegal crossing; forged arrival impossible; cascade-only adjacency inks without extension; far-bank pre-ink still opens the crossing; adjacent/overlapping direct 3+ grants one; distant 3+/4+ do not; wrap and closed-barrier edges do not; empty frontier auto-skip; skip vs select; arrival once; resume while pending; resume rejects a party on disconnected ink.

Session: stale revision, repeated digest, move-while-pending, extend-when-idle, illegal travel, unverified checkpoint.

Budget: same 10 seeds × 6 first-legal moves. **Old 4+ rule:** 4/60 (0.067), greedy reach 0/10. **Trail-adjacent 3+** is the isolated replacement; remeasure and record. Do not tune spawns or enlarge the six-move budget. Spawn bias is not this slice. No human-usability claim.

## Phase C leftover (do not implement)

Arrival on move six still leaves no later matching move to analyze a presence record: Game keeps input disabled, evidence-progress rejects move 7, caseFlow wants family choice. Presence must later feed the **existing ladder** (035), not a second evidence system. Do not add presence gating here.

## Verification record

- Typecheck, `npm test` (192 pass), `npm run build`: pass. Production page `/routing-prototype` is client-only.
- React Doctor `--diff` vs origin/main: 48/100; no findings on new prototype React files. Remaining issues predate this slice.
- Engine tests: wrap is not adjacency; disconnected ink stored; illegal crossing; cascade 4+ inks without extension; one grant for 4+/5+/multi; empty frontier auto-skip; arrival once; resume pending.
- Session tests: unverified/stale/out-of-order, pending hold, illegal travel, malformed arrive command, round-trip.
- Review fixes: crossing stays choosable if the far bank was pre-inked; 409 move failures re-enable Game input; resume parse requires party on a reachable inked cell; store documented as unauthenticated/unevicted.
- Budget sample, same seeds `[91,7,13,21,34,55,89,144,233,377]`: **old 4+ 4/60 (0.067)**; **trail-adjacent 3+ 0/60 (0.000)**; **greedy reach 0/10**. Scripted west-bank ink + one crossing extension still reaches the survey. No spawn/budget tune. No human playtest of this rule.
- Browser: `/routing-prototype` at 1280×800 and 390×844. HUD, 6×6 terrain, camp/party/survey/barrier visible. Tap selects a habitat label. Travel stays disabled until a reachable non-party cell is selected. Main `/` map still loads. In-memory sessions 404 after HMR; client now recreates after a failed resume.
- Auth: `POST /api/runs` → 401 Sign in. No Clerk session in the agent browser. Authenticated three-clip / six-move ladder playtest not done.
- No human-usability claim (no agreed success threshold, no playtest log).

Phase C leftover: arrival on move six still leaves no later matching move to analyze a presence record.
