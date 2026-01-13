# Function: trackClueUnlock()

> **trackClueUnlock**(`playerId`, `speciesId`, `clueCategory`, `clueField`, `clueValue`, `discoveryId`): `Promise`\<`boolean` \| `null`\>

Defined in: [src/lib/playerTracking.ts:313](https://github.com/kc0588615/phaser-june/blob/dc88a140368b29a3e7c30936b266fd46ea76c6ee/src/lib/playerTracking.ts#L313)

Track a clue unlock event
Returns: true if newly unlocked, false if duplicate, null if error

## Parameters

### playerId

`string`

### speciesId

`number`

### clueCategory

`string`

### clueField

`string`

### clueValue

`string` | `null`

### discoveryId

`string` | `null`

## Returns

`Promise`\<`boolean` \| `null`\>
