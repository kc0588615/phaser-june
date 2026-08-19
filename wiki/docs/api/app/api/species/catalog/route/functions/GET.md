# Function: GET()

> **GET**(): `Promise`\<`NextResponse`\<\{ `count`: `number`; `species`: `Record`\<`string`, `unknown`\>[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/species/catalog/route.ts:10](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/app/api/species/catalog/route.ts#L10)

GET /api/species/catalog
Returns all species for the species list/catalog view.

## Returns

`Promise`\<`NextResponse`\<\{ `count`: `number`; `species`: `Record`\<`string`, `unknown`\>[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
