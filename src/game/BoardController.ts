// BoardController: pointer and keyboard input, and the move loop. A move swaps a
// gem with a neighbor: swipe from a gem toward its neighbor, or tap a gem, then
// a neighbor. A swap that makes a match is made, then each explode phase (the
// move's, then every cascade) is reported and animated; any other swap slides
// back and costs nothing. On the keyboard, arrows move a cursor and Shift+arrows
// swap its gem that way; Escape drops a tapped gem. Rules live in BoardModel,
// visuals in BoardView; the scene says what a match means.
import Phaser from 'phaser';
import { isNeighbor, type BoardModel, type Cell, type ExplodePhase, type Move } from './BoardModel';
import type { BoardKey } from './EventBus';
import type { BoardView } from './BoardView';
import { sfx } from './sfx';
import type { BoardLayout } from './squareLayout';
import { GRID_COLS, GRID_ROWS, SWIPE_THRESHOLD } from './constants';

export interface BoardHooks {
    /**
     * Each explode phase, before it animates: the move's (cascade false), then each cascade. Returns the pinned animals
     * to release (plan 044): they hop off once the phase has fallen, and gems drop into their cells.
     */
    onPhase(phase: ExplodePhase, cascade: boolean): number[] | void;
    /** A gem was picked: the pinned animals a swap from it would release (the release preview). */
    preview?(cell: Cell): number[];
    /** The move and every cascade have settled. */
    onMoveResolved(): void;
    /** What a keyboard action did, in words (for screen readers). */
    announce(text: string, cell?: Cell): void;
}

const ARROWS: Partial<Record<BoardKey, [dx: number, dy: number]>> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};
const WAYS: Record<string, string> = { '-1,0': 'left', '1,0': 'right', '0,-1': 'up', '0,1': 'down' };

/** A pointer pressed on a gem, not yet a swipe or a tap. */
interface Press {
    cell: Cell;
    pointerX: number;
    pointerY: number;
}

export class BoardController {
    /** The board has sprites. */
    ready = false;
    /** The page stopped accepting moves (between rounds). */
    locked = false;
    private resolving = false;
    private press: Press | null = null;
    /** Keyboard cursor, and the gem a tap picked (outlined the same way). */
    private cursor: Cell = [Math.floor(GRID_COLS / 2), Math.floor(GRID_ROWS / 2)];
    /** The cursor's gem was tapped and waits for a neighbor tap. */
    private picked = false;
    /** Bumped for each new board, so a move still animating on the old one stops instead of playing on the new one. */
    private board = 0;

    /** Listens to the scene's pointer; Phaser drops the listeners when the scene shuts down. */
    constructor(
        scene: Phaser.Scene,
        private readonly model: BoardModel,
        private readonly view: BoardView,
        private layout: BoardLayout,
        private readonly hooks: BoardHooks,
    ) {
        scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
        scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
        scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
        scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    }

    get canMove(): boolean { return this.ready && !this.locked && !this.resolving; }
    get isResolving(): boolean { return this.resolving; }
    get isDragging(): boolean { return this.press !== null; }

    setLayout(layout: BoardLayout): void { this.layout = layout; }

