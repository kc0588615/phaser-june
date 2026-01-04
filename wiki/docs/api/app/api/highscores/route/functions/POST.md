# Function: POST()

> **POST**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `score`: \{ \}; \}\>\>

Defined in: [src/app/api/highscores/route.ts:29](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/app/api/highscores/route.ts#L29)

POST /api/highscores
Save a new high score.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `score`: \{ \}; \}\>\>
