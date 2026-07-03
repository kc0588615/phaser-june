# Function: POST()

> **POST**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `migrated`: `number`; \}\>\>

Defined in: [src/app/api/discoveries/migrate/route.ts:14](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/app/api/discoveries/migrate/route.ts#L14)

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
