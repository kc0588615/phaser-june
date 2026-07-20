# Interface: CaseState

Defined in: [src/types/expedition.ts:46](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L46)

## Properties

### bestTargetMatchLength

> **bestTargetMatchLength**: `number`

Defined in: [src/types/expedition.ts:64](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L64)

***

### candidateFamilyTraits

> **candidateFamilyTraits**: `Record`\<`string`, `Partial`\<`Record`\<[`EvidenceFamily`](../../../expedition/evidenceFamilies/type-aliases/EvidenceFamily.md), `string`\>\>\>

Defined in: [src/types/expedition.ts:81](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L81)

***

### candidateIds

> **candidateIds**: `number`[]

Defined in: [src/types/expedition.ts:51](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L51)

***

### carriedCharges

> **carriedCharges**: [`EvidenceChargeState`](../../../expedition/evidenceFamilies/type-aliases/EvidenceChargeState.md)

Defined in: [src/types/expedition.ts:69](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L69)

***

### citedObservationRefs

> **citedObservationRefs**: `string`[]

Defined in: [src/types/expedition.ts:66](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L66)

***

### eliminatedIds

> **eliminatedIds**: `number`[]

Defined in: [src/types/expedition.ts:55](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L55)

***

### eliminationReasons

> **eliminationReasons**: `Record`\<`string`, `string`\>

Defined in: [src/types/expedition.ts:79](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L79)

***

### evidenceCharges

> **evidenceCharges**: [`EvidenceChargeState`](../../../expedition/evidenceFamilies/type-aliases/EvidenceChargeState.md)

Defined in: [src/types/expedition.ts:68](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L68)

***

### familyTraits

> **familyTraits**: `Partial`\<`Record`\<[`EvidenceFamily`](../../../expedition/evidenceFamilies/type-aliases/EvidenceFamily.md), `string`\>\>

Defined in: [src/types/expedition.ts:80](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L80)

***

### fieldNotes

> **fieldNotes**: [`FieldNote`](FieldNote.md)[]

Defined in: [src/types/expedition.ts:67](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L67)

***

### guessResult

> **guessResult**: `"correct"` \| `"wrong"` \| `null`

Defined in: [src/types/expedition.ts:58](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L58)

***

### hintFeed

> **hintFeed**: `object`[]

Defined in: [src/types/expedition.ts:73](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L73)

#### family?

> `optional` **family**: `"behavior"` \| `"relatives"` \| `"body"` \| `"habits"` \| `"place"`

#### id

> **id**: `string`

#### kind

> **kind**: `"cascade"` \| `"evidence"`

#### text

> **text**: `string`

***

### interpretations

> **interpretations**: [`InterpretationEvent`](InterpretationEvent.md)[]

Defined in: [src/types/expedition.ts:54](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L54)

***

### lastFeedback

> **lastFeedback**: [`ComparisonResult`](../../../lib/deductionEngine/interfaces/ComparisonResult.md)[] \| `null`

Defined in: [src/types/expedition.ts:59](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L59)

***

### mapView

> **mapView**: [`ExpeditionMapView`](../../../expedition/mapView/interfaces/ExpeditionMapView.md) \| `null`

Defined in: [src/types/expedition.ts:48](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L48)

***

### missedEvidenceNodeIndexes

> **missedEvidenceNodeIndexes**: `number`[]

Defined in: [src/types/expedition.ts:57](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L57)

***

### nodeOutcomes

> **nodeOutcomes**: (`"met"` \| `"failed"` \| `null`)[]

Defined in: [src/types/expedition.ts:65](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L65)

***

### objectiveProgress

> **objectiveProgress**: `number`

Defined in: [src/types/expedition.ts:62](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L62)

***

### objectiveTarget

> **objectiveTarget**: `number`

Defined in: [src/types/expedition.ts:63](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L63)

***

### observations

> **observations**: [`EarnedObservation`](EarnedObservation.md)[]

Defined in: [src/types/expedition.ts:53](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L53)

***

### offeredFamilies

> **offeredFamilies**: (`"behavior"` \| `"relatives"` \| `"body"` \| `"habits"` \| `"place"`)[]

Defined in: [src/types/expedition.ts:70](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L70)

***

### offeredMethods

> **offeredMethods**: \[`"track"` \| `"observe"` \| `"listen"` \| `"survey"` \| `"analyze"`, `"track"` \| `"observe"` \| `"listen"` \| `"survey"` \| `"analyze"`\] \| `null`

Defined in: [src/types/expedition.ts:60](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L60)

***

### pendingInterpretationRef

> **pendingInterpretationRef**: `string` \| `null`

Defined in: [src/types/expedition.ts:56](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L56)

***

### profiles

> **profiles**: [`DeductionProfile`](../../../lib/deductionEngine/interfaces/DeductionProfile.md)[]

Defined in: [src/types/expedition.ts:52](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L52)

***

### selectedFamilies

> **selectedFamilies**: (`"behavior"` \| `"relatives"` \| `"body"` \| `"habits"` \| `"place"`)[]

Defined in: [src/types/expedition.ts:71](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L71)

***

### selectedMethods

> **selectedMethods**: (`"track"` \| `"observe"` \| `"listen"` \| `"survey"` \| `"analyze"` \| `null`)[]

Defined in: [src/types/expedition.ts:61](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L61)

***

### stage

> **stage**: [`CaseStage`](../../../expedition/caseFlow/type-aliases/CaseStage.md)

Defined in: [src/types/expedition.ts:50](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L50)

Sub-state of phase 'mystery': board play, evidence interpretation, or the final guess.

***

### travelEntry

> **travelEntry**: `string` \| `null`

Defined in: [src/types/expedition.ts:72](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L72)

***

### version

> **version**: `1` \| `2` \| `3`

Defined in: [src/types/expedition.ts:47](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L47)
