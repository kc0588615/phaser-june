# Function: projectRunForClient()

> **projectRunForClient**(`session`, `input`): [`ClientRunProjection`](../interfaces/ClientRunProjection.md)

Defined in: [lib/runProjection.ts:271](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L271)

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
