// src/game/constants.ts

// --- Grid Configuration ---
export const GRID_COLS = 7 as const;
export const GRID_ROWS = 8 as const;

// --- Gem Configuration ---
export const GEM_TYPES = ['black', 'blue', 'green', 'orange', 'red', 'white', 'yellow', 'purple'] as const;
export type GemType = typeof GEM_TYPES[number];

export const GEM_FRAME_COUNT = 8 as const; // Number of frames per gem type (for explosion animation, etc.)

// --- Paths ---
export const ASSETS_PATH = 'assets/' as const;

// --- Animation Durations (in milliseconds) ---
export const ANIMATION_DURATIONS = {
    SNAP: 250,           // Snap back/to grid after valid move (increased for smoother effect)
    EXPLODE: 200,        // Gem explosion animation
    FALL_BASE: 200,      // Base time for falling
    FALL_PER_UNIT: 0.4,  // Additional ms per pixel distance fallen (adjust for speed)
    FALL_MAX: 450,       // Maximum fall duration
    LAYOUT_UPDATE: 150,  // Resize/orientation change tween
} as const;

// Keep old names for backward compatibility during conversion
export const TWEEN_DURATION_SNAP = ANIMATION_DURATIONS.SNAP;
export const TWEEN_DURATION_EXPLODE = ANIMATION_DURATIONS.EXPLODE;
export const TWEEN_DURATION_FALL_BASE = ANIMATION_DURATIONS.FALL_BASE;
export const TWEEN_DURATION_FALL_PER_UNIT = ANIMATION_DURATIONS.FALL_PER_UNIT;
export const TWEEN_DURATION_FALL_MAX = ANIMATION_DURATIONS.FALL_MAX;
export const TWEEN_DURATION_LAYOUT_UPDATE = ANIMATION_DURATIONS.LAYOUT_UPDATE;

// --- Input Thresholds ---
export const INPUT_THRESHOLDS = {
    DRAG: 10,        // Pixels pointer must move before drag direction is locked
    MOVE: 0.3,       // Fraction of gem size dragged needed to register as a move
} as const;

// Keep old names for backward compatibility
export const DRAG_THRESHOLD = INPUT_THRESHOLDS.DRAG;
export const MOVE_THRESHOLD = INPUT_THRESHOLDS.MOVE;

// --- Asset Keys (Centralized Naming) ---
export const AssetKeys = {
    LOGO: 'logo',
    BACKGROUND: 'background',
    // Helper to get gem texture key (assuming frame 0 is the default idle state)
    GEM_TEXTURE: (type: GemType, frame: number = 0): string => `${type}_gem_${frame}`,
    // Add sound keys here when implemented
    // SOUND_MATCH: 'match_sound',
    // SOUND_FALL: 'fall_sound',
    // SOUND_SNAP: 'snap_sound',
    // SOUND_EXPLODE: 'explode_sound',
} as const;

// --- Habitat to Gem Mapping ---
export const HABITAT_GEM_MAP: Partial<Record<number, GemType>> = {
    // Forests (100-109) → Green
    100: 'green', 101: 'green', 102: 'green', 103: 'green', 104: 'green',
    105: 'green', 106: 'green', 107: 'green', 108: 'green', 109: 'green',
    
    // Savannas (200-202) → Orange
    200: 'orange', 201: 'orange', 202: 'orange',
    
    // Shrublands (300-308) → Black
    300: 'black', 301: 'black', 302: 'black', 303: 'black', 304: 'black',
    305: 'black', 306: 'black', 307: 'black', 308: 'black',
    
    // Grasslands (400-407) → White
    400: 'white', 401: 'white', 402: 'white', 403: 'white', 404: 'white',
    405: 'white', 406: 'white', 407: 'white',
    
    // Wetlands (500-518) → Blue
    500: 'blue', 501: 'blue', 502: 'blue', 503: 'blue', 504: 'blue',
    505: 'blue', 506: 'blue', 507: 'blue', 508: 'blue', 509: 'blue',
    510: 'blue', 511: 'blue', 512: 'blue', 513: 'blue', 514: 'blue',
    515: 'blue', 516: 'blue', 517: 'blue', 518: 'blue',
    
    // Urban/Artificial (1400-1406) → Red
    1400: 'red', 1401: 'red', 1402: 'red', 1403: 'red', 1404: 'red',
    1405: 'red', 1406: 'red',
    
    // Default for any unmapped habitat types
    0: 'white', // No data
    1700: 'white', // Unknown
} as const;

// --- Game States (Optional: For more complex state machines) ---
// export const GameState = {
//     LOADING: 'loading',
//     MENU: 'menu',
//     READY: 'ready',      // Ready for player input
//     PROCESSING: 'processing', // Handling move/matches/falls
//     GAME_OVER: 'gameOver'
// };
