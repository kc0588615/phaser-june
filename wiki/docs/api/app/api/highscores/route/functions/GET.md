# Function: GET()

> **GET**(): `Promise`\<`NextResponse`\<\{ `scores`: `Record`\<`string`, `unknown`\>[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/highscores/route.ts:19](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/app/api/highscores/route.ts#L19)

GET /api/highscores
Returns top 50 high scores.

## Returns

`Promise`\<`NextResponse`\<\{ `scores`: `Record`\<`string`, `unknown`\>[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
