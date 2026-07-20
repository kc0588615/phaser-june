# Function: hydrateObservation()

> **hydrateObservation**(`card`, `nodeIndex`, `qualityTier?`): `object`

Defined in: [src/lib/runCaseState.ts:451](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runCaseState.ts#L451)

## Parameters

### card

[`EvidenceCardContent`](../interfaces/EvidenceCardContent.md)

### nodeIndex

`number`

### qualityTier?

[`EvidenceQualityTier`](../../../expedition/evidenceQuality/type-aliases/EvidenceQualityTier.md)

## Returns

`object`

### compareTag

> **compareTag**: `string` = `card.compareTag`

### inferenceText

> **inferenceText**: `string` = `card.inferenceText`

### isSignature

> **isSignature**: `boolean` = `card.isSignature`

### method

> **method**: `"track"` \| `"observe"` \| `"listen"` \| `"survey"` \| `"analyze"` = `card.method`

### observationText

> **observationText**: `string` = `card.observationText`

### qualityTier?

> `optional` **qualityTier**: [`EvidenceQualityTier`](../../../expedition/evidenceQuality/type-aliases/EvidenceQualityTier.md)

### ref

> **ref**: `string`

### traitCategory

> **traitCategory**: `"habitat"` \| `"morphology"` \| `"diet"` \| `"behavior"` \| `"reproduction"` \| `"taxonomy"` \| `"key_fact"` \| `"geography"` \| `"conservation"` = `card.traitCategory`
