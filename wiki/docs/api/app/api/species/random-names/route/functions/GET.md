# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `names`: `string`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/species/random-names/route.ts:10](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/app/api/species/random-names/route.ts#L10)

GET /api/species/random-names?count=15&exclude=5

Returns random species names for the guessing game

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `names`: `string`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
