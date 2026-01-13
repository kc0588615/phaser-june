# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `names`: `string`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/species/random-names/route.ts:10](https://github.com/kc0588615/phaser-june/blob/dc88a140368b29a3e7c30936b266fd46ea76c6ee/src/app/api/species/random-names/route.ts#L10)

GET /api/species/random-names?count=15&exclude=5

Returns random species names for the guessing game

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `names`: `string`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
