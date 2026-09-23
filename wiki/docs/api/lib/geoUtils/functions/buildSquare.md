# Function: buildSquare()

> **buildSquare**(`lon`, `lat`, `sizeMeters`): `object`

Defined in: [phaser-june-039/src/lib/geoUtils.ts:3](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/geoUtils.ts#L3)

Shared geo helpers for spatial API routes

## Parameters

### lon

`number`

### lat

`number`

### sizeMeters

`number`

## Returns

`object`

### areaM2

> **areaM2**: `number`

### bbox

> **bbox**: `object`

#### bbox.east

> **east**: `number`

#### bbox.north

> **north**: `number`

#### bbox.south

> **south**: `number`

#### bbox.west

> **west**: `number`

### geometry

> **geometry**: `object`

#### geometry.coordinates

> **coordinates**: `number`[][][]

#### geometry.type

> **type**: `string` = `'Polygon'`

### halfMeters

> **halfMeters**: `number`
