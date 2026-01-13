# Function: fetchPlayerStats()

> **fetchPlayerStats**(`options`): `Promise`\<[`PlayerStats`](../../../components/PlayerStatsDashboard/types/interfaces/PlayerStats.md) \| `null`\>

Defined in: [src/lib/playerStatsService.ts:63](https://github.com/kc0588615/phaser-june/blob/dc88a140368b29a3e7c30936b266fd46ea76c6ee/src/lib/playerStatsService.ts#L63)

Fetch player stats for the current authenticated user.
Auth is not configured yet, so this returns null.

## Parameters

### options

[`FetchPlayerStatsOptions`](../interfaces/FetchPlayerStatsOptions.md) = `...`

## Returns

`Promise`\<[`PlayerStats`](../../../components/PlayerStatsDashboard/types/interfaces/PlayerStats.md) \| `null`\>
