# Function: GET()

> **GET**(`_request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `cards`: `object`[]; \}\>\>

Defined in: [src/app/api/species/cards/route.ts:10](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/app/api/species/cards/route.ts#L10)

GET /api/species/cards
Returns all species cards for the authenticated player.

## Parameters

### \_request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `cards`: `object`[]; \}\>\>
