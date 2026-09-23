# Function: habitatHistogramBbox()

> **habitatHistogramBbox**(`longitude`, `latitude`, `radiusMeters`): `object`

Defined in: [phaser-june-039/src/lib/habitatHistogram.ts:20](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/habitatHistogram.ts#L20)

Same 10 km square used by speciesService.getRasterHabitatDistribution.

## Parameters

### longitude

`number`

### latitude

`number`

### radiusMeters

`number` = `10000`

## Returns

`object`

### east

> **east**: `number`

### featureCollection

> **featureCollection**: `object`

#### featureCollection.features

> **features**: `object`[]

#### featureCollection.type

> **type**: `"FeatureCollection"`

### north

> **north**: `number`

### south

> **south**: `number`

### west

> **west**: `number`
