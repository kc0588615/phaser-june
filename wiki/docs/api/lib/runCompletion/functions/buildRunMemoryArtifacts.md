# Function: buildRunMemoryArtifacts()

> **buildRunMemoryArtifacts**(`route`, `fingerprints`): `object`

Defined in: [src/lib/runCompletion.ts:69](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runCompletion.ts#L69)

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
