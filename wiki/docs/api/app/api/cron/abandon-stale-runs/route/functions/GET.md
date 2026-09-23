# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `abandoned`: `number`; `staleDays`: `number`; \}\>\>

Defined in: [app/api/cron/abandon-stale-runs/route.ts:7](https://github.com/kc0588615/phaser-june/blob/main/src/app/api/cron/abandon-stale-runs/route.ts#L7)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `abandoned`: `number`; `staleDays`: `number`; \}\>\>
