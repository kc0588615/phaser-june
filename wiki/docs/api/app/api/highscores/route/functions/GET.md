# Function: GET()

> **GET**(): `Promise`\<`NextResponse`\<\{ `scores`: `Record`\<`string`, `unknown`\>[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/highscores/route.ts:19](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/app/api/highscores/route.ts#L19)

GET /api/highscores
Returns top 50 high scores.

## Returns

`Promise`\<`NextResponse`\<\{ `scores`: `Record`\<`string`, `unknown`\>[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
