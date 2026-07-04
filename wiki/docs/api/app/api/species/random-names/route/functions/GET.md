# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `names`: `string`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/species/random-names/route.ts:10](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/app/api/species/random-names/route.ts#L10)

GET /api/species/random-names?count=15&exclude=5

Returns random species names for the guessing game

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `names`: `string`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
