# Function: trackClueUnlock()

> **trackClueUnlock**(`playerId`, `speciesId`, `clueCategory`, `clueField`, `clueValue`, `discoveryId`): `Promise`\<`boolean` \| `null`\>

Defined in: [src/lib/playerTracking.ts:262](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/lib/playerTracking.ts#L262)

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
