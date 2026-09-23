# Function: projectRunForClient()

> **projectRunForClient**(`session`, `input`): [`ClientRunProjection`](../interfaces/ClientRunProjection.md)

Defined in: [phaser-june-039/src/lib/runProjection.ts:283](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L283)

Builds the only run shape that API adapters may serialize.

The projection deliberately does not spread the session or its metadata.
New public fields must be added to an explicit projector below.

## Parameters

### session

[`RunProjectionSource`](../interfaces/RunProjectionSource.md)

### input

[`RunProjectionInput`](../interfaces/RunProjectionInput.md) = `{}`

## Returns

[`ClientRunProjection`](../interfaces/ClientRunProjection.md)
