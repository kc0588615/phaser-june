# Function: POST()

> **POST**(`request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `ok`: `boolean`; \}\>\>

Defined in: [phaser-june-039/src/app/api/species/cards/\[speciesId\]/unlock/route.ts:15](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/app/api/species/cards/[speciesId]/unlock/route.ts#L15)

POST /api/species/cards/[speciesId]/unlock
Record an unlock event (discover, fact, stamp, clue, clue_category, set-complete).
playerId derived from Clerk session.

Body: \{ runId?, unlockType, payload? \}

## Parameters

### request

`NextRequest`

### \_\_namedParameters

#### params

`Promise`\<\{ `speciesId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `ok`: `boolean`; \}\>\>
