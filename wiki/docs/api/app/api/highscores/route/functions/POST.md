# Function: POST()

> **POST**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `score`: \{ \}; \}\>\>

Defined in: [src/app/api/highscores/route.ts:29](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/app/api/highscores/route.ts#L29)

POST /api/highscores
Save a new high score.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `score`: \{ \}; \}\>\>
