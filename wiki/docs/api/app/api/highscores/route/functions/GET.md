# Function: GET()

> **GET**(): `Promise`\<`NextResponse`\<\{ `scores`: `object`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/highscores/route.ts:8](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/app/api/highscores/route.ts#L8)

GET /api/highscores
Returns top 50 high scores.

## Returns

`Promise`\<`NextResponse`\<\{ `scores`: `object`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
