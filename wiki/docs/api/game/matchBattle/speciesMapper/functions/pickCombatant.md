# Function: pickCombatant()

> **pickCombatant**(`combatants`, `nodeType`, `nodeIndex`): [`SpeciesCombatInput`](../interfaces/SpeciesCombatInput.md) \| `null`

Defined in: [src/game/matchBattle/speciesMapper.ts:105](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/matchBattle/speciesMapper.ts#L105)

Deterministic species pick per combat node. Leaders get the highest-tier
species, elites the next band down, regular encounters cycle the rest by
node index. Returns null when no combatants are available (caller falls
back to the generic createEnemy()).

## Parameters

### combatants

[`SpeciesCombatInput`](../interfaces/SpeciesCombatInput.md)[]

### nodeType

[`MatchBattleNodeType`](../../types/type-aliases/MatchBattleNodeType.md)

### nodeIndex

`number`

## Returns

[`SpeciesCombatInput`](../interfaces/SpeciesCombatInput.md) \| `null`
