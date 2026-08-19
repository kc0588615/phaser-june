# Function: useSpeciesPanelState()

> **useSpeciesPanelState**(`toastsEnabled`): `object`

Defined in: [src/hooks/useSpeciesPanelState.tsx:14](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/hooks/useSpeciesPanelState.tsx#L14)

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

### hud

> **hud**: `object`

#### hud.maxMoves

> **maxMoves**: `number`

#### hud.moveMultiplier?

> `optional` **moveMultiplier**: `number`

#### hud.movesRemaining

> **movesRemaining**: `number`

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
