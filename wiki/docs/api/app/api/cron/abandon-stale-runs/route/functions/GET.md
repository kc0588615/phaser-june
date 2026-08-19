# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `abandoned`: `number`; `staleDays`: `number`; \}\>\>

Defined in: [src/app/api/cron/abandon-stale-runs/route.ts:7](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/app/api/cron/abandon-stale-runs/route.ts#L7)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `abandoned`: `number`; `staleDays`: `number`; \}\>\>
