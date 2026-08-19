# Function: GET()

> **GET**(`_request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `memory`: [`PublicRunMemory`](../../../../../../../lib/runProjection/interfaces/PublicRunMemory.md) \| `null`; \}\>\>

Defined in: [src/app/api/runs/\[runId\]/memory/route.ts:12](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/app/api/runs/[runId]/memory/route.ts#L12)

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
