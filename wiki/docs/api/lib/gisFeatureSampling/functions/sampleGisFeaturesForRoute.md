# Function: sampleGisFeaturesForRoute()

> **sampleGisFeaturesForRoute**(`points`, `options`): `Promise`\<[`FeatureFingerprint`](../../../types/gis/interfaces/FeatureFingerprint.md)[]\>

Defined in: [src/lib/gisFeatureSampling.ts:261](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/gisFeatureSampling.ts#L261)

## Parameters

### points

[`RoutePoint`](../../expeditionRoute/interfaces/RoutePoint.md)[]

### options

`Omit`\<`SampleGisFeaturesOptions`, `"lon"` \| `"lat"`\> = `{}`

## Returns

`Promise`\<[`FeatureFingerprint`](../../../types/gis/interfaces/FeatureFingerprint.md)[]\>
