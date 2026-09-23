# Function: getFieldSignalPayout()

> **getFieldSignalPayout**(`matchGemType`, `matchLength`, `isCascade`): [`FieldSignalPayout`](../interfaces/FieldSignalPayout.md) \| `null`

Defined in: [game/fieldSignal.ts:41](https://github.com/kc0588615/phaser-june/blob/main/src/game/fieldSignal.ts#L41)

What a match clearing the signal pays. The family is the *clearing match's* colour, not
the gem under the tile, so the player picks their intel by choosing what to match.

## Parameters

### matchGemType

`string` | `null` | `undefined`

### matchLength

`number`

### isCascade

`boolean`

## Returns

[`FieldSignalPayout`](../interfaces/FieldSignalPayout.md) \| `null`
