# Function: GET()

> **GET**(`_request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<[`ClientRunProjection`](../../../../../../lib/runProjection/interfaces/ClientRunProjection.md)\>\>

Defined in: [app/api/runs/\[runId\]/route.ts:11](https://github.com/kc0588615/phaser-june/blob/main/src/app/api/runs/[runId]/route.ts#L11)

## Parameters

### \_request

`NextRequest`

### \_\_namedParameters

#### params

`Promise`\<\{ `runId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<[`ClientRunProjection`](../../../../../../lib/runProjection/interfaces/ClientRunProjection.md)\>\>
