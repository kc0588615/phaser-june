# Expedition Run Loop

The runtime supports v3 expeditions only. New runs always use the six-move evidence-family loop; stored v1/v2 snapshots are rejected on resume with a format-updated message.

## Flow

1. `POST /api/runs` creates three nodes, six candidates, public board seeds, a public three-site `mapView`, and a private immutable five-family card map.
2. Each site accepts exactly six legal matches. Every match advances progress; sites cannot fail.
3. Only unique gem cells cleared by the direct resolution add family totals. Cascades add no evidence, but the first cascade at a site places one Field Signal on the settled board.
4. Red DNA = Relatives, orange Paw = Body, yellow Eye = Behavior, green Leaf/Fang = Habits, and blue Pin = Place.
5. After move six, all unused families tied at or above second place are offered. The selected family resets, locks, and stops spawning; other totals carry forward.
6. The server applies one fixed-strength reviewed clue and automatically eliminates incompatible candidates. There is no evidence tier, signature, interpretation prediction, or citation step.
7. After three distinct clues, the player guesses among the remaining candidates. Wrong guesses may be revised. A correct guess unlocks the three selected-family facts on the species card.

Each clue is pinned in the evidence log as Observation, Inference, and Ruled out. The candidate roster keeps eliminated species visible and reveals a candidate trait only when that clue eliminated that candidate. Answer-derived and surviving-candidate trait phrases stay outside the pre-verdict client projection. During a run, the exploration globe is replaced by the regional MapLibre route map. The answer range is available only from the authenticated post-verdict endpoint.

The detailed evidence log also explains Why ruled out. One eliminated candidate is shown directly; multiple eliminations provide selector chips. The explanation shows only the eliminated candidate’s reviewed phrase and mismatch category—never the mystery trait. It does not change elimination or progression.

A Field Signal is a one-durability reward tile placed on the settled board. Any adjacent match can clear it, but only a **direct** match pays: cascades destroy the tile without a family payout. The family paid is the **clearing match's colour**, not the gem under the tile, so the player chooses their intel by choosing what to match: a direct 3-match pays one reviewed hint from that family, a 4+ match pays two. Multi-line payouts play sequentially through the existing FIELD TEAM ticker. A payout move omits the generic cascade line; a cascade-only clear keeps the normal cascade line. Because a selected family's gem leaves the board, the colour menu narrows across sites (5 → 4 → 3) and an already-banked family can never pay again. It never changes evidence totals, family offers, elimination, score, or bonuses. An uncleared signal expires without penalty at site end.

Every accepted move persists the full board grid, blocker state, Field Signal lifecycle, score, refill queue, allowed gems, move count, and RNG state. Identical retries are idempotent; conflicting same-move retries return `move_locked`. No move log is stored.

Between sites, the journal uses stored waypoints and safe distance wording (`near`, `approaching`). It does not claim crossing or entering without a stored relation.

The three playable waypoints prefer 150–800 km pairwise spacing inside the basecamp’s contiguous One Earth polygon. Selection retries at 75, 150, and 250 km search radii, relaxes to a 100 km floor, then records an `unavailable` diagnostic instead of failing run creation.

## Persistence

- `POST /api/runs`: idempotent v3 creation by `createRequestId`.
- `GET /api/runs/[runId]`: owner-only client projection and resume state.
- `POST /api/runs/[runId]/evidence-progress`: move totals, exact board checkpoint, deterministic soft hints, Field Signal payout, and cascade flavor.
- `POST /api/runs/[runId]/evidence-choice`: family lock, evidence application, eliminated-candidate phrases, elimination reasons, and next-site activation.
- `POST /api/runs/[runId]/guess`: server-authoritative species verdict.
- `GET /api/runs/[runId]/range`: simplified answer-range GeoJSON, owner-only and locked until a correct completed verdict.

Old case metadata remains in PostgreSQL for history but is not parsed as a playable expedition. No schema migration is required.

Deferred: durable move logs and album/foil quality surfacing.
