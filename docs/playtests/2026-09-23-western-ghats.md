# Playtest 2026-09-23 — South Western Ghats

First full agent playtest via the `playtest` skill (chrome-devtools MCP + `window.__cc` bridge), signed in as the Clerk dev test player.

- Run: `a55ff09d-b5be-4092-806f-89813574dadc`, site lon 76.089 / lat 12.011, case 030 "The Broken Sapling Corridor"
- Board seeds: site 1 `2843975215`, site 2 `1203443688`, site 3 `3857879457`
- Moves (`node:moveNumber rowOrCol index amount`): 0:1 row0+2 · 0:2 row2+1 · 0:3 row0+2 · 0:4 row1-2 · 0:5 row0+2 · 0:6 row0+2 · 1:1 row1+3 · 1:2 row3-1 · 1:3 row3-2 · 1:4 row2+1 · 1:5 row0+2 · 1:6 row0-2 · 2:1 row3-2 · 2:2 col2+1 · 2:3 row4-2 · 2:4 row3+1 · 2:5 col2+1 · 2:6 row4-1
- Evidence choices: behavior → body → habits. Verdict: Asian Elephant + "Routine feeding and travel". Result: solved, final score 7511.
- Move policy: always the valid move with the most matches (smoke test, not a human-like playthrough).

## Findings

### Blocker — final claim deadlocks (fixed in the working tree)

Confirm explanation never returned (`POST /api/runs/:id/guess/` pending > 3 min); the dev server's only DB connection sat `idle in transaction`, holding the run's `FOR UPDATE` lock, so every later API call would hang too.

Cause: the guess transaction calls `sampleGisFeaturesForRoute(route)` (`src/app/api/runs/[runId]/guess/route.ts:101`), which queried the shared `db`; the pool is `max: 1` (`src/db/index.ts:21`), so the GIS query waited forever for the connection the transaction held. Present since 59ef1606 (2026-07-13); every correct final claim hit it.

Fix: `sampleGisFeaturesAtPoint`/`ForRoute` take an optional `executor`; the guess route passes `tx`. On a transaction each optional layer query runs in its own savepoint, and route points are sampled sequentially, so a failing layer is skipped instead of aborting the claim (Codex review P2). Verified against the live DB inside rolled-back transactions: with every GIS query forced to fail (`statement_timeout = 1`) the transaction stays usable; a no-savepoint control aborts it. After the fix the claim completed in 5.5s. Also consider `idle_in_transaction_session_timeout` so a stuck transaction can't hold the pool indefinitely.

### Bug — Tailwind spacing utilities are dead app-wide (fixed, verified by replay)

`src/styles/globals.css:110-114` was an unlayered `* { margin: 0; padding: 0; }`. Under Tailwind v4 utilities live in `@layer utilities`, and unlayered rules beat layers, so every `p-*` / `px-*` / `m-*` computed to 0 (a fresh `<div class="p-4">` had `padding: 0px`). Visible as text flush against card edges and clipped labels in the incident modal ("UNRESOLVE"), Field Training card, dossier, roster header ("OSTER"), ledger ("0 facts · 0 out"), completion screen ("ASE RESOLVED", "UCN — SHRINKING SPACES"). Deleted; Tailwind's preflight does the same reset inside `@layer base`. (The "…d claims" clipping is the Next.js dev-tools badge covering the claims bar, not this bug.)

### Bug — waypoints always time out

`/api/expedition/waypoints` was aborted at exactly 4000 ms on all three map clicks (`WAYPOINT_FETCH_TIMEOUT_MS = 4_000`, `src/components/MapLibreExploreMap.tsx:35`); the route takes ~3.3s alone (curl) plus a 308 redirect and parallel requests in the browser. Expeditions start without waypoint data.

### Bug — failed final claim is silent

When the explanation claim returned 500, the claims panel showed no toast or error; the player just waits.

### UX