    /** A new board: forget any press or tapped gem, and stop a move still animating on the old board. */
    resetInput(): void {
        this.board++;
        this.press = null;
        this.drop();
    }

    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        if (!this.canMove) return;
        const { gemSize, offset } = this.layout;
        const cell: Cell = [Math.floor((pointer.x - offset.x) / gemSize), Math.floor((pointer.y - offset.y) / gemSize)];
        if (!this.model.onBoard(cell) || this.model.isPinned(cell)) return; // an animal tile is never swapped
        if (!this.picked) this.view.hideCursor(); // the keyboard cursor, from earlier keyboard play
        this.press = { cell, pointerX: pointer.x, pointerY: pointer.y };
    }

    /** Past the threshold, a press becomes a swipe: swap toward the neighbor that way. */
    private onPointerMove(pointer: Phaser.Input.Pointer): void {
        const press = this.press;
        if (!press) return;
        if (!pointer.isDown) {
            this.onPointerUp(); // released outside our events
            return;
        }
        const dx = pointer.x - press.pointerX;
        const dy = pointer.y - press.pointerY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < this.layout.gemSize * SWIPE_THRESHOLD) return;
        this.press = null;
        this.drop();
        const [x, y] = press.cell;
        const to: Cell = Math.abs(dx) > Math.abs(dy) ? [x + Math.sign(dx), y] : [x, y + Math.sign(dy)];
        void this.trySwap({ from: press.cell, to });
    }

    /** A press that never became a swipe is a tap. */
    private onPointerUp(): void {
        const press = this.press;
        this.press = null;
        if (press && this.canMove) void this.tap(press.cell);
    }

    /** Tap a gem to pick it, then a neighbor to swap them. Tapping it again, or a gem further away, picks again. */
    private async tap(cell: Cell): Promise<void> {
        if (this.picked && isNeighbor(this.cursor, cell)) {
            const from = this.cursor;
            this.drop();
            await this.trySwap({ from, to: cell });
        } else if (this.picked && cell[0] === this.cursor[0] && cell[1] === this.cursor[1]) {
            this.drop();
        } else {
            this.cursor = cell;
            this.picked = true;
            this.view.showCursor(...cell);
            this.view.showPreview(this.hooks.preview?.(cell) ?? []);
        }
    }

    private drop(): void {
        if (!this.picked) return;
        this.picked = false;
        this.view.hideCursor();
        this.view.clearPreview();
    }

    /** A key pressed on the focused board. */
    async key(key: BoardKey, shift: boolean): Promise<void> {
        if (!this.ready || this.press) return;
        const arrow = ARROWS[key];
        if (arrow && shift) {
            this.picked = false;
            this.view.showCursor(...this.cursor);
            const [x, y] = this.cursor;
            const to: Cell = [x + arrow[0], y + arrow[1]];
            if (!this.model.onBoard(to)) {
                this.hooks.announce('Edge of the board');
                return;
            }
            const swapped = await this.trySwap({ from: this.cursor, to });
            if (swapped) this.hooks.announce(`Swapped ${WAYS[arrow.join()]}`);
        } else if (arrow) {
            this.picked = false;
            const [x, y] = this.cursor;
            this.cursor = [clamp(x + arrow[0], GRID_COLS), clamp(y + arrow[1], GRID_ROWS)];
            this.view.showCursor(...this.cursor);
            this.hooks.announce(`Row ${this.cursor[1] + 1}, column ${this.cursor[0] + 1}`, this.cursor);
        } else if (key === 'Escape' && this.picked) {
            this.drop();
            this.hooks.announce('Gem dropped');
        }
    }

    /** Make a swap that matches (or sets a toy off), or show one that doesn't sliding back. True when the move was made. */
    private async trySwap(move: Move): Promise<boolean> {
        if (!this.canMove || !this.model.onBoard(move.to)) return false;
        if (this.model.isPinned(move.from) || this.model.isPinned(move.to)) {
            this.hooks.announce('An animal is there');
            return false;
        }
        if (!this.model.canSwap(move)) {
            sfx.swapBack();
            this.resolving = true;
            try {
                await this.view.animateSwapBack(move);
            } finally {
                this.resolving = false;
            }
            this.hooks.announce('No match that way');
            return false;
        }
        await this.resolve(move);
        return true;
    }

    /** Swap, then animate each explode phase. A new board mid-move (the next round) ends it at the next pause. */
    private async resolve(move: Move): Promise<void> {
        this.resolving = true;
        const board = this.board;
        const replaced = () => board !== this.board;
        try {
            await this.view.animateSwap(move);
            if (replaced()) return;
            let phase = this.model.nextPhase(move);
            for (let cascade = false; phase.cleared.length > 0; cascade = true) {
                const released = this.hooks.onPhase(phase, cascade) ?? [];
                if (phase.fired.length > 0) await this.view.animateFires(phase.fired);
                if (replaced()) return;
                await this.view.animateExplosions(phase.cleared);
                if (replaced()) return;
                this.view.showToys(phase.made);
                await this.view.animateFalls(phase.refills);
                if (replaced()) return;
                if (released.length > 0) {
                    const refills = this.model.unpin(released);
                    await this.view.releaseTiles(released);
                    if (replaced()) return;
                    await this.view.animateFalls(refills);
                    if (replaced()) return;
                }
                phase = this.model.nextPhase();
            }
        } catch (error) {
            console.error('[BoardController] Move failed; redrawing the board:', error);
            this.view.createBoard(this.model.getGrid(), this.model.getToys());
        } finally {
            this.resolving = false;
            this.hooks.onMoveResolved();
        }
    }
}

const clamp = (value: number, length: number) => Math.min(length - 1, Math.max(0, value));
