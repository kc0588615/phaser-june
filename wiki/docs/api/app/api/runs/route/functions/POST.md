# Function: POST()

> **POST**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `nodeIds`: `string`[]; `runId`: `string`; \}\>\>

Defined in: [src/app/api/runs/route.ts:20](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/app/api/runs/route.ts#L20)

POST /api/runs
Create a new expedition run session with 6 pre-generated nodes.

Body: \{ lon, lat, locationKey, nodes: RunNode[], activeAffinities?, bioregion?, realm?, biome?, runSeed?, ...resume snapshot \}
Returns: \{ runId, nodeIds: string[] \}

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `nodeIds`: `string`[]; `runId`: `string`; \}\>\>
