# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `runs`: `object`[]; \}\>\>

Defined in: [src/app/api/runs/list/route.ts:15](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/app/api/runs/list/route.ts#L15)

GET /api/runs/list?status=completed&limit=20
Use comma-separated statuses to fetch multiple run states.
Returns the authenticated player's recent expedition runs with node summaries.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `runs`: `object`[]; \}\>\>
