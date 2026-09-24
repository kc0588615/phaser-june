# Function: POST()

> **POST**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `score`: `Record`\<`string`, `unknown`\>; \}\>\>

Defined in: [app/api/highscores/route.ts:33](https://github.com/kc0588615/phaser-june/blob/main/src/app/api/highscores/route.ts#L33)

POST /api/highscores
Save a new high score.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `score`: `Record`\<`string`, `unknown`\>; \}\>\>
