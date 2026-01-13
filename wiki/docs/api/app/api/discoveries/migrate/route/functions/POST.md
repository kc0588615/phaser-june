# Function: POST()

> **POST**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `migrated`: `number`; \}\>\>

Defined in: [src/app/api/discoveries/migrate/route.ts:10](https://github.com/kc0588615/phaser-june/blob/dc88a140368b29a3e7c30936b266fd46ea76c6ee/src/app/api/discoveries/migrate/route.ts#L10)

POST /api/discoveries/migrate
Migrate localStorage discoveries to database.
Body: \{ userId: string, discoveries: Array\<\{ id: number, discoveredAt?: string \}\> \}

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `migrated`: `number`; \}\>\>
