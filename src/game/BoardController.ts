// BoardController: pointer and keyboard input, and the move loop. A drag moves a
// row or column; on release a move that makes a match is applied, then each
// explode phase (the move's, then every cascade) is reported and animated. On the
// keyboard, arrows move a cursor, Shift+arrows preview sliding its row or column
// (one cell per press), Enter makes that move and Escape cancels. Rules live in
// BoardModel, visuals in BoardView; the scene says what a match means.
import Phaser from 'phaser';
import type { BoardModel, Cell, ExplodePhase, Move, MoveDirection } from './BoardModel';
import type { BoardKey } from './EventBus';
import type { BoardView } from './BoardView';
import type { BoardLayout } from './squareLayout';
import { GRID_COLS, GRID_ROWS, DRAG_THRESHOLD, MOVE_THRESHOLD } from './constants';

export interface BoardHooks {
    /** Each explode phase, before it animates: the move's (cascade false), then each cascade. */
    onPhase(phase: ExplodePhase, cascade: boolean): void;
    /** The move and every cascade have settled. */
    onMoveResolved(): void;
    /** What a keyboard action did, in words (for screen readers). */
    announce(text: string, cell?: Cell): void;
}

const ARROWS: Partial<Record<BoardKey, [dx: number, dy: number]>> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};

interface Drag {
    x: number;
    y: number;
    pointerX: number;
    pointerY: number;
    /** Locked once the pointer has moved past DRAG_THRESHOLD. */
    direction: MoveDirection | null;
}

export class BoardController {
    /** The board has sprites. */
    ready = false;
    /** The page stopped accepting moves (between rounds). */
    locked = false;
    private resolving = false;
    private drag: Drag | null = null;
    private cursor: Cell = [Math.floor(GRID_COLS / 2), Math.floor(GRID_ROWS / 2)];
    /** A keyboard slide being previewed, not yet made. */
    private pending: Move | null = null;

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
    get isDragging(): boolean { return this.drag !== null; }

    setLayout(layout: BoardLayout): void { this.layout = layout; }

