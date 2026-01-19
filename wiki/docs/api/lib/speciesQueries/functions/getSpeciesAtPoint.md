# Function: getSpeciesAtPoint()

> **getSpeciesAtPoint**(`lon`, `lat`): `Promise`\<`SpatialSpeciesRow`[]\>

Defined in: [src/lib/speciesQueries.ts:232](https://github.com/kc0588615/phaser-june/blob/faa14c00324626a166934fb4b850bcca3146ae62/src/lib/speciesQueries.ts#L232)

Finds species whose habitat polygon contains a specific point.
Uses PostGIS ST_Contains to check point-in-polygon.

## Parameters

### lon

`number`

### lat

`number`

## Returns

`Promise`\<`SpatialSpeciesRow`[]\>
