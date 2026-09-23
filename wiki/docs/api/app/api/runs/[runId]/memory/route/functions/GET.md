# Function: GET()

> **GET**(`_request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `memory`: [`PublicRunMemory`](../../../../../../../lib/runProjection/interfaces/PublicRunMemory.md) \| `null`; \}\>\>

Defined in: [phaser-june-039/src/app/api/runs/\[runId\]/memory/route.ts:12](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/app/api/runs/[runId]/memory/route.ts#L12)

GET /api/runs/[runId]/memory
Returns the run memory record, or builds one on-the-fly from session+nodes.

## Parameters

### \_request

`NextRequest`

### \_\_namedParameters

#### params

`Promise`\<\{ `runId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `memory`: [`PublicRunMemory`](../../../../../../../lib/runProjection/interfaces/PublicRunMemory.md) \| `null`; \}\>\>
