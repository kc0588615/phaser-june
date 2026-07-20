# Route Progression + Expedition Recap Map

Design pivot from anchor tap-to-start (too much friction — players find the 3D globe
hard to operate). The map becomes a display: one click anywhere starts the mystery
(as before), the GIS route SHOWS, and gem matches MOVE the player along it —
simulated progression that makes matching feel motivating. After the run, a
generated expedition map of the route is a must-have feature.

Two phases, each gated `npm run typecheck` + commit; `npm run build` at the end.
Rules as before (verify-first, BLOCKED: protocol, no installs).

## Phase A — route display + match-driven progression
Commit: `phase A: match-driven route progression`

1. **Revert tap-to-start.** In `src/components/CesiumMap.tsx`: remove
   `handleAnchorClick`, the anchor `onClick`, `autoStart` param/branch of
   `loadAreaDetails`, the `anchorType` at-point param usage, and the
   played/dimmed pin state (`playedAnchorKeys`/`markAnchorPlayed` in
   ExpeditionContext too). Leave the at-point API's anchorType param tolerant
   (server code stays, harmless). Keep the colored, labeled, UNNUMBERED pins from
   `regionWaypointData` — display only, not clickable.
2. **Restore the full route.** Plain region clicks must again produce the
   multi-waypoint route: restore `getWaypointRouteOrFallback`-style behavior so
   `expedition.routePolyline` runs basecamp→site1→…→site5 (fetchWaypointData's
   routePolyline, fallback computeExpeditionRoutePolyline) and
   `expedition.waypoints` carries all 6. Verify `useCesiumTrail` draws the dashed
   full-route + glowing completed-segments polylines again (its positions.length>1
   branch still exists) and the player marker sits at basecamp on run start.
3. **Matches advance the marker.** Pacing lives in ExpeditionContext:
   `MATCHES_PER_LEG = 3`. `handleDeductionClueTriggered` (fires on every match now
   that all gems are clue gems) increments a per-run match counter on RunState;
   every 3rd match advances `visitedWaypointSlot` by one (cap at last site).
   Emit an EventBus event (e.g. `route-progress-updated { slot }` — add typed
   payload) that `useCesiumTrail` consumes to grow the completed polyline and move
   the marker to that waypoint (it already has trailCurrentSlotRef machinery from
   the old node system — verify and reuse; smooth/simple movement is fine, no
   fancy animation required).
4. **Arrival feeds the notebook.** On advancing to waypoint k: toast
   `Arrived: {name}` and auto-log a site fact as an already-processed geography
   info entry in comp.processedClues (reuse `buildAnchorGeographyClues`' label
   style — negative ids -10-k, category 'geography', compareTags null, status
   'processed'). Remove the current blue-match anchor-clue prepending
   (`buildAnchorGeographyClues` call at deduction init) — blue gems go back to
   species geography+habitat facts only; sites arrive via travel.
5. **Species bias by route mix.** `chooseMysterySpecies` now scores each species
   against ALL route waypoints (sum `scoreSpeciesForAnchor` over
   `expedition.waypoints`), not a single tapped anchor. No anchor → current
   fallback (sorted[0]).

## Phase B — expedition recap map
Commit: `phase B: expedition recap map`

The must-have: after the species is discovered (or slips away), show a generated
map of the expedition route.

1. New `src/components/ExpeditionRouteRecap.tsx`: pure SVG (no Cesium), journal
   aesthetic. Input: waypoints (name, type, lon/lat, slot), routePolyline,
   visitedWaypointSlot, capture state + species name. Render: route polyline
   normalized into the viewBox (padding, preserve aspect), solid stroke for
   traveled legs, dashed for unreached; a dot per site colored by the existing
   WAYPOINT_COLORS mapping with small name labels; basecamp marker at slot 0; a
   star burst at the player's final position with `{species} captured here` (or
   `Last seen near {name}` when it slipped away). Subtle graticule/paper
   background via CSS, text in the ds-* token palette.
2. Mount it in the run outcome card (capture AND slipped paths — the outcome UI in
   `src/MainAppLayout.tsx` / RunCompleteSummary; verify which renders post-run)
   above/beside the existing journal card. Needs waypoints + visited slot to
   survive into the 'complete' phase — verify RunState keeps expedition data
   through completion; if the outcome path clears it, retain what the recap needs
   on RunState.
3. Keep it compact (fits the existing card layout, ~max 320px tall, scrolls never).

## Done state
Both phases committed, typecheck clean, `npm run build` passes. Print commit list.
