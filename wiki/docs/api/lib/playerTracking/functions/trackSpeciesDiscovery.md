# Function: trackSpeciesDiscovery()

> **trackSpeciesDiscovery**(`playerId`, `speciesId`, `options`): `Promise`\<`string` \| `null`\>

Defined in: [src/lib/playerTracking.ts:370](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/lib/playerTracking.ts#L370)

Track a species discovery
Links all pending clues to this discovery

## Parameters

### playerId

`string`

### speciesId

`number`

### options

#### cluesUnlockedBeforeGuess

`number`

#### incorrectGuessesCount

`number`

#### scoreEarned

`number`

#### sessionId?

`string`

#### timeToDiscoverSeconds?

`number`

## Returns

`Promise`\<`string` \| `null`\>
