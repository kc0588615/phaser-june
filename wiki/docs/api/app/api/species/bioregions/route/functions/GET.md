# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `bioregions`: `object`[]; \}\>\>

Defined in: [src/app/api/species/bioregions/route.ts:9](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/app/api/species/bioregions/route.ts#L9)

GET /api/species/bioregions?ids=1,2,3
POST /api/species/bioregions \{ species_ids: [1, 2, 3] \}

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `bioregions`: `object`[]; \}\>\>
