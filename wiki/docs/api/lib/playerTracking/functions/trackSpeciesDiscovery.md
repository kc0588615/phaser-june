# Function: trackSpeciesDiscovery()

> **trackSpeciesDiscovery**(`playerId`, `speciesId`, `options`): `Promise`\<`string` \| `null`\>

Defined in: [src/lib/playerTracking.ts:368](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/lib/playerTracking.ts#L368)

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
