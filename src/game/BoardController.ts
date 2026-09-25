// BoardController: pointer input and the move loop. A drag moves a row or
// column; on release a move that makes a match is applied, then each explode
// phase (the move's, then every cascade) is reported and animated. Rules live in
// BoardModel, visuals in BoardView; the scene says what a match means.
import Phaser from 'phaser';
import type { BoardModel, ExplodePhase, Move, MoveDirection } from './BoardModel';
import type { BoardView } from './BoardView';
import type { BoardLayout } from './squareLayout';
import { GRID_COLS, GRID_ROWS, DRAG_THRESHOLD, MOVE_THRESHOLD } from './constants';

export interface BoardHooks {
    /** Each explode phase, before it animates: the move's (cascade false), then each cascade. */
    onPhase(phase: ExplodePhase, cascade: boolean): void;
    /** The move and every cascade have settled. */
    onMoveResolved(): void;
}

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

    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        if (!this.canMove) return;
        const { gemSize, offset } = this.layout;
        const x = Math.floor((pointer.x - offset.x) / gemSize);
        const y = Math.floor((pointer.y - offset.y) / gemSize);
        if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;
        if (this.drag?.direction) this.view.resetPositions(); // a drag whose release never arrived
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
