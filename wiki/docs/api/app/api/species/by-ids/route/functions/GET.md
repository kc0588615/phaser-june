# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: `Record`\<`string`, `unknown`\>[]; \}\>\>

Defined in: [src/app/api/species/by-ids/route.ts:12](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/app/api/species/by-ids/route.ts#L12)

GET /api/species/by-ids?ids=1,2,3
POST /api/species/by-ids \{ ids: [1, 2, 3] \}

Batch fetch species by their species.id values

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: `Record`\<`string`, `unknown`\>[]; \}\>\>
