# Function: POST()

> **POST**(`request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `completed`: `boolean`; `isLastNode`: `boolean`; `nodeOrder`: `number`; \}\>\>

Defined in: [src/app/api/runs/\[runId\]/nodes/\[nodeIndex\]/complete/route.ts:12](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/app/api/runs/[runId]/nodes/[nodeIndex]/complete/route.ts#L12)

POST /api/runs/[runId]/nodes/[nodeIndex]/complete
Mark a node as completed, optionally record score. Advance session.

Body: \{ scoreEarned?, movesUsed? \}

## Parameters

### request

`NextRequest`

### \_\_namedParameters

#### params

`Promise`\<\{ `nodeIndex`: `string`; `runId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `completed`: `boolean`; `isLastNode`: `boolean`; `nodeOrder`: `number`; \}\>\>
