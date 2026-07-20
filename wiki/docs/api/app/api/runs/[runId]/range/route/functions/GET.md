# Function: GET()

> **GET**(`_request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `range`: \{ `geometry`: `Record`\<`string`, `unknown`\>; `properties`: \{ \}; `type`: `string`; \} \| `null`; \}\>\>

Defined in: [src/app/api/runs/\[runId\]/range/route.ts:7](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/app/api/runs/[runId]/range/route.ts#L7)

## Parameters

### \_request

`Request`

### \_\_namedParameters

#### params

`Promise`\<\{ `runId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `range`: \{ `geometry`: `Record`\<`string`, `unknown`\>; `properties`: \{ \}; `type`: `string`; \} \| `null`; \}\>\>
