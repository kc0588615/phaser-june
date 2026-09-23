# Function: applyFieldSignalMatch()

> **applyFieldSignalMatch**(`board`, `matchGemType`, `matchLength`, `isCascade`): [`FieldSignalPayout`](../interfaces/FieldSignalPayout.md) \| `null`

Defined in: [phaser-june-039/src/game/fieldSignal.ts:65](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/fieldSignal.ts#L65)

Applies an adjacent match to the one live signal after board falls have settled.

## Parameters

### board

`FieldSignalBoard`

### matchGemType

`string` | `null` | `undefined`

### matchLength

`number`

### isCascade

`boolean`

## Returns

[`FieldSignalPayout`](../interfaces/FieldSignalPayout.md) \| `null`
