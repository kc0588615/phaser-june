# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `ecoregion`: `null`; `foundPoints`: `never`[]; `groups`: `never`[]; \}\> \| `NextResponse`\<\{ `ecoregion`: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `collectionRegion`: `string` \| `null`; `dbEcoregionId`: `number`; `ecoregion_id`: `number`; `found_species`: `number`; `realm`: `string` \| `null`; `subrealm`: `string` \| `null`; `total_species`: `number`; \}; `foundPoints`: `FoundPointRow`[]; `groups`: `GroupRow`[]; \}\>\>

Defined in: [src/app/api/ecoregions/progress/route.ts:64](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/app/api/ecoregions/progress/route.ts#L64)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `ecoregion`: `null`; `foundPoints`: `never`[]; `groups`: `never`[]; \}\> \| `NextResponse`\<\{ `ecoregion`: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `collectionRegion`: `string` \| `null`; `dbEcoregionId`: `number`; `ecoregion_id`: `number`; `found_species`: `number`; `realm`: `string` \| `null`; `subrealm`: `string` \| `null`; `total_species`: `number`; \}; `foundPoints`: `FoundPointRow`[]; `groups`: `GroupRow`[]; \}\>\>
