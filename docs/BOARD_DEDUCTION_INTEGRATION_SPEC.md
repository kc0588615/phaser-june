# Board–Deduction Integration Spec

**Status: Phases A and B implemented.**
- Phase A: all five verb rules in `src/expedition/methodVerbs.ts`, direct-only tier with Broad floor for cascade-only completions, tier legend + verb copy in FieldNotebook, survey zone rendering, in-scene trail HUD. Open question 1 resolved: any method match rewarms a cold trail (contributes 0, next one counts) — no soft-lock.
- Phase B: implemented in the Phaser scene, not the context (simpler than specced — `Game.ts` already holds full Species rows + the progressive clue getters, so it resolves drips locally and emits display-ready `field-note-dripped`; context appends to `caseState.fieldNotes`, client-only). `candidateIds` rides the board payload. Off-method 4+ match → 1 fact/move, 4/node cap, seeded candidate rotation skipping exhausted categories. UI: latest note on the board bar, full list at the guess stage. On resume, drips degrade gracefully (resume payload has skeletal species rows; notes from before resume are not restored).
- Phase C: Listen/Analyze needed no code — rankings in `caseOffers.ts` already offer all five methods and the v2 card matrix covers method × tier, so their Phase A verb rules were the missing piece. Obstacle-verb friction hints added (`METHOD_FRICTION_OBSTACLES` + `methodFrictionForObstacles` in methodVerbs.ts; amber ⚠ line on offer cards) — read support for the choice, not a mechanic. Cuts applied: multi-category/repeat-category multipliers, `lastMoveCategories`, `categoriesMatched` all removed; only match-size multipliers remain. Offer tree kept (verbs make it real).
- Playtest fix (2026-07-19): drip pool was `location species ∩ candidateIds`, which collapses to one animal (candidates are the six fixed prototypes; the clicked location usually hosts one). Now the context fetches full rows for all six candidates (`/api/species/by-ids`) once per run (start + resume — also fixes the skeletal-row resume degradation) and passes them as `candidateSpecies` on the board payload; Game.ts drips from that pool. Also: candidate/evidence terminology split (evidence citations say "Evidence"/"Log evidence", drips stay "Candidate notes"), singular/plural fixes on candidate counts.
- Codex review fixes (2026-07-19): verbs + direct-only tier now gated to v2 cases (`caseVersion` on board payload; v1 resumes keep legacy counting/tier); Phaser `inExpeditionRun` now derived from the board payload's `nodeIndex` so resumed runs get expedition game-over handling + drips; FieldNotebook board HUD reordered above the saved-interpretation branch (was hidden on nodes 2–3). Two codex P1s rejected as deliberate supersessions of plan 017: direct-only tier + Broad floor (§3a — skill not luck), category-multiplier cuts (§4).
- Still pending: remaining browser playtests (one run per verb, friction hints); numeric verb-target tuning at difficulty 4–5 (playtest-gated); interpretation-prediction keep/cut decision (playtest-gated); optional future: persist candidate notes via species_facts for album unlocks (plan 016 tie-in).

Fixes: board is a one-axis race (match one color N times); method choice is mechanically fake; evidence tier is cascade luck with invisible stakes; species facts arrive as passive reading. Goal: board choices ARE investigation choices.

Design invariants (unchanged): score-only economy, 12-move budget, `objectiveProgress`/`objectiveTarget`/`bestTargetMatchLength` server contract, v1/v2 snapshot compat, method-never-repeats rule, server-private answer/matrix.

---

## 1. Method verbs — one counting rule per method

Core idea: all five methods keep the same progress formula (`contribution = max(1, len - 2)`, same 4/6/8 targets from `methodObjectiveTargetForDifficulty`), but each method changes **which matches count**. A verb is a counting filter, not a new objective type — so the server contract, snapshots, and `complete` route need zero changes.

| Method | Gem | Counting rule | Fantasy / skill |
|---|---|---|---|
| Track | orange | Method match counts only if ≤2 moves since the last counting method match (first always counts). HUD shows trail freshness (fresh/fading/cold) | Follow the trail; tempo pressure |
| Observe | red | Only matches of len ≥ 4 count | Patience; board setup for big matches |
| Survey | green | Only matches intersecting a highlighted zone count (2–3 zones, seeded) | Coverage; work the terrain |
| Listen | yellow | Cascade-made matches count ×2, direct ×1 | Engineer cascades; ripple reading |
| Analyze | blue | All method matches count (baseline) | Fallback / tutorial verb |

- MVP: Track, Observe, Survey (the current `METHOD_SLOTS`). Listen/Analyze in Phase C.
- Survey zones: pure function of `boardSeed` (same pattern as `nodeObstacles.ts` seeding — deterministic, no stored state). 2 zones of ~2x3, non-overlapping, avoid obstacle cells.
- Method choice becomes a real read: player sees node obstacles + verb rules before locking; mud punishes Track trails, top-row junk punishes Listen cascades, etc. (explicit obstacle-verb tuning is Phase C; the emergent interaction is free.)

### Implementation
- `src/expedition/domain.ts`: add `METHOD_VERB_RULES: Record<MethodType, VerbRule>` (`{ kind: 'trail', windowMoves: 2 } | { kind: 'minLength', min: 4 } | { kind: 'zones' } | { kind: 'cascadeBonus', multiplier: 2 } | { kind: 'baseline' }`) + short player-facing rule copy (grades 6–12 tone).
- `src/game/scenes/Game.ts` `recordMatchesForSummary` (~line 893): replace the flat `requiredMatch` branch with verb filter. Needs two new inputs:
  - `movesSinceLastCountingMatch` (Track) — track alongside existing objective state.
  - `isCascadePhase` flag (Listen, and §3) — thread from `ExplodeAndReplacePhase` match batches: first batch = direct, subsequent = cascade.
