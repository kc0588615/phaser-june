# Function: updateSessionProgress()

> **updateSessionProgress**(`sessionId`, `moves`, `score`, `speciesDiscovered`, `cluesUnlocked`): `Promise`\<`void`\>

Defined in: [src/lib/playerTracking.ts:219](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/lib/playerTracking.ts#L219)

Update session progress (DEBOUNCED)
Batches rapid updates to reduce database load

## Parameters

### sessionId

`string`

### moves

`number`

### score

`number`

### speciesDiscovered

`number`

### cluesUnlocked

`number`

## Returns

`Promise`\<`void`\>
