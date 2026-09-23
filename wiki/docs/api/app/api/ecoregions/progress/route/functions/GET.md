# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `ecoregion`: `null`; `foundPoints`: `never`[]; `groups`: `never`[]; \}\> \| `NextResponse`\<\{ `ecoregion`: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `collectionRegion`: `string` \| `null`; `dbEcoregionId`: `number`; `ecoregion_id`: `number`; `found_species`: `number`; `realm`: `string` \| `null`; `subrealm`: `string` \| `null`; `total_species`: `number`; \}; `foundPoints`: `FoundPointRow`[]; `groups`: `GroupRow`[]; \}\>\>

Defined in: [phaser-june-039/src/app/api/ecoregions/progress/route.ts:64](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/app/api/ecoregions/progress/route.ts#L64)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `ecoregion`: `null`; `foundPoints`: `never`[]; `groups`: `never`[]; \}\> \| `NextResponse`\<\{ `ecoregion`: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `collectionRegion`: `string` \| `null`; `dbEcoregionId`: `number`; `ecoregion_id`: `number`; `found_species`: `number`; `realm`: `string` \| `null`; `subrealm`: `string` \| `null`; `total_species`: `number`; \}; `foundPoints`: `FoundPointRow`[]; `groups`: `GroupRow`[]; \}\>\>
