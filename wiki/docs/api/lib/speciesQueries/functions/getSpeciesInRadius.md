# Function: getSpeciesInRadius()

> **getSpeciesInRadius**(`lon`, `lat`, `radiusMeters`): `Promise`\<`SpatialSpeciesRow`[]\>

Defined in: [src/lib/speciesQueries.ts:209](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/lib/speciesQueries.ts#L209)

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

`Promise`\<`SpatialSpeciesRow`[]\>
