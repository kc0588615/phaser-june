# Function: groupSpeciesByTaxonomy()

> **groupSpeciesByTaxonomy**(`species`): `Record`\<`string`, `Record`\<`string`, `Record`\<`string`, [`Species`](../../../types/database/interfaces/Species.md)[]\>\>\>

Defined in: [src/utils/ecoregion.ts:88](https://github.com/kc0588615/phaser-june/blob/dc88a140368b29a3e7c30936b266fd46ea76c6ee/src/utils/ecoregion.ts#L88)

Group species by taxonomic hierarchy (class -\> order -\> family)

## Parameters

### species

[`Species`](../../../types/database/interfaces/Species.md)[]

## Returns

`Record`\<`string`, `Record`\<`string`, `Record`\<`string`, [`Species`](../../../types/database/interfaces/Species.md)[]\>\>\>
