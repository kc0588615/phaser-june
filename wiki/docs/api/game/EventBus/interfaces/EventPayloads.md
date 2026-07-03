# Interface: EventPayloads

Defined in: [src/game/EventBus.ts:15](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L15)

## Properties

### all-clues-revealed

> **all-clues-revealed**: `object`

Defined in: [src/game/EventBus.ts:59](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L59)

#### speciesId

> **speciesId**: `number`

***

### all-species-completed

> **all-species-completed**: `object`

Defined in: [src/game/EventBus.ts:62](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L62)

#### totalSpecies

> **totalSpecies**: `number`

***

### auth-user-ready

> **auth-user-ready**: `object`

Defined in: [src/game/EventBus.ts:111](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L111)

#### playerId

> **playerId**: `string`

#### sessionId?

> `optional` **sessionId**: `string`

***

### cesium-location-selected

> **cesium-location-selected**: `object`

Defined in: [src/game/EventBus.ts:17](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L17)

#### activeAffinities?

> `optional` **activeAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

#### boardConfig?

> `optional` **boardConfig**: [`BoardSpawnConfig`](../../../expedition/domain/interfaces/BoardSpawnConfig.md)

#### boardContext?

> `optional` **boardContext**: [`NodeBoardContext`](../../nodeObstacles/interfaces/NodeBoardContext.md)

#### counterGem?

> `optional` **counterGem**: `"sword"` \| `"staff"` \| `"shield"` \| `"key"` \| `"crate"` \| `"power"` \| `"thought"` \| `"multiplier"` \| `"grenade"` \| `"blade_drive"` \| `"caltrops"` \| `"shield_unit"` \| `null`

#### difficulty?

> `optional` **difficulty**: `number`

#### ecoregionId?

> `optional` **ecoregionId**: `number` \| `null`

#### habitats

> **habitats**: `string`[]

#### lat

> **lat**: `number`

#### lon

> **lon**: `number`

#### matchBattleArmaments?

> `optional` **matchBattleArmaments**: [`ArmamentDef`](../../matchBattle/types/interfaces/ArmamentDef.md)[]

#### matchBattleCombat?

> `optional` **matchBattleCombat**: [`MatchBattleCombatState`](../../matchBattle/types/interfaces/MatchBattleCombatState.md)

#### matchBattleCombatants?

> `optional` **matchBattleCombatants**: [`SpeciesCombatInput`](../../matchBattle/speciesMapper/interfaces/SpeciesCombatInput.md)[]

#### matchBattleConfig?

> `optional` **matchBattleConfig**: [`MatchBattleBoardConfig`](../../matchBattle/types/interfaces/MatchBattleBoardConfig.md)

#### matchBattleNodeType?

> `optional` **matchBattleNodeType**: [`MatchBattleNodeType`](../../matchBattle/types/type-aliases/MatchBattleNodeType.md)

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

#### requiredGems?

