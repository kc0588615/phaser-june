# Interface: EventPayloads

Defined in: [src/game/EventBus.ts:29](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L29)

## Properties

### all-clues-revealed

> **all-clues-revealed**: `object`

Defined in: [src/game/EventBus.ts:79](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L79)

#### speciesId

> **speciesId**: `number`

***

### all-species-completed

> **all-species-completed**: `object`

Defined in: [src/game/EventBus.ts:82](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L82)

#### totalSpecies

> **totalSpecies**: `number`

***

### auth-user-ready

> **auth-user-ready**: `object`

Defined in: [src/game/EventBus.ts:132](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L132)

#### playerId

> **playerId**: `string`

#### sessionId?

> `optional` **sessionId**: `string`

***

### clue-revealed

> **clue-revealed**: [`CluePayload`](../../clueConfig/interfaces/CluePayload.md)

Defined in: [src/game/EventBus.ts:61](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L61)

***

### current-scene-ready

> **current-scene-ready**: `Scene`

Defined in: [src/game/EventBus.ts:30](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L30)

***

### evidence-move-resolved

> **evidence-move-resolved**: `object`

Defined in: [src/game/EventBus.ts:120](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L120)

#### boardCheckpoint

> **boardCheckpoint**: [`BoardCheckpointV1`](../../boardTypes/interfaces/BoardCheckpointV1.md)

#### cascadeCount

> **cascadeCount**: `number`

#### directClears

> **directClears**: [`EvidenceChargeState`](../../../expedition/evidenceFamilies/type-aliases/EvidenceChargeState.md)

#### directMatchFamilies

> **directMatchFamilies**: (`"behavior"` \| `"relatives"` \| `"body"` \| `"habits"` \| `"place"`)[]

#### moveNumber

> **moveNumber**: `number`

#### nodeIndex

> **nodeIndex**: `number`

***

### evidence-progress-committed

> **evidence-progress-committed**: `object`

Defined in: [src/game/EventBus.ts:128](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L128)

#### moveNumber

> **moveNumber**: `number`

#### nodeIndex

> **nodeIndex**: `number`

***

### expedition-data-ready

> **expedition-data-ready**: `object`

Defined in: [src/game/EventBus.ts:98](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L98)

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

Defined in: [src/game/EventBus.ts:107](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L107)

***

### field-note-dripped

> **field-note-dripped**: `object`

Defined in: [src/game/EventBus.ts:63](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L63)

Off-method 4+ match earned a fact about a public candidate (client-only).

#### categoryName

> **categoryName**: `string`

#### icon

> **icon**: `string`

#### nodeIndex

> **nodeIndex**: `number`

#### speciesId

> **speciesId**: `number`

#### speciesName

> **speciesName**: `string`

#### text

> **text**: `string`

***

### game-hud-updated

> **game-hud-updated**: `object`

Defined in: [src/game/EventBus.ts:88](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L88)

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

Defined in: [src/game/EventBus.ts:77](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L77)

***

### game-restart

> **game-restart**: `Record`\<`string`, `never`\>

Defined in: [src/game/EventBus.ts:97](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L97)

***

### map-location-selected

> **map-location-selected**: `object`

Defined in: [src/game/EventBus.ts:31](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L31)

#### activeAffinities?

> `optional` **activeAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

#### bestTargetMatchLength?

> `optional` **bestTargetMatchLength**: `number`

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

Public case candidates — the pool field-note drips draw from.

#### candidateSpecies?

> `optional` **candidateSpecies**: [`Species`](../../../types/database/interfaces/Species.md)[]

Full rows for those candidates (drips need clue fields; location species may not cover them).

#### caseVersion?

> `optional` **caseVersion**: `number`

Case snapshot version — verb rules apply to v2 only (v1 runs keep legacy counting).

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

#### objectiveGem?

> `optional` **objectiveGem**: `"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`

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

Defined in: [src/game/EventBus.ts:71](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L71)

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

Defined in: [src/game/EventBus.ts:78](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L78)

***

### node-advance-requested

> **node-advance-requested**: `object`

Defined in: [src/game/EventBus.ts:108](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L108)

#### nodeIndex

> **nodeIndex**: `number`

#### reason

> **reason**: `"victory"` \| `"escaped"`

#### source

> **source**: `"game"` \| `"panel"`

***

### node-complete

> **node-complete**: `object`

Defined in: [src/game/EventBus.ts:113](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L113)

#### nodeIndex

> **nodeIndex**: `number`

***

### node-objective-updated

> **node-objective-updated**: `object`

Defined in: [src/game/EventBus.ts:115](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L115)

#### bestTargetMatchLength

> **bestTargetMatchLength**: `number`

#### progress

> **progress**: `number`

#### target

> **target**: `number`

***

### route-progress-updated

> **route-progress-updated**: `object`

Defined in: [src/game/EventBus.ts:114](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L114)

#### slot

> **slot**: `number`

***

### show-species-list

> **show-species-list**: `object`

Defined in: [src/game/EventBus.ts:85](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/EventBus.ts#L85)

#### speciesId

> **speciesId**: `number`
