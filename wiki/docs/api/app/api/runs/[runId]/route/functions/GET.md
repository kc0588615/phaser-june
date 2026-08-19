# Function: GET()

> **GET**(`_request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<[`ClientRunProjection`](../../../../../../lib/runProjection/interfaces/ClientRunProjection.md)\>\>

Defined in: [src/app/api/runs/\[runId\]/route.ts:8](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/app/api/runs/[runId]/route.ts#L8)

## Parameters

### \_request

`NextRequest`

### \_\_namedParameters

#### params

`Promise`\<\{ `runId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<[`ClientRunProjection`](../../../../../../lib/runProjection/interfaces/ClientRunProjection.md)\>\>
