# Function: habitatHistogramBbox()

> **habitatHistogramBbox**(`longitude`, `latitude`, `radiusMeters`): `object`

Defined in: [lib/habitatHistogram.ts:20](https://github.com/kc0588615/phaser-june/blob/main/src/lib/habitatHistogram.ts#L20)

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