- Zone data: generate in `nodeScoring.ts` next to obstacle seeds, pass through existing board-init payload, render as tinted cells in `BoardView.ts`.
- `EventBus` `node-objective-updated`: add optional `verbState` (trail freshness / zone hits) for HUD in `SpeciesPanel`/`GemSignalStrip`.
- Server: none. `objectiveProgress` semantics per-verb are client-computed, same bounds; `boardContext.method` already stored.
- Tests: extend `tests/expedition/domain.test.ts` (verb table pinned), add verb-filter unit tests around `recordMatchesForSummary` logic (extract filter into pure function `countsForVerb(rule, match, ctx)` in domain.ts so it's testable without Phaser).

### Balance starting points
- Track window: 2 moves. Observe: keep target but len≥4 only (a 4-match contributes 2, so effective ~2–4 big matches). Survey: zone cells ~20% of board.
- If a verb proves too tight at difficulty 4–5, tune per-verb target offset in `methodObjectiveTargetForDifficulty`, not the formula.

---

## 2. Off-method matches → candidate dossier drip

Off-method matches currently do nothing (noise). New: they buy **facts about the six public candidates** — study material for the final deduction. No leak risk: facts are labeled with the candidate's name; the answer stays server-private; drip source is `casePublic.candidateIds` only, never the evidence matrix.

Rules:
- Off-method match of len ≥ 4 (3s stay inert — keeps drip rare and deliberate) surfaces one fact: category = matched gem's `clueCategory`, species = next candidate in a seeded rotation (`boardSeed + dripIndex`), text = existing progressive getters in `clueConfig.ts` (`CLUE_CONFIG[category].getClue`) — this machinery is already built and unused.
- Max 1 drip per move (largest qualifying off-method match wins), max 4 per node (reading-load cap).
- Copy frame: "Field note — Addax: Diet: desert grasses." Displayed in a Field Notes feed (FieldNotebook tab or GemSignalStrip toast), persists for the run in `ExpeditionContext` (client state only; no API/DB writes — purely educational).

Player choice created: every move is now portfolio allocation — push the objective vs. graze a color whose category you want candidate intel on (e.g. mid-run you suspect it's the desert species: graze blue for geography notes on the other candidates to eliminate them).

### Implementation
- `Game.ts` `recordMatchesForSummary`: qualifying off-method matches emit `field-note-requested { category, dripIndex }` (typed in `EventBus`).
- `ExpeditionContext.tsx`: listener resolves candidate (seeded rotation over public candidates), fetches species row via existing species query hooks (React Query cache makes repeats free), calls progressive getter, appends to `run.fieldNotes`, caps at 4/node.
- UI: Field Notes list in `FieldNotebook.tsx`; brief toast on drip.
- Species objects must be stable references per run for the WeakMap progress in `clueConfig.ts` — hold them in context, don't refetch fresh objects per drip.

---

## 3. Evidence tier: visible stakes, skill not luck

Two changes:

**a. Direct-only tier.** `updateBestTargetMatchLength` currently counts cascade groups ("called for every direct and cascade group"). Change: only direct-resolution method matches update `bestTargetMatchLength`. Cascades still count for progress (and double for Listen — progress and data-quality are deliberately separate axes). A 5-match tier is now something you built, not something that fell on you.
- `src/expedition/evidenceQuality.ts`: `updateBestTargetMatchLength(current, len, isTargetMethod, isDirect)`; Game.ts passes the cascade flag from §1.
- Server: none — `complete` route stores the bounded max as before; `qualityTierForSuccessfulNode` unchanged.

**b. Tier legend before the board.** The method-offer card in `FieldNotebook.tsx` shows a static ladder: `3-match → Broad · 4 → Replicated · 5+ → High-resolution`, one line on what tier buys ("higher resolution evidence narrows the case further"), plus the chosen verb's counting rule. No dynamic card-content teasers (would require touching the private matrix — don't).

---

## 4. Cuts (do after §1 ships)

- `applyMoveBonuses` in Game.ts: `MULTIPLIER_MULTI_CATEGORY` and `MULTIPLIER_REPEAT_CATEGORY` reward category patterns the player can't see and no longer relate to anything. Cut both; keep large/huge-match multipliers (now aligned with tier chasing). Simplifies HUD multiplier story.
- Offer tree: **keep** — verbs make the choice real. If verbs are rejected, cut the offer tree instead (auto-assign method per node).
- Interpretation prediction: keep only if a wrong prediction gets a visible consequence in the recap; otherwise mark optional in UI. Decide after playtest, out of scope here.

---

## Rollout

- **Phase A** (core payoff): §1 verbs for track/observe/survey, §3a+3b. Board strategy + visible stakes.
- **Phase B**: §2 dossier drip. Active learning + off-color meaning.
- **Phase C**: Listen/Analyze verbs in the offer pool, obstacle-verb tuning pass, §4 cuts.

Each phase independently shippable; verify with `npm run typecheck` + pinned tests (`tests/lib/nodeScoring.test.ts`, `tests/expedition/domain.test.ts`) + browser playtest of one full run per verb.

## Open questions
1. Track trail-break feedback: silent non-count vs. explicit "trail cold" state that needs one method match to rewarm. (Spec assumes silent + HUD freshness indicator.)
2. Survey zone count/size at difficulty 4–5.
3. Drip cap of 4/node — enough to feel generous, or should cap scale with node index?
