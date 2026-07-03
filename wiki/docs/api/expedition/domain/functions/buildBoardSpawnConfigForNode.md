# Function: buildBoardSpawnConfigForNode()

> **buildBoardSpawnConfigForNode**(`nodeType`, `counterGem`, `actionBias`, `activeAffinities`): [`BoardSpawnConfig`](../interfaces/BoardSpawnConfig.md)

Defined in: [src/expedition/domain.ts:503](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/expedition/domain.ts#L503)

## Parameters

### nodeType

`string`

### counterGem

`"sword"` | `"staff"` | `"shield"` | `"key"` | `"crate"` | `"power"` | `"thought"` | `"multiplier"` | `"grenade"` | `"blade_drive"` | `"caltrops"` | `"shield_unit"` | `null`

### actionBias

`Partial`\<`Record`\<[`ActionGemType`](../type-aliases/ActionGemType.md), `number`\>\> = `{}`

### activeAffinities

(`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[] = `[]`

## Returns

[`BoardSpawnConfig`](../interfaces/BoardSpawnConfig.md)
