# Function: getSpeciesInRadius()

> **getSpeciesInRadius**(`lon`, `lat`, `radiusMeters`): `Promise`\<`SpatialSpeciesRow`[]\>

Defined in: [src/lib/speciesQueries.ts:209](https://github.com/kc0588615/phaser-june/blob/dc88a140368b29a3e7c30936b266fd46ea76c6ee/src/lib/speciesQueries.ts#L209)

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
