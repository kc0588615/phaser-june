# Plan 025 (brainstorm only): Board-native soft intel after Field Signal

> **Status**: design-only. No implementation. Written 2026-07-28 in reply to a product review of the v3 match-3 deduction loop + Plan 023/024 Field Signal.
>
> **Goal**: more board interest in the spirit of Field Signal — surprise + meaningful board agency + vetted soft hints — while hard clues stay the only elimination spine.

## Current loop (locked)

- Three sites, six moves each. Direct gem clears build five evidence-family totals.
- After each site the player selects one offered family and receives one reviewed hard clue; that clue alone eliminates candidates.
- First cascade per site plants one Field Signal (`field_signal`, durability 1).
- Adjacent **direct** match clears it: match colour chooses soft-hint family; length 3 → 1 hint, 4+ → 2; cascades may destroy without payout; ignore has no penalty.
- Never pauses play; changes no score, evidence totals, offers, elimination, charges, or bonuses.
- Why Ruled Out exposes only traits of candidates actually eliminated by that clue; answer-derived and survivor traits stay hidden pre-verdict.
- Bonus facts remain post-verdict (leakage risk).

Successful pattern: **surprise + board agency + vetted soft**, hard clues sole cut.

## Constraints (carry forward)

- No modal quizzes
- No family-specific minigames
- No new authored content if possible
- No pre-verdict answer leakage
- No disruption of the six-move flow / no new `CaseStage` / never defer `evidence-progress-committed`
- Modest engineering cost
- Product-critical: reject skip-dominant or purely cosmetic rewards

## What not to build

| Idea | Why reject |
|---|---|
| Plan 022 predict modal + Reveal escape | Skip-dominant by run two |
| Plan 021 player-marked elimination | Different product (hard spine), not board soft layer |
| Pure cascade flavor / score baubles / radio replay alone | Cosmetic; ignore still rational |
| Second special gem type before evolving signal further | 024 deferred correctly; teach one lens first |
| Soft on every uncapped 4+ anywhere | Farmable; flattens Field Signal |
| Dual signals same site | Clutter; ignore still free; doubles same-hint spam |
| Uncleared-signal carry buff | Rewards ignoring |
| Site-end free soft for runner-up | No board agency |
| Anything mutating charge / offer / elim / score mid-board | Breaks spine |
| Mid-run `bonus_fact_text` | Answer leakage |

## Soft corpus reality

Soft pool is thin by design (prototype: ~4 reviewed hints per species×family). Extra soft is intentionally weak for identity safety — good. Spamming more lines of the **same** family is low value; **agency about which family pays** is the scarce resource.

---

## Rank 1 — Survey Split (evolve Field Signal)

### Player action

Clear the live signal with a **direct** match.

- Length **3**: unchanged — one soft of the match family.
- Length **4+**: instead of two lines of the *same* family, pay **1 of match family + 1 of a different family** chosen deterministically from evidence-coloured gems **adjacent to the signal cell** (not in the clearing match).
  - Prefer families still on the board (not yet selected/locked).
  - Tie-break: lowest current charge among neighbor families, then stable family order.
  - If no valid neighbor family → fall back to two of match family (today’s 4+).

### Surprise / skill

Cascade plant remains the surprise. Skill shifts from “clear with my main colour” to **geometry**: where the tile sits, which edge you attack, and whether you set up a 4+ to unlock cross-family intel. Neighbor-reading becomes board literacy.

### Educational value

Soft lines already teach family language. Split gives mid-site **comparison** of two families without a hard clue — better offer prep than double Place hints.

### Interaction with evidence selection

Strong complement: charge family A while scouting soft on neighbor B. Does not change who is offered; changes how informed the pick is. Selected families leave the board, so the neighbor menu narrows naturally (same 5→4→3 pressure as 024).

### Implementation surface (S)

- `fieldSignal.ts` payout shape → primary + optional secondary, or explicit `signalClearedFamilies: EvidenceFamily[]`
- `Game.ts` summary + `EventBus` evidence-move payload
- `parseEvidenceProgressInput` / `getEvidenceHintFamilies` (already multiplies by count — switch to explicit list)
- Tests: neighbor pick, fallback, locked-family exclusion
- No migration, no seed, no new UI chrome (FIELD TEAM ticker already multi-line)
- Optional: dual-tint flash on 4+ clear in `BoardView`

### Exploits / edge cases

1. Dual always available if signal always has multi-colour neighbors — mitigate with prefer-low-charge + **only on 4+**.
2. Empty neighbor set late site → same-family fallback.
3. Client could lie about secondary — server should recompute from checkpoint grid + match cells, or require secondary ∈ adjacent families present in submitted checkpoint (same trust model as length today).
4. Soft pool wrap remains weak; dual **different** families better than double same.
5. Cascade-only clear still unpaid — keep.

### vs Field Signal

**Evolve** payout table only. Keep spawn, durability 1, direct-only claim, no-pause, no economy mutation.

---

## Rank 2 — Underdog Scout (evolve Field Signal payout)

### Player action

Clear signal with direct match colour F.

- If F is **not** among current charge leaders (max charge among still-active families; all ties count as leaders): upgrade payout — **3-match → 2 soft of F** (instead of 1); 4+ stays 2 of F (or keep as-is).
- If F **is** a leader: keep today’s 3→1 / 4→2.

