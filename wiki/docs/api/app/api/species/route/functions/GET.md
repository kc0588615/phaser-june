# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: \{ \}; \}\> \| `NextResponse`\<\{ `count`: `number`; `query`: `string`; `species`: `object`[]; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>

Defined in: [src/app/api/species/route.ts:58](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/app/api/species/route.ts#L58)

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

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `species`: \{ \}; \}\> \| `NextResponse`\<\{ `count`: `number`; `query`: `string`; `species`: `object`[]; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>

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
