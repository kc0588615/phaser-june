# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `ecoregion`: `null`; `foundPoints`: `never`[]; `groups`: `never`[]; \}\> \| `NextResponse`\<\{ `ecoregion`: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `collectionRegion`: `string` \| `null`; `dbEcoregionId`: `number`; `ecoregion_id`: `number`; `found_species`: `number`; `realm`: `string` \| `null`; `subrealm`: `string` \| `null`; `total_species`: `number`; \}; `foundPoints`: `FoundPointRow`[]; `groups`: `GroupRow`[]; \}\>\>

Defined in: [src/app/api/ecoregions/progress/route.ts:64](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/app/api/ecoregions/progress/route.ts#L64)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `ecoregion`: `null`; `foundPoints`: `never`[]; `groups`: `never`[]; \}\> \| `NextResponse`\<\{ `ecoregion`: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `collectionRegion`: `string` \| `null`; `dbEcoregionId`: `number`; `ecoregion_id`: `number`; `found_species`: `number`; `realm`: `string` \| `null`; `subrealm`: `string` \| `null`; `total_species`: `number`; \}; `foundPoints`: `FoundPointRow`[]; `groups`: `GroupRow`[]; \}\>\>
