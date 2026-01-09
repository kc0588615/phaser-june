# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `names`: `string`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/species/random-names/route.ts:9](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/app/api/species/random-names/route.ts#L9)

GET /api/species/random-names?count=15&exclude=5

Returns random species names for the guessing game

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `names`: `string`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
