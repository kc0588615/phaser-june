# Function: GET()

> **GET**(): `Promise`\<`NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>

Defined in: [src/app/api/species/catalog/route.ts:8](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/app/api/species/catalog/route.ts#L8)

GET /api/species/catalog
Returns all species for the species list/catalog view.

## Returns

`Promise`\<`NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\> \| `NextResponse`\<\{ `error`: `string`; \}\>\>
