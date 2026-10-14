// Board constants shared by the model (BackendPuzzle), view (BoardView) and
// input (BoardController).

/** Gem color keys (saved with each solve). The game uses six: four clue gems, the pebble and the rare witness gem (src/clueGame/animalBoard.ts). A key names the gem, not its look: 'black' draws a grey pebble. */
export const GEM_TYPES = ['black', 'blue', 'green', 'orange', 'red', 'white', 'yellow', 'purple'] as const;
export type GemType = typeof GEM_TYPES[number];

/** Each gem icon's main color (public/assets/evidence/<color>.svg), for bursts and the color toy. */
export const GEM_COLOR: Partial<Record<GemType, string>> = {
    orange: '#ff8a3d', yellow: '#ffd84a', green: '#3fcf7c', blue: '#4aa6fb', black: '#a3aab1', purple: '#b27dff',
};

export const GRID_COLS = 7 as const;
export const GRID_ROWS = 7 as const;

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
