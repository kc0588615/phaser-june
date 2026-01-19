# Function: refreshPlayerStats()

> **refreshPlayerStats**(`playerId`): `Promise`\<`boolean`\>

Defined in: [src/lib/playerTracking.ts:523](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/lib/playerTracking.ts#L523)

Refresh player_stats from source tables (player_species_discoveries, player_clue_unlocks)
Uses upsert to create or update the stats row.

## Parameters

### playerId

`string`

## Returns

`Promise`\<`boolean`\>
