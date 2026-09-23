# Interface: CaseState

Defined in: [phaser-june-039/src/types/expedition.ts:32](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L32)

## Properties

### candidateIds

> **candidateIds**: `number`[]

Defined in: [phaser-june-039/src/types/expedition.ts:41](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L41)

***

### carriedCharges

> **carriedCharges**: [`EvidenceChargeState`](../../../expedition/evidenceFamilies/type-aliases/EvidenceChargeState.md)

Defined in: [phaser-june-039/src/types/expedition.ts:52](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L52)

***

### claims

> **claims**: [`ClaimState`](../../../lib/liveClaims/interfaces/ClaimState.md)

Defined in: [phaser-june-039/src/types/expedition.ts:34](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L34)

***

### diagnosisFeedback

> **diagnosisFeedback**: [`DiagnosisFeedback`](../../../lib/mysteryCase/interfaces/DiagnosisFeedback.md) \| `null`

Defined in: [phaser-june-039/src/types/expedition.ts:47](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L47)

***

### eliminatedIds

> **eliminatedIds**: `number`[]

Defined in: [phaser-june-039/src/types/expedition.ts:44](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L44)

***

### eliminationReasons

> **eliminationReasons**: `Record`\<`string`, `string`\>

Defined in: [phaser-june-039/src/types/expedition.ts:62](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L62)

***

### evidenceCharges

> **evidenceCharges**: [`EvidenceChargeState`](../../../expedition/evidenceFamilies/type-aliases/EvidenceChargeState.md)

Defined in: [phaser-june-039/src/types/expedition.ts:51](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L51)

***

### explanationFeedback

> **explanationFeedback**: `Record`\<`string`, `string`\>

Defined in: [phaser-june-039/src/types/expedition.ts:36](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L36)

***

### factLedger

> **factLedger**: [`PublicLedgerFact`](../../../lib/evidenceLadder/interfaces/PublicLedgerFact.md)[]

Defined in: [phaser-june-039/src/types/expedition.ts:64](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L64)

Live deduction between hard clues, in reveal order.

***

### guessResult

> **guessResult**: `"wrong"` \| `"correct"` \| `null`

Defined in: [phaser-june-039/src/types/expedition.ts:45](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L45)

***

### hintFeed

> **hintFeed**: `object`[]

Defined in: [phaser-june-039/src/types/expedition.ts:56](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L56)

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

Defined in: [phaser-june-039/src/types/expedition.ts:35](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L35)

***

### lastFeedback

> **lastFeedback**: [`ComparisonResult`](../../../lib/deductionEngine/interfaces/ComparisonResult.md)[] \| `null`

Defined in: [phaser-june-039/src/types/expedition.ts:46](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L46)

***

### mapView

> **mapView**: [`ExpeditionMapView`](../../../expedition/mapView/interfaces/ExpeditionMapView.md) \| `null`

Defined in: [phaser-june-039/src/types/expedition.ts:37](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L37)

***

### mystery

> **mystery**: [`PublicMysteryCase`](../../../lib/mysteryCase/interfaces/PublicMysteryCase.md)

Defined in: [phaser-june-039/src/types/expedition.ts:38](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L38)

***

### nodeOutcomes

> **nodeOutcomes**: (`"met"` \| `"failed"` \| `null`)[]

Defined in: [phaser-june-039/src/types/expedition.ts:50](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L50)

***

### objectiveProgress

> **objectiveProgress**: `number`

Defined in: [phaser-june-039/src/types/expedition.ts:48](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L48)

***

### objectiveTarget

> **objectiveTarget**: `number`

Defined in: [phaser-june-039/src/types/expedition.ts:49](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L49)

***

### observations

> **observations**: [`EarnedObservation`](EarnedObservation.md)[]

Defined in: [phaser-june-039/src/types/expedition.ts:43](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L43)

***

### offeredFamilies

> **offeredFamilies**: (`"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`)[]

Defined in: [phaser-june-039/src/types/expedition.ts:53](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L53)

***

### profiles

> **profiles**: [`DeductionProfile`](../../../lib/deductionEngine/interfaces/DeductionProfile.md)[]

Defined in: [phaser-june-039/src/types/expedition.ts:42](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L42)

***

### selectedFamilies

> **selectedFamilies**: (`"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`)[]

Defined in: [phaser-june-039/src/types/expedition.ts:54](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L54)

***

### stage

> **stage**: [`CaseStage`](../../../expedition/caseFlow/type-aliases/CaseStage.md)

Defined in: [phaser-june-039/src/types/expedition.ts:40](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L40)

Sub-state of phase 'mystery': incident, board play, evidence choice/reveal, or final diagnosis.

***

### travelEntry

> **travelEntry**: `string` \| `null`

Defined in: [phaser-june-039/src/types/expedition.ts:55](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L55)

***

### version

> **version**: `4`

Defined in: [phaser-june-039/src/types/expedition.ts:33](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L33)
