# Function: updateSessionProgress()

> **updateSessionProgress**(`sessionId`, `moves`, `score`, `speciesDiscovered`, `cluesUnlocked`): `Promise`\<`void`\>

Defined in: [src/lib/playerTracking.ts:191](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/playerTracking.ts#L191)

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
