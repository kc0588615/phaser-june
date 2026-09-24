# Interface: CaseState

Defined in: [types/expedition.ts:47](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L47)

## Properties

### candidateIds

> **candidateIds**: `number`[]

Defined in: [types/expedition.ts:56](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L56)

***

### carriedCharges

> **carriedCharges**: [`EvidenceChargeState`](../../../expedition/evidenceFamilies/type-aliases/EvidenceChargeState.md)

Defined in: [types/expedition.ts:67](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L67)

***

### claims

> **claims**: [`ClaimState`](../../../lib/liveClaims/interfaces/ClaimState.md)

Defined in: [types/expedition.ts:49](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L49)

***

### diagnosisFeedback

> **diagnosisFeedback**: [`DiagnosisFeedback`](../../../lib/mysteryCase/interfaces/DiagnosisFeedback.md) \| `null`

Defined in: [types/expedition.ts:62](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L62)

***

### eliminatedIds

> **eliminatedIds**: `number`[]

Defined in: [types/expedition.ts:59](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L59)

***

### eliminationReasons

> **eliminationReasons**: `Record`\<`string`, `string`\>

Defined in: [types/expedition.ts:77](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L77)

***

### evidenceCharges

> **evidenceCharges**: [`EvidenceChargeState`](../../../expedition/evidenceFamilies/type-aliases/EvidenceChargeState.md)

Defined in: [types/expedition.ts:66](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L66)

***

### explanationFeedback

> **explanationFeedback**: `Record`\<`string`, `string`\>

Defined in: [types/expedition.ts:51](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L51)

***

### factLedger

> **factLedger**: [`PublicLedgerFact`](../../../lib/evidenceLadder/interfaces/PublicLedgerFact.md)[]

Defined in: [types/expedition.ts:79](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L79)

Live deduction between hard clues, in reveal order.

***

### guessResult

> **guessResult**: `"correct"` \| `"wrong"` \| `null`

Defined in: [types/expedition.ts:60](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L60)

***

### hintFeed

> **hintFeed**: `object`[]

Defined in: [types/expedition.ts:71](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L71)

#### family?

> `optional` **family**: `"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`

#### id

> **id**: `string`

#### kind

> **kind**: `"cascade"` \| `"evidence"` \| `"reinforce"`

#### text

> **text**: `string`

***

### hypotheses

> **hypotheses**: [`Hypotheses`](../../../lib/liveClaims/type-aliases/Hypotheses.md)

Defined in: [types/expedition.ts:50](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L50)

***

### lastFeedback

> **lastFeedback**: [`ComparisonResult`](../../../lib/deductionEngine/interfaces/ComparisonResult.md)[] \| `null`

Defined in: [types/expedition.ts:61](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L61)

***

### mapView

> **mapView**: [`ExpeditionMapView`](../../../expedition/mapView/interfaces/ExpeditionMapView.md) \| `null`

Defined in: [types/expedition.ts:52](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L52)

***

### mystery

> **mystery**: [`PublicMysteryCase`](../../../lib/mysteryCase/interfaces/PublicMysteryCase.md)

Defined in: [types/expedition.ts:53](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L53)

***

### nodeOutcomes

> **nodeOutcomes**: (`"met"` \| `"failed"` \| `null`)[]

Defined in: [types/expedition.ts:65](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L65)

***

### objectiveProgress

> **objectiveProgress**: `number`

Defined in: [types/expedition.ts:63](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L63)

***

### objectiveTarget

> **objectiveTarget**: `number`

Defined in: [types/expedition.ts:64](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L64)

***

### observations

> **observations**: [`EarnedObservation`](EarnedObservation.md)[]

Defined in: [types/expedition.ts:58](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L58)

***

### offeredFamilies

> **offeredFamilies**: (`"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`)[]

Defined in: [types/expedition.ts:68](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L68)

***

### profiles

> **profiles**: [`DeductionProfile`](../../../lib/deductionEngine/interfaces/DeductionProfile.md)[]

Defined in: [types/expedition.ts:57](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L57)

***

### selectedFamilies

> **selectedFamilies**: (`"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`)[]

Defined in: [types/expedition.ts:69](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L69)

***

### stage

> **stage**: [`CaseStage`](../../../expedition/caseFlow/type-aliases/CaseStage.md)

Defined in: [types/expedition.ts:55](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L55)

Sub-state of phase 'mystery': incident, board play, evidence choice/reveal, or final diagnosis.

***

### travelEntry

> **travelEntry**: `string` \| `null`

Defined in: [types/expedition.ts:70](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L70)

***

### version

> **version**: `4`

Defined in: [types/expedition.ts:48](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L48)
