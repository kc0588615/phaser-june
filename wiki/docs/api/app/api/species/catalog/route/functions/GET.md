# Function: GET()

> **GET**(): `Promise`\<`NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/species/catalog/route.ts:63](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/app/api/species/catalog/route.ts#L63)

GET /api/species/catalog
Returns all species for the species list/catalog view.

## Returns

`Promise`\<`NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
