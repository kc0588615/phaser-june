# Function: filterCandidates()

> **filterCandidates**(`allProfiles`, `confirmedClues`, `eliminatedSpeciesIds`): [`DeductionProfile`](../interfaces/DeductionProfile.md)[]

Defined in: [src/lib/deductionEngine.ts:175](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/deductionEngine.ts#L175)

Given all species profiles and a set of confirmed clue constraints,
return profiles that satisfy ALL confirmed constraints.

confirmedClues: each entry means "the mystery species has one of these
compareTags in this category". Every clue entry must pass. Tags inside one
clue are ORed; separate confirmed clues are ANDed.

eliminatedSpeciesIds: species explicitly ruled out via negative confirmation.

## Parameters

### allProfiles

[`DeductionProfile`](../interfaces/DeductionProfile.md)[]

### confirmedClues

[`ConfirmedClue`](../../../types/expedition/interfaces/ConfirmedClue.md)[]

### eliminatedSpeciesIds

`Set`\<`number`\>

## Returns

[`DeductionProfile`](../interfaces/DeductionProfile.md)[]
