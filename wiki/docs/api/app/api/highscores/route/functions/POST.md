# Function: POST()

> **POST**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `score`: `Record`\<`string`, `unknown`\>; \}\>\>

Defined in: [src/app/api/highscores/route.ts:42](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/app/api/highscores/route.ts#L42)

POST /api/highscores
Save a new high score.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `score`: `Record`\<`string`, `unknown`\>; \}\>\>
