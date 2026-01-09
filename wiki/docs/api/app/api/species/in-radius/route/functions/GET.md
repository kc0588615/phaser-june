# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>

Defined in: [src/app/api/species/in-radius/route.ts:10](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/app/api/species/in-radius/route.ts#L10)

GET /api/species/in-radius?lon=-122.4&lat=37.7&radius=10000

Returns species within a radius (meters) of a point.
Uses PostGIS ST_DWithin for efficient spatial query.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>
