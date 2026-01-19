# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: [`Species`](../../../../../types/database/interfaces/Species.md); \}\> \| `NextResponse`\<\{ `count`: `number`; `query`: `string`; `species`: `object`[]; \}\> \| `NextResponse`\<\{ `count`: `number`; `realm`: `string`; `species`: [`Species`](../../../../../types/database/interfaces/Species.md)[]; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: [`Species`](../../../../../types/database/interfaces/Species.md)[]; `statuses`: `string`[]; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>

Defined in: [src/app/api/species/route.ts:58](https://github.com/kc0588615/phaser-june/blob/faa14c00324626a166934fb4b850bcca3146ae62/src/app/api/species/route.ts#L58)

GET /api/species

Query Parameters:
- id: number - Get single species by ID
- search: string - Search by common or scientific name
- realm: string - Filter by biogeographic realm
- status: string - Filter by IUCN status (comma-separated: CR,EN,VU)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: [`Species`](../../../../../types/database/interfaces/Species.md); \}\> \| `NextResponse`\<\{ `count`: `number`; `query`: `string`; `species`: `object`[]; \}\> \| `NextResponse`\<\{ `count`: `number`; `realm`: `string`; `species`: [`Species`](../../../../../types/database/interfaces/Species.md)[]; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: [`Species`](../../../../../types/database/interfaces/Species.md)[]; `statuses`: `string`[]; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>

## Example

```
// Get all species
fetch('/api/species')

// Get species by ID
fetch('/api/species?id=1')

// Search by name
fetch('/api/species?search=turtle')

// Filter by realm
fetch('/api/species?realm=Nearctic')

// Filter by conservation status
fetch('/api/species?status=CR,EN')
```
