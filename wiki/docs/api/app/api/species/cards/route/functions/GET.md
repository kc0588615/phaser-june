# Function: GET()

> **GET**(`_request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `cards`: `object`[]; \}\>\>

Defined in: [src/app/api/species/cards/route.ts:10](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/app/api/species/cards/route.ts#L10)

GET /api/species/cards
Returns all species cards for the authenticated player.

## Parameters

### \_request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `cards`: `object`[]; \}\>\>
