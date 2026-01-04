# Function: GET()

> **GET**(): `Promise`\<`NextResponse`\<\{ `scores`: `object`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/highscores/route.ts:8](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/app/api/highscores/route.ts#L8)

GET /api/highscores
Returns top 50 high scores.

## Returns

`Promise`\<`NextResponse`\<\{ `scores`: `object`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
