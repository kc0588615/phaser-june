# Function: GET()

> **GET**(`_request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `card`: \{ `affinityTags`: `unknown`; `bestRunId`: `string` \| `null`; `bestRunScore`: `number` \| `null`; `cardVariant`: `string` \| `null`; `clueCategoriesUnlocked`: `unknown`; `completionPct`: `number`; `conservationCode`: `string` \| `null`; `createdAt`: `Date`; `discovered`: `boolean`; `expeditionRegionsSeen`: `unknown`; `factsUnlocked`: `unknown`; `firstDiscoveredAt`: `Date` \| `null`; `gisStamps`: `unknown`; `id`: `string`; `lastEncounteredAt`: `Date` \| `null`; `playerId`: `string`; `rarityTier`: `string`; `speciesId`: `number`; `timesEncountered`: `number`; `updatedAt`: `Date`; \}; `memories`: [`PublicRunMemory`](../../../../../../../lib/runProjection/interfaces/PublicRunMemory.md)[]; \}\>\>

Defined in: [src/app/api/species/cards/\[speciesId\]/route.ts:11](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/app/api/species/cards/[speciesId]/route.ts#L11)

GET /api/species/cards/[speciesId]
Returns one species card with linked run memories for the authenticated player.

## Parameters

### \_request

`NextRequest`

### \_\_namedParameters

#### params

`Promise`\<\{ `speciesId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `card`: \{ `affinityTags`: `unknown`; `bestRunId`: `string` \| `null`; `bestRunScore`: `number` \| `null`; `cardVariant`: `string` \| `null`; `clueCategoriesUnlocked`: `unknown`; `completionPct`: `number`; `conservationCode`: `string` \| `null`; `createdAt`: `Date`; `discovered`: `boolean`; `expeditionRegionsSeen`: `unknown`; `factsUnlocked`: `unknown`; `firstDiscoveredAt`: `Date` \| `null`; `gisStamps`: `unknown`; `id`: `string`; `lastEncounteredAt`: `Date` \| `null`; `playerId`: `string`; `rarityTier`: `string`; `speciesId`: `number`; `timesEncountered`: `number`; `updatedAt`: `Date`; \}; `memories`: [`PublicRunMemory`](../../../../../../../lib/runProjection/interfaces/PublicRunMemory.md)[]; \}\>\>
