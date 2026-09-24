# Interface: EventPayloads

Defined in: [game/EventBus.ts:28](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L28)

## Properties

### auth-user-ready

> **auth-user-ready**: `object`

Defined in: [game/EventBus.ts:81](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L81)

#### playerId

> **playerId**: `string`

#### sessionId?

> `optional` **sessionId**: `string`

***

### current-scene-ready

> **current-scene-ready**: `Scene`

Defined in: [game/EventBus.ts:30](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L30)

***

### evidence-move-resolved

> **evidence-move-resolved**: `object`

Defined in: [game/EventBus.ts:70](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L70)

#### boardCheckpoint

> **boardCheckpoint**: [`BoardCheckpointV1`](../../boardTypes/interfaces/BoardCheckpointV1.md)

#### move

> **move**: `object`

##### move.amount

> **amount**: `number`

##### move.index

> **index**: `number`

##### move.rowOrCol

> **rowOrCol**: `"row"` \| `"col"`

#### moveNumber

> **moveNumber**: `number`

#### nodeIndex

> **nodeIndex**: `number`

***

### evidence-progress-committed

> **evidence-progress-committed**: `object`

Defined in: [game/EventBus.ts:76](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L76)

#### moveNumber

> **moveNumber**: `number`

#### nodeIndex

> **nodeIndex**: `number`

***

### expedition-data-ready

> **expedition-data-ready**: `object`

Defined in: [game/EventBus.ts:54](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L54)

#### ecoregionId?

> `optional` **ecoregionId**: `number` \| `null`

#### expedition

> **expedition**: [`ExpeditionData`](../../../types/expedition/interfaces/ExpeditionData.md)

#### featureFingerprints?

> `optional` **featureFingerprints**: [`FeatureFingerprint`](../../../types/gis/interfaces/FeatureFingerprint.md)[]

#### habitats

> **habitats**: `string`[]

#### lat

> **lat**: `number`

#### lon

> **lon**: `number`

#### rasterHabitats

> **rasterHabitats**: [`RasterHabitatResult`](../../../lib/speciesService/interfaces/RasterHabitatResult.md)[]

#### species

> **species**: [`Species`](../../../types/database/interfaces/Species.md)[]

***

### expedition-start

> **expedition-start**: `Record`\<`string`, `never`\>

Defined in: [game/EventBus.ts:63](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L63)

***

### game-hud-updated

> **game-hud-updated**: `object`

Defined in: [game/EventBus.ts:45](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L45)

#### maxMoves

> **maxMoves**: `number`

#### moveMultiplier?

> `optional` **moveMultiplier**: `number`

#### movesRemaining

> **movesRemaining**: `number`

#### movesUsed

> **movesUsed**: `number`

#### multiplier

> **multiplier**: `number`

#### score

> **score**: `number`

#### streak

> **streak**: `number`

***

### game-reset

> **game-reset**: `undefined`

Defined in: [game/EventBus.ts:44](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L44)

***

### map-location-selected

> **map-location-selected**: `object`

Defined in: [game/EventBus.ts:32](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L32)

Board setup for one node; Game.ts reads only these fields.

#### boardCheckpoint?

> `optional` **boardCheckpoint**: [`BoardCheckpointV1`](../../boardTypes/interfaces/BoardCheckpointV1.md)

#### boardConfig?

> `optional` **boardConfig**: [`BoardSpawnConfig`](../../../expedition/domain/interfaces/BoardSpawnConfig.md)

#### boardContext?

> `optional` **boardContext**: [`NodeBoardContext`](../../nodeObstacles/interfaces/NodeBoardContext.md)

#### boardSeed?

> `optional` **boardSeed**: `number`

#### difficulty?

> `optional` **difficulty**: `number`

#### moveBudget?

> `optional` **moveBudget**: `number`

#### nodeIndex?

> `optional` **nodeIndex**: `number`

#### objectiveProgress?

> `optional` **objectiveProgress**: `number`

#### obstacles?

> `optional` **obstacles**: (`"flow_shift"` \| `"mud_tiles"` \| `"overgrowth"` \| `"low_visibility"` \| `"junk_blockers"` \| `"noise_interference"` \| `"steep_terrain"` \| `"time_pressure"` \| `"signal_dropout"` \| `"unknown_terrain"` \| `"limited_signal"`)[]

#### terrain?

> `optional` **terrain**: [`TerrainSnapshot`](../../../terrain/terrain/type-aliases/TerrainSnapshot.md)

***

### node-complete

> **node-complete**: `object`

Defined in: [game/EventBus.ts:64](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L64)

#### nodeIndex

> **nodeIndex**: `number`

***

### node-objective-updated

> **node-objective-updated**: `object`

Defined in: [game/EventBus.ts:66](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L66)

#### progress

> **progress**: `number`

#### target

> **target**: `number`

***

### route-progress-updated

> **route-progress-updated**: `object`

Defined in: [game/EventBus.ts:65](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L65)

#### slot

> **slot**: `number`

***

### routing-state-updated

> **routing-state-updated**: [`PublicRoutingView`](../../../terrain/routing/interfaces/PublicRoutingView.md) \| `null`

Defined in: [game/EventBus.ts:80](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L80)

***

### terrain-cell-selected

> **terrain-cell-selected**: [`TerrainSelection`](../../../terrain/terrain/interfaces/TerrainSelection.md)

Defined in: [game/EventBus.ts:29](https://github.com/kc0588615/phaser-june/blob/main/src/game/EventBus.ts#L29)
