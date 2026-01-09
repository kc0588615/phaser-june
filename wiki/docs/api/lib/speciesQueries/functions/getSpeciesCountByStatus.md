# Function: getSpeciesCountByStatus()

> **getSpeciesCountByStatus**(): `Promise`\<`Record`\<`string`, `number`\>\>

Defined in: [src/lib/speciesQueries.ts:288](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/lib/speciesQueries.ts#L288)

Gets count of species by conservation status.

## Returns

`Promise`\<`Record`\<`string`, `number`\>\>

Object mapping IUCN codes to counts, e.g. `{ CR: 5, EN: 10, ... }`
