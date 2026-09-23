# Function: buildAnswerPrior()

> **buildAnswerPrior**(`species`, `anchors`): `Map`\<`number`, `number`\>

Defined in: [phaser-june-039/src/lib/answerPrior.ts:24](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/answerPrior.ts#L24)

Builds a soft, answer-independent location prior. Every candidate retains a
non-zero chance; GIS context influences selection but never proves identity.

## Parameters

### species

readonly [`AnswerPriorSpecies`](../interfaces/AnswerPriorSpecies.md)[]

### anchors

readonly [`AnswerPriorAnchor`](../interfaces/AnswerPriorAnchor.md)[]

## Returns

`Map`\<`number`, `number`\>
