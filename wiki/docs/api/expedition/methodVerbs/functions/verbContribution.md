# Function: verbContribution()

> **verbContribution**(`method`, `matchLength`, `context`): `number`

Defined in: [src/expedition/methodVerbs.ts:99](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/expedition/methodVerbs.ts#L99)

Progress contribution of one method-color match group under the method's
verb. Returns 0 when the group does not count. Off-method groups must be
filtered out by the caller.

## Parameters

### method

`"track"` | `"observe"` | `"listen"` | `"survey"` | `"analyze"`

### matchLength

`number`

### context

[`VerbMatchContext`](../interfaces/VerbMatchContext.md)

## Returns

`number`
