# Function: GET()

> **GET**(): `Promise`\<`NextResponse`\<\{ `scores`: `Record`\<`string`, `unknown`\>[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/highscores/route.ts:19](https://github.com/kc0588615/phaser-june/blob/faa14c00324626a166934fb4b850bcca3146ae62/src/app/api/highscores/route.ts#L19)

GET /api/highscores
Returns top 50 high scores.

## Returns

`Promise`\<`NextResponse`\<\{ `scores`: `Record`\<`string`, `unknown`\>[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
