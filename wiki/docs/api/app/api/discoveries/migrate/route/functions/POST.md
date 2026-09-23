# Function: POST()

> **POST**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `migrated`: `number`; \}\>\>

Defined in: [app/api/discoveries/migrate/route.ts:15](https://github.com/kc0588615/phaser-june/blob/main/src/app/api/discoveries/migrate/route.ts#L15)

POST /api/discoveries/migrate
Migrate localStorage discoveries to database.
Accepts entries explicitly marked as stable species.id values only.
Raw import ogc_fid values are intentionally not bridged here because full
IUCN reimports can reassign ogc_fid and make old client IDs unsafe.
Writes for the signed-in player only; any body userId is ignored.
Body: \{ discoveries: Array\<\{ id: number, idSource: 'species.id', discoveredAt?: string \}\> \}

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `migrated`: `number`; \}\>\>
