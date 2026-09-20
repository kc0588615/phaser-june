# Expedition Run Loop

The runtime supports v4 expeditions only. New runs wrap the six-move evidence-family loop in an ecological incident and two-part diagnosis. Stored v1-v3 snapshots are rejected on resume with a format-updated message.

## Flow

1. `POST /api/runs` creates three nodes, six candidates, public board seeds, a public three-site `mapView`, safe incident text and explanation choices, and private answer material.
2. The player reviews the incident dossier before entering the first field site.
3. Each site accepts exactly six legal matches. Every match advances progress; sites cannot fail.
4. Only unique gem cells cleared by the direct resolution add family totals. Cascades add no evidence, but the first cascade at a site places one Field Signal on the settled board.
5. Red DNA = Relatives, orange Paw = Body, yellow Eye = Behavior, green Leaf/Fang = Habits, and blue Pin = Place.
6. After move six, all unused families tied at or above second place are offered. The selected family resets, locks, and stops spawning; other totals carry forward.
7. The server applies one fixed-strength reviewed clue and automatically eliminates incompatible candidates. There is no evidence tier, signature, interpretation prediction, or citation step.
8. After three distinct clues, the player submits a species and ecological explanation. Each component receives supported/revise feedback. Both must be correct to resolve the case.
9. Resolution presents the evidence chain, ecology, taxonomy, misconception correction, rejected alternatives, and reviewed sources. It also unlocks the three selected-family facts on the species card.

Each clue is pinned in the evidence log as Observation, Inference, and Ruled out. The candidate roster keeps eliminated species visible and reveals a candidate trait only when that clue eliminated that candidate. Answer-derived and surviving-candidate trait phrases stay outside the pre-verdict client projection. During a run, the exploration globe is replaced by the regional MapLibre route map. The answer range is available only from the authenticated post-verdict endpoint.

The detailed evidence log also explains Why ruled out. One eliminated candidate is shown directly; multiple eliminations provide selector chips. The explanation shows only the eliminated candidate’s reviewed phrase and mismatch category—never the mystery trait. It does not change elimination or progression.

A Field Signal is a one-durability reward tile placed on the settled board. Any adjacent match can clear it, but only a **direct** match pays: cascades destroy the tile without a family payout. The family paid is the **clearing match's colour**, not the gem under the tile, so the player chooses their intel by choosing what to match: a direct 3-match pays one reviewed hint from that family, a 4+ match pays two. Multi-line payouts play sequentially through the existing FIELD TEAM ticker. A payout move omits the generic cascade line; a cascade-only clear keeps the normal cascade line. Because a selected family's gem leaves the board, the colour menu narrows across sites (5 → 4 → 3) and an already-banked family can never pay again. It never changes evidence totals, family offers, elimination, score, or bonuses. An uncleared signal expires without penalty at site end.

Every submitted move contains only its row/column shift plus the resulting checkpoint. The server deterministically replays the move from the prior accepted checkpoint, derives matches, cascades, evidence, Field Signal effects, and score, then requires an exact checkpoint match. Accepted state persists the full grid, blockers, Field Signal lifecycle, score, refill queue, allowed gems, move count, and RNG state. Identical retries are idempotent; conflicting same-move retries return `move_locked`. No move log is stored.

Between sites, the journal uses stored waypoints and safe distance wording (`near`, `approaching`). It does not claim crossing or entering without a stored relation.

The three playable waypoints prefer 150–800 km pairwise spacing inside the basecamp’s contiguous One Earth polygon. Selection retries at 75, 150, and 250 km search radii, relaxes to a 100 km floor, then records an `unavailable` diagnostic instead of failing run creation.

## Persistence

New runs require a saved 6×6 habitat terrain snapshot for each final waypoint before the creation transaction begins. `boardContext.terrain` is immutable ground, separate from the movable board/checkpoint. The server checks the versioned source ETag before/after bounded extraction; failure creates no run (503 for extraction/configuration failures, 422 for unsupported or wholly missing habitat). Database labels override shared nonzero static labels; NoData zero never means Water.

Start/resume uses the saved node projection. Terrain-backed map/board selection shares source-pixel ids, spends no move, and resets on site changes. Local map zoom is 12–20; Region restores its camera. Terrain-backed play does not fetch the live habitat raster. Existing v4 runs without terrain retain their original board and regional map; malformed stored terrain fails explicitly. Source changes never backfill saved runs. See [Phase A plan and verification](../plans/034-cog-terrain-phase-a.md); traversal/presence mechanics remain deferred.

- `POST /api/runs`: idempotent v4 creation by `createRequestId`.
- `GET /api/runs/[runId]`: owner-only client projection and resume state.
- `POST /api/runs/[runId]/evidence-progress`: server-replayed move, exact board checkpoint, deterministic soft hints, Field Signal payout, and cascade flavor.
- `POST /api/runs/[runId]/evidence-choice`: family lock, evidence application, eliminated-candidate phrases, elimination reasons, and next-site activation.
- `POST /api/runs/[runId]/guess`: server-authoritative species and explanation verdict.
- `GET /api/runs/[runId]/range`: simplified answer-range GeoJSON, owner-only and locked until a correct completed verdict.

Old case metadata remains in PostgreSQL for history but is not parsed as a playable expedition. The v4 snapshot-format change requires no schema migration. Separately, migration 023 was applied on 2026-09-13 to convert legacy `crisis` node types to `custom` and remove `crisis` from the database CHECK constraint; this does not restore old snapshot support.

Deferred: durable move logs and album/foil quality surfacing.