Stricter optional variant: upgrade only when F is outside top-2 charges.

### Surprise / skill

Intentional off-meta clears: spend a move on Place when Body leads because underdog intel is underpriced. Colour choice gains **strategic** meaning, not only aesthetic.

### Educational value

Players under-sample non-leading families (race the charge leader). Soft on underdogs improves offer literacy without quizzes.

### Interaction with evidence selection

Directly serves “should I bank the runner-up?” without mutating offers. Risk: if upgrade too fat, soft spam on every underdog 3 — keep upgrade modest (**+1 only on underdog 3-match**).

### Implementation surface (XS–S)

- Server has pre-move `evidenceCharges` on progress apply — compute leader set **server-side**
- Pure helper: `isUnderdogFamily(family, charges, selected)` → bump `signalHintCount`
- Telemetry can stay family+count; no content, no new endpoint

### Exploits / edge cases

1. Ties for lead: all tied max are leaders so underdog means strictly below max.
2. Early site all-zero charges: all tied → no upgrade (correct; Survey Split is better early).
3. Site 3 with three colours: still works.
4. Client cannot forge underdog without forging charge state (server authoritative).

### vs Field Signal

Pure **payout evolution**. Stacks later with Survey Split (underdog 4+ → split prefers other underdog neighbor). Ship one first.

### Product risk

Teaches “don’t only play your leader” — good. If soft feels mandatory, players slightly derail pure charge race — acceptable because hard clue still from totals; soft never eliminates.

---

## Rank 3 — Hazard Sample (complement Field Signal)

### Player action

Existing node obstacles (`mud` / `vine` / `junk` / `stone` / … from `nodeObstacles`) already take adjacent-match damage.

- First time **per site** a **direct** match finishes an obstacle (`durability → 0`), pay **1 soft** of that match’s family.
- Cascades may clear hazards with **no** soft.
- Cap: **one** hazard-sample payout per site. Later hazard clears are pure board hygiene.

### Surprise / skill

Early-site board **before any cascade** finally feeds deduction. Clearing path is already motivated (open space); soft is a rider on good obstacle play, not a second ignore-optional tile. Less “should I go out of my way?” than signal — obstacles block.

### Educational value

Same vetted soft corpus; spreads soft acquisition across the site instead of cascade-gated only. Teaches colour→family earlier.

### Interaction with evidence selection

Weak–moderate: early soft can bias which family you chase. Board-native and fine. Does not change offer math.

### Implementation surface (S)

- Mirror Field Signal match outcome for non-signal blockers in the existing Game adjacent-blocker loop
- On true hazard clear + `!isCascade` + `!hazardSampleClaimed` → set `hazardSampleFamily`
- Progress payload + server +1 hint family once
- Persist claimed flag on node/checkpoint metadata
- Reuse FIELD TEAM ticker; no new art required if clear VFX exists

### Exploits / edge cases

1. Sites with zero obstacles → no payout (signal still carries).
2. Double-clear same move: first hazard in stable iteration order wins.
3. Must not pay on `field_signal` path (already branched).
4. Cap 1/site prevents soft flood.
5. Ignore-dominant critique is weaker than free tiles — clearing hazards is often forced.
6. Do **not** attach soft to every hazard or cascade clears become free intel machines.

### vs Field Signal

**Complement**, not replace. Signal = cascade skill / intentional lens. Hazard Sample = early-board relevance. Together cover pre- and post-first-cascade without a second special tile type.

---

## Honourable mentions (do not ship yet)

### Cascade Bloom (evolve durability)

Durability 2; cascade chips only; need a second adjacent hit (prefer direct) to pay. Increases protect-vs-cascade tension inside six moves. Risk: more often expires uncleared → soft less reliable → ignore becomes more dominant. Playtest only after Split/Underdog.

### Charge Echo

Uncapped 4+ → free soft without tile is farmable. If ever: hard-cap 1/site and only when no live signal (fills cascade-dry sites). Lower priority than Hazard Sample.

---

## Recommended ship order

1. **Survey Split alone** — highest skill ceiling, best educational (cross-family), pure evolve of 024, S cost, no new skip trap beyond existing opportunity cost.
2. Playtest one prototype species set.
3. Then either:
   - **Underdog Scout** if players only clear with the charge leader, or
   - **Hazard Sample** if sites feel dead until first cascade.

Do **not** stack all three at once. Soft is intentionally weak; three sources will either spam the 4-hint pools or train players that board soft replaces reading hard clues.

## Invariants locked for any of these

- No modal, no new `CaseStage`, never defer `evidence-progress-committed`
- No score / charge / offer / elimination / bonus mutation from soft paths
- No `bonus_fact_text` mid-run
- No new authored rows / migration / endpoint if possible
- Cascade-only clear of Field Signal remains unpaid
- Hard clues remain the only candidate cut

## Code anchors

- `src/game/fieldSignal.ts` — place, damage, payout
- `src/game/scenes/Game.ts` — adjacent blocker loop, move summary
- `src/lib/evidenceRunState.ts` — hint families, signalHintCount, cascade flavor suppress
- `src/components/FieldHintTicker.tsx` — FIELD TEAM multi-line queue
- `docs/EXPEDITION_RUN_LOOP.md` — player-facing loop truth
- `plans/023-board-side-signal-tile.md`, `plans/024-lens-gem.md` — shipped design history
