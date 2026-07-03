# Function: PATCH()

> **PATCH**(`request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `ok`: `boolean`; \}\>\>

Defined in: [src/app/api/runs/\[runId\]/route.ts:199](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/app/api/runs/[runId]/route.ts#L199)

PATCH /api/runs/[runId]
Update session metadata (checkpoint or deduction summary on completion).
When finalScore is provided, also persists a run_memories row.

Body: \{ finalScore?: number; status?: 'active' | 'deduction'; deductionSummary?: Record\<string, unknown\> \}

## Parameters

### request

`NextRequest`

### \_\_namedParameters

#### params

`Promise`\<\{ `runId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `ok`: `boolean`; \}\>\>
