# Interface: EventPayloads

Defined in: [src/game/EventBus.ts:28](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L28)

## Properties

### all-clues-revealed

> **all-clues-revealed**: `object`

Defined in: [src/game/EventBus.ts:65](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L65)

#### speciesId

> **speciesId**: `number`

***

### all-species-completed

> **all-species-completed**: `object`

Defined in: [src/game/EventBus.ts:68](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L68)

#### totalSpecies

> **totalSpecies**: `number`

***

### auth-user-ready

> **auth-user-ready**: `object`

Defined in: [src/game/EventBus.ts:112](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L112)

#### playerId

> **playerId**: `string`

#### sessionId?

> `optional` **sessionId**: `string`

***

### clue-revealed

> **clue-revealed**: [`CluePayload`](../../clueConfig/interfaces/CluePayload.md)

Defined in: [src/game/EventBus.ts:56](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L56)

***

### current-scene-ready

> **current-scene-ready**: `Scene`

Defined in: [src/game/EventBus.ts:29](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L29)

***

### evidence-move-resolved

> **evidence-move-resolved**: `object`

Defined in: [src/game/EventBus.ts:100](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L100)

#### boardCheckpoint

> **boardCheckpoint**: [`BoardCheckpointV1`](../../boardTypes/interfaces/BoardCheckpointV1.md)

#### cascadeCount

> **cascadeCount**: `number`

#### directClears

> **directClears**: [`EvidenceChargeState`](../../../expedition/evidenceFamilies/type-aliases/EvidenceChargeState.md)

#### directMatchFamilies

> **directMatchFamilies**: (`"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`)[]

#### moveNumber

> **moveNumber**: `number`

#### nodeIndex

> **nodeIndex**: `number`

***

### evidence-progress-committed

> **evidence-progress-committed**: `object`

Defined in: [src/game/EventBus.ts:108](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L108)

#### moveNumber

> **moveNumber**: `number`

#### nodeIndex

> **nodeIndex**: `number`

***

### expedition-data-ready

> **expedition-data-ready**: `object`

Defined in: [src/game/EventBus.ts:84](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L84)

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

Defined in: [src/game/EventBus.ts:93](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L93)

***

### game-hud-updated

> **game-hud-updated**: `object`

Defined in: [src/game/EventBus.ts:74](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L74)

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

Defined in: [src/game/EventBus.ts:63](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L63)

***

### game-restart

> **game-restart**: `Record`\<`string`, `never`\>

Defined in: [src/game/EventBus.ts:83](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L83)

***

### map-location-selected

> **map-location-selected**: `object`

Defined in: [src/game/EventBus.ts:30](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L30)

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

***

### new-game-started

> **new-game-started**: `object`

Defined in: [src/game/EventBus.ts:57](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L57)

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

Defined in: [src/game/EventBus.ts:64](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L64)

***

### node-complete

> **node-complete**: `object`

Defined in: [src/game/EventBus.ts:94](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L94)

#### nodeIndex

> **nodeIndex**: `number`

***

### node-objective-updated

> **node-objective-updated**: `object`

Defined in: [src/game/EventBus.ts:96](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L96)

#### progress

> **progress**: `number`

#### target

> **target**: `number`

***

### route-progress-updated

> **route-progress-updated**: `object`

Defined in: [src/game/EventBus.ts:95](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L95)

#### slot

> **slot**: `number`

***

### show-species-list

> **show-species-list**: `object`

Defined in: [src/game/EventBus.ts:71](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/EventBus.ts#L71)

#### speciesId

> **speciesId**: `number`
