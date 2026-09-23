# Interface: EventPayloads

Defined in: [phaser-june-039/src/game/EventBus.ts:28](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L28)

## Properties

### all-species-completed

> **all-species-completed**: `object`

Defined in: [phaser-june-039/src/game/EventBus.ts:66](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L66)

#### totalSpecies

> **totalSpecies**: `number`

***

### auth-user-ready

> **auth-user-ready**: `object`

Defined in: [phaser-june-039/src/game/EventBus.ts:109](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L109)

#### playerId

> **playerId**: `string`

#### sessionId?

> `optional` **sessionId**: `string`

***

### current-scene-ready

> **current-scene-ready**: `Scene`

Defined in: [phaser-june-039/src/game/EventBus.ts:30](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L30)

***

### evidence-move-resolved

> **evidence-move-resolved**: `object`

Defined in: [phaser-june-039/src/game/EventBus.ts:98](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L98)

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

Defined in: [phaser-june-039/src/game/EventBus.ts:104](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L104)

#### moveNumber

> **moveNumber**: `number`

#### nodeIndex

> **nodeIndex**: `number`

***

### expedition-data-ready

> **expedition-data-ready**: `object`

Defined in: [phaser-june-039/src/game/EventBus.ts:82](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L82)

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

Defined in: [phaser-june-039/src/game/EventBus.ts:91](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L91)

***

### game-hud-updated

> **game-hud-updated**: `object`

Defined in: [phaser-june-039/src/game/EventBus.ts:72](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L72)

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

Defined in: [phaser-june-039/src/game/EventBus.ts:64](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L64)

***

### game-restart

> **game-restart**: `Record`\<`string`, `never`\>

Defined in: [phaser-june-039/src/game/EventBus.ts:81](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L81)

***

### map-location-selected

> **map-location-selected**: `object`

Defined in: [phaser-june-039/src/game/EventBus.ts:31](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L31)

#### activeAffinities?

> `optional` **activeAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

#### boardCheckpoint?

> `optional` **boardCheckpoint**: [`BoardCheckpointV1`](../../boardTypes/interfaces/BoardCheckpointV1.md)

#### boardConfig?

> `optional` **boardConfig**: [`BoardSpawnConfig`](../../../expedition/domain/interfaces/BoardSpawnConfig.md)

#### boardContext?

> `optional` **boardContext**: [`NodeBoardContext`](../../nodeObstacles/interfaces/NodeBoardContext.md)

#### boardSeed?

> `optional` **boardSeed**: `number`

#### candidateIds?

> `optional` **candidateIds**: `number`[]

Public case candidates.

#### candidateSpecies?

> `optional` **candidateSpecies**: [`Species`](../../../types/database/interfaces/Species.md)[]

Full rows for those candidates.

#### difficulty?

> `optional` **difficulty**: `number`

#### ecoregionId?

> `optional` **ecoregionId**: `number` \| `null`

#### events?

> `optional` **events**: `string`[]

#### habitats

> **habitats**: `string`[]

#### lat

> **lat**: `number`

#### lon

> **lon**: `number`

#### moveBudget?

> `optional` **moveBudget**: `number`

#### nodeIndex?

> `optional` **nodeIndex**: `number`

#### nodeType?

> `optional` **nodeType**: `string`

#### objectiveProgress?

> `optional` **objectiveProgress**: `number`

#### objectiveTarget?

> `optional` **objectiveTarget**: `number`

#### obstacleFamily?

> `optional` **obstacleFamily**: [`ObstacleFamily`](../../nodeObstacles/type-aliases/ObstacleFamily.md) \| `null`

#### obstacles?

> `optional` **obstacles**: (`"flow_shift"` \| `"mud_tiles"` \| `"overgrowth"` \| `"low_visibility"` \| `"junk_blockers"` \| `"noise_interference"` \| `"steep_terrain"` \| `"time_pressure"` \| `"signal_dropout"` \| `"unknown_terrain"` \| `"limited_signal"`)[]

#### rasterHabitats

> **rasterHabitats**: [`RasterHabitatResult`](../../../lib/speciesService/interfaces/RasterHabitatResult.md)[]

#### species

> **species**: [`Species`](../../../types/database/interfaces/Species.md)[]

#### terrain?

> `optional` **terrain**: [`TerrainSnapshot`](../../../terrain/terrain/type-aliases/TerrainSnapshot.md)

***

### new-game-started

> **new-game-started**: `object`

Defined in: [phaser-june-039/src/game/EventBus.ts:58](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L58)

#### currentIndex

> **currentIndex**: `number`

#### speciesId

> **speciesId**: `number`

#### speciesName

> **speciesName**: `string`

#### totalSpecies

> **totalSpecies**: `number`

***

### no-species-found

> **no-species-found**: `object`

Defined in: [phaser-june-039/src/game/EventBus.ts:65](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L65)

***

### node-complete

> **node-complete**: `object`

Defined in: [phaser-june-039/src/game/EventBus.ts:92](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L92)

#### nodeIndex

> **nodeIndex**: `number`

***

### node-objective-updated

> **node-objective-updated**: `object`

Defined in: [phaser-june-039/src/game/EventBus.ts:94](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L94)

#### progress

> **progress**: `number`

#### target

> **target**: `number`

***

### route-progress-updated

> **route-progress-updated**: `object`

Defined in: [phaser-june-039/src/game/EventBus.ts:93](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L93)

#### slot

> **slot**: `number`

***

### routing-state-updated

> **routing-state-updated**: [`PublicRoutingView`](../../../terrain/routing/interfaces/PublicRoutingView.md) \| `null`

Defined in: [phaser-june-039/src/game/EventBus.ts:108](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L108)

***

### show-species-list

> **show-species-list**: `object`

Defined in: [phaser-june-039/src/game/EventBus.ts:69](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L69)

#### speciesId

> **speciesId**: `number`

***

### terrain-cell-selected

> **terrain-cell-selected**: [`TerrainSelection`](../../../terrain/terrain/interfaces/TerrainSelection.md)

Defined in: [phaser-june-039/src/game/EventBus.ts:29](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/EventBus.ts#L29)
