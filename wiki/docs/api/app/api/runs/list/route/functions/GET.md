# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `runs`: `object`[]; \}\>\>

Defined in: [src/app/api/runs/list/route.ts:11](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/app/api/runs/list/route.ts#L11)

GET /api/runs/list?status=completed&limit=20
Use comma-separated statuses to fetch multiple run states.
Returns the authenticated player's recent expedition runs with node summaries.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `runs`: `object`[]; \}\>\>
