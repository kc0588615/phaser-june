// src/game/constants.ts

import {
    ACTIVE_GEM_TYPES,
    LOOT_GEM_TYPES,
    GEM_TYPES,
    type LootGemType,
    type GemType,
    type GemFamily,
    type BoardSpawnConfig,
    getGemFamily,
    DEFAULT_BOARD_SPAWN_CONFIG,
} from '../expedition/domain';

// --- Grid Configuration ---
export const GRID_COLS = 6 as const;
export const GRID_ROWS = 6 as const;

// --- Gem Configuration ---
export { ACTIVE_GEM_TYPES, LOOT_GEM_TYPES, GEM_TYPES, getGemFamily, DEFAULT_BOARD_SPAWN_CONFIG };
export type { LootGemType, GemType, GemFamily, BoardSpawnConfig };

export const GEM_FRAME_COUNT = 8 as const; // Number of animation frames per gem type (explosion etc.)

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
    EVIDENCE_GEM_TEXTURE: (type: GemType): string => `evidence_gem_${type}`,
    // Add sound keys here when implemented
    // SOUND_MATCH: 'match_sound',
    // SOUND_FALL: 'fall_sound',
    // SOUND_SNAP: 'snap_sound',
    // SOUND_EXPLODE: 'explode_sound',
} as const;

// --- Game Mechanics Configuration ---
export const MAX_MOVES = 50;
export const STREAK_STEP = 0.25;           // +25% per streak level
export const STREAK_CAP = 3.0;             // optional cap (x3.0)

export const MOVE_LARGE_MATCH_THRESHOLD = 4;
export const MOVE_HUGE_MATCH_THRESHOLD = 5;
export const MULTIPLIER_LARGE_MATCH = 1.25;
export const MULTIPLIER_HUGE_MATCH = 1.5;

// --- Game States (Optional: For more complex state machines) ---
// export const GameState = {
//     LOADING: 'loading',
//     MENU: 'menu',
//     READY: 'ready',      // Ready for player input
//     PROCESSING: 'processing', // Handling move/matches/falls
//     GAME_OVER: 'gameOver'
// };
