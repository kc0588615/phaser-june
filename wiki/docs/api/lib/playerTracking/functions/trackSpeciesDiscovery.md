# Function: trackSpeciesDiscovery()

> **trackSpeciesDiscovery**(`playerId`, `speciesId`, `options`): `Promise`\<`string` \| `null`\>

Defined in: [src/lib/playerTracking.ts:358](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/lib/playerTracking.ts#L358)

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
