# Function: buildRunMemoryArtifacts()

> **buildRunMemoryArtifacts**(`route`, `fingerprints`): `object`

Defined in: [src/lib/runCompletion.ts:69](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runCompletion.ts#L69)

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
