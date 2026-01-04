# Function: fetchPlayerStats()

> **fetchPlayerStats**(`options`): `Promise`\<[`PlayerStats`](../../../components/PlayerStatsDashboard/types/interfaces/PlayerStats.md) \| `null`\>

Defined in: [src/lib/playerStatsService.ts:64](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/lib/playerStatsService.ts#L64)

Fetch player stats for the current authenticated user
NOTE: Uses Supabase auth temporarily (will migrate to Clerk in Phase 4)

## Parameters

### options

[`FetchPlayerStatsOptions`](../interfaces/FetchPlayerStatsOptions.md) = `...`

## Returns

`Promise`\<[`PlayerStats`](../../../components/PlayerStatsDashboard/types/interfaces/PlayerStats.md) \| `null`\>
