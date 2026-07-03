# Function: GET()

> **GET**(`_request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `memory`: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `createdAt`: `Date`; `deductionSummary`: `unknown`; `eventsTriggered`: `unknown`; `finalScore`: `number` \| `null`; `gisFeaturesNearby`: `unknown`; `id`: `string`; `itemsUsed`: `unknown`; `locationKey`: `string`; `nodes`: `unknown`; `playerId`: `string` \| `null`; `realm`: `string` \| `null`; `routeBounds`: `unknown`; `routePolyline`: `unknown`; `runId`: `string`; `speciesId`: `number` \| `null`; `startLat`: `number`; `startLon`: `number`; \}; \}\> \| `NextResponse`\<\{ `memory`: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `deductionSummary`: \{ \} \| `null`; `endedAt`: `Date` \| `null`; `finalScore`: `number` \| `null`; `locationKey`: `string`; `nodes`: `object`[]; `realm`: `string` \| `null`; `runId`: `string`; `startedAt`: `Date`; `startLat`: `number`; `startLon`: `number`; \}; \}\>\>

Defined in: [src/app/api/runs/\[runId\]/memory/route.ts:10](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/app/api/runs/[runId]/memory/route.ts#L10)

GET /api/runs/[runId]/memory
Returns the run memory record, or builds one on-the-fly from session+nodes.

## Parameters

### \_request

`NextRequest`

### \_\_namedParameters

#### params

`Promise`\<\{ `runId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `memory`: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `createdAt`: `Date`; `deductionSummary`: `unknown`; `eventsTriggered`: `unknown`; `finalScore`: `number` \| `null`; `gisFeaturesNearby`: `unknown`; `id`: `string`; `itemsUsed`: `unknown`; `locationKey`: `string`; `nodes`: `unknown`; `playerId`: `string` \| `null`; `realm`: `string` \| `null`; `routeBounds`: `unknown`; `routePolyline`: `unknown`; `runId`: `string`; `speciesId`: `number` \| `null`; `startLat`: `number`; `startLon`: `number`; \}; \}\> \| `NextResponse`\<\{ `memory`: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `deductionSummary`: \{ \} \| `null`; `endedAt`: `Date` \| `null`; `finalScore`: `number` \| `null`; `locationKey`: `string`; `nodes`: `object`[]; `realm`: `string` \| `null`; `runId`: `string`; `startedAt`: `Date`; `startLat`: `number`; `startLon`: `number`; \}; \}\>\>
