# Function: groupSpeciesByTaxonomy()

> **groupSpeciesByTaxonomy**(`species`): `Record`\<`string`, `Record`\<`string`, `Record`\<`string`, [`Species`](../../../types/database/interfaces/Species.md)[]\>\>\>

Defined in: [src/utils/ecoregion.ts:88](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/utils/ecoregion.ts#L88)

Group species by taxonomic hierarchy (class -\> order -\> family)

## Parameters

### species

[`Species`](../../../types/database/interfaces/Species.md)[]

## Returns

`Record`\<`string`, `Record`\<`string`, `Record`\<`string`, [`Species`](../../../types/database/interfaces/Species.md)[]\>\>\>
