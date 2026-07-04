# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `bioregions`: `object`[]; \}\>\>

Defined in: [src/app/api/species/bioregions/route.ts:11](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/app/api/species/bioregions/route.ts#L11)

GET /api/species/bioregions?ids=1,2,3
POST /api/species/bioregions \{ species_ids: [1, 2, 3] \}

Returns bioregion data for species by intersecting with OneEarth bioregion polygons.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `bioregions`: `object`[]; \}\>\>
