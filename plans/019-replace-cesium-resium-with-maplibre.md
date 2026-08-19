# Replace Cesium/Resium with MapLibre

## Summary

- Replace the exploration globe with `MapLibreExploreMap` using MapLibre GL JS 5.19 globe projection.
- Keep `ExpeditionMapHud` as the dedicated Mercator-style v3 map; share style and layer helpers between both maps.
- Preserve all current behavior: location selection, ecoregion interaction, habitat raster, species highlights, waypoints, legacy expedition trails, camera movement, fullscreen, and v3 range reveal.
- Remove all Cesium/Resium runtime code, dependencies, assets, configuration, and current documentation.

## Implementation Changes

### MapLibre foundation

- Add a shared MapLibre style factory and layer utilities:
  - `NEXT_PUBLIC_MAP_STYLE_URL` remains the optional production/self-hosted style override.
  - Replace the demotiles fallback with a network-independent background style; exploration land context comes from `/ecoregions.json`, while expedition context comes from existing GIS APIs.
  - Decision required before implementation: the default production basemap. Cesium Ion currently provides satellite imagery; the fallback style is flat polygons only. Plan must name the default prod style (self-hosted tiles vs. flat style), tile hosting, and required attribution. Fallback != default experience.
  - Force `globe` projection plus atmosphere on the exploration map and `mercator` on `ExpeditionMapHud`. Verified APIs (maplibre-gl 5.19.0): `projection: { type: 'globe' }` in the style or `map.setProjection({ type: 'globe' })` after style load; atmosphere via style `sky` / `map.setSky()` with `atmosphere-blend` zoom interpolation (e.g. fade out by zoom 7). Note: globe auto-enlarges as center nears the poles; camera code adjusting latitude must compensate zoom.
  - Define stable layer ordering: basemap -> habitat raster -> ecoregions/landscape -> species/habitat highlights -> routes/markers.
- Use one MapLibre instance per surface. Keep the exploration instance mounted but inactive while the v3 HUD is visible; stop transitions/interactions while hidden and call `resize()`/`triggerRepaint()` when restored.
- WebGL context budget: exploration map + HUD map + Phaser = 3 live contexts. Test on a low-end mobile device; if contexts get evicted, fall back to destroying/recreating the exploration map's GL context around v3 HUD visibility (React component stays mounted per EventBus rule — only the GL context is torn down).
- Centralize lifecycle handling: load timeout, visible error/retry state, `ResizeObserver`, visibility restoration, abortable requests, listener cleanup, marker cleanup, and `map.remove()`.

### Exploration globe parity

- Port `CesiumMap` to `MapLibreExploreMap` while retaining the existing React overlay.
- Replace globe picking with MapLibre click `lngLat`.
- Port the ecoregion layer to a GeoJSON source with fill/line layers:
  - Desktop hover uses rendered-feature queries.
  - Touch devices query the viewport center after movement.
  - Clicked/hovered states use feature-state styling.
- Port the TiTiler TileJSON habitat overlay to a MapLibre raster source/layer with the existing opacity, bounds, attribution, and non-blocking error handling.
- Render species ranges and nearest-habitat guidance through reusable GeoJSON sources with fill/line layers; clear the temporary habitat highlight after three seconds.
- Render discovered-species points, regional waypoints, and labels preserving current colors, text, and interaction blocking during runs. Prefer symbol layers with feature-state for point sets that grow (discovered species); reserve HTML markers for the few interactive elements. For HTML markers, back-of-globe occlusion is native via `opacityWhenCovered` (Marker option / `setOpacity(opacity, opacityWhenCovered)`): MapLibre sets `element.style.opacity` when `transform.isLocationOccluded(lngLat)` — no manual culling and no CSS class (5.19.0 does not use `.maplibregl-marker-covered`).
- Port legacy v1/v2 trail behavior into `useMapTrail`:
  - Scope gate first: pre-case runs (`casePublic === null`) are rejected on resume (`ExpeditionContext.tsx` "Expedition format updated"), but **v1/v2 runs with snapshots still resume** and still need trail UX. New-run version is server-controlled by `EXPEDITION_CASE_VERSION` (code default v2; local `.env.local` may pin 3). Confirm prod value **and** whether any active/resumable v1/v2 runs must keep trail; only if prod is v3-only and v1/v2 trail is disposable, drop the port (~500 lines in `useCesiumTrail.ts`) and delete instead.
  - Full upcoming route, growing completed route, node status markers, spatial context layers, route overview, active-node camera follow, and reset cleanup.
  - Use `fitBounds`, `flyTo`, bearing, and pitch to retain the current globe-oriented route presentation.
