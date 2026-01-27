# Function: getSpeciesInRadius()

> **getSpeciesInRadius**(`lon`, `lat`, `radiusMeters`): `Promise`\<`SpatialSpeciesRow`[]\>

Defined in: [src/lib/speciesQueries.ts:219](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/lib/speciesQueries.ts#L219)

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
