// BoardController: the board engine shared by every scene.
//
// It owns pointer input (drag a row or column, decide whether it's a legal
// move) and the move loop (apply the move, then each cascade, animating every
// explode phase). Scenes plug in what the board *means* through hooks: scoring,
// telemetry, clue reveals. Rules live in BackendPuzzle; visuals in BoardView.
import Phaser from 'phaser';
import type { BackendPuzzle } from '../BackendPuzzle';
import { MoveAction, type MoveDirection } from '../MoveAction';
import type { BoardView } from '../BoardView';
import type { ExplodeAndReplacePhase } from '../ExplodeAndReplacePhase';
import { GRID_COLS, GRID_ROWS, DRAG_THRESHOLD, MOVE_THRESHOLD } from '../constants';

export interface BoardLayout {
    gemSize: number;
    offset: { x: number; y: number };
}

export interface BoardControllerHooks {
    /** A legal move is about to be applied. */
    onMoveStart?(move: MoveAction): void;
    /** Each explode phase, before it animates: the player's move (cascade false), then each cascade. */
    onPhase?(phase: ExplodeAndReplacePhase, cascade: boolean): void;
    /** The move and every cascade have settled. */
    onMoveResolved?(move: MoveAction, anyMatch: boolean): void;
    /** A tap on a cell (no drag). Fires even while moves are locked. */
    onTap?(gridX: number, gridY: number): void;
    /** Whether input comes back after a move (`committed`) or a snap-back. Default: unless paused. */
    shouldResumeInput?(committed: boolean): boolean;
}

interface DragSpritePosition {
    x: number;
    y: number;
    gridX: number;
    gridY: number;
}

export class BoardController {
    private ready = false;
    private inputEnabled = false;
    private paused = false;
    private resolving = false;

    private dragging = false;
    private dragDirection: MoveDirection | null = null;
    private dragStartGridX = 0;
    private dragStartGridY = 0;
    private dragStartPointerX = 0;
    private dragStartPointerY = 0;
    private draggingSprites: Phaser.GameObjects.Sprite[] = [];
    private dragStartSpritePositions: DragSpritePosition[] = [];
    private touchPreventDefault: ((event: Event) => void) | null = null;

    constructor(
        private readonly scene: Phaser.Scene,
        readonly puzzle: BackendPuzzle,
        readonly view: BoardView,
        private layout: BoardLayout,
        private readonly hooks: BoardControllerHooks = {},
    ) {
        scene.input.addPointer(1);
        scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
        scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
        scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
        scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
        this.disableTouchScrolling();
    }

    setLayout(layout: BoardLayout): void { this.layout = layout; }
    /** The board has sprites and accepts taps; moves still need input enabled. */
    setReady(ready: boolean): void { this.ready = ready; }
    isReady(): boolean { return this.ready; }
    setInputEnabled(enabled: boolean): void { this.inputEnabled = enabled; }
    isInputEnabled(): boolean { return this.inputEnabled; }
    setPaused(paused: boolean): void { this.paused = paused; }
    isResolving(): boolean { return this.resolving; }
    isDragging(): boolean { return this.dragging; }

    destroy(): void {
        this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
        this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
        this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
        this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
        this.enableTouchScrolling();
        this.resetDragState();
        this.inputEnabled = false;
        this.ready = false;
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        if (this.paused || !this.ready) return;
        if (this.dragging) { // Safeguard: a drag that never ended
            console.warn("PointerDown while already dragging. Resetting drag state.");
            if (this.draggingSprites.length > 0) {
                this.view.snapBack(this.draggingSprites, this.dragStartSpritePositions, undefined, 0, 0)
                    .catch(e => console.error("Error snapping back during PointerDown reset:", e));
            }
            this.resetDragState();
        }

        const { gemSize, offset } = this.layout;
        const boardRect = new Phaser.Geom.Rectangle(offset.x, offset.y, GRID_COLS * gemSize, GRID_ROWS * gemSize);
        if (!boardRect.contains(pointer.x, pointer.y)) return;

        this.dragStartGridX = Phaser.Math.Clamp(Math.floor((pointer.x - offset.x) / gemSize), 0, GRID_COLS - 1);
        this.dragStartGridY = Phaser.Math.Clamp(Math.floor((pointer.y - offset.y) / gemSize), 0, GRID_ROWS - 1);
        this.dragStartPointerX = pointer.x;
        this.dragStartPointerY = pointer.y;
        this.dragging = true;
        this.dragDirection = null;
        this.draggingSprites = [];
        this.dragStartSpritePositions = [];
    }

