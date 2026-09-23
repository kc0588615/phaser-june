# Function: preserveRunEvidenceHints()

> **preserveRunEvidenceHints**(`metadata`, `rows`): `Record`\<`string`, `unknown`\>

Defined in: [phaser-june-039/src/lib/preserveRunEvidenceHints.ts:5](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/preserveRunEvidenceHints.ts#L5)

Called under the session row lock, before the seed transaction changes any content.

## Parameters

### metadata

`unknown`

### rows

readonly [`EvidenceHintSnapshot`](../../evidenceHintSnapshot/interfaces/EvidenceHintSnapshot.md)[]

## Returns

`Record`\<`string`, `unknown`\>
