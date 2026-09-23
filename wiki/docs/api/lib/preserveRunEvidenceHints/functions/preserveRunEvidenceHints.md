# Function: preserveRunEvidenceHints()

> **preserveRunEvidenceHints**(`metadata`, `rows`): `Record`\<`string`, `unknown`\>

Defined in: [lib/preserveRunEvidenceHints.ts:5](https://github.com/kc0588615/phaser-june/blob/main/src/lib/preserveRunEvidenceHints.ts#L5)

Called under the session row lock, before the seed transaction changes any content.

## Parameters

### metadata

`unknown`

### rows

readonly [`EvidenceHintSnapshot`](../../evidenceHintSnapshot/interfaces/EvidenceHintSnapshot.md)[]

## Returns

`Record`\<`string`, `unknown`\>
