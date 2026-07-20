# Function: useSpeciesPanelState()

> **useSpeciesPanelState**(`toastsEnabled`): `object`

Defined in: [src/hooks/useSpeciesPanelState.tsx:14](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/hooks/useSpeciesPanelState.tsx#L14)

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
