# Function: updateSessionProgress()

> **updateSessionProgress**(`sessionId`, `moves`, `score`, `speciesDiscovered`, `cluesUnlocked`): `Promise`\<`void`\>

Defined in: [src/lib/playerTracking.ts:193](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/lib/playerTracking.ts#L193)

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
