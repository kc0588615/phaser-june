# Interface: CaseState

Defined in: [src/types/expedition.ts:25](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L25)

## Properties

### candidateFamilyTraits

> **candidateFamilyTraits**: `Record`\<`string`, `Partial`\<`Record`\<[`EvidenceFamily`](../../../expedition/evidenceFamilies/type-aliases/EvidenceFamily.md), `string`\>\>\>

Defined in: [src/types/expedition.ts:52](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L52)

***

### candidateIds

> **candidateIds**: `number`[]

Defined in: [src/types/expedition.ts:30](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L30)

***

### carriedCharges

> **carriedCharges**: [`EvidenceChargeState`](../../../expedition/evidenceFamilies/type-aliases/EvidenceChargeState.md)

Defined in: [src/types/expedition.ts:40](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L40)

***

### eliminatedIds

> **eliminatedIds**: `number`[]

Defined in: [src/types/expedition.ts:33](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L33)

***

### eliminationReasons

> **eliminationReasons**: `Record`\<`string`, `string`\>

Defined in: [src/types/expedition.ts:50](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L50)

***

### evidenceCharges

> **evidenceCharges**: [`EvidenceChargeState`](../../../expedition/evidenceFamilies/type-aliases/EvidenceChargeState.md)

Defined in: [src/types/expedition.ts:39](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L39)

***

### familyTraits

> **familyTraits**: `Partial`\<`Record`\<[`EvidenceFamily`](../../../expedition/evidenceFamilies/type-aliases/EvidenceFamily.md), `string`\>\>

Defined in: [src/types/expedition.ts:51](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L51)

***

### guessResult

> **guessResult**: `"correct"` \| `"wrong"` \| `null`

Defined in: [src/types/expedition.ts:34](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L34)

***

### hintFeed

> **hintFeed**: `object`[]

Defined in: [src/types/expedition.ts:44](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L44)

#### family?

> `optional` **family**: `"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`

#### id

> **id**: `string`

#### kind

> **kind**: `"cascade"` \| `"evidence"`

#### text

> **text**: `string`

***

### lastFeedback

> **lastFeedback**: [`ComparisonResult`](../../../lib/deductionEngine/interfaces/ComparisonResult.md)[] \| `null`

Defined in: [src/types/expedition.ts:35](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L35)

***

### mapView

> **mapView**: [`ExpeditionMapView`](../../../expedition/mapView/interfaces/ExpeditionMapView.md) \| `null`

Defined in: [src/types/expedition.ts:27](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L27)

***

### nodeOutcomes

> **nodeOutcomes**: (`"met"` \| `"failed"` \| `null`)[]

Defined in: [src/types/expedition.ts:38](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L38)

***

### objectiveProgress

> **objectiveProgress**: `number`

Defined in: [src/types/expedition.ts:36](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L36)

***

### objectiveTarget

> **objectiveTarget**: `number`

Defined in: [src/types/expedition.ts:37](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L37)

***

### observations

> **observations**: [`EarnedObservation`](EarnedObservation.md)[]

Defined in: [src/types/expedition.ts:32](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L32)

***

### offeredFamilies

> **offeredFamilies**: (`"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`)[]

Defined in: [src/types/expedition.ts:41](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L41)

***

### profiles

> **profiles**: [`DeductionProfile`](../../../lib/deductionEngine/interfaces/DeductionProfile.md)[]

Defined in: [src/types/expedition.ts:31](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L31)

***

### selectedFamilies

> **selectedFamilies**: (`"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`)[]

Defined in: [src/types/expedition.ts:42](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L42)

***

### stage

> **stage**: [`CaseStage`](../../../expedition/caseFlow/type-aliases/CaseStage.md)

Defined in: [src/types/expedition.ts:29](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L29)

Sub-state of phase 'mystery': board play, evidence choice/reveal, or the final guess.

***

### travelEntry

> **travelEntry**: `string` \| `null`

Defined in: [src/types/expedition.ts:43](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L43)

***

### version

> **version**: `3`

Defined in: [src/types/expedition.ts:26](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L26)
