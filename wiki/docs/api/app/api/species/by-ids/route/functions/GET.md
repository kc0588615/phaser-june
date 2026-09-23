# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: `Record`\<`string`, `unknown`\>[]; \}\>\>

Defined in: [app/api/species/by-ids/route.ts:11](https://github.com/kc0588615/phaser-june/blob/main/src/app/api/species/by-ids/route.ts#L11)

GET /api/species/by-ids?ids=1,2,3

Batch fetch species by their species.id values

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: `Record`\<`string`, `unknown`\>[]; \}\>\>
