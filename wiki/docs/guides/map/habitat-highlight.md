---
sidebar_position: 2
title: Habitat Highlighting
description: Visualizing habitat polygons on the globe
tags: [guide, maplibre, habitats]
---

# Habitat Highlight Implementation

Display habitat polygons when a location is selected.

## Entity-Based Approach

```tsx
{habitatPolygons.map((polygon) => (
  <Entity
    key={polygon.id}
    polygon={{
      hierarchy: polygon.coordinates,
      material: Color.fromCssColorString(polygon.color).withAlpha(0.4)
    }}
  />
))}
```

See [MapLibre Integration](/docs/tutorials/maplibre-integration) for more.
