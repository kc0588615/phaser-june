# Function: buildSquare()

> **buildSquare**(`lon`, `lat`, `sizeMeters`): `object`

Defined in: [src/lib/geoUtils.ts:3](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/geoUtils.ts#L3)

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
