# Plan 013: Investigation-Method Tiles + Server-Side Deterministic Case Compiler

> **Executor instructions**: Follow phases in order. Run every verification gate. Stop at every STOP condition. This plan was written 2026-07-10 from a full read of the cited files at commit `ea17a07` + uncommitted working tree; re-verify any `file:line` before editing (working tree was dirty when planned).
>
> **Drift check (run first)**: `git status --short -- src/game src/expedition src/lib src/contexts src/types src/db src/app/api plans/` and `npm run typecheck && npm test`. Record baseline. Any test failures BEFORE you start are pre-existing — note them, don't fix them silently.

## Status

- **Priority**: P1
- **Effort**: XL
- **Risk**: MED-HIGH (touches persistence, API, board, and deduction loop simultaneously — mitigated by phase ordering: server-first, client-last)
- **Depends on**: owner decision recorded 2026-07-10 (cross-agent design review, Claude ⇄ codex): the redesign direction is ACCEPTED; contract below is final
- **Planned at**: 2026-07-10, working tree on `main` at `ea17a07` + uncommitted changes
- **Revised 3.1**: 2026-07-10 — signature_tag must also live in exactly one semantically correct trait array (live check: both existing signature values sit in sparse arrays, 0/2 in common); signature CARD may use its sparse category while non-signature cards stay in the six common categories; node-row success gate scoped to nodeIndex 0-2 (obs-3 has no node row); reasoning-event PATCH awaited before advancing (explicit exception to the fire-and-forget non-goal; obs-2 commit durable before requesting obs-3); /guess server-rejects while any issued ref lacks a persisted interpretation; nodeIndex 0-2 ↔ node_order 1-3 mapping stated; pre-commit UI shows observationText only; stale wording removed
- **Revised 3**: 2026-07-10 — coverage wording corrected (six legacy arrays populated in all 24 profiles; geography/conservation/key_fact/signature in only 2 — never "all 24 full"); obs-3 gate tightened to ALL THREE regular observations issued AND all three interpretations committed; endpoint/cardinality text reconciled to nodeIndex 0–3 and 0–4 total issued cards with interpretation required for obs-3
- **Revised 2**: 2026-07-10 — live-DB verification via tunnel corrected fact #14; signature-card issuance path defined (`obs-3`); 3-node client sequencing specified (awaited node completion, run completes only via /guess)
- **Revised**: 2026-07-10 (same day) after codex cold review — blockers P0-1…P0-5 and P1-6…P1-9 addressed: 3-node route expansion phase added; profile-authoring prerequisite added; earned-evidence objective defined (observation only on objective success); `evidence_cards` gains `traitCategory`, drops `polarity`, enforces one compareTag in v0; active-gem-set spawn change (zero weights don't disable gems today); extra leak surfaces closed (`new-game-started`, GameBridgeContext, SpeciesGuessSelector, PATCH speciesId); per-node transactional observation idempotency; fixed v0 route-method contract; live-DB migration approval STOP + `.env.example` secret handling; explicit v1 deferrals listed

## Relationship to Plan 012

Plan 012 (`012-july9-hybrid-match3-evidence-loop.md`) argued "measure the current 8-color evidence loop before replacing it." The 2026-07-10 review superseded that gate: the owner + codex converged on replacing the 8 knowledge-category tiles with 5 investigation-method tiles and a server-side case compiler. Plan 012's content-quality findings remain valid inputs (genus-tag uniqueness leak, GIS-tag vocabulary mismatch, AND/OR clue semantics) but its "keep and measure" staging is dead. Do not execute 012's board-measurement phases. Mark 012 SUPERSEDED in `plans/README.md` when this plan starts.

Separately, `plans/012-july9-improved deducation game system` (no `.md`) is a 331-line codex DESIGN TRANSCRIPT, not the superseded executable plan. This plan (013) implements that transcript's foundation — five method tiles, server compiler, interpretation step — but **explicitly defers to v1**: the 1-of-2 method choice per node (the transcript's central agency hypothesis — v0's fixed methods are forward-compatible but do NOT test it), the Insight special tile, richer GIS-driven board physics, post-reveal learning content, and the retrieval/spaced-repetition loop. Do not scavenge the transcript for scope during execution; those items re-enter only through the Phase 8.5 gate.

---

## Part 1 — Verified current-state facts (all confirmed 2026-07-10)

1. **Board spawns loot-only.** `src/game/BackendPuzzle.ts` — `getInitialPuzzleStateWithNoMatches` (~L147) and `pickWeightedGem` (~L252) draw only from `LOOT_GEM_TYPES` (8 colors). Action-gem spawn config retained but explicitly inert (comment ~L251). Uses `Math.random()` throughout — **no seeded RNG anywhere in the board**.
2. **Dead action family lives on.** `src/expedition/domain.ts` — `ACTION_GEM_TYPES` (8), `DEFAULT_ACTION_WEIGHTS`, `createBoardSpawnConfig` action math, `NODE_TYPE_BOARD_META` boosts, affinity→action-gem buffs (~L292). All dead weight downstream of the loot-only spawner.
3. **Latent soft-lock.** `src/lib/nodeScoring.ts` — `computeActionBias` (~L150) emits action distributions; `NODE_TEMPLATES` derive `counterGem`/`requiredGems` from obstacle family; `src/game/scenes/Game.ts:1188-1190` consumes them into `nodeCounterGem`/`nodeRequiredGems`/`nodeObjectiveTarget`. `generateRunNodes` hardcodes `objectiveTarget: 0` so it's latent, but the data persists to DB and re-arms if anyone sets a target > 0.
4. **Auto-fire clue pipeline, zero player decision.** `src/contexts/ExpeditionContext.tsx` — `handleDeductionClueTriggered` (~L383) auto-processes next clue for the matched wallet key (toast + append). `buildHabitatLootWeights` (~L737) does GIS-habitat-substring → gem-color weighting.
5. **Answer is client-side.** `chooseMysterySpecies` runs in `handleExpeditionStart` (~L149); `correctSpeciesId` POSTed to `/api/runs` (stored in `ecoRunSessions.metadata` jsonb — `src/app/api/runs/route.ts:83`); `/api/species/deduction?mysteryId=<answer>` leaks identity in the query string; resume payload returns it (`src/app/api/runs/[runId]/route.ts:135`); `ExpeditionContext` exposes `correctSpeciesId` + `hiddenSpeciesName` in its context value.
6. **Three category vocabularies, two lossy maps.** `GemCategory` (`src/game/clueConfig.ts`) → `ClueCategoryKey` (`src/types/expedition.ts`, `deductionCatToWalletKey`) → `DeductionClueCategory` (`src/db/schema/species.ts`, `WALLET_KEY_TO_DEDUCTION_CATEGORIES` in `src/lib/deductionEngine.ts` — where `habitat → []` and `geographic → [geography, habitat]`).
7. **Schema.** `species_deduction_profiles` = 9 fixed tag arrays + `signature_tag`, GIN-indexed. `species_deduction_clues` = per-species ordered rows (`reveal_order`, `compare_tags`, `is_filtering`, `unlock_mode`, `base_cost`). `ecoRunSessions` has an unused `runSeed` bigint; `ecoRunNodes` has an unused `boardSeed` bigint (both already in `src/db/schema/game.ts` — reuse them, don't add duplicates).
8. **Dual clue paths in Game.ts.** Expedition path emits `deduction-clue-triggered`; non-expedition path calls `revealCluesForCategory` with match-size thresholds (`processMatchedGemsForClues` ~L1704, `processMatchedGemsWithOriginalTypes` ~L1661).
9. **EventBus** (`src/game/EventBus.ts`) is fully typed. `cesium-location-selected` carries `counterGem`, `requiredGems`, `boardConfig`; `deduction-clue-triggered` carries `{category: DeductionClueCategory, matchLength, source}`.
10. **Existing tests**: `tests/{types,expedition,game,lib}` — 7 suites via `npm test` (`scripts/run-tests.mjs`), behavior-pinning BackendPuzzle, domain, gemSemantics, nodeObstacles, nodeScoring, expedition types.
11. **Single-node runs today.** `generateRunNodes` (`src/lib/nodeScoring.ts:374-404`) returns exactly ONE node, and `POST /api/runs` truncates regardless: `applyWaypointsToRunNodes(nodes).slice(0, 1)` (`src/app/api/runs/route.ts:61`). The 3-observation contract requires explicit 3-node generation + persistence (Phase 3.0) — without it this plan cannot complete.
12. **Zero weights do NOT disable gems.** `pickWeightedGem` treats any weight ≤ 0 as 1 (`src/game/BackendPuzzle.ts:256,262`), and the initial-fill retry/fallback samples from ALL `LOOT_GEM_TYPES` (~L147,L177-180). Disabling `black`/`white`/`purple` requires an active-gem-set change in spawn selection itself (Phase 4), not weight tuning.
13. **More answer-leak surfaces than ExpeditionContext.** `new-game-started.hiddenSpeciesName` (EventBus payload, emitted by `Game.ts`) → `GameBridgeContext.tsx:73` stores `hiddenName` → `SpeciesGuessSelector.tsx` compares the player's guess against the hidden/actual name CLIENT-SIDE (`actualName` in `species-guess-submitted`). The client PATCH to `/api/runs/:id` also sends `speciesId` (the answer). All are in scope for leak closure (Phase 5).
14. **Live DB content — exact coverage, per-category tunnel query 2026-07-10.** `species_deduction_profiles`: 24 rows. Six legacy arrays populated in ALL 24 (`habitat`, `morphology`, `diet`, `behavior`, `reproduction`, `taxonomy`); three arrays populated in ONLY 2 (`geography`, `conservation`, `key_fact`); `signature_tag` set in ONLY 2. Do not describe the 24 as "full" profiles. `species_deduction_clues`: 373 rows across 24 species. Live check: BOTH existing `signature_tag` values appear in a sparse array (`geography`/`conservation`/`key_fact`) and in NONE of the six common arrays. Rule: non-signature evidence cards restrict `traitCategory` to the six common categories; every `signature_tag` must ALSO exist in exactly one semantically correct trait array of its species (Phase 0.5 authors both), and the signature card uses that array's category — sparse categories permitted for signature cards only. (Tunnel note: 127.0.0.1:55432 accepts connections from this repo's WSL environment; strip the `?pgbouncer=true` param for psql — it rejects the URI parameter, consistent with the CLAUDE.md warning. Sandboxed agent environments may not see the tunnel — verify from a plain shell before declaring it down.)

## Part 2 — Final design contract (agreed with codex 2026-07-10, do not re-litigate)

- **5 investigation-method tiles**: Track, Observe, Listen, Survey, Analyze. Methods are board verbs (acquisition); biological/subject dimensions stay as content traits, never board controls. Method REPLACES `GemCategory` + `ClueCategoryKey` — it must not become a 4th vocabulary layer.
- **Frozen internal ids**: map the 5 methods onto 5 existing loot gem ids (relabel only); zero-weight the other 3. Never mint new gem ids (save/asset compat discipline — see `.claude` memory "Match Battle theme").
- **Answer-secrecy invariant (server-private forever)**: answer id, answer display name, compiled chain (card selection + order), and `caseSeed`. `caseSeed = HMAC-SHA256(CASE_COMPILER_SECRET, runId)` — never transmitted (with a public compiler + public content, `hash(runId)` is brute-forceable per candidate hypothesis). Public per-node `boardSeed` for deterministic board replay. **Invariant: board spawn weights derive from location/route only, NEVER from the answer** (currently true — `buildHabitatLootWeights` is location-based; keep it so).
- **Leak-closure removals**: `correctSpeciesId` from POST /api/runs body; the entire `GET /api/species/deduction?mysteryId=` endpoint; `resume.correctSpeciesId`; `correctSpeciesId`/`hiddenSpeciesName` from ExpeditionContext. Evidence delivered one card per earned observation via `POST /api/runs/:id/observations`; guess via `POST /api/runs/:id/guess` returning `{correct, contrastiveFeedback}` (feedback needs the mystery profile → server-side).
- **Symmetric visibility**: full candidate list WITH all trait profiles is client-visible, answer sits among them indistinguishably — that's the game, not a leak. Card refs are opaque per-run indices, never `evidence_cards` row ids; no endpoint may dereference a card ref → species.
- **Case snapshot split**: `case_public` (shuffled candidateIds, per-node objective options, boardSeeds) vs `case_private` (answerId, ordered chain, caseSeed). Only a public projection is ever serialized, including resume.
- **Compiler**: deterministic seeded greedy. 6–8 candidates (answer included, each sharing ≥1 trait with answer). Chain = exactly 3 observations; score each unused evidence card by `|remaining/2 − eliminations|` + predicate-reuse penalty; seeded tie-break. Signature card appended as optional 4th ONLY on residual ambiguity (>1 surviving candidate). Snapshot is immutable — resume/replay never recompiles.
- **v0 scope decision**: FIXED method per node (no 1-of-2 objective choice in v0). Consequence: 7 evidence cards per target (2 cards × 3 route methods + 1 signature) → 42 cards for 6 entities. The 1-of-2 choice (which requires 9–10 cards/target, ~55–60 total) is a v1 upgrade, gated on prototype metrics. NEVER rescue low card counts by offering only methods the answer has cards for — the offer pattern meta-leaks identity.
- **Interpretation step**: REQUIRED, graded, non-blocking prediction. Before elimination applies, the player predicts which candidates the observation rules out; engine then applies the true elimination and renders the delta AS the contrastive feedback. Wrong predictions never halt progress.
- **Schema scope** (CLAUDE.md simplicity rule): ONE new table (`evidence_cards`, compare tags as `text[]` column — no join table) + case snapshot jsonb on the existing runs table. DEFER: `trait_definitions`, `entity_traits`, `evidence_card_traits`, `run_reasoning_events` (jsonb array via existing PATCH first), `lore`. `species_deduction_profiles` stays authoritative for the slice. `species_deduction_clues` + the fragment economy get DEPRECATED — never run both systems.
- **Metrics pass/fail** (Part 6 below) — includes seed→identical-snapshot hash test, 200-run solvability, elimination-per-observation band, interpretation accuracy band.

**v0 amendments (2026-07-10 second codex review — binding):**
- **Earned evidence**: an observation is issued ONLY when the node's method-match objective succeeds. Objective = clear N tiles of the node's method gem within the move budget (`objectiveType: 'method_match'`, reusing the existing generic objective columns/machinery — `objectiveTarget`, `objectiveProgress`, `node-objective-updated`). Victory → observation at node advance; escaped/failed → NO observation for that node, run continues to the next node. The guess phase must be playable with 0–4 issued cards (3 regular + optional signature; fewer cards = harder guess, that's the stake), each issued card carrying a required interpretation commit — including obs-3. Preserve the generic objective machinery in the deletion sweep — delete only the action-gem counter mechanics.
- **Evidence atomicity**: each card carries `traitCategory` (a `DeductionClueCategory`, mapping the card to exactly one profile tag array) and EXACTLY ONE `compareTag` in v0 (validator-enforced). `primaryPredicate` remains only the compiler's independence key. NO negative polarity in v0 — the column is dropped; inverse matching + its validator rules are a v1 design item (negative polarity contradicts the compareTag-must-be-in-answer-profile validation).
- **Fixed v0 route-method contract**: every case uses the same three methods in slot order — node 0 = `track`, node 1 = `observe`, node 2 = `survey` — regardless of node type. Node type contributes flavor only (obstacles, rationale, board context). `listen`/`analyze` gems exist in the registry but are not route methods in v0. This is what makes 7 cards/target (2×track + 2×observe + 2×survey + 1 signature) = 42 total sufficient. The node-type→method map is v1, gated with the objective-choice upgrade.

## Part 3 — Target architecture

```
POST /api/runs                    ── server picks answer, compiles case, stores
  ├─ ecoRunSessions.metadata.casePrivate  {answerId, chain:[cardId…], caseSeed}   (never serialized out)
  ├─ ecoRunSessions.metadata.casePublic   {candidateIds[], nodeMethods[], boardSeeds[], version:1}
  └─ response: {runId, nodeIds, casePublic}

POST /api/runs/:id/observations   ── body {nodeIndex} → that node's chain card
  └─ response: {ref: "obs-<nodeIndex>", method, observationText, inferenceText,
                traitCategory, compareTag, isSignature}
     (issued only if that node's objective succeeded; idempotent per nodeIndex)

POST /api/runs/:id/guess          ── body {speciesId} → {correct, contrastiveFeedback[]}

Client: EventBus 'observation-earned' {method, matchLength} → ExpeditionContext
  → fetch observation → interpretation prediction UI → local elimination vs
  candidate profiles (client-computable; answer not needed) → reasoning event
  appended via existing PATCH checkpoint.
```

Method↔gem mapping (internal ids frozen; labels/colors tunable later, ids not):

| Method  | Internal gem id | Rationale                     |
|---------|-----------------|-------------------------------|
| Track   | `orange`        | ground/prints warm tone       |
| Observe | `red`           | sighting                      |
| Listen  | `yellow`        | acoustic                      |
| Survey  | `green`         | habitat/vegetation            |
| Analyze | `blue`          | lab/data                      |
| (unused)| `black`,`white`,`purple` | weight 0, assets stay |

## Part 4 — Implementation phases

Order is deliberate: schema → pure compiler → server API → board seeding → client loop → content → cleanup. Phases 1–3 land with zero client-visible change.

### Phase 0 — Baseline
1. Run drift check (top of file). `npm run typecheck && npm test` — record results.
2. Read `src/db/schema/game.ts` (ecoRunSessions/ecoRunNodes), `src/app/api/runs/route.ts`, `src/app/api/runs/[runId]/route.ts` in full before touching anything.
3. Check exact per-category coverage via postgres-tunnel skill (strip `?pgbouncer=true` for psql): `select count(*) filter (where cardinality(geography_tags)>0) geo, count(*) filter (where cardinality(conservation_tags)>0) cons, count(*) filter (where cardinality(key_fact_tags)>0) kf, count(*) filter (where signature_tag is not null) sig, count(*) total from species_deduction_profiles;`. Expected as of 2026-07-10: six common arrays populated in all 24; geo/cons/kf/sig = 2 each. Phase 0.5 is required regardless.

### Phase 0.5 — Profile selection + signature authoring (hard gate for Phases 2–3 verification)
Corrected scope per fact #14: all 24 profiles have the six legacy arrays populated; geography/conservation/key_fact arrays and `signature_tag` exist in only 2. Before any compiler/API integration testing:
1. Select the 6 prototype species from the 24 (owner picks; favor mutual distinctness in habitat + morphology so candidate splits are non-trivial; tiger + addax included by default since they also have authored clue decks).
2. Author `signature_tag` for the selected species missing one (≥4). Signature = a tag unique to that species within the full 24-species pool (validator-checked), since the candidate sample draws from the whole pool. Author BOTH the `signature_tag` column AND its membership in exactly one semantically correct trait array of that species (validator asserts the tag exists in exactly one array); that array's category becomes the signature card's `traitCategory` (sparse categories allowed here only).
3. Quality pass on the 6 selected profiles against plan 012's findings: tags drawn from the shared vocabulary in `src/lib/deductionTags.ts`; no unique `genus:`-style tags OUTSIDE `signature_tag`; every non-signature tag used by evidence cards must appear in ≥2 profiles.
4. Extend/reuse the seed loader validation (`scripts/seed-deduction.ts` or sibling) — per-category cross-species overlap report over the 6 (a category where all 6 share one tag can't split; zero overlap can't confirm).
5. Gate: 6 selected species each have nonempty arrays + valid unique `signature_tag` in the tunneled DB; overlap report reviewed. **STOP for owner sign-off before Phase 2's compiler tests run against them.**

### Phase 1 — Vocabulary + schema (no behavior change)
1. `src/expedition/domain.ts`: add
   ```ts
   export const METHOD_TYPES = ['track','observe','listen','survey','analyze'] as const;
   export type MethodType = typeof METHOD_TYPES[number];
   export const METHOD_GEM_MAP: Record<MethodType, LootGemType> = {
     track:'orange', observe:'red', listen:'yellow', survey:'green', analyze:'blue' };
   export const GEM_METHOD_MAP: Partial<Record<LootGemType, MethodType>> = /* inverse */;
   ```
   Do NOT delete the action family yet (Phase 7).
2. New table in `src/db/schema/species.ts`:
   ```ts
   export const evidenceCards = pgTable('evidence_cards', {
     id: serial('id').primaryKey(),
     speciesId: integer('species_id').notNull().references(() => speciesTable.id, { onDelete:'cascade' }),
     method: text('method').notNull().$type<MethodType>(),
     observationText: text('observation_text').notNull(),   // what the player sees in the field
     inferenceText: text('inference_text').notNull(),       // why it means what it means (educational payload)
     traitCategory: text('trait_category').notNull().$type<DeductionClueCategory>(), // maps card → exactly one profile tag array
     primaryPredicate: text('primary_predicate').notNull(), // independence key for compiler only (NOT the profile mapping)
     compareTags: text('compare_tags').array().notNull().default(sql`'{}'::text[]`), // v0 validator: exactly 1 element, present in the species' profile[traitCategory] array
     // NO polarity column in v0 — negative/inverse matching is v1 (needs inverse-validator design)
     isSignature: boolean('is_signature').notNull().default(false),
     specificity: smallint('specificity').notNull().default(2), // 1 broad – 3 narrow, compiler tiebreak
     source: text('source'),            // nullable provenance
     reviewStatus: text('review_status'), // nullable
     createdAt: timestamp('created_at', { withTimezone:true }).notNull().defaultNow(),
   }, (t) => [
     index('ix_evidence_cards_species').on(t.speciesId),
     index('ix_evidence_cards_species_method').on(t.speciesId, t.method),
     index('ix_evidence_cards_compare').using('gin', t.compareTags),
   ]);
   ```
   Player-facing text obeys the grades-6-12 tone rules (memory: `feedback_audience_tone`).
3. Case snapshot: NO new column. Use `ecoRunSessions.metadata` jsonb keys `casePublic` / `casePrivate` (metadata already holds `correctSpeciesId` today). Enforce the boundary in code: create `src/lib/runProjection.ts` with `projectRunForClient(session)` that whitelists metadata keys — every GET/POST/PATCH response for runs MUST pass through it. `casePrivate` and legacy `correctSpeciesId` are never in the whitelist.
4. Migration via drizzle (follow `docs/DRIZZLE_ORM_GUIDE.md`; migrations run in isolation — verify imports available in migration context per CLAUDE.md). **STOP: get explicit owner approval before applying ANY migration to the tunneled live DB** — this is the production database, there is no staging copy.
5. Gate: `npm run typecheck`; migration reviewed + owner-approved + applied; `npm test` unchanged.

### Phase 2 — Pure case compiler
1. New `src/lib/caseCompiler.ts` (pure TS, zero imports from React/Phaser/db):
   ```ts
   export interface CompilerCard { id:number; speciesId:number; method:MethodType;
     traitCategory:DeductionClueCategory; primaryPredicate:string; compareTag:string;
     isSignature:boolean; specificity:number }
   export interface CompiledCase {
     version: 1;
     public: { candidateIds:number[]; nodeMethods:MethodType[]; boardSeeds:number[] };
     private: { answerId:number; chainCardIds:number[]; caseSeed:string };
   }
   export function compileCase(input: {
     caseSeed: string;                    // hex string, already HMAC'd by caller
     speciesPool: DeductionProfile[];     // from species_deduction_profiles
     cardsBySpecies: Map<number, CompilerCard[]>;
     gisPrior: Map<number, number>;       // speciesId → soft weight ≥ 0 (habitat/waypoint fit)
     routeMethods: MethodType[];          // length 3, fixed per node in v0
   }): CompiledCase | { error: string }
   ```
2. Algorithm (keep it this simple — no entropy math, no search):
   - `rng = mulberry32(hash32(caseSeed))` — implement both helpers in-file, ~10 lines.
   - **Answer**: seeded weighted pick from pool by gisPrior, restricted to species with ≥2 cards per route method + 1 signature (else `{error}` — caller falls back to next-best answer candidate).
   - **Candidates**: seeded weighted sample of 5–7 others (total 6–8) requiring each shares ≥1 compareTag with the answer in ≥1 category (prevents first-observation trivial elimination). Shuffle final array with rng (answer position must be uniform).
   - **Chain**: greedy, exactly 3. At each step, over answer's unused cards whose `method === routeMethods[step]`: `elim(card)` = count of live candidates whose `profile[card.traitCategory]` does NOT contain `card.compareTag`; `score = |liveCount/2 − elim| + (predicateUsed ? 2 : 0) − specificity*0.1`; pick min, seeded tie-break; apply elimination to the live set.
   - **Signature fallback**: if live set >1 after 3 steps, append the signature card as chain[3].
   - **Route methods**: v0 is the FIXED global sequence `['track','observe','survey']` (contract amendment) — the caller passes it as a constant. NOT derived from which cards the answer has — meta-leak rule. If a species lacks 2 cards per route method + signature, reject it at the Answer step, never bend the route.
   - **Runtime failure tolerance**: the compiler always emits a full 3-card chain; a player failing a node objective means that card is never ISSUED (server-side issuance check, Phase 3), not that the chain changes. The guess endpoint must accept guesses with 0–4 issued cards (3 regular + optional signature).
3. `boardSeeds`: `hash32(caseSeed + ':board:' + nodeIndex)` — deterministic, one-way from caseSeed, safe to publish.
4. Tests `tests/lib/caseCompiler.test.ts`:
   - same input → byte-identical `JSON.stringify(CompiledCase)` (hash assert);
   - different caseSeed → different candidate order;
   - every chain card eliminates ≥1 candidate;
   - signature appears iff ambiguity remains;
   - answer never at a biased index (χ² over 500 seeds is overkill — assert uniform-ish over 100: no index >30%);
   - species with insufficient cards → `{error}`.
5. Gate: new tests green; `npm test` green.

### Phase 3 — Server API (route expansion + leak closure)
0. **Route expansion to 3 nodes (P0 blocker fix).** `generateRunNodes` (`src/lib/nodeScoring.ts`) currently returns ONE node and `POST /api/runs` truncates with `.slice(0, 1)` (`route.ts:61`). Change `generateRunNodes` to return THREE nodes: slot 0/1/2 templates still chosen from GIS context (waypoint/habitat flavor as today — obstacles, rationale, difficulty), but each node gains `method: METHOD_SLOTS[slot]` where `METHOD_SLOTS = ['track','observe','survey']`, `objectiveType: 'method_match'`, and `objectiveTarget` = method-gem tiles to clear (v0 default 6, difficulty-scaled ±2; tune in one constant). Change the API truncation to `.slice(0, 3)`. Persist per-node: `objectiveType`, `objectiveTarget`, `boardSeed`, method (in node `boardContext` or a metadata key — `ecoRunNodes` has no method column; do NOT add one, use the existing `boardContext` jsonb). Update `tests/lib/nodeScoring.test.ts` pins. Waypoint handling (`applyWaypointsToRunNodes`) already supports multi-node arrays — verify slots map sanely to waypoints.
1. `POST /api/runs` (`src/app/api/runs/route.ts`):
   - DELETE `correctSpeciesId` from the accepted body (ignore if sent — old clients).
   - Server: build `gisPrior` from the request's habitats/waypoints (port the scoring logic of `chooseMysterySpecies`/`scoreSpeciesForAnchor` from `ExpeditionContext.tsx:767-800` to a server module `src/lib/answerPrior.ts` — move, don't duplicate); `caseSeed = HMAC-SHA256(process.env.CASE_COMPILER_SECRET, runId)` (crypto.createHmac; **STOP and ask owner to set the secret in Vercel + local `.env.local` before deploy; add the VARIABLE NAME with a placeholder to a tracked `.env.example`, never a real value in any tracked file**); load profiles + evidence cards for the candidate pool (Drizzle, try/catch per CLAUDE.md); `compileCase(...)` with `routeMethods = METHOD_SLOTS`; store `metadata.casePrivate` + `metadata.casePublic`; write `ecoRunNodes.boardSeed` per node.
   - Response: `{runId, nodeIds, casePublic}` via `projectRunForClient`.
2. New `POST /api/runs/[runId]/observations/route.ts`:
   - Body `{nodeIndex}` (0–3; 0–2 = regular route observations, 3 = signature). Auth-check run ownership (copy pattern from `nodes/[nodeIndex]/complete`).
   - **Issuance gate (nodeIndex 0–2 ONLY)**: the node's row must show objective success (`objectiveProgress >= objectiveTarget` on the completed node, set by the existing `nodes/[nodeIndex]/complete` flow). Objective not met → 403 `{reason: 'objective_failed'}` — no observation for that node, ever. `nodeIndex: 3` has NO node row — it is governed solely by the signature gate below. Mapping note: client `nodeIndex` 0–2 corresponds to DB `node_order` (and the `nodes/[nodeIndex]/complete` path segment) 1–3 via `nodeOrder = nodeIndex + 1` — the existing ExpeditionContext convention; state it, don't rediscover it.
   - **Idempotency (P1 blocker fix)**: NOT a global counter. Persist `metadata.observationsIssued: Array<{nodeIndex, ref, cardId, issuedAt}>` and update transactionally — wrap the read-check-append in a single transaction with `SELECT ... FOR UPDATE` on the run row so concurrent/duplicate requests for the same `nodeIndex` return the SAME card without advancing anything. Chain position = `nodeIndex` (chain card i belongs to node i), so a skipped/failed node never shifts later cards.
   - Response card content with opaque ref `obs-<nodeIndex>`. Never return `evidence_cards.id`. 409 only for `nodeIndex` outside 0–3, or (for 0–2) node not yet completed.
   - **Signature issuance path (gap fix; gate per Revision 3)**: the fallback signature card (chain[3], present only when the compiler found residual ambiguity) is served as `nodeIndex: 3` / ref `obs-3`. Gate: ALL THREE regular observations issued AND all three interpretations committed (interpretation commits are visible server-side via the reasoning events persisted through PATCH — the endpoint checks `metadata.reasoningEvents` covers obs-0..obs-2) AND `casePrivate.chainCardIds[3]` exists — else 403 `{reason: 'no_signature'|'not_eligible'}`. Rationale: any weaker gate makes failed boards irrelevant — the signature must reward full diligence, not rescue skipped work. A run with any failed node lives with its residual ambiguity. No board play required for obs-3 itself, and it REQUIRES an interpretation commit like every other issued card. Same idempotency array as regular observations.
3. New `POST /api/runs/[runId]/guess/route.ts`:
   - Body `{speciesId}`. **Reject with 409 `{reason: 'uncommitted_interpretation'}` while ANY issued ref (including obs-3) lacks a persisted interpretation in `metadata.reasoningEvents` — UI gating alone is insufficient.** Otherwise compare to `casePrivate.answerId`. Must accept guesses with 0–4 issued cards.
   - On wrong: compute `contrastiveFeedback` server-side = for each ISSUED observation, `compareReference(answerProfile, guessedProfile, traitCategory, [compareTag])` — move/reuse `compareReference` from `src/lib/deductionEngine.ts` (pure, server-importable). Persist the wrong guess (`guessedSpeciesId`, `guessCorrect` on the analysis/last node).
   - On correct: **finalize server-side (P1 blocker fix)** — set `runStatus: 'completed'`, compute + write `finalScore` (banked score from run row + guess bonuses via `getGuessBonuses` logic moved server-side), write deduction summary, and perform the discovery/card-progression writes that are currently client-triggered (`unlockSpeciesCardDiscovery` + the `species-card-progress-updated` path — port the server effects; the client keeps only the UI refresh event). The client PATCH must no longer send `speciesId` or `finalScore` for the win path.
   - Return `{correct, contrastiveFeedback, finalScore?}`.
4. `GET /api/runs/[runId]` (`buildResumePayload` ~L119-135): remove `correctSpeciesId` from the payload; add `casePublic` + issued observations (replay refs + content — they were already revealed, re-sending is not a leak) + reasoning events. Route ALL run serialization through `projectRunForClient`.
5. `DELETE src/app/api/species/deduction/` (the `?mysteryId=` endpoint) — grep consumers first: `rg -n "species/deduction" src/`; the only caller is the ExpeditionContext effect (~L521-561), which Phase 5 rewrites. Delete endpoint and caller in the same commit.
6. Back-compat: runs whose metadata lacks `casePublic` (pre-migration in-flight runs) → resume returns `{legacy: true}`; client shows "expedition format updated — start a new run" toast + reset (graceful invalidation per contract). Do not attempt to synthesize a case for old runs.
7. Gate: typecheck; manual API smoke via curl through dev server (create run → request 4 observations → 409 on 5th → guess wrong → guess right); confirm `rg -n "correctSpeciesId" src/app src/contexts src/components` shows only the legacy-tolerant read (ignored input) and nothing in any response builder.

### Phase 4 — Seeded board + active gem set
1. `src/game/BackendPuzzle.ts`: add `private rng: () => number = Math.random;` + `setSeed(seed: number)` (mulberry32 — import from a new tiny shared `src/lib/seededRng.ts`, used by both compiler and board; compiler must not import game code, so put mulberry32/hash32 in `src/lib/seededRng.ts` and have `caseCompiler.ts` import from there). Replace every `Math.random()` call (`getInitialPuzzleStateWithNoMatches` fallback ~L179, `pickWeightedGem` ~L258, `shuffle` ~L301) with `this.rng()`.
2. **Active gem set (P0 blocker fix — zero weights do NOT disable gems today).** `pickWeightedGem` coerces weight ≤ 0 to 1, and initial fill samples all `LOOT_GEM_TYPES`. Change the spawn universe itself: add `ACTIVE_GEM_TYPES: LootGemType[]` = the 5 method gems (derive from `METHOD_GEM_MAP` in domain.ts, single source). `pickWeightedGem` iterates ONLY the active set; `getInitialPuzzleStateWithNoMatches` seeds `possibleGems` from the active set (both the Set init ~L147 and the fallback ~L177); `shuffle` permutes existing cells so it's safe by construction once fill/refill are clean. Keep the weight≤0→1 coercion WITHIN the active set (it guards divide-by-zero, not disabling).
3. Plumb `boardSeed` from `cesium-location-selected` payload (add optional `boardSeed?: number` to the EventBus payload) → `Game.ts` calls `backendPuzzle.setSeed(...)` before `regenerateBoard`/`reset`. ExpeditionContext passes the node's boardSeed from `casePublic.boardSeeds[nodeIndex]` in both `handleExpeditionStart` and `emitBoardForNode`.
4. Method weights: `boardConfig.lootWeights` now expresses methods — the node's method gem gets a boost (e.g. +2 relative weight) so the objective is reachable in the move budget. Delete `buildHabitatLootWeights` (the habitat→color mapping loses meaning once colors are methods).
5. Update `tests/game/backendPuzzle.test.ts`: (a) determinism — same seed + same moves → identical grid states; (b) **no-disabled-gem tests** — over many seeded fills, refill phases, and shuffles, `black`/`white`/`purple` never appear in the grid.
6. Gate: `npm test`; manually verify two dev-server runs with the same runId-derived seeds produce identical starting boards and only 5 gem types on screen.

### Phase 5 — Client loop rewrite
This is the biggest phase. `handleDeductionClueTriggered` is REPLACED, not adapted.
1. `src/game/EventBus.ts`: rename `'deduction-clue-triggered'` → `'observation-earned'` with payload `{method: MethodType, matchLength: number, source: 'gem_match'}`. Typed bus → compiler errors walk you through every consumer (`Game.ts` two emit sites ~L1685/L1729, `ExpeditionContext` listener). In `Game.ts`, replace `getClueCategoryForGemType`+`getDeductionCategoryForGemCategory` at those sites with `GEM_METHOD_MAP[gem.gemType]`.
   **Method-match objective (P0 blocker fix — evidence must be EARNED).** In `Game.ts`, node objective = clear `objectiveTarget` tiles of the node's method gem within the move budget. Wire matched method-gem tile counts into the existing `nodeObjectiveProgress`/`emitNodeObjectiveUpdated`/`finishNodeObjective` machinery (`Game.ts:259-275`) — it already distinguishes `'victory'` vs `'escaped'`; keep that machinery, it is NOT in the deletion sweep. Matches of the node's method gem advance the objective; matches of other method gems build score + route pacing only (keep `MATCHES_PER_LEG = 3`).
   **Observation issuance rule**: on `node-advance-requested` with `reason: 'victory'` → client requests `POST /observations {nodeIndex}` (server re-verifies objective success from the node row — client is not trusted). `reason: 'escaped'` → no request; UI states plainly that the evidence was missed and the run continues. Tests: victory issues exactly one observation; escaped issues none; server 403s a forged request after escape.
2. `src/types/expedition.ts`: add
   ```ts
   export interface CaseState {
     candidateIds: number[];
     profiles: DeductionProfile[];          // fetched once, all candidates, symmetric
     observations: EarnedObservation[];      // ref, method, texts, predicate, tags, isSignature
     interpretations: InterpretationEvent[]; // {obsRef, predictedEliminatedIds, actualEliminatedIds, correct, latencyMs}
     eliminatedIds: number[];
     guessResult: 'correct'|'wrong'|null;
     lastFeedback: ComparisonResult[]|null;
   }
   ```
   Add `caseState: CaseState | null` to `RunState`. DELETE: `clueFragments`, `matchedGemCategories`, `deductionCamp` fragment fields, `comparativeDeduction` (fold what survives — score economy, guess bonuses — into `caseState` handling; keep `getGuessBonuses`). Delete `ClueCategoryKey`, `CLUE_CATEGORY_KEYS`, `deductionCatToWalletKey`.
3. `src/contexts/ExpeditionContext.tsx`:
   - `handleExpeditionStart`: drop `chooseMysterySpecies` + `correctSpeciesIdRef` + `hiddenSpeciesNameRef` entirely; POST /api/runs without `correctSpeciesId`; store returned `casePublic`; fetch candidate profiles once via existing `/api/species/by-ids?ids=<candidateIds>` + profile endpoint (add `GET /api/species/profiles?ids=` if none exists — symmetric, no mysteryId param).
   - Replace `handleDeductionClueTriggered` with `handleObservationEarned` (route pacing only).
   - **3-node sequencing (gap fix — today `handleNodeAdvanceRequested` completes the run after the single node; that is wrong for 3).** New per-node flow in `handleNodeAdvanceRequested`:
     1. bank node score (existing logic);
     2. **AWAIT** `POST /api/runs/:id/nodes/:order/complete` (currently fire-and-forget — must become awaited, because the `/observations` issuance gate reads `objectiveProgress` from the node row; requesting before completion persists is a guaranteed race/403);
     3. if `reason === 'victory'`: `POST /observations {nodeIndex}` → push to `caseState.observations` → `pendingInterpretation` → player commits interpretation → **AWAIT the reasoning-event PATCH** persisting that commit before advancing (explicit exception to the fire-and-forget checkpoint non-goal — the server gates obs-3 and /guess on persisted interpretations, so an unpersisted commit is a race; in particular the obs-2 commit must be durable BEFORE requesting obs-3); if `'escaped'`: skip straight to 4 with a "missed evidence" note;
     4. `nodeIndex < 2`: `emitBoardForNode(nodeIndex + 1)` and stay in `phase: 'mystery'` — the run does NOT complete;
     5. `nodeIndex === 2`: after the observation/interpretation resolves, request the signature (`nodeIndex: 3`) if eligible (server decides — just try and tolerate 403); an issued obs-3 requires its own interpretation commit before the guess UI unlocks, same as every issued card; then enter the guess phase. `phase: 'complete'` + run finalization happen ONLY via the `/guess` endpoint verdict, never from node advance.
     The interpretation step gates the next board (observation → interpretation → next node), keeping one atomic reasoning beat per node.
   - New `handleCommitInterpretation(obsRef, predictedIds)`: compute `actualEliminatedIds` locally via `filterCandidates` against candidate profiles (client-computable, answer not needed); record InterpretationEvent; apply elimination; persist reasoning event via existing PATCH checkpoint (`reasoningEvents` array in the PATCH body → server appends to `metadata.reasoningEvents`).
   - `handleComparativeGuessResult` → `handleGuess(speciesId)`: call `POST /guess`; server verdict; on wrong, render server `contrastiveFeedback`; scoring per existing `getGuessBonuses`.
   - Context value: remove `correctSpeciesId`, `hiddenSpeciesName`, `handleProcessClue`, `handlePlaceReference`. Grep consumers: `rg -n "correctSpeciesId|hiddenSpeciesName|handleProcessClue|handlePlaceReference" src/components src/` and update each (SpeciesPanel, FieldNotebook, guess selector, MainAppLayout as applicable).
   - Resume: consume `casePublic` + issued observations from the resume payload; `{legacy:true}` → toast + `handleRunReset()`.
   - **Full leak-surface closure (P1 blocker fix — ExpeditionContext is not the only leak):**
     - `EventBus.ts`: delete `hiddenSpeciesName` from the `new-game-started` payload and `actualName` from `species-guess-submitted`; fix the `Game.ts` emit sites.
     - `src/contexts/GameBridgeContext.tsx:73`: delete `hiddenName` from `speciesInfo` state + its consumers.
     - `src/components/SpeciesGuessSelector.tsx`: currently injects the hidden name into the candidate list and compares the guess CLIENT-SIDE. Rewrite: candidate options come from `caseState.profiles` (symmetric); submit calls `handleGuess(speciesId)` → server verdict. No name-string comparison anywhere client-side.
     - Client PATCH to `/api/runs/:id`: stop sending `speciesId` and win-path `finalScore` (the guess endpoint now finalizes; PATCH keeps checkpoints + reasoning events only).
     - Acceptance grep (must return nothing outside tests/plan docs): `rg -n "hiddenSpeciesName|hiddenName|actualName" src/`.
4. Interpretation UI (minimal, reuse existing deduction panel components): PRE-COMMIT the player sees `observationText` ONLY — no inferenceText, no traitCategory/compareTag, no computed delta (otherwise the prediction is a read-back, not a prediction, and the accuracy metric is void). Candidate grid with toggle-to-predict-eliminated; Commit button; AFTER commit reveal inferenceText, the tag, and the delta view (predicted vs actual, correct in green / missed in amber). v0 enforces this at the UI layer; withholding inference/tag server-side until commit is an optional hardening, deferred. No new design system work — function over polish for the slice.
5. Gate: typecheck; full manual run on dev server (map click → briefing → 3 nodes → 3 observations+interpretations → guess wrong → feedback → guess right → complete); resume mid-case works; browser network tab shows NO answer-bearing field anywhere (verify by inspection — this is the acceptance test for the whole leak contract).

### Phase 6 — Content (can start parallel to Phases 3–5)
1. 6 entities: `panthera_tigris` + `addax_nasomaculatus` seeds exist (`db/seeds/deduction/`); pick 4 more with rich `species_deduction_profiles` rows.
2. Author `db/seeds/evidence/<species>.json`: 7 cards each = 2 per fixed route method (`track`, `observe`, `survey` — `METHOD_SLOTS`) + 1 signature (`isSignature: true`, `compareTag` = the profile's `signature_tag`, `traitCategory` = the one trait array hosting that tag — the only place a sparse category is permitted). 42 total. Fields per Phase 1 schema: every card has `traitCategory` and EXACTLY ONE `compareTag`, which the validator asserts is present in that species' `profile[traitCategory]` array (extend the validation approach in `scripts/seed-deduction.ts`). Heed plan 012's finding: no unique `genus:` tags as non-signature compareTags (identity giveaway) — a non-signature compareTag must appear in ≥2 of the 6 profiles.
3. New `scripts/seed-evidence.ts` mirroring `scripts/seed-deduction.ts` (loader + validation + sequential-reduction report).
4. Gate: seed loads; compiler smoke over the 6 entities (Phase 7 harness).

### Phase 7 — Deletion sweep (only after Phases 3–5 verified)
Delete in one commit, compiler-guided:
- `src/expedition/domain.ts`: `ACTION_GEM_TYPES`, `ACTION_GEM_DEFINITIONS`, `DEFAULT_ACTION_WEIGHTS`, `normalizeActionWeights`, `actionWeights`/`actionBias`/`objectiveActions`/`nodeBoosts` from `createBoardSpawnConfig` + `BoardSpawnConfig`, action boosts in `NODE_TYPE_BOARD_META`, affinity→action buffs (check `src/expedition/affinities.ts` `getAffinityBuffedGem` — retarget to method gems or delete affinity board effects; **recommend delete for v0, affinities become score-only**).
- `src/lib/nodeScoring.ts`: `computeActionBias`, `counterGem`, `requiredGems`, `obstacleFamily→counterGem` derivation, `actionBias` from `NodeSelection`.
- `src/game/scenes/Game.ts`: `nodeCounterGem`, `nodeRequiredGems`, and action-gem counter mechanics ONLY. **PRESERVE the generic objective machinery** (`objectiveType`/`objectiveTarget`/`objectiveProgress` columns, `nodeObjectiveProgress`, `emitNodeObjectiveUpdated`, `finishNodeObjective`, `node-objective-updated` event) — Phase 5 repurposed it for `method_match`; deleting it breaks earned evidence. **Decision point** for the non-expedition clue path (`revealCluesForCategory`, `MOVE_LARGE/HUGE_MATCH_THRESHOLD` logic): recommend DELETE (free-play mode predates the expedition loop; the 8-category semantics it depends on no longer exist). **STOP and confirm with owner before deleting the non-expedition mode.**
- `src/lib/deductionEngine.ts`: `WALLET_KEY_TO_DEDUCTION_CATEGORIES`, `getNextClueForWalletKey`; keep `compareReference`, `filterCandidates`, `applyEvidenceBundle` (GIS auto-confirm survives as a `caseState` bootstrap if desired — v0: keep, it feeds the run-memory context).
- `src/game/clueConfig.ts` `GemCategory` + `src/game/gemSemantics.ts` category mapping → replace with method labels (this is where player-facing method names/colors live; ~5 player-facing files per Match Battle discipline).
- `species_deduction_clues` table + `scripts/seed-deduction.ts` + fragment economy (`unlock_mode`, `base_cost`, clue shop in `DeductionCampState`): mark deprecated in code comments in this pass; drop table in a later migration once the slice is validated (don't destroy authored content yet).
- `cesium-location-selected` payload: drop `counterGem`, `requiredGems`; keep `boardConfig` (now method weights) + new `boardSeed`.
- Update `tests/expedition/domain.test.ts`, `tests/lib/nodeScoring.test.ts`, `tests/game/gemSemantics.test.ts` to pin the NEW behavior.
- Gate: typecheck; `npm test`; `rg -n "ActionGemType|ACTION_GEM|counterGem|requiredGems|actionBias" src/ | grep -v test` returns nothing.

### Phase 8 — Metrics harness + acceptance
1. New `scripts/verify-case-compiler.mjs` (pattern: `scripts/verify-waypoint-run-integration.mjs`): load the 6 seeded entities + 42 cards, run `compileCase` over 200 seeds × rotating gisPriors, assert:
   - 100% compile without `{error}` and reach a unique answer by chain end (incl. signature fallback);
   - ≥90% resolve WITHOUT the signature fallback;
   - zero dead reveals (every chain card eliminates ≥1);
   - mean eliminations per observation ∈ [1.5, 3.0] for 7-candidate cases;
   - determinism: seed → snapshot hash stable across two runs of the script.
2. Playtest metrics (from `metadata.reasoningEvents`, computed by a small `scripts/report-reasoning.mjs` or SQL):
   - interpretation accuracy (predicted vs actual elimination-set match) in 55–85% band with upward slope within a session (>90% early = distractor candidates too weak; <40% = card text failing);
   - revision rate: accuracy improvement on repeat exposure to the same predicate family after corrective feedback (directional only at prototype n);
   - median time-to-commit 5–30s (skim detector, secondary);
   - first-guess accuracy 40–75% band; median case ≤ 3 boards × 12 moves.
3. Earned-evidence path checks: manual E2E includes one deliberately failed node (objective unmet) → no observation issued, forged `POST /observations` returns 403, guess phase still playable with 2 observations; track `% of nodes failed` in reasoning events — if players fail >40% of nodes the objectiveTarget tuning constant is wrong, not the design. Also E2E the signature path: a case compiled WITH chain[3] issues `obs-3` only after all three regular observations are issued AND all three interpretations committed (403 `not_eligible` before that, and permanently for any run with a failed node); a case without chain[3] returns `no_signature`; an issued obs-3 demands its own interpretation commit before guessing. And the sequencing invariant: after node 0 victory the run is still `phase: 'mystery'` with board 1 live — the run never completes from node advance.
4. Full acceptance: `npm run typecheck` + `npm test` green; harness green; manual E2E incl. resume; legacy run resumes-to-reset gracefully; network-tab leak inspection clean (incl. `new-game-started` and guess flows).
5. **STOP — decision gate for v1**: only if interpretation accuracy is in-band AND players don't skim (time-to-commit sane) do the v1 deferrals get built: the 1-of-2 method choice per node (9–10 cards/target — the design transcript's central agency hypothesis, untested in v0), node-type→method mapping, negative-polarity evidence, Insight special tile, GIS board physics, post-reveal learning, retrieval loop. If interpretation is skimmed despite being required, CUT the prediction step rather than decorating it.

## Part 5 — Explicit non-goals / objections carried from review

1. No normalized `trait_definitions`/`entity_traits`/`evidence_card_traits`/`lore` in this slice — contradicts repo simplicity rule + 3-ORM migration history. Normalize only when authoring volume forces it.
2. No dual writable representations: `species_deduction_profiles` is the single trait source now; flip derivation direction later if `entity_traits` ever lands.
3. No objective-choice authoring tooling before the metric gate (Phase 8.5).
4. Nothing client-side may know the answer, ever — carrying any legacy answer field forward silently invalidates all Phase 8 metrics (players can cheat; playtests lie).
5. No retry/queue machinery on checkpoints; the fire-and-forget PATCH pattern stands — with ONE exception: interpretation-commit PATCHes are awaited (Phase 5 sequencing), because obs-3 issuance and /guess are server-gated on persisted reasoning events.

## Part 6 — Quick-reference: files touched

| File | Action |
|---|---|
| `src/expedition/domain.ts` | +method registry (P1); −action family (P7) |
| `src/db/schema/species.ts` | +`evidence_cards` (P1) |
| `src/lib/seededRng.ts` | NEW: mulberry32 + hash32 (P2/P4 shared) |
| `src/lib/caseCompiler.ts` | NEW: pure compiler (P2) |
| `src/lib/answerPrior.ts` | NEW: server answer prior, ported from ExpeditionContext (P3) |
| `src/lib/runProjection.ts` | NEW: client-safe run serializer (P1/P3) |
| `src/app/api/runs/route.ts` | server compilation; drop correctSpeciesId (P3) |
| `src/app/api/runs/[runId]/route.ts` | resume projection; legacy flag (P3) |
| `src/app/api/runs/[runId]/observations/route.ts` | NEW (P3) |
| `src/app/api/runs/[runId]/guess/route.ts` | NEW (P3) |
| `src/app/api/species/deduction/` | DELETE (P3) |
| `src/game/BackendPuzzle.ts` | seeded rng (P4) |
| `src/game/EventBus.ts` | `observation-earned`; payload prune; +boardSeed (P4/P5/P7) |
| `src/game/scenes/Game.ts` | method emit; method_match objective; −counter gems (keep objective machinery); free-play decision (P5/P7) |
| `src/contexts/GameBridgeContext.tsx` | −hiddenName (P5) |
| `src/components/SpeciesGuessSelector.tsx` | server-verdict guess; −hidden-name comparison (P5) |
| `db/seeds/deduction/` + profile validator | select 6 of 24; author signature_tag + its array membership (Phase 0.5) |
| `.env.example` | NEW: CASE_COMPILER_SECRET placeholder, tracked (P3) |
| `src/game/gemSemantics.ts` + `clueConfig.ts` | method labels replace categories (P7) |
| `src/contexts/ExpeditionContext.tsx` | loop rewrite; leak closure (P5) |
| `src/types/expedition.ts` | +CaseState; −wallet/fragments (P5) |
| `src/lib/deductionEngine.ts` | −wallet maps; keep compare/filter (P7) |
| `src/lib/nodeScoring.ts` | −counterGem/requiredGems/actionBias (P7) |
| `db/seeds/evidence/*.json` + `scripts/seed-evidence.ts` | NEW content (P6) |
| `scripts/verify-case-compiler.mjs` | NEW harness (P8) |
| tests (5 suites) | update pins; +caseCompiler tests |
| `.env.local` / Vercel | +`CASE_COMPILER_SECRET` (P3, STOP) |
| `plans/README.md` | index 013; mark 012 SUPERSEDED |
