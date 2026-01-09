# Function: getSpeciesInRadius()

> **getSpeciesInRadius**(`lon`, `lat`, `radiusMeters`): `Promise`\<`object`[]\>

Defined in: [src/lib/speciesQueries.ts:167](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/lib/speciesQueries.ts#L167)

Finds species within a radius of a geographic point.
Uses PostGIS ST_DWithin for efficient spatial query.

## Parameters

### lon

`number`

### lat

`number`

### radiusMeters

`number` = `10000`

## Returns

`Promise`\<`object`[]\>
