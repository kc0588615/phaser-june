# Interface: EventPayloads

Defined in: [src/game/EventBus.ts:7](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L7)

## Properties

### all-clues-revealed

> **all-clues-revealed**: `object`

Defined in: [src/game/EventBus.ts:34](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L34)

#### speciesId

> **speciesId**: `number`

***

### all-species-completed

> **all-species-completed**: `object`

Defined in: [src/game/EventBus.ts:37](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L37)

#### totalSpecies

> **totalSpecies**: `number`

***

### cesium-location-selected

> **cesium-location-selected**: `object`

Defined in: [src/game/EventBus.ts:9](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L9)

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

### clue-revealed

> **clue-revealed**: [`CluePayload`](../../clueConfig/interfaces/CluePayload.md)

Defined in: [src/game/EventBus.ts:24](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L24)

***

### current-scene-ready

> **current-scene-ready**: `Scene`

Defined in: [src/game/EventBus.ts:8](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L8)

***

### game-hud-updated

> **game-hud-updated**: `object`

Defined in: [src/game/EventBus.ts:52](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L52)

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

### game-over

> **game-over**: `object`

Defined in: [src/game/EventBus.ts:20](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L20)

#### finalScore

> **finalScore**: `number`

#### habitats

> **habitats**: `string`[]

***

### game-reset

> **game-reset**: `undefined`

Defined in: [src/game/EventBus.ts:32](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L32)

***

### game-restart

> **game-restart**: `Record`\<`string`, `never`\>

Defined in: [src/game/EventBus.ts:61](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L61)

***

### game-score-updated

> **game-score-updated**: `object`

Defined in: [src/game/EventBus.ts:16](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L16)

#### movesRemaining

> **movesRemaining**: `number`

#### score

> **score**: `number`

***

### layout-changed

> **layout-changed**: `object`

Defined in: [src/game/EventBus.ts:40](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L40)

#### mapMinimized

> **mapMinimized**: `boolean`

***

### new-game-started

> **new-game-started**: `object`

Defined in: [src/game/EventBus.ts:25](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L25)

#### currentIndex

> **currentIndex**: `number`

#### hiddenSpeciesName?

> `optional` **hiddenSpeciesName**: `string`

#### speciesId

> **speciesId**: `number`

#### speciesName

> **speciesName**: `string`

#### totalSpecies

> **totalSpecies**: `number`

***

### no-species-found

> **no-species-found**: `object`

Defined in: [src/game/EventBus.ts:33](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L33)

***

### show-species-list

> **show-species-list**: `object`

Defined in: [src/game/EventBus.ts:49](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L49)

#### speciesId

> **speciesId**: `number`

***

### species-guess-submitted

> **species-guess-submitted**: `object`

Defined in: [src/game/EventBus.ts:43](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/game/EventBus.ts#L43)

#### actualName

> **actualName**: `string`

#### guessedName

> **guessedName**: `string`

#### isCorrect

> **isCorrect**: `boolean`

#### speciesId

> **speciesId**: `number`
