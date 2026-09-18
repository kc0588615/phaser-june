# Implementation Plans

Generated 2026-07-09; reconciled August 18, 2026. Execute numbered advisor plans in order unless their dependency notes say otherwise.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|---|---|---|---|---|---|
| 012 | July 9, 2026 — Make Match-3 the Expedition Evidence Engine Before Replacing It | P1 | XL | — | SUPERSEDED by 013 |
| 013 | Investigation-Method Tiles + Server-Side Deterministic Case Compiler | P1 | XL | 2026-07-10 review decision | IN PROGRESS |
| 014 | July 11, 2026 — Mystery-Loop Integration Fixes (post-review) | P0 | M–L | — (repairs 013's landed Phase 4/5 slice) | ABSORBED into 013 (2026-07-11) — do not execute as written |
| 015 | July 11, 2026 — Plan 013 Runtime Readiness Review | P1 | S–M | 013 implementation | IMPLEMENTED — AUTH BROWSER + PROD ENV GATES PENDING |
| 016 | Species Content System — Dossier → Tags → Evidence → Agent Workflow | P0 product | L | 013 engine stable; 015 browser gate preferred | TODO |
| 017 | Contextual Method Choice and Tiered Evidence | P1 | XL | 013 | SUPERSEDED by 018/020 |
| 018 | Six-Move Evidence-Family Expeditions | P1 product | XL | 017 + DB migration 026 + reviewed family corpus | IMPLEMENTED v3 |
| 020 | Remove v1/v2 Expedition Support | P0 cleanup | M | 018 | IMPLEMENTED — v3 only |
| 021 | Player-Marked Deduction | P1 product | L | v3 loop | SUPERSEDED by 022 (then narrowed by 023) |
| 022 | Field Discovery Co-Pilot | P1 product | L | 020 | SUPERSEDED by 023 — modal Field Event dropped |
| 023 | Board-Side Signal Tile + Compare Trail | P1 product | S–M | v3 loop | IMPLEMENTED / in tree — cascade signal + compare trail |
| 024 | Lens Payout — Match-Adjacent Soft Clues | P1 product | S | 023 Field Signal | TODO — clear-family from match; 3→1 / 4+→2 FIELD TEAM hints |
| 026 | August 18, 2026 — Make Player Tracking Stateless and Owner-Scoped | P0 | M | — | DONE — merged as `c98a5c39` |
| 027 | August 18, 2026 — Patch Vulnerable Production Dependencies | P0 | S–M | — | DONE — merged as `2ac7de7d`; production audit clean |
| 028 | August 18, 2026 — Remove Only Confirmed Dead Code | P2 | S | 027 | DONE — merged as `7c64b142` |
| 029 | August 18, 2026 — Identify the Package as Critter Connect | P3 | XS | 028 | DONE — merged as `4257421d` |
| 030 | August 29, 2026 — Ecological Mystery Cases | P1 product | L | 018 | IMPLEMENTED — run snapshot v4, merged as `a999c61c`; phases 5–6 await playtest |
| 031 | September 17, 2026 — Content Database Clarity | P1 data | L | 030 + DB migrations 027–031 | DONE 2026-09-17 — commits aa74e8e0…860c345a; migrations 027–031 on production; see `docs/CONTENT_AUTHORING.md` |
| 032 | September 18, 2026 — Land the Open Increment and Reset Player Tracking | P1 cleanup | M | 031 | DONE 2026-09-18 — commits 7aec22dc…68b60805; migrations 032–033 on production; player progress reset |

## Dependency notes

- Database migration `023_remove_crisis_run_nodes.sql` is separate from implementation Plan 023 (Field Signal). Applied to `phaser_june` on 2026-09-13: 48 legacy `crisis` nodes became `custom`; the validated node-type CHECK now rejects `crisis`. All 1,081 node rows were retained. See [live constraint details](../docs/DATABASE_ER_PLAY_PATH.md#eco_run_nodes--evidence-family-sites-3-per-v3-run).
- Plan 012 argued measure-before-replace; the 2026-07-10 cross-agent design review (Claude ⇄ codex) accepted the replacement direction instead. 012's content-quality findings (genus-tag identity leak, GIS-tag vocabulary mismatch, AND/OR clue semantics) remain valid inputs to 013 Phase 6; do not execute 012's board-measurement phases.
- Plan 013 is self-contained: verified code facts, final design contract, phases 0–8 (incl. 0.5 content prerequisite and 3.0 three-node route expansion) with gates and STOP points, deletion list, metrics. Revision 4 fixes v0 to exactly six evidence-backed mammals, preserves De Winton's unknown reproduction data, separates public board seeds from the private case seed, and requires three positive regular eliminations plus a singleton signature fallback. Local six-profile validation passed read-only; production DB application remains approval-gated.
- Plan 014 was written against the mid-013 client (stale line anchors, pre-rewrite state model). Its durable items (method requiredGems, 3-board advance, boardSeed emit, loud empty-map toast, pure updaters, server finalize) landed via the 013 client rewrite + 2026-07-11 correction pass; its interim items (client guess finalizer, 9-category wallet remap) were deliberately rejected — they contradict 013's server-authoritative case. Do not run 014's phases against the current tree.
- Plan 015 records the post-implementation readiness review: the playable loop, automated gate, and API/database gate pass; Plan 013 Phases 7–8, browser acceptance, partial-start cleanup, guest-run policy, wrong-guess rewards, and the production Vercel secret remain. Treat 015 as a short gate checklist, not the long-term product plan.
- Plan 016 is the product plan of record after the loop is playable: single-package species authoring, claim→tag→card agent workflow, corpus frequency tooling, and templated PlaceNote unlocks per successful node. Does not expand the six-mammal prototype pool or write production DB without owner approval. Locked 2026-07-11: single package JSON; place notes from existing GIS/node fields.
- Plan 020 makes Plan 018 the only runtime expedition format. New runs are always v3; v1/v2 routes and compilers are removed, and old snapshots are resume-rejected.
- Plans 021→022→023 narrowed discovery: player-marked elimination (021) and modal Field Events (022) were rejected/superseded; 023 ships board-native signal tile + compare trail with no migration.
- Plan 024 evolves 023’s Field Signal payout only: family from the **direct match that clears** the tile (not under-tile color); match length 3 → 1 soft hint, 4+ → 2; both via existing FIELD TEAM ticker. No second special gem type.
- Plan 026 removes cross-request player/session state and owner-scopes every legacy player-session mutation. It adds one two-case structural regression file; no DB harness or schema work.
- Plan 027 patches the current Clerk/Next/Drizzle/Swiper production audit findings. It forbids `--force`, migrations, and speculative API rewrites.
- Plans 026 and 027 are independent P0 work; either may run first, and a STOP
  in one must not block the other. Keep Plans 028 and 029 after 027 to avoid
  needless lockfile overlap.
- Plan 028 deletes only ten import-graph-confirmed files plus the two packages used solely by `SpeciesTree`. It explicitly rejects broad React Doctor cleanup.
- Plan 029 changes package metadata only; no install, tests, or build.
- `plans/012-july9-improved deducation game system` (no `.md`) is a design TRANSCRIPT, not the executable plan 012. Plan 013 implements its foundation and lists its remaining ideas (1-of-2 method choice, Insight tile, GIS board physics, post-reveal learning, retrieval loop) as explicit v1 deferrals behind the Phase 8.5 gate.

## August 18, 2026 reconciliation

- `007-dependency-security-updates.md` is superseded by Plan 027: its audit,
  package list, Swiper major, test baseline, and planned SHA are stale.
- `011-remove-dead-code-and-dead-deps.md` is superseded by Plan 028: its prior
  deletion set has already left the tree and it incorrectly marks
  `discoveryMigrationService.ts` as live.

## Findings considered and rejected

- Mixed Pages/App routing: current production build supports both; migrating
  four APIs would not allow deleting `src/pages`. No migration without a
  concrete product/runtime benefit.
- Consolidating the three `speciesCard*` modules: rejected; they separate pure
  progression, server persistence, and client unlock transport.

## Existing plans

Pre-existing plan files remain untouched and unindexed here. Add them deliberately if they are still active.
