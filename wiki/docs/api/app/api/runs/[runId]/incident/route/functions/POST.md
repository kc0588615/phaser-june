# Function: POST()

> **POST**(`_request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `duplicate?`: `undefined`; `error`: `string`; `ok?`: `undefined`; \} \| \{ `duplicate`: `boolean`; `error?`: `undefined`; `ok`: `boolean`; \}\>\>

Defined in: [app/api/runs/\[runId\]/incident/route.ts:8](https://github.com/kc0588615/phaser-june/blob/main/src/app/api/runs/[runId]/incident/route.ts#L8)

## Parameters

### \_request

`Request`

### \_\_namedParameters

#### params

`Promise`\<\{ `runId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `duplicate?`: `undefined`; `error`: `string`; `ok?`: `undefined`; \} \| \{ `duplicate`: `boolean`; `error?`: `undefined`; `ok`: `boolean`; \}\>\>
