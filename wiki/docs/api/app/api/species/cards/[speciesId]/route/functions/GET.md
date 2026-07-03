# Function: GET()

> **GET**(`_request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `card`: \{ `affinityTags`: `unknown`; `bestRunId`: `string` \| `null`; `bestRunScore`: `number` \| `null`; `cardVariant`: `string` \| `null`; `clueCategoriesUnlocked`: `unknown`; `completionPct`: `number`; `conservationCode`: `string` \| `null`; `createdAt`: `Date`; `discovered`: `boolean`; `expeditionRegionsSeen`: `unknown`; `factsUnlocked`: `unknown`; `firstDiscoveredAt`: `Date` \| `null`; `gisStamps`: `unknown`; `id`: `string`; `lastEncounteredAt`: `Date` \| `null`; `playerId`: `string`; `rarityTier`: `string`; `speciesId`: `number`; `timesEncountered`: `number`; `updatedAt`: `Date`; \}; `memories`: `object`[]; \}\>\>

Defined in: [src/app/api/species/cards/\[speciesId\]/route.ts:10](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/app/api/species/cards/[speciesId]/route.ts#L10)

GET /api/species/cards/[speciesId]
Returns one species card with linked run memories for the authenticated player.

## Parameters

### \_request

`NextRequest`

### \_\_namedParameters

#### params

`Promise`\<\{ `speciesId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `card`: \{ `affinityTags`: `unknown`; `bestRunId`: `string` \| `null`; `bestRunScore`: `number` \| `null`; `cardVariant`: `string` \| `null`; `clueCategoriesUnlocked`: `unknown`; `completionPct`: `number`; `conservationCode`: `string` \| `null`; `createdAt`: `Date`; `discovered`: `boolean`; `expeditionRegionsSeen`: `unknown`; `factsUnlocked`: `unknown`; `firstDiscoveredAt`: `Date` \| `null`; `gisStamps`: `unknown`; `id`: `string`; `lastEncounteredAt`: `Date` \| `null`; `playerId`: `string`; `rarityTier`: `string`; `speciesId`: `number`; `timesEncountered`: `number`; `updatedAt`: `Date`; \}; `memories`: `object`[]; \}\>\>
