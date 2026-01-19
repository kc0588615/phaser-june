# Function: POST()

> **POST**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `score`: `Record`\<`string`, `unknown`\>; \}\>\>

Defined in: [src/app/api/highscores/route.ts:42](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/app/api/highscores/route.ts#L42)

POST /api/highscores
Save a new high score.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `score`: `Record`\<`string`, `unknown`\>; \}\>\>
