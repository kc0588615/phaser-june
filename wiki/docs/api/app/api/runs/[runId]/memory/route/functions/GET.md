# Function: GET()

> **GET**(`_request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `memory`: [`PublicRunMemory`](../../../../../../../lib/runProjection/interfaces/PublicRunMemory.md) \| `null`; \}\>\>

Defined in: [app/api/runs/\[runId\]/memory/route.ts:12](https://github.com/kc0588615/phaser-june/blob/main/src/app/api/runs/[runId]/memory/route.ts#L12)

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
