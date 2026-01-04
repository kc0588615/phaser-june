# Function: trackClueUnlock()

> **trackClueUnlock**(`playerId`, `speciesId`, `clueCategory`, `clueField`, `clueValue`, `discoveryId`): `Promise`\<`boolean` \| `null`\>

Defined in: [src/lib/playerTracking.ts:297](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/lib/playerTracking.ts#L297)

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