    private handlePointerMove(pointer: Phaser.Input.Pointer): void {
        if (this.paused || !this.dragging || !this.inputEnabled || !this.ready) return;
        if (!pointer.isDown) {
            void this.handlePointerUp(pointer); // Button released outside our events
            return;
        }

        const deltaX = pointer.x - this.dragStartPointerX;
        const deltaY = pointer.y - this.dragStartPointerY;

        if (!this.dragDirection && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
            this.dragDirection = Math.abs(deltaX) > Math.abs(deltaY) ? 'row' : 'col';
            const allSprites = this.view.getGemsSprites();
            if (!allSprites) {
                this.cancelDrag("BoardView sprites unavailable");
                return;
            }
            const index = this.dragDirection === 'row' ? this.dragStartGridY : this.dragStartGridX;
            const limit = this.dragDirection === 'row' ? GRID_COLS : GRID_ROWS;
            this.draggingSprites = [];
            this.dragStartSpritePositions = [];
            for (let i = 0; i < limit; i++) {
                const x = this.dragDirection === 'row' ? i : index;
                const y = this.dragDirection === 'row' ? index : i;
                const sprite = allSprites[x]?.[y];
                if (sprite && sprite.active) {
                    this.draggingSprites.push(sprite);
                    this.dragStartSpritePositions.push({ x: sprite.x, y: sprite.y, gridX: x, gridY: y });
                    this.scene.tweens.killTweensOf(sprite);
                }
            }
            if (this.draggingSprites.length === 0) {
                this.cancelDrag("No sprites in dragged line");
                return;
            }
        }

        if (this.dragDirection) {
            this.view.moveDraggingSprites(this.draggingSprites, this.dragStartSpritePositions, deltaX, deltaY, this.dragDirection);
        }
    }

    private async handlePointerUp(pointer: Phaser.Input.Pointer): Promise<void> {
        if (this.paused) return;
        // Copy drag state before resetting it; the move resolves asynchronously.
        const wasDragging = this.dragging;
        const direction = this.dragDirection;
        const sprites = [...this.draggingSprites];
        const startPositions = [...this.dragStartSpritePositions];
        const startGridX = this.dragStartGridX;
        const startGridY = this.dragStartGridY;
        const deltaX = pointer.x - this.dragStartPointerX;
        const deltaY = pointer.y - this.dragStartPointerY;
        this.resetDragState();
        if (!wasDragging) return;

        if (!direction && Math.abs(deltaX) <= DRAG_THRESHOLD && Math.abs(deltaY) <= DRAG_THRESHOLD) {
            this.hooks.onTap?.(startGridX, startGridY);
            return;
        }

        if (!this.inputEnabled || !this.ready) {
            if (sprites.length > 0) await this.view.snapBack(sprites, startPositions, direction || undefined, deltaX, deltaY);
            return;
        }
        if (!direction || sprites.length === 0) {
            if (sprites.length > 0) await this.view.snapBack(sprites, startPositions, direction || undefined, deltaX, deltaY);
            return;
        }

        this.inputEnabled = false; // Locked while the move resolves
        const move = this.calculateMoveAction(deltaX, deltaY, direction, startGridX, startGridY);
        let committed = false;
        try {
            if (move.amount !== 0 && this.puzzle.getMatchesFromHypotheticalMove(move).length > 0) {
                this.view.updateGemsSpritesArrayAfterMove(move);
                this.view.snapDraggedGemsToFinalGridPositions();
                this.resolving = true;
                await this.commitMove(move);
                committed = true;
            } else {
                await this.view.snapBack(sprites, startPositions, direction, deltaX, deltaY);
            }
        } catch (error) {
            console.error("Error processing pointer up:", error);
            if (sprites.length > 0) await this.view.snapBack(sprites, startPositions, direction, deltaX, deltaY);
            this.view.syncSpritesToGridPositions();
        } finally {
            this.resolving = false;
            if (this.hooks.shouldResumeInput ? this.hooks.shouldResumeInput(committed) : !this.paused) {
                this.inputEnabled = true;
            }
        }
    }