- Keep search, layers, compass, fullscreen, expedition preview, and start-expedition behavior unchanged.

### Integration and removal

- Replace `CesiumMap` in `MainAppLayout`, rename the wrapper to a generic map identifier, and replace `suspended` with an `active` visibility prop.
- Rename the internal typed event `cesium-location-selected` to `map-location-selected`, including Phaser initialization methods, context payload types, logs, comments, and listeners. Keep `expedition-data-ready` and all HTTP/database contracts unchanged.
- Delete Cesium-only files (inventory): `src/components/CesiumMap.tsx` (918 lines), `src/hooks/useCesiumTrail.ts` (507), `src/hooks/useEcoregionLayer.ts` (172, imports cesium), `src/hooks/useCesiumFullscreen.ts` (78), `scripts/copy-cesium-assets.js`, generated `public/cesium` assets, global declaration, `_document.tsx` widget stylesheet link, `next.config.mjs` proxy exception + cache headers + build-time `CESIUM_BASE_URL`, and CSS overrides. `ExpeditionRouteMap.tsx` is pure SVG — untouched.
- Remove `cesium`, `resium`, and now-unused `symlink-dir`; regenerate `package-lock.json`; remove the Cesium postinstall and clean-script target.
- Remove `NEXT_PUBLIC_CESIUM_ION_TOKEN` from environment documentation and update page metadata, architecture docs, map guides, onboarding, TypeDoc output, and Docusaurus sidebars for MapLibre.
- Current docs must contain no active Cesium instructions. Historical archived plans may retain historical references.
- Land as two commits: (1) MapLibre map wired in and passing verification, (2) Cesium/Resium removal — so rollback is a single revert. No long-lived dual-engine flag.

## Interfaces

- New component contract:
  - `MapLibreExploreMap({ onSearchOpen, expeditionPhase, activeWaypoint, active })`
- Internal EventBus breaking rename:
  - `cesium-location-selected` -> `map-location-selected`
- Environment:
  - Keep `NEXT_PUBLIC_MAP_STYLE_URL`, `NEXT_PUBLIC_TITILER_BASE_URL`, and `NEXT_PUBLIC_COG_URL`.
  - Remove `NEXT_PUBLIC_CESIUM_ION_TOKEN`.
- No API routes, database schemas, run snapshots, or persisted payloads change.

## Verification

- Unit-test pure GeoJSON builders, route progress/status conversion, ecoregion property mapping, layer ordering, and fallback style creation.
- Browser-test:
  - Globe renders with the network-independent fallback and with `NEXT_PUBLIC_MAP_STYLE_URL`.
  - Ecoregion hover/tap, layer toggle, area exploration, species queries, habitat raster, waypoints, and expedition start.
  - v1/v2 route overview, node advancement, active marker, camera follow, and reset.
  - v3 HUD, fullscreen reparenting, contextual layers, answer-range reveal, and return to exploration.
  - Tab changes, split-layout resizing, mobile touch controls, fullscreen, style failure, TiTiler failure, and WebGL context recovery.
  - Globe-specific: `fitBounds` across the antimeridian, `queryRenderedFeatures` hover near the globe limb, marker occlusion on the globe back side, camera behavior near poles (globe auto-enlargement).
- Run `npm test`, `npm run typecheck`, `npm run build`, waypoint integration verification, and the wiki build.
- Record bundle-size before/after (Cesium removal is the headline win — quantify it). Verify a Vercel preview deploy after removing the `/cesium/*` proxy and cache-header config, not just local build.
- Confirm no Cesium/Resium packages, imports, generated chunks, asset routes, environment variables, or current TypeDoc pages remain.

## Assumptions

- Migration targets current feature parity, not Cesium-grade 3D Tiles, photorealistic terrain, or 3D model support; none are used by the current implementation.
- MapLibre globe projection is the exploration experience; close regional gameplay may naturally flatten at high zoom (consistent with MapLibre's globe behavior at high zoom).
- No long-lived dual-engine feature flag remains after migration.
- API claims verified against MapLibre GL JS docs (context7, 2026-07-19) at installed version 5.19.0: globe projection, `setProjection`, `setSky`/`atmosphere-blend`, marker `opacityWhenCovered` + `isLocationOccluded` (inline opacity, not a CSS class), feature-state styling, pole auto-enlargement + zoom compensation.
