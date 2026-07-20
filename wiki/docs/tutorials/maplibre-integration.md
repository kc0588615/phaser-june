---
title: MapLibre Integration
description: How the exploration globe and regional HUD are integrated
---

# MapLibre Integration

Critter Connect uses MapLibre GL JS for both map surfaces.

## Exploration globe

`src/components/MapLibreExploreMap.tsx` creates one globe map and keeps it mounted. A map click uses `event.lngLat`, queries the ecoregion fill layer, and then calls the species, habitat, protected-area, waypoint, and progress APIs. Valid selections emit `expedition-data-ready`.

Ecoregions come from `/ecoregions.json`. Desktop hover and touch-center selection use rendered-feature queries; feature state drives hover and selected styling.

The TiTiler TileJSON endpoint supplies the habitat raster source. Species and nearest-habitat geometry use GeoJSON fill/line layers. Discovery and waypoint coordinates use circle layers plus lightweight labels.

## Regional expedition HUD

`src/components/ExpeditionMapHud.tsx` uses Mercator projection. It draws the v3 route, research sites, landscape context, and the answer range after a correct guess. Fullscreen reparents the same map host so the WebGL context survives.

## Shared style

`src/lib/maplibreStyle.ts` provides:

```ts
resolveMapStyle('explore');
applyMapProjection(map, 'explore');
restoreCustomLayerOrder(map);
```

Set `NEXT_PUBLIC_MAP_STYLE_URL` for a hosted/self-hosted production basemap. The fallback is network-independent and relies on app GeoJSON/API layers for context.

## Lifecycle

Both maps bound initial loading, expose retry UI, observe size changes, repaint after visibility restoration, abort owned requests, remove markers/listeners, and call `map.remove()` on teardown.
