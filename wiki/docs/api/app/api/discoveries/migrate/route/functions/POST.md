# Function: POST()

> **POST**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `migrated`: `number`; \}\>\>

Defined in: [src/app/api/discoveries/migrate/route.ts:13](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/app/api/discoveries/migrate/route.ts#L13)

POST /api/discoveries/migrate
Migrate localStorage discoveries to database.
Accepts entries explicitly marked as stable species.id values only.
Raw import ogc_fid values are intentionally not bridged here because full
IUCN reimports can reassign ogc_fid and make old client IDs unsafe.
Body: \{ userId: string, discoveries: Array\<\{ id: number, idSource: 'species.id', discoveredAt?: string \}\> \}

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `migrated`: `number`; \}\>\>
