# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: `object`[]; \}\>\>

Defined in: [src/app/api/species/by-ids/route.ts:10](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/app/api/species/by-ids/route.ts#L10)

GET /api/species/by-ids?ids=1,2,3
POST /api/species/by-ids \{ ids: [1, 2, 3] \}

Batch fetch species by their ogc_fid values

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: `object`[]; \}\>\>
