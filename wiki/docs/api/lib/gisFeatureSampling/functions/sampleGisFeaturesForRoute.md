# Function: sampleGisFeaturesForRoute()

> **sampleGisFeaturesForRoute**(`points`, `options`): `Promise`\<[`FeatureFingerprint`](../../../types/gis/interfaces/FeatureFingerprint.md)[]\>

Defined in: [phaser-june-039/src/lib/gisFeatureSampling.ts:261](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/gisFeatureSampling.ts#L261)

## Parameters

### points

[`RoutePoint`](../../expeditionRoute/interfaces/RoutePoint.md)[]

### options

`Omit`\<`SampleGisFeaturesOptions`, `"lon"` \| `"lat"`\> = `{}`

## Returns

`Promise`\<[`FeatureFingerprint`](../../../types/gis/interfaces/FeatureFingerprint.md)[]\>
