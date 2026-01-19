# Function: GET()

> **GET**(): `Promise`\<`NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/species/catalog/route.ts:63](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/app/api/species/catalog/route.ts#L63)

GET /api/species/catalog
Returns all species for the species list/catalog view.

## Returns

`Promise`\<`NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
