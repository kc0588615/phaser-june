# Function: updateBestTargetMatchLength()

> **updateBestTargetMatchLength**(`current`, `matchLength`, `isTargetMethod`, `isDirect`): `number`

Defined in: [src/expedition/evidenceQuality.ts:28](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/expedition/evidenceQuality.ts#L28)

Called for every match group; only direct-resolution (first-swap) target
 groups update sampling quality — cascades count for progress, not tier.

## Parameters

### current

`number`

### matchLength

`number`

### isTargetMethod

`boolean`

### isDirect

`boolean`

## Returns

`number`
