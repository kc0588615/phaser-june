# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `geometry`: `null`; `species`: `null`; \}\> \| `NextResponse`\<\{ `geometry`: `any`; `species`: \{ `common_name`: `string` \| `null`; `distance_km`: `number`; `ogc_fid`: `number`; `scientific_name`: `string` \| `null`; \}; \}\>\>

Defined in: [src/app/api/species/closest/route.ts:20](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/app/api/species/closest/route.ts#L20)

GET /api/species/closest?lon=-30&lat=20

Returns the closest species to a point (no distance limit).
Uses PostGIS \<-\> operator for efficient nearest-neighbor search.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `geometry`: `null`; `species`: `null`; \}\> \| `NextResponse`\<\{ `geometry`: `any`; `species`: \{ `common_name`: `string` \| `null`; `distance_km`: `number`; `ogc_fid`: `number`; `scientific_name`: `string` \| `null`; \}; \}\>\>
