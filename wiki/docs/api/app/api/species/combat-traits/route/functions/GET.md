# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `traits`: `Record`\<`string`, `unknown`\>[]; \}\>\>

Defined in: [src/app/api/species/combat-traits/route.ts:9](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/app/api/species/combat-traits/route.ts#L9)

GET /api/species/combat-traits?ids=1,2,3
Batch fetch species_combat_traits rows for match-battle enemy generation.

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `traits`: `Record`\<`string`, `unknown`\>[]; \}\>\>
