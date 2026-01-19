# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>

Defined in: [src/app/api/species/at-point/route.ts:31](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/app/api/species/at-point/route.ts#L31)

GET /api/species/at-point?lon=-122.4&lat=37.7

Returns species whose habitat polygon contains the given point.
Uses PostGIS ST_Contains for point-in-polygon query.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>
