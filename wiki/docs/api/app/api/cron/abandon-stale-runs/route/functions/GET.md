# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `abandoned`: `number`; `staleDays`: `number`; \}\>\>

Defined in: [phaser-june-039/src/app/api/cron/abandon-stale-runs/route.ts:7](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/app/api/cron/abandon-stale-runs/route.ts#L7)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `abandoned`: `number`; `staleDays`: `number`; \}\>\>
