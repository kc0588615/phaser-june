# Function: POST()

> **POST**(`_request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `abandoned?`: `undefined`; `duplicate?`: `undefined`; `error`: `string`; \} \| \{ `abandoned`: `boolean`; `duplicate`: `boolean`; `error?`: `undefined`; \}\>\>

Defined in: [phaser-june-039/src/app/api/runs/\[runId\]/abandon/route.ts:7](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/app/api/runs/[runId]/abandon/route.ts#L7)

## Parameters

### \_request

`Request`

### \_\_namedParameters

#### params

`Promise`\<\{ `runId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `abandoned?`: `undefined`; `duplicate?`: `undefined`; `error`: `string`; \} \| \{ `abandoned`: `boolean`; `duplicate`: `boolean`; `error?`: `undefined`; \}\>\>
