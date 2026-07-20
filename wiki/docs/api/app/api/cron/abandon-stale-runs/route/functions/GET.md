# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `abandoned`: `number`; `staleDays`: `number`; \}\>\>

Defined in: [src/app/api/cron/abandon-stale-runs/route.ts:7](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/app/api/cron/abandon-stale-runs/route.ts#L7)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `abandoned`: `number`; `staleDays`: `number`; \}\>\>
