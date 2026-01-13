---
sidebar_position: 3
title: Cesium Integration
description: Working with the 3D globe and geospatial data
tags: [tutorial, cesium, geospatial]
---

# Tutorial: Cesium Integration

Learn how Critter Connect integrates CesiumJS for 3D globe visualization and geospatial queries.

## Overview

CesiumJS provides the 3D globe where players select locations. When a player clicks the globe:

1. Coordinates are captured
2. Species at that location are queried via `/api/species/*` (Drizzle + PostGIS)
3. Habitat data is fetched from TiTiler (raster service)
4. Data is sent to the game via EventBus

## Cesium Setup

### Component Structure

**Location:** `src/components/CesiumMap.tsx`

```typescript
import { Viewer, Entity, CesiumComponentRef } from 'resium';
import { Viewer as CesiumViewer, Cartesian3, Ion } from 'cesium';

export function CesiumMap() {
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);

  return (
    <Viewer
      ref={viewerRef}
      full
      timeline={false}
      animation={false}
      homeButton={false}
      sceneModePicker={false}
    >
      {/* Entity layers added here */}
    </Viewer>
  );
}
```

### Ion Token Setup

```typescript
// Set before Viewer renders
Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN!;
```

## Click Handling

### Capturing Globe Clicks

```typescript
useEffect(() => {
  const viewer = viewerRef.current?.cesiumElement;
  if (!viewer) return;

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction((click: { position: Cartesian2 }) => {
    const cartesian = viewer.camera.pickEllipsoid(
      click.position,
      viewer.scene.globe.ellipsoid
    );

    if (cartesian) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const longitude = Cesium.Math.toDegrees(cartographic.longitude);
      const latitude = Cesium.Math.toDegrees(cartographic.latitude);

      handleLocationSelect(longitude, latitude);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  return () => handler.destroy();
}, []);
```

### Querying Species Data

```typescript
async function handleLocationSelect(lon: number, lat: number) {
  // 1. Query species at location
  const speciesResult = await getSpeciesAtLocation(lon, lat, SPECIES_RADIUS_METERS);

  // 2. Query habitat raster data
  const rasterHabitats = await getRasterHabitats(lon, lat);

  // 3. Send to game
  EventBus.emit('cesium-location-selected', {
    lon,
    lat,
    species: speciesResult.species,
    habitats: speciesResult.habitats,
    rasterHabitats
  });
}
```

## PostGIS Integration (Drizzle + API Routes)

### Species Query (API Route)

```typescript
// src/lib/speciesService.ts
export async function getSpeciesInRadius(
  lon: number,
  lat: number,
  radiusMeters: number
) {
  const response = await fetch(
    `/api/species/in-radius?lon=${lon}&lat=${lat}&radius=${radiusMeters}`
  );

  if (!response.ok) throw new Error('Failed to fetch species');
  return response.json();
}
```

### API Route Query (PostGIS)

```typescript
// src/app/api/species/in-radius/route.ts
import { sql } from 'drizzle-orm';
import { db } from '@/db';

const species = await db.execute(sql`
  SELECT
    ogc_fid,
    comm_name,
    sci_name,
    ST_AsGeoJSON(wkb_geometry)::text as wkb_geometry
  FROM icaa
  WHERE wkb_geometry IS NOT NULL
    AND ST_DWithin(
      wkb_geometry::geography,
      ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
      ${radius}
    )
`);
```

## TiTiler Raster Integration

### Querying Habitat Rasters

```typescript
async function getRasterHabitats(lon: number, lat: number) {
  const url = `${TITILER_BASE_URL}/cog/point/${lon},${lat}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await response.json();

  return data.values.map((value: number, index: number) => ({
    habitat_type: HABITAT_LEGEND[value] || 'Unknown',
    band: index,
    value
  }));
}
```

### Habitat Legend Mapping

```typescript
const HABITAT_LEGEND: Record<number, string> = {
  100: 'Tropical Rainforest',
  101: 'Temperate Forest',
  200: 'Savanna',
  300: 'Shrubland',
  400: 'Grassland',
  500: 'Wetland',
  // ...
};
```

## Visualizing Selected Area

### Drawing a Circle

```typescript
const [selectedLocation, setSelectedLocation] = useState<{
  lon: number;
  lat: number;
} | null>(null);

// In JSX
{selectedLocation && (
  <Entity
    position={Cartesian3.fromDegrees(
      selectedLocation.lon,
      selectedLocation.lat
    )}
    ellipse={{
      semiMajorAxis: SPECIES_RADIUS_METERS,
      semiMinorAxis: SPECIES_RADIUS_METERS,
      material: Cesium.Color.CYAN.withAlpha(0.3),
      outline: true,
      outlineColor: Cesium.Color.CYAN
    }}
  />
)}
```

### Highlighting Habitat Polygons

```typescript
{habitatPolygons.map((polygon, index) => (
  <Entity
    key={index}
    polygon={{
      hierarchy: polygon.coordinates,
      material: Cesium.Color.fromCssColorString(polygon.color).withAlpha(0.4),
      outline: true,
      outlineColor: Cesium.Color.WHITE
    }}
  />
))}
```

## Camera Controls

### Flying to Location

```typescript
function flyToLocation(lon: number, lat: number) {
  const viewer = viewerRef.current?.cesiumElement;
  if (!viewer) return;

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(lon, lat, 1000000),
    duration: 2,
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    }
  });
}
```

### Setting Initial View

```typescript
useEffect(() => {
  const viewer = viewerRef.current?.cesiumElement;
  if (!viewer) return;

  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(-95, 40, 15000000)
  });
}, []);
```

## Performance Tips

1. **Limit entities:** Remove old visualization entities when new ones are added
2. **Use primitives:** For many polygons, use `PrimitiveCollection` instead of `Entity`
3. **Disable unneeded features:** Turn off timeline, animation, etc.
4. **Lazy load Cesium:** Load Cesium assets only when the map is visible

## Exercise: Add a Location Marker

Add a pulsing marker at the clicked location:

```typescript
{selectedLocation && (
  <Entity
    position={Cartesian3.fromDegrees(
      selectedLocation.lon,
      selectedLocation.lat
    )}
    point={{
      pixelSize: 20,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 3
    }}
    label={{
      text: 'Selected',
      font: '14px sans-serif',
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -25)
    }}
  />
)}
```

## Summary

- Cesium provides 3D globe visualization
- Click events capture lat/lon coordinates
- API routes query species at location using PostGIS
- TiTiler provides raster habitat data
- EventBus sends combined data to game

## Related Documentation

- [Habitat Highlight Guide](/docs/guides/map/habitat-highlight)
- [Database Guide](/docs/guides/data/database-guide)
