# Function: sampleGisFeaturesForRoute()

> **sampleGisFeaturesForRoute**(`points`, `options`): `Promise`\<[`FeatureFingerprint`](../../../types/gis/interfaces/FeatureFingerprint.md)[]\>

Defined in: [src/lib/gisFeatureSampling.ts:261](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/gisFeatureSampling.ts#L261)

## Parameters

### points

[`RoutePoint`](../../expeditionRoute/interfaces/RoutePoint.md)[]

### options

`Omit`\<`SampleGisFeaturesOptions`, `"lon"` \| `"lat"`\> = `{}`

## Returns

`Promise`\<[`FeatureFingerprint`](../../../types/gis/interfaces/FeatureFingerprint.md)[]\>
