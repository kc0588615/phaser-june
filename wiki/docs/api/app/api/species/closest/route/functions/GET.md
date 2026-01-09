# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `geometry`: `null`; `species`: `null`; \}\> \| `NextResponse`\<\{ `geometry`: `any`; `species`: \{ `comm_name`: `string` \| `null`; `distance_km`: `number`; `ogc_fid`: `number`; `sci_name`: `string` \| `null`; \}; \}\>\>

Defined in: [src/app/api/species/closest/route.ts:10](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/app/api/species/closest/route.ts#L10)

GET /api/species/closest?lon=-30&lat=20

Returns the closest species to a point (no distance limit).
Uses PostGIS \<-\> operator for efficient nearest-neighbor search.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `geometry`: `null`; `species`: `null`; \}\> \| `NextResponse`\<\{ `geometry`: `any`; `species`: \{ `comm_name`: `string` \| `null`; `distance_km`: `number`; `ogc_fid`: `number`; `sci_name`: `string` \| `null`; \}; \}\>\>
