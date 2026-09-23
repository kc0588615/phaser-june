# Function: buildRunMemoryArtifacts()

> **buildRunMemoryArtifacts**(`route`, `fingerprints`): `object`

Defined in: [phaser-june-039/src/lib/runCompletion.ts:66](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runCompletion.ts#L66)

## Parameters

### route

[`RoutePoint`](../../expeditionRoute/interfaces/RoutePoint.md)[]

### fingerprints

[`FeatureFingerprint`](../../../types/gis/interfaces/FeatureFingerprint.md)[]

## Returns

`object`

### gisFeaturesNearby

> **gisFeaturesNearby**: [`FeatureFingerprint`](../../../types/gis/interfaces/FeatureFingerprint.md)[] = `fingerprints`

### routeBounds

> **routeBounds**: \{ `maxLat`: `number`; `maxLon`: `number`; `minLat`: `number`; `minLon`: `number`; \} \| `null`

### routePolyline

> **routePolyline**: [`RoutePoint`](../../expeditionRoute/interfaces/RoutePoint.md)[] = `route`
