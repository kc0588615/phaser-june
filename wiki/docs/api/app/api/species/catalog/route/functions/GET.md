# Function: GET()

> **GET**(): `Promise`\<`NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/species/catalog/route.ts:63](https://github.com/kc0588615/phaser-june/blob/dc88a140368b29a3e7c30936b266fd46ea76c6ee/src/app/api/species/catalog/route.ts#L63)

GET /api/species/catalog
Returns all species for the species list/catalog view.

## Returns

`Promise`\<`NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
