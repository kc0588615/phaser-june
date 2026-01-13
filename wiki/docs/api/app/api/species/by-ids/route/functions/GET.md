# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: `object`[]; \}\>\>

Defined in: [src/app/api/species/by-ids/route.ts:65](https://github.com/kc0588615/phaser-june/blob/dc88a140368b29a3e7c30936b266fd46ea76c6ee/src/app/api/species/by-ids/route.ts#L65)

GET /api/species/by-ids?ids=1,2,3
POST /api/species/by-ids \{ ids: [1, 2, 3] \}

Batch fetch species by their ogc_fid values

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: `object`[]; \}\>\>
