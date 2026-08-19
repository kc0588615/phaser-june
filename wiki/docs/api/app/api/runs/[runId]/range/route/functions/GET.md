# Function: GET()

> **GET**(`_request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `range`: \{ `geometry`: `Record`\<`string`, `unknown`\>; `properties`: \{ \}; `type`: `string`; \} \| `null`; \}\>\>

Defined in: [src/app/api/runs/\[runId\]/range/route.ts:7](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/app/api/runs/[runId]/range/route.ts#L7)

## Parameters

### \_request

`Request`

### \_\_namedParameters

#### params

`Promise`\<\{ `runId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `range`: \{ `geometry`: `Record`\<`string`, `unknown`\>; `properties`: \{ \}; `type`: `string`; \} \| `null`; \}\>\>
