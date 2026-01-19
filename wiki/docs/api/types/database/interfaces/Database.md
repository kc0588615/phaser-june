# Interface: Database

Defined in: [src/types/database.ts:182](https://github.com/kc0588615/phaser-june/blob/faa14c00324626a166934fb4b850bcca3146ae62/src/types/database.ts#L182)

## Properties

### public

> **public**: `object`

Defined in: [src/types/database.ts:183](https://github.com/kc0588615/phaser-june/blob/faa14c00324626a166934fb4b850bcca3146ae62/src/types/database.ts#L183)

#### Tables

> **Tables**: `object`

##### Tables.high\_scores

> **high\_scores**: `object`

##### Tables.high\_scores.Insert

> **Insert**: `Omit`\<[`HighScore`](HighScore.md), `"id"` \| `"created_at"`\>

##### Tables.high\_scores.Row

> **Row**: [`HighScore`](HighScore.md)

##### Tables.high\_scores.Update

> **Update**: `Partial`\<`Omit`\<[`HighScore`](HighScore.md), `"id"` \| `"created_at"`\>\>

##### Tables.icaa

> **icaa**: `object`

##### Tables.icaa.Insert

> **Insert**: `Omit`\<[`Species`](Species.md), `"ogc_fid"`\>

##### Tables.icaa.Row

> **Row**: [`Species`](Species.md)

##### Tables.icaa.Update

> **Update**: `Partial`\<`Omit`\<[`Species`](Species.md), `"ogc_fid"`\>\>

##### Tables.player\_clue\_unlocks

> **player\_clue\_unlocks**: `object`

##### Tables.player\_clue\_unlocks.Insert

> **Insert**: `Omit`\<[`PlayerClueUnlock`](PlayerClueUnlock.md), `"id"` \| `"unlocked_at"`\>

##### Tables.player\_clue\_unlocks.Row

> **Row**: [`PlayerClueUnlock`](PlayerClueUnlock.md)

##### Tables.player\_clue\_unlocks.Update

> **Update**: `Partial`\<`Omit`\<[`PlayerClueUnlock`](PlayerClueUnlock.md), `"id"` \| `"player_id"` \| `"unlocked_at"`\>\>

##### Tables.player\_game\_sessions

> **player\_game\_sessions**: `object`

##### Tables.player\_game\_sessions.Insert

> **Insert**: `Omit`\<[`PlayerGameSession`](PlayerGameSession.md), `"id"` \| `"created_at"`\>

##### Tables.player\_game\_sessions.Row

> **Row**: [`PlayerGameSession`](PlayerGameSession.md)

##### Tables.player\_game\_sessions.Update

> **Update**: `Partial`\<`Omit`\<[`PlayerGameSession`](PlayerGameSession.md), `"id"` \| `"player_id"` \| `"created_at"`\>\>

##### Tables.player\_species\_discoveries

> **player\_species\_discoveries**: `object`

##### Tables.player\_species\_discoveries.Insert

> **Insert**: `Omit`\<[`PlayerSpeciesDiscovery`](PlayerSpeciesDiscovery.md), `"id"` \| `"discovered_at"`\>

##### Tables.player\_species\_discoveries.Row

> **Row**: [`PlayerSpeciesDiscovery`](PlayerSpeciesDiscovery.md)

##### Tables.player\_species\_discoveries.Update

> **Update**: `Partial`\<`Omit`\<[`PlayerSpeciesDiscovery`](PlayerSpeciesDiscovery.md), `"id"` \| `"player_id"` \| `"species_id"` \| `"discovered_at"`\>\>

##### Tables.player\_stats

> **player\_stats**: `object`

##### Tables.player\_stats.Insert

> **Insert**: `Omit`\<[`PlayerStats`](PlayerStats.md), `"created_at"` \| `"updated_at"`\>

##### Tables.player\_stats.Row

> **Row**: [`PlayerStats`](PlayerStats.md)

##### Tables.player\_stats.Update

> **Update**: `Partial`\<`Omit`\<[`PlayerStats`](PlayerStats.md), `"player_id"` \| `"created_at"` \| `"updated_at"`\>\>

##### Tables.profiles

> **profiles**: `object`

##### Tables.profiles.Insert

> **Insert**: `Omit`\<[`Profile`](Profile.md), `"created_at"` \| `"updated_at"`\>

##### Tables.profiles.Row

> **Row**: [`Profile`](Profile.md)

##### Tables.profiles.Update

> **Update**: `Partial`\<`Omit`\<[`Profile`](Profile.md), `"user_id"` \| `"created_at"` \| `"updated_at"`\>\>

#### Views

> **Views**: `object`

##### Views.player\_leaderboard

> **player\_leaderboard**: `object`

##### Views.player\_leaderboard.Row

> **Row**: [`PlayerLeaderboard`](PlayerLeaderboard.md)

##### Views.top\_scores

> **top\_scores**: `object`

##### Views.top\_scores.Row

> **Row**: [`HighScore`](HighScore.md) & `object`

###### Type Declaration

###### rank

> **rank**: `number`
