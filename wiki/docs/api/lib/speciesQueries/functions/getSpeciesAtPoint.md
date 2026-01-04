# Function: getSpeciesAtPoint()

> **getSpeciesAtPoint**(`lon`, `lat`): `Promise`\<`object`[]\>

Defined in: [src/lib/speciesQueries.ts:190](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/lib/speciesQueries.ts#L190)

Finds species whose habitat polygon contains a specific point.
Uses PostGIS ST_Contains to check point-in-polygon.

## Parameters

### lon

`number`

### lat

`number`

## Returns

`Promise`\<`object`[]\>
