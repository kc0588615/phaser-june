// Board constants shared by the model (BackendPuzzle), view (BoardView) and
// input (BoardController).

/** Gem colors. The game uses six: five categories and the rare note gem (src/clueGame/gems.ts). */
export const GEM_TYPES = ['black', 'blue', 'green', 'orange', 'red', 'white', 'yellow', 'purple'] as const;
export type GemType = typeof GEM_TYPES[number];

export const GRID_COLS = 5 as const;
export const GRID_ROWS = 5 as const;

/** Phaser texture key for a gem's icon (public/assets/evidence/<color>.svg). */
export const gemTexture = (type: GemType): string => `gem_${type}`;

// Animation durations, in milliseconds (kept quick: a board that makes you wait feels slow).
export const TWEEN_DURATION_SWAP = 120;
export const TWEEN_DURATION_EXPLODE = 150;
export const TWEEN_DURATION_FALL_BASE = 150;
/** Extra ms per pixel fallen. */
export const TWEEN_DURATION_FALL_PER_UNIT = 0.4;
export const TWEEN_DURATION_FALL_MAX = 340;
export const TWEEN_DURATION_LAYOUT_UPDATE = 150;

/** Fraction of a gem a swipe must cover to swap toward its neighbor. */
export const SWIPE_THRESHOLD = 0.3;
