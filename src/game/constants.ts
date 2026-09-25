// Board constants shared by the model (BackendPuzzle), view (BoardView) and
// input (BoardController).

/** Gem colors. Each is one Clue Match clue category (src/clueGame/categories.ts). */
export const GEM_TYPES = ['black', 'blue', 'green', 'orange', 'red', 'white', 'yellow', 'purple'] as const;
export type GemType = typeof GEM_TYPES[number];

export const GRID_COLS = 6 as const;
export const GRID_ROWS = 6 as const;

/** Phaser texture key for a gem's icon (public/assets/evidence/<color>.svg). */
export const gemTexture = (type: GemType): string => `gem_${type}`;

// Animation durations, in milliseconds.
export const TWEEN_DURATION_SNAP = 250;
export const TWEEN_DURATION_EXPLODE = 200;
export const TWEEN_DURATION_FALL_BASE = 200;
/** Extra ms per pixel fallen. */
export const TWEEN_DURATION_FALL_PER_UNIT = 0.4;
export const TWEEN_DURATION_FALL_MAX = 450;
export const TWEEN_DURATION_LAYOUT_UPDATE = 150;

/** Pixels a pointer must move before the drag direction locks. */
export const DRAG_THRESHOLD = 10;
/** Fraction of a gem a drag must cover to count as a move. */
export const MOVE_THRESHOLD = 0.3;
