# Function: TaxonomyTab()

> **TaxonomyTab**(`__namedParameters`): `Element`

Defined in: [src/components/species-list/TaxonomyTab.tsx:17](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/components/species-list/TaxonomyTab.tsx#L17)

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
