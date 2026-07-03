# Function: TaxonomyTab()

> **TaxonomyTab**(`__namedParameters`): `Element`

Defined in: [src/components/species-list/TaxonomyTab.tsx:17](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/TaxonomyTab.tsx#L17)

## Parameters

### \_\_namedParameters

#### biomeList

`string`[]

#### discoveredSpecies

`Record`\<`number`, \{ `discoveredAt`: `string`; `name`: `string`; \}\>

#### ecoregionList

`string`[]

#### filteredSpecies

[`Species`](../../../../types/database/interfaces/Species.md)[]

#### gridRef

`MutableRefObject`\<`HTMLDivElement` \| `null`\>

#### grouped

`Record`\<`string`, `Record`\<`string`, [`Species`](../../../../types/database/interfaces/Species.md)[]\>\>

#### knownCounts

`Record`\<`string`, `number`\>

#### knownSpecies

[`Species`](../../../../types/database/interfaces/Species.md)[]

#### onClearFilter

() => `void`

#### onJump

(`target`) => `void`

#### onOpenAccordionsChange

(`value`) => `void`

#### onStickyHeadersChange

(`value`) => `void`

#### onToggleClassification

() => `void`

#### onTreeFilterSelect

(`filter`) => `void`

#### openAccordions

`string`[]

#### realmList

`string`[]

#### selectedFilter

`SpeciesFilter`

#### setRef

(`id`) => (`el`) => `void`

#### showClassification

`boolean`

#### showStickyHeaders

`boolean`

#### species

[`Species`](../../../../types/database/interfaces/Species.md)[]

#### totalCounts

`Record`\<`string`, `number`\>

#### unknownSpecies

[`Species`](../../../../types/database/interfaces/Species.md)[]

## Returns

`Element`
