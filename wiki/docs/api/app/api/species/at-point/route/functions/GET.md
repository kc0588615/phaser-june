# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>

Defined in: [src/app/api/species/at-point/route.ts:31](https://github.com/kc0588615/phaser-june/blob/dc88a140368b29a3e7c30936b266fd46ea76c6ee/src/app/api/species/at-point/route.ts#L31)

GET /api/species/at-point?lon=-122.4&lat=37.7

Returns species whose habitat polygon contains the given point.
Uses PostGIS ST_Contains for point-in-polygon query.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>
