# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `names`: `string`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/species/random-names/route.ts:9](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/app/api/species/random-names/route.ts#L9)

GET /api/species/random-names?count=15&exclude=5

Returns random species names for the guessing game

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `names`: `string`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
