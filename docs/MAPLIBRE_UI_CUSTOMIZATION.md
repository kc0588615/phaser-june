# MapLibre UI Customization

The application has two MapLibre surfaces:

- `src/components/MapLibreExploreMap.tsx`: globe exploration, ecoregion selection, habitat raster, species ranges, and expedition ingress.
- `src/components/ExpeditionMapHud.tsx`: Mercator regional route/evidence map for v3 runs.

Both use `src/lib/maplibreStyle.ts`. `NEXT_PUBLIC_MAP_STYLE_URL` may supply a production style. Without it, the app uses the shared dark fallback style and adds API GeoJSON context.

Both surfaces use the same TiTiler habitat raster. The expedition HUD renders the active One Earth region as an outline only and identifies the dominant habitat at the current research site.

## Exploration controls

The React overlay supplies search, recenter, ecoregion visibility, fullscreen, area details, and expedition start controls. MapLibre's built-in navigation controls are intentionally omitted.

## Layer order

`CUSTOM_LAYER_ORDER` keeps overlays stable above any hosted basemap:

1. Habitat raster
2. Ecoregions and landscape context
3. Species/habitat highlights
4. Answer range and routes
5. Discovery/waypoint markers

Call `restoreCustomLayerOrder(map)` after adding a custom source/layer set.

## Projection

`applyMapProjection(map, 'explore')` enables globe projection and atmosphere. `applyMapProjection(map, 'expedition')` forces Mercator for the regional HUD.
