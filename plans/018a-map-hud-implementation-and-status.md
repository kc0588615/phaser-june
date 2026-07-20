# 018a — MapLibre Map HUD: implementation + current situation

Frontend delta of plan 018 (v3 expeditions). Replaces the Cesium globe with a MapLibre "field notebook" map HUD during v3 mystery runs. Written 2026-07-19.

## What was built

### New: `src/components/ExpeditionMapHud.tsx`
- MapLibre GL JS 5.19.0, client-only. Inline `StyleSpecification` (NOTEBOOK_STYLE): topo/notebook palette — water `#b9ccc9`, land `#ece4cd`, graticule, country ink `#a5936a`. Vector source: demotiles.maplibre.org.
- `resolveMapStyle()` honors `NEXT_PUBLIC_MAP_STYLE_URL` env override (for future self-hosted style/PMTiles).
- Sites derived from `caseState.mapView.route` (nodeIndex/lon/lat/biome/nearestFeature) merged with `expedition.nodes[].waypoint` (name/type/distKm). Status per site: `visited` (nodeIndex < currentNodeIndex, or current while guessing), `current` (pulse + label), `upcoming` (hollow dashed).
- Route drawn as dashed GeoJSON line + casing. Auto-fit to `mapView.bounds` (already 20%-padded server-side), zoom clamps: panel 5–10, fullscreen 2–13, FIT_PADDING 48.
- Fullscreen overlay: body portal, `inert` on `#app-container`, Escape/close button, focus management. Single map instance reparented between panel slot and overlay (imperative host-div move, no second WebGL context).
- Range reveal: when `caseState.guessResult === 'correct'`, one-shot fetch `GET /api/runs/${runState.runId}/range`, adds translucent green species-range fill/line with paint transitions.
- Codex extension (consumption pass): route coords from mapView snapshot; water/protected-area/biome context layers from `/api/layers/near-point`.
- Grok hardening (after freeze bug): deferred init until slot has non-zero size (ResizeObserver + double-rAF); `map.on('error')` + `webglcontextlost` pre-ready → error state; a dedicated initial-load flag keeps later source/tile errors from restoring the cover; 8s load timeout; Retry button (initToken remount, resets didFit + one-shot refs); IntersectionObserver + visibilitychange → `resize()` + `triggerRepaint()`; single cover UI ("Charting route…" loading / error + "Retry map").

### New: `src/components/EvidenceLog.tsx`
Persistent three-slot log, keyed `obs-${nodeIndex}`; each slot renders Observation / Inference (`inferenceText`) / Ruled-out names; `focusNodeIndex` highlight + scrollIntoView. Refactored externally to use `buildEvidenceLogSlots` from `@/expedition/evidenceLog`.

### New: `src/expedition/candidateTraits.ts`
`candidateTraitPhrase(profile, observation)` derives a candidate's own trait from profile tags — now only a fallback for runs persisted before server-authored `candidateFamilyTraits` existed. Plus `revealedFamilyObservations()`, `humanizeTag()`.

### Edited: `src/components/CandidateRoster.tsx`
`ownTraitFor(profile, family)`: prefers server `caseState.candidateFamilyTraits[speciesId][family]`, falls back to derivation. Per-family trait dots (unrevealed/eliminated/alive styling, tooltip = own phrase); opened portrait card lists per-family phrase chips.

### Edited: `src/MainAppLayout.tsx`
```tsx
const showV3MapHud = runState.caseState?.version === 3
    && (inRun || (showComplete && runState.caseState.guessResult === 'correct'));
```
- Cesium container: `display: viewMode === 'map' && !showV3MapHud ? 'block' : 'none'` — stays mounted (EventBus listeners preserved).
- HUD rendered when `showV3MapHud`, `display: viewMode === 'map' ? 'flex' : 'none'`.
- HUD stays mounted through completion so the range fetch can run (correct guess flips phase to 'complete' in the same setState).

### Edited: `src/components/CesiumMap.tsx`
New `suspended?: boolean` prop: sets `viewer.useDefaultRenderLoop = !suspended`; on resume, `resize()` + `requestRender()`. `MainAppLayout` passes `suspended={showV3MapHud}` to cut multi-WebGL-context pressure (Cesium + Phaser + MapLibre).

### Edited: `src/styles/globals.css`
`.map-hud-canvas.maplibregl-map` explicitly fills its slot and outranks MapLibre's `position: relative`; `.map-hud-fullscreen` (z-index `var(--z-modal)`), `.map-site-marker*`, `map-marker-pulse` keyframes, reduced-motion guard.

### Removed after diagnosis: `src/pages/map-test.tsx`
The isolation page proved MapLibre loaded while its host remained zero-height. Deleted after panel and fullscreen rendering passed.

Typecheck and tests green. Package changes add `maplibre-gl` and its lockfile entries. No API/schema/seed/migration changes by this workstream (backend fields — `mapView`, `candidateFamilyTraits`, `inferenceText`, `runId`, range endpoint — are codex's).

## Resolution

**Original symptom:** no visible map in-game or on the temporary `/map-test/` page.

**Root cause:** MapLibre adds `.maplibregl-map` to the host. Its later-loaded stylesheet set `position: relative`, overriding `.map-hud-canvas { position: absolute }` at equal specificity. The parent slot had height, but the map host computed to zero height and clipped the canvas and markers. The successful `load` event was real; the blank pixels were not a SwiftShader artifact.

**Fix:** use `.map-hud-canvas.maplibregl-map` with `position: absolute`, `inset: 0`, `width: 100%`, and `height: 100%`. Also gate fatal map errors with a dedicated initial-load flag because `map.loaded()` can return false again during later source/style work.

**Verified:** clean reload rendered the notebook tiles, route, and markers with a non-zero host; fullscreen reparent rendered at full size; close restored the panel size and removed `inert`.

**Deployment option:** self-hosted style/tiles or a local caching proxy remains available through `NEXT_PUBLIC_MAP_STYLE_URL`, but it was not required for this rendering defect.

**Other loose ends:**
- Repo-wide ESLint broken (pre-existing circular eslintrc TypeError); typecheck is the gate.
- Nothing staged/committed per owner constraint.
