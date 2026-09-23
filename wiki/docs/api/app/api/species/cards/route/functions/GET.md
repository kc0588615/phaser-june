# Function: GET()

> **GET**(`_request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `cards`: `object`[]; \}\>\>

Defined in: [app/api/species/cards/route.ts:10](https://github.com/kc0588615/phaser-june/blob/main/src/app/api/species/cards/route.ts#L10)

GET /api/species/cards
Returns all species cards for the authenticated player.

## Parameters

### \_request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `cards`: `object`[]; \}\>\>
