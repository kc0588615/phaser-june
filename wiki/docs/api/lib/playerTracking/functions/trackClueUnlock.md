# Function: trackClueUnlock()

> **trackClueUnlock**(`playerId`, `speciesId`, `clueCategory`, `clueField`, `clueValue`, `discoveryId`): `Promise`\<`boolean` \| `null`\>

Defined in: [src/lib/playerTracking.ts:260](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/playerTracking.ts#L260)

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