    /** Apply a legal move, then every cascade, animating each explode phase. */
    private async commitMove(move: MoveAction): Promise<void> {
        this.hooks.onMoveStart?.(move);
        const phase = this.puzzle.getNextExplodeAndReplacePhase([move]); // Applies the move
        const anyMatch = !phase.isNothingToDo();
        if (anyMatch) {
            await this.runPhase(phase, false);
            for (let cascade = this.puzzle.getNextExplodeAndReplacePhase([]); !cascade.isNothingToDo(); cascade = this.puzzle.getNextExplodeAndReplacePhase([])) {
                await this.runPhase(cascade, true);
            }
        } else {
            console.warn("commitMove: the move applied but the puzzle reports no matches. This might be a logic discrepancy.");
        }
        this.hooks.onMoveResolved?.(move, anyMatch);
    }

    private async runPhase(phase: ExplodeAndReplacePhase, cascade: boolean): Promise<void> {
        try {
            this.hooks.onPhase?.(phase, cascade);
            await this.view.animateExplosions(phase.matches.flat());
            await this.view.animateFalls(phase.replacements, this.puzzle.getGridState());
        } catch (error) {
            console.error("Error during phase animation:", error);
            this.view.syncSpritesToGridPositions();
        }
    }

    private calculateMoveAction(deltaX: number, deltaY: number, direction: MoveDirection, startGridX: number, startGridY: number): MoveAction {
        const cellsMoved = (direction === 'row' ? deltaX : deltaY) / this.layout.gemSize;
        const index = direction === 'row' ? startGridY : startGridX;
        const amount = Math.abs(cellsMoved) >= MOVE_THRESHOLD ? Math.round(cellsMoved) : 0;
        return new MoveAction(direction, index, amount);
    }

    private cancelDrag(reason: string): void {
        console.warn(`Drag cancelled: ${reason}`);
        if (this.draggingSprites.length > 0 && this.dragStartSpritePositions.length > 0) {
            this.view.snapBack(this.draggingSprites, this.dragStartSpritePositions, undefined, 0, 0)
                .catch(err => console.error("Error snapping back on cancel:", err));
        }
        this.resetDragState();
    }

    private resetDragState(): void {
        this.dragging = false;
        this.dragDirection = null;
        this.draggingSprites = [];
        this.dragStartSpritePositions = [];
    }

    private disableTouchScrolling(): void {
        const canvas = this.scene.game.canvas;
        if (!canvas) return;
        canvas.style.touchAction = 'none';
        const preventDefault = (event: Event) => event.preventDefault();
        canvas.addEventListener('touchstart', preventDefault, { passive: false });
        canvas.addEventListener('touchmove', preventDefault, { passive: false });
        this.touchPreventDefault = preventDefault;
    }

    private enableTouchScrolling(): void {
        const canvas = this.scene.game.canvas;
        if (!canvas || !this.touchPreventDefault) return;
        canvas.style.touchAction = 'auto';
        canvas.removeEventListener('touchstart', this.touchPreventDefault);
        canvas.removeEventListener('touchmove', this.touchPreventDefault);
        this.touchPreventDefault = null;
    }
}
