# Function: buildAnswerPrior()

> **buildAnswerPrior**(`species`, `anchors`): `Map`\<`number`, `number`\>

Defined in: [src/lib/answerPrior.ts:24](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/answerPrior.ts#L24)

Builds a soft, answer-independent location prior. Every candidate retains a
non-zero chance; GIS context influences selection but never proves identity.

## Parameters

### species

readonly [`AnswerPriorSpecies`](../interfaces/AnswerPriorSpecies.md)[]

### anchors

readonly [`AnswerPriorAnchor`](../interfaces/AnswerPriorAnchor.md)[]

## Returns

`Map`\<`number`, `number`\>
