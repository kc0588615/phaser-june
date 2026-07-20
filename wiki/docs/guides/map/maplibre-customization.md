---
title: MapLibre Customization
description: Globe, regional map, style, and layer customization
---

# MapLibre Customization

The app renders globe exploration in `MapLibreExploreMap` and the v3 regional route in `ExpeditionMapHud`.

Shared helpers live in `src/lib/maplibreStyle.ts` and `src/lib/maplibreLayers.ts`:

- `NEXT_PUBLIC_MAP_STYLE_URL` overrides the default style.
- The fallback style has no tile-network dependency.
- Exploration always uses globe projection plus atmosphere.
- The expedition HUD always uses Mercator.
- `restoreCustomLayerOrder()` keeps habitat, ecoregion, landscape, highlight, route, and marker layers ordered.

Custom React controls provide search, recenter, ecoregion toggle, and fullscreen behavior.