> `optional` **requiredGems**: (`"sword"` \| `"staff"` \| `"shield"` \| `"key"` \| `"crate"` \| `"power"` \| `"thought"` \| `"multiplier"` \| `"grenade"` \| `"blade_drive"` \| `"caltrops"` \| `"shield_unit"` \| `"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]

#### species

> **species**: [`Species`](../../../types/database/interfaces/Species.md)[]

***

### clue-revealed

> **clue-revealed**: [`CluePayload`](../../clueConfig/interfaces/CluePayload.md)

Defined in: [src/game/EventBus.ts:49](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L49)

***

### current-scene-ready

> **current-scene-ready**: `Scene`

Defined in: [src/game/EventBus.ts:16](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L16)

***

### deduction-camp-purchase

> **deduction-camp-purchase**: `object`

Defined in: [src/game/EventBus.ts:110](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L110)

#### category

> **category**: [`ClueCategoryKey`](../../../types/expedition/type-aliases/ClueCategoryKey.md)

#### cost

> **cost**: `number`

***

### expedition-data-ready

> **expedition-data-ready**: `object`

Defined in: [src/game/EventBus.ts:82](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L82)

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

Defined in: [src/game/EventBus.ts:91](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L91)

***

### game-hud-updated

> **game-hud-updated**: `object`

Defined in: [src/game/EventBus.ts:74](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L74)

#### moveMultiplier?

> `optional` **moveMultiplier**: `number`

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

Defined in: [src/game/EventBus.ts:45](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L45)

#### finalScore

> **finalScore**: `number`

#### habitats

> **habitats**: `string`[]

***

### game-reset

> **game-reset**: `undefined`

Defined in: [src/game/EventBus.ts:57](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L57)

***

### game-restart

> **game-restart**: `Record`\<`string`, `never`\>

Defined in: [src/game/EventBus.ts:81](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L81)

***

### game-score-updated

> **game-score-updated**: `object`

Defined in: [src/game/EventBus.ts:42](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L42)

#### score

> **score**: `number`

***

### match-battle-combat-ended

> **match-battle-combat-ended**: `object`

Defined in: [src/game/EventBus.ts:93](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L93)

#### cleanCapture

> **cleanCapture**: `boolean`

#### combat

> **combat**: [`MatchBattleCombatState`](../../matchBattle/types/interfaces/MatchBattleCombatState.md)

#### nodeIndex

> **nodeIndex**: `number`

#### outcome

> **outcome**: `"won"` \| `"lost"`

#### scoreDelta

> **scoreDelta**: `number`

***

### match-battle-combat-state-updated

> **match-battle-combat-state-updated**: [`MatchBattleCombatState`](../../matchBattle/types/interfaces/MatchBattleCombatState.md)

Defined in: [src/game/EventBus.ts:92](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L92)

***

### match-battle-reward-draft-opened

> **match-battle-reward-draft-opened**: `object`

Defined in: [src/game/EventBus.ts:94](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L94)

#### options

> **options**: [`RewardOption`](../../matchBattle/types/type-aliases/RewardOption.md)[]

***

### match-battle-route-node-selected

> **match-battle-route-node-selected**: `object`

Defined in: [src/game/EventBus.ts:95](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L95)

#### routeNodeId

> **routeNodeId**: `string`

***

### match-battle-run-ended

> **match-battle-run-ended**: `object`

Defined in: [src/game/EventBus.ts:96](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L96)

#### outcome

> **outcome**: `"won"` \| `"lost"`

***

### new-game-started

> **new-game-started**: `object`

Defined in: [src/game/EventBus.ts:50](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L50)

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

Defined in: [src/game/EventBus.ts:58](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L58)

***

### node-advance-requested

> **node-advance-requested**: `object`

Defined in: [src/game/EventBus.ts:97](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L97)

#### nodeIndex

> **nodeIndex**: `number`

#### reason

> **reason**: `"objective_complete"` \| `"analysis_complete"` \| `"victory"` \| `"retreat"` \| `"escaped"`

#### source

> **source**: `"game"` \| `"panel"`

***

### node-complete

> **node-complete**: `object`

Defined in: [src/game/EventBus.ts:102](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L102)

#### nodeIndex

> **nodeIndex**: `number`

***

### node-objective-updated

> **node-objective-updated**: `object`

Defined in: [src/game/EventBus.ts:103](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L103)

#### activeAffinities?

> `optional` **activeAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

#### counterGem?

> `optional` **counterGem**: `"sword"` \| `"staff"` \| `"shield"` \| `"key"` \| `"crate"` \| `"power"` \| `"thought"` \| `"multiplier"` \| `"grenade"` \| `"blade_drive"` \| `"caltrops"` \| `"shield_unit"` \| `null`

#### progress

> **progress**: `number`

#### requiredGems

> **requiredGems**: (`"sword"` \| `"staff"` \| `"shield"` \| `"key"` \| `"crate"` \| `"power"` \| `"thought"` \| `"multiplier"` \| `"grenade"` \| `"blade_drive"` \| `"caltrops"` \| `"shield_unit"` \| `"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]

#### target

> **target**: `number`

***

### show-species-list

> **show-species-list**: `object`

Defined in: [src/game/EventBus.ts:71](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L71)

#### speciesId

> **speciesId**: `number`

***

### species-guess-submitted

> **species-guess-submitted**: `object`

Defined in: [src/game/EventBus.ts:65](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/EventBus.ts#L65)

#### actualName

> **actualName**: `string`

#### guessedName

> **guessedName**: `string`

#### isCorrect

> **isCorrect**: `boolean`

#### speciesId

> **speciesId**: `number`
