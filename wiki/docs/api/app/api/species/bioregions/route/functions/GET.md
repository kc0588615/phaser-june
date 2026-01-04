# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `bioregions`: `object`[]; \}\>\>

Defined in: [src/app/api/species/bioregions/route.ts:10](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/app/api/species/bioregions/route.ts#L10)

GET /api/species/bioregions?ids=1,2,3
POST /api/species/bioregions \{ species_ids: [1, 2, 3] \}

Returns bioregion data for species by intersecting with OneEarth bioregion polygons.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `bioregions`: `object`[]; \}\>\>
