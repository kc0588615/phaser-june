// src/game/MoveAction.ts

export type MoveDirection = 'row' | 'col';

/**
 * Represents a player's action of moving a row or column.
 */
export class MoveAction {
    /**
     * Creates a MoveAction.
     * @param rowOrCol - Whether a row or column was moved.
     * @param index - The index of the row or column moved.
     * @param amount - The number of cells shifted (positive for right/down, negative for left/up).
     */
    constructor(
        public readonly rowOrCol: MoveDirection,
        public readonly index: number,
        public readonly amount: number
    ) {}

    /**
     * Checks if this move is horizontal (row move)
     */
    isHorizontal(): boolean {
        return this.rowOrCol === 'row';
    }

    /**
     * Checks if this move is vertical (column move)
     */
    isVertical(): boolean {
        return this.rowOrCol === 'col';
    }

    /**
     * Gets the absolute distance moved
     */
    getDistance(): number {
        return Math.abs(this.amount);
    }

    /**
     * Checks if move is to the right (for rows) or down (for columns)
     */
    isPositiveDirection(): boolean {
        return this.amount > 0;
    }

    /**
     * Returns a string representation of the move
     */
    toString(): string {
        const direction = this.amount > 0 
            ? (this.rowOrCol === 'row' ? 'right' : 'down')
            : (this.rowOrCol === 'row' ? 'left' : 'up');
        return `Move ${this.rowOrCol} ${this.index} ${direction} by ${Math.abs(this.amount)}`;
    }
}
