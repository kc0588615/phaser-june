# Function: sampleGisFeaturesForRoute()

> **sampleGisFeaturesForRoute**(`points`, `options`): `Promise`\<[`FeatureFingerprint`](../../../types/gis/interfaces/FeatureFingerprint.md)[]\>

Defined in: [src/lib/gisFeatureSampling.ts:278](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/lib/gisFeatureSampling.ts#L278)

## Parameters

### points

[`RoutePoint`](../../expeditionRoute/interfaces/RoutePoint.md)[]

### options

`Omit`\<`SampleGisFeaturesOptions`, `"lon"` \| `"lat"`\> = `{}`

## Returns

`Promise`\<[`FeatureFingerprint`](../../../types/gis/interfaces/FeatureFingerprint.md)[]\>
