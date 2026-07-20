# Expedition Run Loop

The runtime supports v1/v2 compatibility and the Plan 018 v3 loop. New-run selection is server-gated by `EXPEDITION_CASE_VERSION`; the safe default is v2 until migration 026 and the reviewed family corpus are deployed.

## V3 flow

1. `POST /api/runs` creates three nodes, six candidates, public board seeds, a public three-site `mapView`, and a private immutable five-family card map.
2. Each site accepts exactly six legal matches. Every match advances progress; sites cannot fail.
3. Only unique gem cells cleared by the direct resolution add literal family totals. Cascades still score and animate but add no evidence.
4. Red DNA = Relatives, orange Paw = Body, yellow Eye = Behavior, green Leaf/Fang = Habits, and blue Pin = Place. Each gem is the family silhouette; the HUD always shows icon, name, total, likely choices, and six-move progress.
5. After move six, all unused families tied at or above second place are offered. The selected family resets, locks, and stops spawning; other totals carry forward.
6. The server applies one fixed-strength reviewed clue and automatically eliminates incompatible candidates. There is no evidence tier, signature, interpretation prediction, or citation step.
7. After three distinct clues, the player guesses among one to three candidates. Wrong guesses may be revised. A correct guess unlocks the three selected-family facts on the species card.

Each clue is pinned in a three-slot evidence log as Observation, Inference, and Ruled out. The candidate roster remains visible, including eliminated species, and each played family reveals that family’s own trait phrase for all six candidates. The in-run Cesium globe is replaced by a MapLibre regional route map; Cesium remains the selection and recap surface. The answer range is available only from the authenticated post-verdict range endpoint.

Every accepted move persists the full board grid, blocker state, score, refill queue, allowed gems, move count, and RNG state. Identical retries are idempotent; conflicting same-move retries return `move_locked`. No move log is stored.

Between sites, the journal uses stored waypoints and safe distance wording (`near`, `approaching`). It does not claim crossing or entering without a stored relation.

The three playable waypoints prefer 150–800 km pairwise spacing inside the basecamp’s contiguous One Earth polygon. Selection retries at 75, 150, and 250 km search radii, relaxes to a 100 km floor, then records an `unavailable` diagnostic instead of failing run creation.

## V2 compatibility flow

## Flow

1. `POST /api/runs` creates three nodes, a six-candidate case, board seeds, a public method-offer tree, and a private immutable evidence matrix.
2. Before each board, Field Notebook offers two unused methods derived only from public node types and prior choices.
3. `POST /api/runs/[runId]/research-choice` locks the choice. Same-method retries are idempotent; different retries return `choice_locked`.
4. The chosen method becomes the board objective. Each method applies a counting verb (`src/expedition/methodVerbs.ts`): Track needs a fresh trail (within 2 moves of the last method match; any method match rewarms a cold trail), Observe counts only 4+ matches, Survey counts only matches touching seeded board zones, Listen doubles cascade contributions, Analyze counts everything.
5. Phaser reports objective progress plus the largest selected-method match from direct resolution only; cascades count for progress, never for sampling quality. A met objective with no direct method match still earns Broad.
5a. Off-method matches of 4+ drip one fact about a public case candidate (max 1/move, 4/node, seeded rotation). Client-only study material (`field-note-dripped` → `caseState.fieldNotes`); never persisted, never cites, never leaks the answer.
6. Node completion stores the final bounded maximum. Failed objectives issue no evidence.
7. Successful match 3/4/5-8 issues Broad/Replicated/High-resolution evidence from the private card matrix.
8. The player predicts eliminations, then commits the interpretation. Inference and tags stay hidden until commit.
9. After three nodes, an eligible signature may resolve residual ambiguity.
10. Final deduction cites exactly `min(2, interpreted observations)` issued, interpreted refs, then selects a species.

Methods never repeat, including after a failed node. Evidence quality measures sampling only; interpretation accuracy is separate.

## Versions

- v1 snapshots retain fixed Track -> Observe -> Survey and their stored evidence chain.
- v2 snapshots use contextual offers and tiered card matrices.
- v3 snapshots use six-move family charging, fixed-strength clues, automatic elimination, and exact board checkpoints.
- Missing private version plus a valid `chainCardIds` is v1.
- Invalid snapshots are rejected; v1 runs are not reset into v2.

## Economy

No energy or Insight currency exists. No move log is stored. Board score, guess bonus, efficiency bonus, and wrong-guess bonus decay are unchanged.

## Persistence

- `POST /api/runs`: idempotent versioned creation by `createRequestId`.
- `POST /api/runs/[runId]/research-choice`: locked method selection and server choice latency.
- `PATCH /api/runs/[runId]`: objective/quality checkpoint and interpretation commit.
- `POST /api/runs/[runId]/nodes/[nodeIndex]/complete`: atomic objective result and final quality.
- `POST /api/runs/[runId]/observations`: server-only evidence issuance.
- `POST /api/runs/[runId]/guess`: citation validation and species verdict.
- `POST /api/runs/[runId]/evidence-progress`: v3 move totals, exact board checkpoint, deterministic soft hints, and cascade flavor.
- `POST /api/runs/[runId]/evidence-choice`: v3 family lock, observation/inference application, all-candidate trait phrases, per-candidate elimination reasons, and next-site activation.
- `GET /api/runs/[runId]/range`: simplified answer range GeoJSON, owner-only and locked until a correct completed v3 verdict.

Deferred: durable move logs, legacy economy cleanup, and album/foil quality surfacing.