    /** A new board: forget any drag or keyboard preview. */
    resetInput(): void {
        this.drag = null;
        this.pending = null;
    }

    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        if (!this.canMove) return;
        const { gemSize, offset } = this.layout;
        const x = Math.floor((pointer.x - offset.x) / gemSize);
        const y = Math.floor((pointer.y - offset.y) / gemSize);
        if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;
        if (this.drag?.direction || this.pending) this.view.resetPositions(); // a drag whose release never arrived, or a keyboard preview
        this.pending = null;
        this.view.hideCursor();
        this.drag = { x, y, pointerX: pointer.x, pointerY: pointer.y, direction: null };
    }

    private onPointerMove(pointer: Phaser.Input.Pointer): void {
        const drag = this.drag;
        if (!drag) return;
        if (!pointer.isDown) {
            void this.onPointerUp(pointer); // released outside our events
            return;
        }
        const dx = pointer.x - drag.pointerX;
        const dy = pointer.y - drag.pointerY;
        if (!drag.direction) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) <= DRAG_THRESHOLD) return;
            drag.direction = Math.abs(dx) > Math.abs(dy) ? 'row' : 'col';
        }
        const row = drag.direction === 'row';
        this.view.dragLine(drag.direction, row ? drag.y : drag.x, row ? dx : dy);
    }

    private async onPointerUp(pointer: Phaser.Input.Pointer): Promise<void> {
        const drag = this.drag;
        this.drag = null;
        if (!drag?.direction) return; // a tap
        const row = drag.direction === 'row';
        const index = row ? drag.y : drag.x;
        const offset = row ? pointer.x - drag.pointerX : pointer.y - drag.pointerY;
        const cells = offset / this.layout.gemSize;
        const move: Move = { rowOrCol: drag.direction, index, amount: Math.abs(cells) >= MOVE_THRESHOLD ? Math.round(cells) : 0 };
        if (!this.canMove || move.amount === 0 || this.model.matchesAfter(move).length === 0) {
            await this.view.snapBack(drag.direction, index, offset);
            return;
        }
        await this.resolve(move);
    }

    /** A key pressed on the focused board. */
    async key(key: BoardKey, shift: boolean): Promise<void> {
        if (!this.ready || this.drag) return;
        const arrow = ARROWS[key];
        if (arrow && shift) {
            if (this.canMove) this.preview(arrow);
        } else if (arrow) {
            this.cancelPreview();
            const [x, y] = this.cursor;
            this.cursor = [clamp(x + arrow[0], GRID_COLS), clamp(y + arrow[1], GRID_ROWS)];
            this.view.showCursor(...this.cursor);
            this.hooks.announce(`Row ${this.cursor[1] + 1}, column ${this.cursor[0] + 1}`, this.cursor);
        } else if (key === 'Escape') {
            if (this.cancelPreview()) this.hooks.announce('Slide canceled');
        } else if (key === 'Enter') {
            await this.commitPreview();
        }
    }

    /** One more cell of slide along the cursor's row (left/right) or column (up/down). */
    private preview([dx, dy]: [number, number]): void {
        const rowOrCol: MoveDirection = dx !== 0 ? 'row' : 'col';
        if (this.pending && this.pending.rowOrCol !== rowOrCol) this.cancelPreview();
        const length = rowOrCol === 'row' ? GRID_COLS : GRID_ROWS;
        const index = rowOrCol === 'row' ? this.cursor[1] : this.cursor[0];
        const amount = ((this.pending?.amount ?? 0) + dx + dy) % length;
        this.view.showCursor(...this.cursor);
        if (amount === 0) {
            this.cancelPreview();
            this.hooks.announce('Back where it started');
            return;
        }
        this.pending = { rowOrCol, index, amount };
        this.view.dragLine(rowOrCol, index, amount * this.layout.gemSize);
        const way = rowOrCol === 'row' ? (amount > 0 ? 'right' : 'left') : (amount > 0 ? 'down' : 'up');
        const cells = Math.abs(amount);
        const match = this.model.matchesAfter(this.pending).length > 0 ? 'Makes a match: press Enter.' : 'No match yet.';
        this.hooks.announce(`${rowOrCol === 'row' ? 'Row' : 'Column'} ${index + 1} ${way} ${cells} cell${cells === 1 ? '' : 's'}. ${match}`);
    }

    private cancelPreview(): boolean {
        const pending = this.pending;
        if (!pending) return false;
        this.pending = null;
        void this.view.snapBack(pending.rowOrCol, pending.index, pending.amount * this.layout.gemSize);
        return true;
    }

    private async commitPreview(): Promise<void> {
        const move = this.pending;
        if (!move) return;
        if (!this.canMove || this.model.matchesAfter(move).length === 0) {
            this.cancelPreview();
            this.hooks.announce('No match that way');
            return;
        }
        this.pending = null;
        // The cursor rides along with its gem.
        const [x, y] = this.cursor;
        this.cursor = move.rowOrCol === 'row' ? [wrap(x + move.amount, GRID_COLS), y] : [x, wrap(y + move.amount, GRID_ROWS)];
        this.view.showCursor(...this.cursor);
        await this.resolve(move);
    }

    /** Make a move that matches: shift, then animate each explode phase. */
    private async resolve(move: Move): Promise<void> {
        this.resolving = true;
        try {
            this.view.applyMove(move);
            let phase = this.model.nextPhase(move);
            for (let cascade = false; phase.groups.length > 0; cascade = true) {
                this.hooks.onPhase(phase, cascade);
                await this.view.animateExplosions(phase.groups.flatMap(group => group.cells));
                await this.view.animateFalls(phase.refills);
                phase = this.model.nextPhase();
            }
        } catch (error) {
            console.error('[BoardController] Move failed; redrawing the board:', error);
            this.view.createBoard(this.model.getGrid());
        } finally {
            this.resolving = false;
            this.hooks.onMoveResolved();
        }
    }
}

const clamp = (value: number, length: number) => Math.min(length - 1, Math.max(0, value));
const wrap = (value: number, length: number) => ((value % length) + length) % length;
