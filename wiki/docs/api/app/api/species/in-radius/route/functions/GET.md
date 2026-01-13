# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>

Defined in: [src/app/api/species/in-radius/route.ts:31](https://github.com/kc0588615/phaser-june/blob/dc88a140368b29a3e7c30936b266fd46ea76c6ee/src/app/api/species/in-radius/route.ts#L31)

GET /api/species/in-radius?lon=-122.4&lat=37.7&radius=10000

Returns species within a radius (meters) of a point.
Uses PostGIS ST_DWithin for efficient spatial query.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>
