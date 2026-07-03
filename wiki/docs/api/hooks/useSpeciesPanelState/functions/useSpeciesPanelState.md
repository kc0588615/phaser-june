# Function: useSpeciesPanelState()

> **useSpeciesPanelState**(`toastsEnabled`): `object`

Defined in: [src/hooks/useSpeciesPanelState.tsx:15](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/hooks/useSpeciesPanelState.tsx#L15)

## Parameters

### toastsEnabled

`boolean`

## Returns

`object`

### allSpeciesCompleted

> **allSpeciesCompleted**: `boolean` = `!!allSpeciesCompleted`

### clues

> **clues**: [`CluePayload`](../../../game/clueConfig/interfaces/CluePayload.md)[]

### currentSpeciesIndex

> **currentSpeciesIndex**: `number`

### discoveredClues

> **discoveredClues**: `DiscoveredClue`[]

### discoveredSpeciesName

> **discoveredSpeciesName**: `string`

### hasSelectedSpecies

> **hasSelectedSpecies**: `boolean`

### hiddenSpeciesName

> **hiddenSpeciesName**: `string`

### hud

> **hud**: `object`

#### hud.moveMultiplier?

> `optional` **moveMultiplier**: `number`

#### hud.movesUsed

> **movesUsed**: `number`

#### hud.multiplier

> **multiplier**: `number`

#### hud.score

> **score**: `number`

#### hud.streak

> **streak**: `number`

### isSpeciesDiscovered

> **isSpeciesDiscovered**: `boolean`

### selectedSpeciesId

> **selectedSpeciesId**: `number`

### selectedSpeciesName

> **selectedSpeciesName**: `string`

### totalSpecies

> **totalSpecies**: `number`
