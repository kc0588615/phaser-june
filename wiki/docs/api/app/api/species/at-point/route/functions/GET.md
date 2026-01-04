# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>

Defined in: [src/app/api/species/at-point/route.ts:10](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/app/api/species/at-point/route.ts#L10)

GET /api/species/at-point?lon=-122.4&lat=37.7

Returns species whose habitat polygon contains the given point.
Uses PostGIS ST_Contains for point-in-polygon query.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `count`: `number`; `species`: `object`[]; \}\>\>
