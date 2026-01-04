# Function: groupSpeciesByTaxonomy()

> **groupSpeciesByTaxonomy**(`species`): `Record`\<`string`, `Record`\<`string`, `Record`\<`string`, [`Species`](../../../types/database/interfaces/Species.md)[]\>\>\>

Defined in: [src/utils/ecoregion.ts:88](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/utils/ecoregion.ts#L88)

Group species by taxonomic hierarchy (class -\> order -\> family)

## Parameters

### species

[`Species`](../../../types/database/interfaces/Species.md)[]

## Returns

`Record`\<`string`, `Record`\<`string`, `Record`\<`string`, [`Species`](../../../types/database/interfaces/Species.md)[]\>\>\>
