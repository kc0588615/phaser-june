# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: `Record`\<`string`, `unknown`\>[]; \}\>\>

Defined in: [src/app/api/species/by-ids/route.ts:12](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/app/api/species/by-ids/route.ts#L12)

GET /api/species/by-ids?ids=1,2,3
POST /api/species/by-ids \{ ids: [1, 2, 3] \}

Batch fetch species by their species.id values

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: `Record`\<`string`, `unknown`\>[]; \}\>\>
