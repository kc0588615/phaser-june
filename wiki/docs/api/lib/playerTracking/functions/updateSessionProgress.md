# Function: updateSessionProgress()

> **updateSessionProgress**(`sessionId`, `moves`, `score`, `speciesDiscovered`, `cluesUnlocked`): `Promise`\<`void`\>

Defined in: [src/lib/playerTracking.ts:191](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/playerTracking.ts#L191)

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
