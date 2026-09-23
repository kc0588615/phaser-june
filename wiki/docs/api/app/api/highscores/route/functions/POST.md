# Function: POST()

> **POST**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `score`: `Record`\<`string`, `unknown`\>; \}\>\>

Defined in: [phaser-june-039/src/app/api/highscores/route.ts:42](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/app/api/highscores/route.ts#L42)

POST /api/highscores
Save a new high score.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `score`: `Record`\<`string`, `unknown`\>; \}\>\>
