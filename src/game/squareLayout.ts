// Board layout for a canvas that belongs entirely to the board: the largest
// gem that fits, the board centered.

export interface BoardLayout {
    gemSize: number;
    /** Top-left corner of the board, in canvas pixels. */
    offset: { x: number; y: number };
}

const SQUARE_LAYOUT = {
    /** Space kept free around the board, in pixels. */
    padding: 8,
    minGem: 24,
    maxGem: 112,
} as const;

export function squareBoardLayout(width: number, height: number, cols: number, rows: number): BoardLayout {
    const { padding, minGem, maxGem } = SQUARE_LAYOUT;
    const fit = Math.floor(Math.min((width - 2 * padding) / cols, (height - 2 * padding) / rows));
    const gemSize = Math.max(minGem, Math.min(maxGem, fit));
    return {
        gemSize,
        offset: {
            x: Math.round((width - cols * gemSize) / 2),
            y: Math.round((height - rows * gemSize) / 2),
        },
    };
}
