# Interface: ComparativeDeductionState

Defined in: [src/types/expedition.ts:89](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L89)

## Properties

### activeReferenceId

> **activeReferenceId**: `number` \| `null`

Defined in: [src/types/expedition.ts:99](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L99)

Currently slotted reference card (null = empty slot)

***

### albumProfiles

> **albumProfiles**: [`DeductionProfile`](../../../lib/deductionEngine/interfaces/DeductionProfile.md)[]

Defined in: [src/types/expedition.ts:97](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L97)

Album cards available as references

***

### candidateCount

> **candidateCount**: `number`

Defined in: [src/types/expedition.ts:107](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L107)

Current candidate count after filtering

***

### confirmedTags

> **confirmedTags**: `Partial`\<`Record`\<[`DeductionClueCategory`](../../../db/schema/species/type-aliases/DeductionClueCategory.md), `string`[]\>\>

Defined in: [src/types/expedition.ts:103](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L103)

Confirmed tags per category from successful comparisons

***

### eliminatedSpeciesIds

> **eliminatedSpeciesIds**: `number`[]

Defined in: [src/types/expedition.ts:105](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L105)

Species IDs eliminated via negative confirmation

***

### guessBonusAwarded

> **guessBonusAwarded**: `number`

Defined in: [src/types/expedition.ts:112](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L112)

***

### guessResult

> **guessResult**: `"pending"` \| `"correct"` \| `"wrong"` \| `null`

Defined in: [src/types/expedition.ts:111](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L111)

Final guess

***

### mysteryClues

> **mysteryClues**: [`DeductionClue`](../../../lib/deductionEngine/interfaces/DeductionClue.md)[]

Defined in: [src/types/expedition.ts:93](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L93)

All clues available for the mystery species

***

### mysteryProfile

> **mysteryProfile**: [`DeductionProfile`](../../../lib/deductionEngine/interfaces/DeductionProfile.md)

Defined in: [src/types/expedition.ts:91](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L91)

Mystery species profile (tag arrays for comparison)

***

### processedClues

> **processedClues**: [`ProcessedClue`](../../../lib/deductionEngine/interfaces/ProcessedClue.md)[]

Defined in: [src/types/expedition.ts:95](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L95)

Clues the player has processed (unblurred)

***

### referenceHistory

> **referenceHistory**: [`ReferenceAttempt`](../../../lib/deductionEngine/interfaces/ReferenceAttempt.md)[]

Defined in: [src/types/expedition.ts:101](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L101)

History of all reference attempts

***

### scoreSpent

> **scoreSpent**: `number`

Defined in: [src/types/expedition.ts:109](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L109)

Score spent on clue processing