- Every `/api/*` request first gets a 308 to the trailing-slash URL (two round trips each).
- Start Expedition returns to the map with no prompt to pick a site.
- Investigate (run creation, `POST /api/runs` 11.0s) shows no progress; the button looks dead.
- "Select a ground cell" stays in the map HUD all run, but moves never require it.
- The HUD evidence log still says "0 / 3 EVIDENCE · Finish six moves to unlock the first family." while the dossier asks for the family choice.
- The claims panel says "Keep matching to investigate" at the verdict stage, when the board is gone.
- Route recap on the completion screen draws "Basecamp" twice, overlapping.
- Map labels 404: `glyphs` in `src/lib/maplibreStyle.ts:71` points at `demotiles.maplibre.org` "Open Sans Regular" (404); labels fall back to local rendering with a console warning per glyph.

### Copy

- Site 3 field radio repeats internal filler: "Place ladder already complete.", "Habits ladder already complete.", "Relatives ladder already complete." (11 lines).
- "1 candidates remain." in the dossier (header pluralizes correctly).
- Ledger relabels families after the first facts (Lineage / Body form / Range / Diet) while the evidence panel and tutorial say Relatives / Body / Place / Habits.
- Above the grades 6–12 register: "Context guides investigation; it does not prove identity", "concentrated disturbance", "The resting behavior record excludes communal roosting in treetops", "natural ecosystem engineering rather than proof of ecological collapse", "an elephantid in the order Proboscidea and the broader afrotherian lineage".

### Balance

- Species identity was settled after site 2 (4 of 6 eliminated after site 1, 1 left after site 2); site 3 added no information.
- Both evidence choices made with two candidates live only ruled out already-eliminated species (behavior → flying fox; body → tiger).
- Max-match play may over-produce cascade hints; re-check with human-like move choice.

## Replay after the spacing fix

Run `2f3fc5bb-7701-4a24-8c1e-d002be1c7842`, same site, same choices, same move list. Board seeds came back identical (`2843975215`, `1203443688`, `3857879457`), so all 18 moves replayed exactly: same eliminations, observations, and evidence hints (only cascade flavor lines vary); final score 7511 again. Field Training did not show a second time.

Spacing now correct: search bar, site sheet, briefing, incident modal (badge and header whole), ledger, roster header, dossier, completion stat tiles, route-memory card, resolution card (labels and source chips whole), verdict notes, Return to Globe.

New or changed:

- **Bug (fixed)** — the completion screen's resolution card (diagnosis, evidence chain, misconception check, sources) collapsed to 2px and could not be scrolled to. The column in `src/components/RunCompleteSummary.tsx` stretched to exactly the overlay height, so once real padding made the content taller, flex shrank the `overflow-hidden` card to nothing. Added `h-fit` to the column; the card renders at full height and the overlay scrolls.
- **Layout** — side panels are narrower inside now, so truncation got worse: evidence descriptions "What is thi…" / "What doe…", roster "Livingstone's …" / "De Winton's …". Needs wider panels or shorter copy.
- **Layout** — the dossier overlaps the Field claims bar; the claims panel covers the third observation row in the ledger.
- **Layout** — completion species card has a large empty band between the name and footer; an icon overlaps the "83%" footer text.
- **UX** — Investigate stays enabled with no label change for the full run creation (11.9s).
- **UX** — the final explanation claim took 19.2s this time (5.5s on the first fixed run): 15 GIS queries (3 route points × 5 layers) run one after another on the single pooled connection. Consider sampling GIS before taking the run lock, or caching per route.
- **Design question** — the same site and case give the same board seeds on every run, so boards can be memorized. Intended?
- Unchanged: the active-tab dot sits in the descender zone of the nav label, same as before the fix.

## Not covered

Wrong claims and the three-strike close, the "slipped" completion path, resume/reload mid-run, pause, mobile layout, other pools and sites, performance traces.
