# Function: getSpeciesAtPoint()

> **getSpeciesAtPoint**(`lon`, `lat`): `Promise`\<`SpatialSpeciesRow`[]\>

Defined in: [src/lib/speciesQueries.ts:232](https://github.com/kc0588615/phaser-june/blob/dc88a140368b29a3e7c30936b266fd46ea76c6ee/src/lib/speciesQueries.ts#L232)

Finds species whose habitat polygon contains a specific point.
Uses PostGIS ST_Contains to check point-in-polygon.

## Parameters

### lon

`number`

### lat

`number`

## Returns

`Promise`\<`SpatialSpeciesRow`[]\>
