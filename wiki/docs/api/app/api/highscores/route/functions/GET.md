# Function: GET()

> **GET**(): `Promise`\<`NextResponse`\<\{ `scores`: `Record`\<`string`, `unknown`\>[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/highscores/route.ts:19](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/app/api/highscores/route.ts#L19)

GET /api/highscores
Returns top 50 high scores.

## Returns

`Promise`\<`NextResponse`\<\{ `scores`: `Record`\<`string`, `unknown`\>[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
