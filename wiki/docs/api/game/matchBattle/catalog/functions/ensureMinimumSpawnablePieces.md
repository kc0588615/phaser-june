# Function: ensureMinimumSpawnablePieces()

> **ensureMinimumSpawnablePieces**(`pool`): [`PiecePoolEntry`](../../types/interfaces/PiecePoolEntry.md)[]

Defined in: [src/game/matchBattle/catalog.ts:119](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/matchBattle/catalog.ts#L119)

Guarantee at least MIN_SPAWNABLE_PIECES positive-weight entries by restoring starter pieces.
Repairs corrupt/legacy persisted pools so board generation cannot break. Valid pools pass through unchanged.

## Parameters

### pool

[`PiecePoolEntry`](../../types/interfaces/PiecePoolEntry.md)[]

## Returns

[`PiecePoolEntry`](../../types/interfaces/PiecePoolEntry.md)[]
