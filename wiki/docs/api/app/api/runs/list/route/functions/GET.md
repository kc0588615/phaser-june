# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `runs`: `object`[]; \}\>\>

Defined in: [src/app/api/runs/list/route.ts:15](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/app/api/runs/list/route.ts#L15)

GET /api/runs/list?status=completed&limit=20
Use comma-separated statuses to fetch multiple run states.
Returns the authenticated player's recent expedition runs with node summaries.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `runs`: `object`[]; \}\>\>
